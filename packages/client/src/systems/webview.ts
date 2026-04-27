import * as alt from 'alt';

const API_BASE = 'http://localhost:3000';
let webView: alt.WebView | null = null;
let authToken: string | null = null;
let currentCharacterId: number | null = null;

// Initialize WebView
export function initWebView(token: string, charId: number) {
  authToken = token;
  currentCharacterId = charId;
  
  if (webView) {
    webView.destroy();
  }

  webView = new alt.WebView('http://resource/client/ui/index.html', false);
  webView.focus();
  webView.visible = false;
  
  setupWebViewEvents();
  
  alt.log('[WebView] Initialized');
}

// Show WebView
export function showWebView(screen: string) {
  if (!webView) return;
  
  webView.visible = true;
  webView.focus();
  webView.emit('client:showScreen', screen);
}

// Hide WebView
export function hideWebView() {
  if (!webView) return;
  
  webView.visible = false;
  webView.unfocus();
}

// Toggle WebView
export function toggleWebView() {
  if (!webView) return;
  
  if (webView.visible) {
    hideWebView();
  } else {
    showWebView('hud-screen');
  }
}

// Destroy WebView
export function destroyWebView() {
  if (webView) {
    webView.destroy();
    webView = null;
  }
}

// Setup WebView events
function setupWebViewEvents() {
  if (!webView) return;

  // Auth events
  webView.on('client:login', async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:loginSuccess', data.token);
      } else {
        webView.emit('server:loginError', data.message);
      }
    } catch (error) {
      webView.emit('server:loginError', 'Connection error');
    }
  });

  webView.on('client:register', async (email: string, password: string) => {
    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:registerSuccess', data.token);
      } else {
        webView.emit('server:registerError', data.message);
      }
    } catch (error) {
      webView.emit('server:registerError', 'Connection error');
    }
  });

  // Character events
  webView.on('client:getCharacters', async () => {
    try {
      const response = await fetch(`${API_BASE}/characters`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:characters', data.characters);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to load characters');
    }
  });

  webView.on('client:createCharacter', async (firstName: string, lastName: string, gender: string) => {
    try {
      const response = await fetch(`${API_BASE}/characters`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ firstName, lastName, gender })
      });
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:characterCreated');
        // Reload characters
        webView.emit('client:getCharacters');
      } else {
        webView.emit('server:error', data.message);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to create character');
    }
  });

  webView.on('client:selectCharacter', async (characterId: number) => {
    try {
      const response = await fetch(`${API_BASE}/characters/select`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ characterId })
      });
      
      if (response.ok) {
        currentCharacterId = characterId;
        webView.emit('server:characterSelected', characterId);
        alt.emit('client:selectCharacter', characterId);
      } else {
        const data = await response.json();
        webView.emit('server:error', data.message);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to select character');
    }
  });

  // Inventory events
  webView.on('client:getInventory', async () => {
    try {
      const response = await fetch(`${API_BASE}/inventory-full`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:inventory', data.inventory, data.currentWeight, data.maxWeight);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to load inventory');
    }
  });

  webView.on('client:useItem', async (itemCode: string, quantity: number) => {
    try {
      const response = await fetch(`${API_BASE}/inventory/use`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ itemCode, quantity })
      });
      
      if (response.ok) {
        webView.emit('server:itemUsed', itemCode);
        alt.emit('client:useItem', itemCode, quantity);
      } else {
        const data = await response.json();
        webView.emit('server:error', data.message);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to use item');
    }
  });

  // Vehicle events
  webView.on('client:getVehicles', async () => {
    try {
      const response = await fetch(`${API_BASE}/vehicles/me`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:vehicles', data.vehicles);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to load vehicles');
    }
  });

  webView.on('client:getVehicleCatalog', async () => {
    try {
      const response = await fetch(`${API_BASE}/vehicles/catalog`);
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:vehicleCatalog', data.vehicles);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to load catalog');
    }
  });

  webView.on('client:buyVehicle', async (modelCode: string) => {
    try {
      const response = await fetch(`${API_BASE}/vehicles/buy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ modelCode })
      });
      
      if (response.ok) {
        webView.emit('server:vehicleBought', modelCode);
        alt.emit('client:vehicleBought', modelCode);
      } else {
        const data = await response.json();
        webView.emit('server:error', data.message);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to buy vehicle');
    }
  });

  webView.on('client:spawnVehicle', async (vehicleId: number) => {
    const player = alt.Player.local;
    alt.emit('client:spawnVehicle', vehicleId, player.pos.x, player.pos.y, player.pos.z, player.rot.z);
  });

  webView.on('client:despawnVehicle', async (vehicleId: number) => {
    alt.emit('client:despawnVehicle', vehicleId);
  });

  webView.on('client:impoundVehicle', async (vehicleId: number) => {
    alt.emit('client:impoundVehicle', vehicleId);
  });

  // Tablet events
  webView.on('client:getTabletApps', async () => {
    try {
      const response = await fetch(`${API_BASE}/tablet/apps`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:tabletApps', data.apps);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to load tablet apps');
    }
  });

  webView.on('client:getTabletApp', async (appCode: string) => {
    try {
      const response = await fetch(`${API_BASE}/tablet/${appCode}`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:tabletAppData', appCode, data);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to load app data');
    }
  });

  // Marketplace events
  webView.on('client:getMarketplace', async () => {
    try {
      const response = await fetch(`${API_BASE}/marketplace`);
      const data = await response.json();
      
      if (response.ok) {
        webView.emit('server:marketplace', data.listings);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to load marketplace');
    }
  });

  webView.on('client:buyListing', async (listingId: number) => {
    try {
      const response = await fetch(`${API_BASE}/marketplace/buy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ listingId })
      });
      
      if (response.ok) {
        webView.emit('server:listingBought', listingId);
      } else {
        const data = await response.json();
        webView.emit('server:error', data.message);
      }
    } catch (error) {
      webView.emit('server:error', 'Failed to buy listing');
    }
  });

  // Close UI
  webView.on('client:closeUI', (screen: string) => {
    hideWebView();
    alt.emit('client:closeUI', screen);
  });

  // HUD updates from server
  alt.on('hud:updateMoney', (cash: number, bank: number) => {
    if (webView) {
      webView.emit('server:updateHUD', { moneyCash: cash, moneyBank: bank });
    }
  });

  alt.on('hud:updateHealth', (health: number, armor: number) => {
    if (webView) {
      webView.emit('server:updateHUD', { health, armor });
    }
  });

  alt.on('hud:updateJob', (job: string) => {
    if (webView) {
      webView.emit('server:updateHUD', { job });
    }
  });

  alt.on('hud:updateFaction', (faction: string) => {
    if (webView) {
      webView.emit('server:updateHUD', { faction });
    }
  });
}

// Notification function
export function showNotification(type: 'success' | 'error' | 'info' | 'warning', message: string) {
  if (webView) {
    webView.emit('server:notification', type, message);
  }
}

alt.on('client:notification', showNotification);

// Key handlers for UI
alt.on('keydown', (key: number) => {
  // F1 - Toggle main menu
  if (key === 118) {
    if (webView && webView.visible) {
      hideWebView();
    } else {
      showWebView('interaction-screen');
    }
  }
  
  // I - Inventory
  if (key === 73) {
    if (webView) {
      showWebView('inventory-screen');
    }
  }
  
  // F2 - Interaction menu
  if (key === 119) {
    if (webView) {
      showWebView('interaction-screen');
    }
  }
  
  // P - Phone
  if (key === 80) {
    // Phone UI
  }
  
  // T - Tablet
  if (key === 84) {
    if (webView) {
      showWebView('tablet-screen');
    }
  }
  
  // ESC - Close UI
  if (key === 27) {
    if (webView && webView.visible) {
      hideWebView();
    }
  }
});
