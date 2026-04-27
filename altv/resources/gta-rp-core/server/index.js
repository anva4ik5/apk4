/// <reference types="@altv/types-server" />
import dotenv from "dotenv";
dotenv.config();
const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";
const SPAWN_POS = { x: -1038.2, y: -2737.8, z: 13.8 };
const sessions = new Map();
async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
            "content-type": "application/json",
            ...(options.headers ?? {})
        }
    });
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API ${path} failed: ${response.status} ${text}`);
    }
    return (await response.json());
}
async function registerOrLogin(email, password) {
    try {
        return await apiRequest("/auth/register", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    }
    catch {
        return apiRequest("/auth/login", {
            method: "POST",
            body: JSON.stringify({ email, password })
        });
    }
}
async function ensureCharacter(token) {
    try {
        return await apiRequest("/characters/me", {
            headers: { authorization: `Bearer ${token}` }
        });
    }
    catch {
        return apiRequest("/characters", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ firstName: "Player", lastName: `${Math.floor(Math.random() * 10000)}` })
        });
    }
}
function ensureSession(player) {
    const session = sessions.get(player.id);
    if (!session)
        throw new Error("No active session");
    return session;
}
function emitHud(player, character) {
    player.emit("hud:updateMoney", character.moneyCash, character.moneyBank);
    player.emit("rp:character", {
        id: character.id,
        firstName: character.firstName,
        lastName: character.lastName
    });
}
alt.log(`[altv] bridge started, api=${API_BASE_URL}`);
alt.on("playerConnect", async (player) => {
    player.model = "mp_m_freemode_01";
    player.spawn(SPAWN_POS.x, SPAWN_POS.y, SPAWN_POS.z);
    player.dimension = 0;
    try {
        const pseudoEmail = `player_${player.socialID || player.id}@gta-rp.local`;
        const pseudoPassword = `pw_${player.socialID || player.id}_123456`;
        const auth = await registerOrLogin(pseudoEmail, pseudoPassword);
        const character = await ensureCharacter(auth.token);
        sessions.set(player.id, { token: auth.token, characterId: character.id });
        emitHud(player, character);
        alt.log(`[altv] ${player.name} connected as character ${character.id}`);
    }
    catch (error) {
        alt.logError(`[altv] login failed for ${player.name}: ${String(error)}`);
        player.kick("Login failed");
    }
});
alt.on("playerDisconnect", (player) => {
    sessions.delete(player.id);
});
alt.onClient("rp:inventory:get", async (player) => {
    try {
        const { token } = ensureSession(player);
        const inventory = await apiRequest("/inventory/me", {
            headers: { authorization: `Bearer ${token}` }
        });
        player.emit("rp:inventory:data", inventory.items);
    }
    catch (error) {
        player.emit("rp:error", "Inventory request failed");
        alt.logError(String(error));
    }
});
alt.onClient("rp:inventory:use", async (player, itemCode, quantity) => {
    try {
        const { token } = ensureSession(player);
        await apiRequest("/inventory/use", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ itemCode, quantity })
        });
        player.emit("rp:inventory:used", itemCode, quantity);
    }
    catch (error) {
        player.emit("rp:error", "Use item failed");
        alt.logError(String(error));
    }
});
alt.onClient("rp:jobs:start", async (player, jobCode) => {
    try {
        const { token } = ensureSession(player);
        await apiRequest("/jobs/start", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ jobCode })
        });
        player.emit("rp:jobs:started", jobCode);
    }
    catch (error) {
        player.emit("rp:error", "Start job failed");
        alt.logError(String(error));
    }
});
alt.onClient("rp:jobs:complete", async (player, jobCode, distanceMeters) => {
    try {
        const { token } = ensureSession(player);
        const result = await apiRequest("/jobs/complete", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ jobCode, distanceMeters })
        });
        const character = await apiRequest("/characters/me", {
            headers: { authorization: `Bearer ${token}` }
        });
        emitHud(player, character);
        player.emit("rp:jobs:completed", result.payout, result.xpGain);
    }
    catch (error) {
        player.emit("rp:error", "Complete job failed");
        alt.logError(String(error));
    }
});
alt.onClient("rp:jobs:get", async (player) => {
    try {
        const { token } = ensureSession(player);
        const result = await apiRequest("/jobs/me", {
            headers: { authorization: `Bearer ${token}` }
        });
        player.emit("rp:jobs:data", result.jobs);
    }
    catch (error) {
        player.emit("rp:error", "Jobs request failed");
        alt.logError(String(error));
    }
});
alt.onClient("rp:vehicles:get", async (player) => {
    try {
        const { token } = ensureSession(player);
        const result = await apiRequest("/vehicles/me", {
            headers: { authorization: `Bearer ${token}` }
        });
        player.emit("rp:vehicles:data", result.vehicles);
    }
    catch (error) {
        player.emit("rp:error", "Vehicles request failed");
        alt.logError(String(error));
    }
});
alt.onClient("rp:vehicles:buy", async (player, modelCode) => {
    try {
        const { token } = ensureSession(player);
        await apiRequest("/vehicles/buy", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ modelCode })
        });
        const character = await apiRequest("/characters/me", {
            headers: { authorization: `Bearer ${token}` }
        });
        emitHud(player, character);
        player.emit("rp:vehicles:bought", modelCode);
    }
    catch (error) {
        player.emit("rp:error", "Buy vehicle failed");
        alt.logError(String(error));
    }
});
alt.onClient("rp:vehicles:spawn", async (player, vehicleId, spawned) => {
    try {
        const { token } = ensureSession(player);
        await apiRequest("/vehicles/spawn", {
            method: "POST",
            headers: { authorization: `Bearer ${token}` },
            body: JSON.stringify({ vehicleId, spawned })
        });
        player.emit("rp:vehicles:spawned", vehicleId, spawned);
    }
    catch (error) {
        player.emit("rp:error", "Vehicle spawn update failed");
        alt.logError(String(error));
    }
});
//# sourceMappingURL=index.js.map