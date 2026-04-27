// API base URL
const API_BASE = 'http://localhost:3000';
let authToken = null;
let currentCharacter = null;

// Screen management
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.add('hidden');
    });
    document.getElementById(screenId).classList.remove('hidden');
}

// Auth handlers
document.getElementById('to-register').addEventListener('click', () => {
    document.getElementById('login-form').classList.add('hidden');
    document.getElementById('register-form').classList.remove('hidden');
    document.getElementById('to-register').classList.add('hidden');
    document.getElementById('to-login').classList.remove('hidden');
});

document.getElementById('to-login').addEventListener('click', () => {
    document.getElementById('register-form').classList.add('hidden');
    document.getElementById('login-form').classList.remove('hidden');
    document.getElementById('to-login').classList.add('hidden');
    document.getElementById('to-register').classList.remove('hidden');
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            loadCharacters();
        } else {
            alert(data.message || 'Ошибка входа');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка соединения');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();
        
        if (response.ok) {
            authToken = data.token;
            showScreen('character-creation-screen');
        } else {
            alert(data.message || 'Ошибка регистрации');
        }
    } catch (error) {
        console.error('Register error:', error);
        alert('Ошибка соединения');
    }
});

// Character loading
async function loadCharacters() {
    try {
        const response = await fetch(`${API_BASE}/characters`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (response.ok && data.characters.length > 0) {
            showScreen('character-screen');
            renderCharacters(data.characters);
        } else {
            showScreen('character-creation-screen');
        }
    } catch (error) {
        console.error('Load characters error:', error);
    }
}

function renderCharacters(characters) {
    const list = document.getElementById('character-list');
    list.innerHTML = '';
    
    characters.forEach(char => {
        const card = document.createElement('div');
        card.className = 'character-card';
        card.innerHTML = `
            <h3>${char.firstName} ${char.lastName}</h3>
            <p>Уровень: ${char.level}</p>
            <p>Деньги: $${char.money}</p>
        `;
        card.addEventListener('click', () => selectCharacter(char.id));
        list.appendChild(card);
    });
}

async function selectCharacter(characterId) {
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
            currentCharacter = { id: characterId };
            showScreen('hud-screen');
            // Notify alt:V server
            if (typeof mp !== 'undefined') {
                mp.trigger('client:selectCharacter', characterId);
            }
        }
    } catch (error) {
        console.error('Select character error:', error);
    }
}

// Character creation
document.getElementById('create-character-btn').addEventListener('click', () => {
    showScreen('character-creation-screen');
});

document.getElementById('cancel-creation').addEventListener('click', () => {
    showScreen('character-screen');
});

document.getElementById('character-creation-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const firstName = document.getElementById('char-first-name').value;
    const lastName = document.getElementById('char-last-name').value;
    const gender = document.getElementById('char-gender').value;

    try {
        const response = await fetch(`${API_BASE}/characters`, {
            method: 'POST',
            headers: { 
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ firstName, lastName, gender })
        });
        
        if (response.ok) {
            loadCharacters();
        } else {
            const data = await response.json();
            alert(data.message || 'Ошибка создания персонажа');
        }
    } catch (error) {
        console.error('Create character error:', error);
        alert('Ошибка соединения');
    }
});

// HUD updates
function updateHUD(data) {
    if (data.moneyCash) document.getElementById('hud-cash').textContent = data.moneyCash;
    if (data.moneyBank) document.getElementById('hud-bank').textContent = data.moneyBank;
    if (data.health) document.getElementById('health-fill').style.width = `${data.health}%`;
    if (data.armor) document.getElementById('armor-fill').style.width = `${data.armor}%`;
    if (data.job) document.getElementById('hud-job').textContent = data.job;
    if (data.faction) document.getElementById('hud-faction').textContent = data.faction;
}

// Close buttons
document.querySelectorAll('.close-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const screenId = btn.dataset.screen;
        document.getElementById(`${screenId}-screen`).classList.add('hidden');
        if (typeof mp !== 'undefined') {
            mp.trigger('client:closeUI', screenId);
        }
    });
});

// Interaction menu
document.querySelectorAll('.interaction-option').forEach(option => {
    option.addEventListener('click', () => {
        const action = option.dataset.action;
        document.getElementById('interaction-screen').classList.add('hidden');
        
        if (action === 'inventory') {
            loadInventory();
            showScreen('inventory-screen');
        } else if (action === 'tablet') {
            loadTablet();
            showScreen('tablet-screen');
        } else if (action === 'phone') {
            // Open phone
        } else if (action === 'animations') {
            // Open animations
        }
        
        if (typeof mp !== 'undefined') {
            mp.trigger('client:interaction', action);
        }
    });
});

