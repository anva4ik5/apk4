/// <reference types="@altv/types-server" />
import dotenv from "dotenv";

declare const alt: any;

dotenv.config();

type AuthResponse = {
  token: string;
  userId: number;
};

type Character = {
  id: number;
  firstName: string;
  lastName: string;
  moneyCash: number;
  moneyBank: number;
};

type InventoryResponse = {
  items: Array<{ itemCode: string; quantity: number }>;
};

type JobsResponse = {
  jobs: Array<{ jobCode: string; level: number; xp: number; active: boolean }>;
};

type VehiclesResponse = {
  vehicles: Array<{ id: number; modelCode: string; plate: string; fuel: number; isSpawned: boolean }>;
};

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:4000";
const SPAWN_POS = { x: -1038.2, y: -2737.8, z: 13.8 };

const sessions = new Map<number, { token: string; characterId: number }>();

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
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
  return (await response.json()) as T;
}

async function registerOrLogin(email: string, password: string): Promise<AuthResponse> {
  try {
    return await apiRequest<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  } catch {
    return apiRequest<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  }
}

async function ensureCharacter(token: string): Promise<Character> {
  try {
    return await apiRequest<Character>("/characters/me", {
      headers: { authorization: `Bearer ${token}` }
    });
  } catch {
    return apiRequest<Character>("/characters", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ firstName: "Player", lastName: `${Math.floor(Math.random() * 10000)}` })
    });
  }
}

function ensureSession(player: any): { token: string; characterId: number } {
  const session = sessions.get(player.id);
  if (!session) throw new Error("No active session");
  return session;
}

function emitHud(player: any, character: Character): void {
  player.emit("hud:updateMoney", character.moneyCash, character.moneyBank);
  player.emit("rp:character", {
    id: character.id,
    firstName: character.firstName,
    lastName: character.lastName
  });
}

alt.log(`[altv] bridge started, api=${API_BASE_URL}`);

alt.on("playerConnect", async (player: any) => {
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
  } catch (error) {
    alt.logError(`[altv] login failed for ${player.name}: ${String(error)}`);
    player.kick("Login failed");
  }
});

alt.on("playerDisconnect", (player: any) => {
  sessions.delete(player.id);
});

alt.onClient("rp:inventory:get", async (player: any) => {
  try {
    const { token } = ensureSession(player);
    const inventory = await apiRequest<InventoryResponse>("/inventory/me", {
      headers: { authorization: `Bearer ${token}` }
    });
    player.emit("rp:inventory:data", inventory.items);
  } catch (error) {
    player.emit("rp:error", "Inventory request failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:inventory:use", async (player: any, itemCode: string, quantity: number) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/inventory/use", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ itemCode, quantity })
    });
    player.emit("rp:inventory:used", itemCode, quantity);
  } catch (error) {
    player.emit("rp:error", "Use item failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:jobs:start", async (player: any, jobCode: "courier" | "miner") => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/jobs/start", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ jobCode })
    });
    player.emit("rp:jobs:started", jobCode);
  } catch (error) {
    player.emit("rp:error", "Start job failed");
    alt.logError(String(error));
  }
});

alt.onClient(
  "rp:jobs:complete",
  async (player: any, jobCode: "courier" | "miner", distanceMeters: number) => {
  try {
    const { token } = ensureSession(player);
    const result = await apiRequest<{ ok: true; payout: number; xpGain: number }>("/jobs/complete", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ jobCode, distanceMeters })
    });
    const character = await apiRequest<Character>("/characters/me", {
      headers: { authorization: `Bearer ${token}` }
    });
    emitHud(player, character);
    player.emit("rp:jobs:completed", result.payout, result.xpGain);
  } catch (error) {
    player.emit("rp:error", "Complete job failed");
    alt.logError(String(error));
  }
  }
);

alt.onClient("rp:jobs:get", async (player: any) => {
  try {
    const { token } = ensureSession(player);
    const result = await apiRequest<JobsResponse>("/jobs/me", {
      headers: { authorization: `Bearer ${token}` }
    });
    player.emit("rp:jobs:data", result.jobs);
  } catch (error) {
    player.emit("rp:error", "Jobs request failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:get", async (player: any) => {
  try {
    const { token } = ensureSession(player);
    const result = await apiRequest<VehiclesResponse>("/vehicles/me", {
      headers: { authorization: `Bearer ${token}` }
    });
    player.emit("rp:vehicles:data", result.vehicles);
  } catch (error) {
    player.emit("rp:error", "Vehicles request failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:buy", async (player: any, modelCode: string) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest("/vehicles/buy", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ modelCode })
    });
    const character = await apiRequest<Character>("/characters/me", {
      headers: { authorization: `Bearer ${token}` }
    });
    emitHud(player, character);
    player.emit("rp:vehicles:bought", modelCode);
  } catch (error) {
    player.emit("rp:error", "Buy vehicle failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:spawn", async (player: any, vehicleId: number, x: number, y: number, z: number, heading: number) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/vehicles/spawn", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ vehicleId, x, y, z, heading })
    });
    player.emit("rp:vehicles:spawned", vehicleId);
  } catch (error) {
    player.emit("rp:error", "Vehicle spawn failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:despawn", async (player: any, vehicleId: number, x: number, y: number, z: number, heading: number) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/vehicles/despawn", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ vehicleId, x, y, z, heading })
    });
    player.emit("rp:vehicles:despawned", vehicleId);
  } catch (error) {
    player.emit("rp:error", "Vehicle despawn failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:keys:give", async (player: any, targetCharacterId: number, vehicleId: number) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/vehicles/keys/give", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ targetCharacterId, vehicleId })
    });
    player.emit("rp:vehicles:keys:given", vehicleId);
  } catch (error) {
    player.emit("rp:error", "Give keys failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:impound", async (player: any, vehicleId: number) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/vehicles/impound", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ vehicleId })
    });
    player.emit("rp:vehicles:impounded", vehicleId);
  } catch (error) {
    player.emit("rp:error", "Impound vehicle failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:impound:release", async (player: any, vehicleId: number) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/vehicles/impound/release", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ vehicleId })
    });
    player.emit("rp:vehicles:released", vehicleId);
  } catch (error) {
    player.emit("rp:error", "Release vehicle failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:tuning:insurance", async (player: any, vehicleId: number) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/vehicles/tuning/insurance", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ vehicleId })
    });
    player.emit("rp:vehicles:insured", vehicleId);
  } catch (error) {
    player.emit("rp:error", "Insurance purchase failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:tuning:upgrade", async (player: any, vehicleId: number, upgradeType: string) => {
  try {
    const { token } = ensureSession(player);
    await apiRequest<{ ok: true }>("/vehicles/tuning/upgrade", {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
      body: JSON.stringify({ vehicleId, upgradeType })
    });
    player.emit("rp:vehicles:upgraded", vehicleId, upgradeType);
  } catch (error) {
    player.emit("rp:error", "Upgrade purchase failed");
    alt.logError(String(error));
  }
});

alt.onClient("rp:vehicles:catalog", async (player: any) => {
  try {
    const result = await apiRequest<{ vehicles: Array<any> }>("/vehicles/catalog");
    player.emit("rp:vehicles:catalog", result.vehicles);
  } catch (error) {
    player.emit("rp:error", "Catalog request failed");
    alt.logError(String(error));
  }
});

// Vehicle lock sync
alt.onClient("server:vehicle:syncLock", (player: any, vehicleId: number, locked: boolean) => {
  // Broadcast lock state to all players
  alt.emit("client:vehicle:lockSync", vehicleId, locked);
});
