import * as alt from 'alt';
import * as native from 'natives';

const API_BASE = 'http://localhost:3000';
let authToken: string | null = null;
let currentCharacterId: number | null = null;

// Vehicle state
interface VehicleState {
  id: number;
  vehicle: alt.Vehicle | null;
  model: string;
  plate: string;
  fuel: number;
  isSpawned: boolean;
  hasKey: boolean;
}

const playerVehicles: Map<number, VehicleState> = new Map();
let currentVehicle: alt.Vehicle | null = null;

// Initialize vehicle system
export function initVehicleSystem(token: string, charId: number) {
  authToken = token;
  currentCharacterId = charId;
  loadPlayerVehicles();
  setupVehicleEvents();
}

// Load player vehicles from API
async function loadPlayerVehicles() {
  try {
    const response = await fetch(`${API_BASE}/vehicles/me`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const data = await response.json();
    
    if (response.ok && data.vehicles) {
      data.vehicles.forEach((v: any) => {
        playerVehicles.set(v.id, {
          id: v.id,
          vehicle: null,
          model: v.model_code,
          plate: v.plate,
          fuel: v.fuel,
          isSpawned: v.is_spawned,
          hasKey: v.has_key
        });
      });
      
      alt.log(`[Vehicles] Loaded ${data.vehicles.length} vehicles`);
    }
  } catch (error) {
    alt.log('[Vehicles] Failed to load vehicles:', error);
  }
}

// Spawn vehicle
export async function spawnVehicle(vehicleId: number, position: alt.Vector3, heading: number = 0) {
  const vehicleState = playerVehicles.get(vehicleId);
  if (!vehicleState) {
    alt.log('[Vehicles] Vehicle not found:', vehicleId);
    return null;
  }

  if (vehicleState.isSpawned && vehicleState.vehicle) {
    alt.log('[Vehicles] Vehicle already spawned');
    return vehicleState.vehicle;
  }

  try {
    // Call API to spawn
    const response = await fetch(`${API_BASE}/vehicles/spawn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vehicleId,
        x: position.x,
        y: position.y,
        z: position.z,
        heading
      })
    });

    if (!response.ok) {
      const data = await response.json();
      alt.log('[Vehicles] Spawn failed:', data.message);
      return null;
    }

    // Create vehicle in game
    const vehicle = new alt.Vehicle(
      alt.hash(vehicleState.model),
      position.x,
      position.y,
      position.z,
      heading
    );

    if (!vehicle || !vehicle.valid) {
      alt.log('[Vehicles] Failed to create vehicle entity');
      return null;
    }

    // Set vehicle properties
    vehicle.numberPlateText = vehicleState.plate;
    vehicle.lockState = 2; // Locked
    
    // Set fuel level (stored as variable)
    native.setVehicleFuelLevel(vehicle.scriptID, vehicleState.fuel);
    native.setVehicleEngineOn(vehicle.scriptID, false);

    // Update state
    vehicleState.vehicle = vehicle;
    vehicleState.isSpawned = true;
    
    // Set custom data
    vehicle.setStreamSyncedMeta('vehicleId', vehicleId);
    vehicle.setStreamSyncedMeta('plate', vehicleState.plate);
    vehicle.setStreamSyncedMeta('fuel', vehicleState.fuel);

    alt.log(`[Vehicles] Spawned ${vehicleState.model} (${vehicleState.plate})`);
    return vehicle;
  } catch (error) {
    alt.log('[Vehicles] Spawn error:', error);
    return null;
  }
}

// Despawn vehicle
export async function despawnVehicle(vehicleId: number) {
  const vehicleState = playerVehicles.get(vehicleId);
  if (!vehicleState || !vehicleState.vehicle) {
    return;
  }

  try {
    // Save position
    const pos = vehicleState.vehicle.pos;
    const heading = vehicleState.vehicle.rot.z;

    await fetch(`${API_BASE}/vehicles/despawn`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        vehicleId,
        x: pos.x,
        y: pos.y,
        z: pos.z,
        heading
      })
    });

    // Destroy vehicle
    vehicleState.vehicle.destroy();
    vehicleState.vehicle = null;
    vehicleState.isSpawned = false;

    alt.log(`[Vehicles] Despawned vehicle ${vehicleId}`);
  } catch (error) {
    alt.log('[Vehicles] Despawn error:', error);
  }
}

// Despawn all vehicles
export async function despawnAllVehicles() {
  for (const [id, state] of playerVehicles) {
    if (state.vehicle && state.vehicle.valid) {
      await despawnVehicle(id);
    }
  }
}

// Enter vehicle
export async function enterVehicle(vehicle: alt.Vehicle) {
  const vehicleId = vehicle.getStreamSyncedMeta('vehicleId') as number;
  if (!vehicleId) return;

  const vehicleState = playerVehicles.get(vehicleId);
  if (!vehicleState) {
    // Not player's vehicle
    alt.log('[Vehicles] Not player\'s vehicle');
    return;
  }

  // Check if has key
  if (!vehicleState.hasKey) {
    alt.emit('client:notification', 'error', 'У вас нет ключей от этого транспорта');
    return;
  }

  currentVehicle = vehicle;
  native.setVehicleEngineOn(vehicle.scriptID, true);
  
  alt.log(`[Vehicles] Entered vehicle ${vehicleId}`);
}

// Exit vehicle
export function exitVehicle() {
  if (currentVehicle) {
    native.setVehicleEngineOn(currentVehicle.scriptID, false);
    currentVehicle = null;
  }
}

// Toggle engine
export function toggleEngine() {
  if (!currentVehicle || !currentVehicle.valid) return;

  const player = alt.Player.local;
  if (!player.vehicle || player.vehicle !== currentVehicle) return;

  const isEngineOn = native.getIsVehicleEngineRunning(currentVehicle.scriptID);
  native.setVehicleEngineOn(currentVehicle.scriptID, !isEngineOn);
  
  alt.emit('client:notification', 'info', !isEngineOn ? 'Двигатель запущен' : 'Двигатель заглушен');
}

// Toggle lock
export async function toggleLock() {
  if (!currentVehicle || !currentVehicle.valid) return;

  const player = alt.Player.local;
  if (!player.vehicle || player.vehicle !== currentVehicle) return;

  const vehicleId = currentVehicle.getStreamSyncedMeta('vehicleId') as number;
  const vehicleState = playerVehicles.get(vehicleId);
  if (!vehicleState || !vehicleState.hasKey) {
    alt.emit('client:notification', 'error', 'У вас нет ключей');
    return;
  }

  const isLocked = currentVehicle.lockState === 2;
  currentVehicle.lockState = isLocked ? 1 : 2;
  
  // Sync lock state
  alt.emitServer('server:vehicle:syncLock', vehicleId, !isLocked);
  
  alt.emit('client:notification', 'info', !isLocked ? 'Машина открыта' : 'Машина закрыта');
}

// Give keys
export async function giveKeys(targetPlayerId: number, vehicleId: number) {
  const vehicleState = playerVehicles.get(vehicleId);
  if (!vehicleState || !vehicleState.hasKey) {
    alt.emit('client:notification', 'error', 'У вас нет ключей от этого транспорта');
    return;
  }

  try {
    const response = await fetch(`${API_BASE}/vehicles/keys/give`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        targetCharacterId: targetPlayerId,
        vehicleId
      })
    });

    if (response.ok) {
      alt.emit('client:notification', 'success', 'Ключи переданы');
    } else {
      const data = await response.json();
      alt.emit('client:notification', 'error', data.message);
    }
  } catch (error) {
    alt.log('[Vehicles] Give keys error:', error);
  }
}

// Impound vehicle
export async function impoundVehicle(vehicleId: number) {
  const vehicleState = playerVehicles.get(vehicleId);
  if (!vehicleState) return;

  try {
    const response = await fetch(`${API_BASE}/vehicles/impound`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vehicleId })
    });

    if (response.ok) {
      if (vehicleState.vehicle) {
        vehicleState.vehicle.destroy();
        vehicleState.vehicle = null;
        vehicleState.isSpawned = false;
      }
      alt.emit('client:notification', 'success', 'Транспорт отправлен на штрафстоянку');
    } else {
      const data = await response.json();
      alt.emit('client:notification', 'error', data.message);
    }
  } catch (error) {
    alt.log('[Vehicles] Impound error:', error);
  }
}

// Release from impound
export async function releaseFromImpound(vehicleId: number) {
  try {
    const response = await fetch(`${API_BASE}/vehicles/impound/release`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ vehicleId })
    });

    if (response.ok) {
      const data = await response.json();
      const player = alt.Player.local;
      await spawnVehicle(vehicleId, player.pos, player.rot.z);
      alt.emit('client:notification', 'success', 'Транспорт освобожден');
    } else {
      const data = await response.json();
      alt.emit('client:notification', 'error', data.message);
    }
  } catch (error) {
    alt.log('[Vehicles] Release error:', error);
  }
}

// Get vehicle info
export function getVehicleInfo(vehicleId: number): VehicleState | null {
  return playerVehicles.get(vehicleId) || null;
}

// Get all player vehicles
export function getPlayerVehicles(): VehicleState[] {
  return Array.from(playerVehicles.values());
}

// Setup vehicle events
function setupVehicleEvents() {
  alt.on('vehicleEnter', enterVehicle);
  alt.on('vehicleLeave', exitVehicle);
  
  // Key handlers
  alt.on('keydown', (key: number) => {
    if (key === 74) { // J key - toggle engine
      toggleEngine();
    }
    if (key === 76) { // L key - toggle lock
      toggleLock();
    }
  });
}

// Vehicle damage handler
alt.on('vehicleDamage', (vehicle: alt.Vehicle, health: number) => {
  const vehicleId = vehicle.getStreamSyncedMeta('vehicleId') as number;
  if (vehicleId) {
    // Save damage state periodically
    // Could be sent to server for persistence
  }
});

// Vehicle destroy handler
alt.on('vehicleDestroy', (vehicle: alt.Vehicle) => {
  const vehicleId = vehicle.getStreamSyncedMeta('vehicleId') as number;
  if (vehicleId) {
    const state = playerVehicles.get(vehicleId);
    if (state) {
      state.vehicle = null;
      state.isSpawned = false;
    }
  }
});

// Fuel system (simplified - would need more complex implementation)
export function updateFuel() {
  if (!currentVehicle || !currentVehicle.valid) return;

  const player = alt.Player.local;
  if (!player.vehicle || player.vehicle !== currentVehicle) return;

  const currentFuel = native.getVehicleFuelLevel(currentVehicle.scriptID);
  if (currentFuel > 0) {
    native.setVehicleFuelLevel(currentVehicle.scriptID, Math.max(0, currentFuel - 0.01));
    
    if (currentFuel < 5) {
      native.setVehicleEngineOn(currentVehicle.scriptID, false);
      alt.emit('client:notification', 'warning', 'Мало топлива');
    }
  }
}

// Update fuel every second
alt.setInterval(updateFuel, 1000);