// Inventory
async function loadInventory() {
    try {
        const response = await fetch(`${API_BASE}/inventory-full`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (response.ok) {
            renderInventory(data.inventory || []);
            document.getElementById('inv-weight').textContent = data.currentWeight || 0;
            document.getElementById('inv-max-weight').textContent = data.maxWeight || 50;
            document.getElementById('inv-slots').textContent = data.usedSlots || 0;
            document.getElementById('inv-max-slots').textContent = data.maxSlots || 30;
        }
    } catch (error) {
        console.error('Load inventory error:', error);
    }
}

function renderInventory(items) {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = '';
    
    // Render slots
    for (let i = 0; i < 30; i++) {
        const slot = document.createElement('div');
        slot.className = 'inventory-slot';
        
        if (items[i]) {
            slot.innerHTML = `
                <span class="inventory-slot-icon">📦</span>
                <span class="inventory-slot-quantity">${items[i].quantity}</span>
            `;
            slot.addEventListener('click', () => selectItem(items[i], slot));
        }
        
        grid.appendChild(slot);
    }
}

function selectItem(item, element) {
    document.querySelectorAll('.inventory-slot').forEach(s => s.classList.remove('selected'));
    element.classList.add('selected');
    
    document.getElementById('item-name').textContent = item.itemCode;
    document.getElementById('item-description').textContent = 'Описание предмета';
    document.getElementById('item-quantity').textContent = `Количество: ${item.quantity}`;
}

document.getElementById('use-item').addEventListener('click', async () => {
    // Use item logic
});

document.getElementById('drop-item').addEventListener('click', async () => {
    // Drop item logic
});

// Tablet
async function loadTablet() {
    try {
        const response = await fetch(`${API_BASE}/tablet/apps`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (response.ok) {
            renderTabletApps(data.apps || []);
        }
    } catch (error) {
        console.error('Load tablet error:', error);
    }
}

function renderTabletApps(apps) {
    const appsContainer = document.getElementById('tablet-apps');
    appsContainer.innerHTML = '';
    
    apps.forEach(app => {
        const appEl = document.createElement('div');
        appEl.className = 'tablet-app';
        appEl.innerHTML = `
            <div class="tablet-app-icon">📱</div>
            <div class="tablet-app-name">${app.name}</div>
        `;
        appEl.addEventListener('click', () => openTabletApp(app));
        appsContainer.appendChild(appEl);
    });
}

async function openTabletApp(app) {
    try {
        const response = await fetch(`${API_BASE}/tablet/${app.code}`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        
        if (response.ok) {
            const content = document.getElementById('tablet-content');
            content.innerHTML = `<h3>${app.name}</h3><pre>${JSON.stringify(data, null, 2)}</pre>`;
        }
    } catch (error) {
        console.error('Open tablet app error:', error);
    }
}

// alt:V event listeners
if (typeof mp !== 'undefined') {
    mp.events.add('client:showAuth', () => {
        showScreen('auth-screen');
    });
    
    mp.events.add('client:showCharacterSelection', () => {
        loadCharacters();
    });
    
    mp.events.add('client:showHUD', () => {
        showScreen('hud-screen');
    });
    
    mp.events.add('client:showInventory', () => {
        loadInventory();
        showScreen('inventory-screen');
    });
    
    mp.events.add('client:showInteraction', () => {
        showScreen('interaction-screen');
    });
    
    mp.events.add('client:showTablet', () => {
        loadTablet();
        showScreen('tablet-screen');
    });
    
    mp.events.add('client:updateHUD', (data) => {
        updateHUD(data);
    });
    
    mp.events.add('client:closeAllUI', () => {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.add('hidden');
        });
    });
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.screen').forEach(screen => {
            if (!screen.classList.contains('hidden') && screen.id !== 'hud-screen') {
                screen.classList.add('hidden');
            }
        });
    }
    
    if (e.key === 'i' || e.key === 'I') {
        if (currentCharacter) {
            loadInventory();
            showScreen('inventory-screen');
        }
    }
    
    if (e.key === 'f2' || e.key === 'F2') {
        if (currentCharacter) {
            showScreen('interaction-screen');
        }
    }
});

// Initialize
showScreen('auth-screen');
