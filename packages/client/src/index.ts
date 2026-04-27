/* global alt */
import * as alt from 'alt';
import { initVehicleSystem, spawnVehicle, despawnVehicle, toggleEngine, toggleLock } from './systems/vehicles.js';
import { initWebView, showWebView, hideWebView, showNotification } from './systems/webview.js';

declare const alt: any;

let authToken: string | null = null;
let currentCharacterId: number | null = null;

alt.log("[client] GTA RP client started");

// Server events
alt.onServer('client:auth', (token: string, charId: number) => {
  authToken = token;
  currentCharacterId = charId;
  
  // Initialize systems
  initVehicleSystem(token, charId);
  initWebView(token, charId);
  
  alt.log(`[client] Authenticated as character ${charId}`);
  showWebView('hud-screen');
});

alt.onServer('client:selectCharacter', (charId: number) => {
  currentCharacterId = charId;
  alt.log(`[client] Selected character ${charId}`);
});

alt.onServer('client:vehicleBought', (modelCode: string) => {
  showNotification('success', `Вы купили ${modelCode}`);
});

alt.onServer('client:spawnVehicle', async (vehicleId: number, x: number, y: number, z: number, heading: number) => {
  const position = new alt.Vector3(x, y, z);
  await spawnVehicle(vehicleId, position, heading);
});

alt.onServer('client:despawnVehicle', async (vehicleId: number) => {
  await despawnVehicle(vehicleId);
});

alt.onServer('client:impoundVehicle', async (vehicleId: number) => {
  const { impoundVehicle } = await import('./systems/vehicles.js');
  await impoundVehicle(vehicleId);
});

alt.onServer('client:useItem', (itemCode: string, quantity: number) => {
  showNotification('info', `Использован ${itemCode} x${quantity}`);
});

alt.onServer('client:closeUI', (screen: string) => {
  hideWebView();
});

// Vehicle control events
alt.onServer('client:vehicle:lockSync', (vehicleId: number, locked: boolean) => {
  // Handle lock sync from server
});

// HUD updates from server
alt.onServer('hud:updateMoney', (cash: number, bank: number) => {
  alt.log(`[client] money updated: cash=${cash} bank=${bank}`);
});

alt.onServer('hud:updateHealth', (health: number, armor: number) => {
  alt.log(`[client] health updated: health=${health} armor=${armor}`);
});

alt.onServer('hud:updateJob', (job: string) => {
  alt.log(`[client] job updated: ${job}`);
});

alt.onServer('hud:updateFaction', (faction: string) => {
  alt.log(`[client] faction updated: ${faction}`);
});

// Error handling
alt.onServer('rp:error', (message: string) => {
  alt.log(`[client] error: ${message}`);
  showNotification('error', message);
});

// Legacy compatibility events
alt.onServer('rp:inventory:data', (items: Array<{ itemCode: string; quantity: number }>) => {
  alt.log(`[client] inventory: ${JSON.stringify(items)}`);
});

alt.onServer('rp:jobs:data', (jobs: Array<{ jobCode: string; level: number; xp: number }>) => {
  alt.log(`[client] jobs: ${JSON.stringify(jobs)}`);
});

alt.onServer('rp:vehicles:data', (vehicles: Array<{ id: number; modelCode: string; plate: string }>) => {
  alt.log(`[client] vehicles: ${JSON.stringify(vehicles)}`);
});

alt.onServer('rp:vehicles:bought', (modelCode: string) => {
  showNotification('success', `Вы купили ${modelCode}`);
});

alt.onServer('rp:vehicles:spawned', (vehicleId: number) => {
  showNotification('success', 'Машина заспавнена');
});

alt.onServer('rp:vehicles:despawned', (vehicleId: number) => {
  showNotification('success', 'Машина убрана');
});

alt.onServer('rp:vehicles:keys:given', (vehicleId: number) => {
  showNotification('success', 'Ключи переданы');
});

alt.onServer('rp:vehicles:impounded', (vehicleId: number) => {
  showNotification('warning', 'Машина на штрафстоянке');
});

alt.onServer('rp:vehicles:released', (vehicleId: number) => {
  showNotification('success', 'Машина освобождена');
});

alt.onServer('rp:vehicles:insured', (vehicleId: number) => {
  showNotification('success', 'Страховка куплена');
});

alt.onServer('rp:vehicles:upgraded', (vehicleId: number, upgradeType: string) => {
  showNotification('success', `Апгрейд ${upgradeType} установлен`);
});

alt.onServer('rp:jobs:started', (jobCode: string) => {
  showNotification('success', `Работа ${jobCode} начата`);
});

alt.onServer('rp:jobs:completed', (payout: number, xpGain: number) => {
  showNotification('success', `Работа завершена: $${payout}, +${xpGain} XP`);
});

alt.onServer('rp:inventory:used', (itemCode: string, quantity: number) => {
  showNotification('info', `Использован ${itemCode}`);
});

alt.onServer('rp:character', (character: any) => {
  currentCharacterId = character.id;
  alt.log(`[client] character loaded: ${character.firstName} ${character.lastName}`);
});

// Key handlers for direct vehicle control
alt.on('keydown', (key: number) => {
  if (!currentCharacterId) return;
  
  // J - Toggle engine
  if (key === 74) {
    toggleEngine();
  }
  
  // L - Toggle lock
  if (key === 76) {
    toggleLock();
  }
});

// Cleanup on disconnect
alt.on('disconnect', () => {
  alt.log('[client] Disconnected, cleaning up');
  hideWebView();
});
