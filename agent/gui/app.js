const API_URL = ''; // Relative path
const PLATFORM_API_URL = 'http://localhost:8080'; // In prod, this would be https://api.hashnhedge.com
const SECRET = 'HNH_LOCAL_AGENT_SECRET';

// Elements
const els = {
    status: document.getElementById('status-badge'),
    hashrate: document.getElementById('hashrate'),
    temp: document.getElementById('temp'),
    power: document.getElementById('power'),
    shares: document.getElementById('shares'),
    logs: document.getElementById('terminal'),

    coinSelect: document.getElementById('coin-select'),
    coinInput: document.getElementById('coin-input'),

    poolSelect: document.getElementById('pool-select'),
    poolInput: document.getElementById('pool-input'),

    walletSelect: document.getElementById('wallet-select'),
    walletInput: document.getElementById('wallet-input'),
    cancelEdit: document.getElementById('cancel-edit-btn'),
    saveStatus: document.getElementById('save-status'),

    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn'),

    loginBtn: document.getElementById('login-btn'),
    logoutBtn: document.getElementById('logout-btn'),
    userInfo: document.getElementById('user-info'),
    usernameDisplay: document.getElementById('username-display')
};

// State
let meta = null;
let authToken = localStorage.getItem('hnh_auth_token');
let currentUser = null;

// Init
async function init() {
    // Check Auth
    if (authToken) {
        await verifyToken();
    }
    updateAuthUI();

    // Fetch Meta
    const res = await fetch(`${API_URL}/meta`);
    meta = await res.json();

    // Populate UI
    populateDropdown(els.coinSelect, meta.coins, meta.currentCoin);
    populateDropdown(els.poolSelect, Object.values(meta.pools), meta.pools[meta.currentCoin]);

    // Handle Custom Default State? 
    // If currentCoin is not in list, set to CUSTOM
    if (!meta.coins.includes(meta.currentCoin)) {
        els.coinSelect.value = 'CUSTOM';
        toggleInput(els.coinSelect, els.coinInput, true);
        els.coinInput.value = meta.currentCoin;
    }

    // Wallet UI Init
    await renderWalletUI(meta.currentCoin);

    // Listeners
    setupListeners();

    // Start Polling
    setInterval(pollTelemetry, 1000);
}

function setupListeners() {
    // Coin Change
    els.coinSelect.addEventListener('change', async (e) => {
        const val = e.target.value;
        if (val === 'CUSTOM') {
            toggleInput(els.coinSelect, els.coinInput, true);
            els.coinInput.focus();
        } else {
            toggleInput(els.coinSelect, els.coinInput, false);
            // Switch Coin Logic
            await handleCoinChange(val);
        }
    });

    // Custom Coin Input
    els.coinInput.addEventListener('change', async (e) => {
        const val = e.target.value.toUpperCase();
        if (val) await handleCoinChange(val);
    });

    // Pool Change
    els.poolSelect.addEventListener('change', async (e) => {
        const val = e.target.value;
        if (val === 'CUSTOM') {
            toggleInput(els.poolSelect, els.poolInput, true);
            els.poolInput.focus();
        } else {
            toggleInput(els.poolSelect, els.poolInput, false);
            // We don't auto-save pool config yet in this MVP, but we could
        }
    });

    // Wallet Dropdown Change
    els.walletSelect.addEventListener('change', async (e) => {
        const val = e.target.value;
        if (val === 'NEW') {
            toggleWalletEdit(true);
        } else {
            await saveWalletConfig(val);
        }
    });

    // Wallet Input Save
    els.walletInput.addEventListener('input', debounce(async () => {
        const val = els.walletInput.value;
        if (val) await saveWalletConfig(val);
    }, 1000));

    // Cancel Edit
    els.cancelEdit.addEventListener('click', () => {
        toggleWalletEdit(false);
    });

    // Start/Stop
    els.startBtn.addEventListener('click', () => sendAction('start-miner', {}));
    els.stopBtn.addEventListener('click', () => sendAction('stop-miner', {}));

    // Auth
    els.loginBtn.addEventListener('click', handleLogin);
    els.logoutBtn.addEventListener('click', handleLogout);
}

function populateDropdown(el, items, selected) {
    el.innerHTML = '';

    // Standard Items
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        if (item === selected) opt.selected = true;
        el.appendChild(opt);
    });

    // Custom Option
    const optCustom = document.createElement('option');
    optCustom.value = 'CUSTOM';
    optCustom.textContent = 'Custom...';
    el.appendChild(optCustom);
}

function toggleInput(selectEl, inputEl, showInput) {
    if (showInput) {
        inputEl.classList.remove('hidden');
    } else {
        inputEl.classList.add('hidden');
    }
}

async function renderWalletUI(coin) {
    const savedWallet = meta.config.wallets[coin];
    let history = meta.walletHistory ? meta.walletHistory[coin] : [];

    // If logged in, fetch cloud wallets too
    if (authToken && currentUser) {
        try {
            const cloudWallets = await fetchCloudWallets();
            // Filter for current coin
            const cloudForCoin = cloudWallets.filter(w => w.coin === coin).map(w => w.address);
            // Merge
            history = [...new Set([...history, ...cloudForCoin])];
        } catch (e) {
            console.error("Failed to fetch cloud wallets", e);
        }
    }

    els.walletSelect.innerHTML = '';

    // 1. Add History Items
    if (history && history.length > 0) {
        history.forEach(addr => {
            const opt = document.createElement('option');
            opt.value = addr;
            opt.textContent = `${addr.substring(0, 8)}...${addr.substring(addr.length - 4)}`;
            if (addr === savedWallet) opt.selected = true;
            els.walletSelect.appendChild(opt);
        });
    }

    // 2. Add current saved wallet if not in history
    if (savedWallet && (!history || !history.includes(savedWallet))) {
        const opt = document.createElement('option');
        opt.value = savedWallet;
        opt.textContent = `Saved: ${savedWallet.substring(0, 8)}...${savedWallet.substring(savedWallet.length - 4)}`;
        opt.selected = true;
        els.walletSelect.appendChild(opt);
    }

    // 3. Option New
    const optNew = document.createElement('option');
    optNew.value = 'NEW';
    optNew.textContent = '+ Add New Address';
    els.walletSelect.appendChild(optNew);

    // If no wallets at all, force edit
    if (!savedWallet && (!history || history.length === 0)) {
        toggleWalletEdit(true);
    } else {
        toggleWalletEdit(false);
    }
}

function toggleWalletEdit(showInput) {
    if (showInput) {
        els.walletSelect.classList.add('hidden');
        els.walletInput.classList.remove('hidden');
        els.cancelEdit.classList.remove('hidden');
        els.walletInput.focus();
        const saved = meta.config.wallets[els.coinSelect.value];
        if (!els.walletInput.value && saved) els.walletInput.value = saved;
    } else {
        els.walletSelect.classList.remove('hidden');
        els.walletInput.classList.add('hidden');
        els.cancelEdit.classList.add('hidden');
    }
}

async function handleCoinChange(newCoin) {
    // 1. Tell backend to switch (assuming backend handles custom coins by just taking the string)
    await sendAction('switch-coin', { coin: newCoin });

    // 2. Update local state
    const res = await fetch(`${API_URL}/meta`);
    meta = await res.json();

    // 3. Update Pool UI
    const poolUrl = meta.pools[newCoin];
    if (poolUrl) {
        populateDropdown(els.poolSelect, Object.values(meta.pools), poolUrl);
        toggleInput(els.poolSelect, els.poolInput, false);
    } else {
        // Unknown coin, maybe custom? Set pool to custom
        els.poolSelect.value = 'CUSTOM';
        toggleInput(els.poolSelect, els.poolInput, true);
    }

    // 4. Update Wallet UI
    await renderWalletUI(newCoin);
}

async function saveWalletConfig(wallet) {
    if (wallet !== meta.wallet) {
        // Local Save
        await sendAction('config', { wallet });
        meta.wallet = wallet;
        meta.config.wallets[els.coinSelect.value] = wallet;

        // Cloud Save
        if (authToken) {
            await saveCloudWallet(els.coinSelect.value, wallet);
            els.saveStatus.textContent = "Saved to Cloud";
        } else {
            els.saveStatus.textContent = "Saved Locally";
        }

        showSave();
    }
}

async function fetchCloudWallets() {
    const res = await fetch(`${PLATFORM_API_URL}/user/wallets`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
    });
    if (res.ok) return await res.json();
    return [];
}

async function saveCloudWallet(coin, address) {
    await fetch(`${PLATFORM_API_URL}/user/wallets`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({ coin, address, label: 'Agent Wallet' })
    });
}


// --- AUTH ---
async function handleLogin() {
    // MVP: Prompt for token OR username/password.
    // Ideally we'd open a window or have inputs. 
    // Let's ask for username/password via prompt for simplicity in this Electron view.
    const username = prompt("Enter Username:");
    if (!username) return;
    const password = prompt("Enter Password:");
    if (!password) return;

    try {
        const res = await fetch(`${PLATFORM_API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (data.token) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('hnh_auth_token', authToken);
            updateAuthUI();
            // Refresh wallets
            renderWalletUI(meta.currentCoin);
        } else {
            alert("Login Failed: " + data.error);
        }
    } catch (e) {
        alert("Login Error: " + e.message);
    }
}

function handleLogout() {
    authToken = null;
    currentUser = null;
    localStorage.removeItem('hnh_auth_token');
    updateAuthUI();
    renderWalletUI(meta.currentCoin);
}

async function verifyToken() {
    try {
        const res = await fetch(`${PLATFORM_API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        if (res.ok) {
            currentUser = await res.json();
        } else {
            handleLogout();
        }
    } catch (e) {
        handleLogout();
    }
}

function updateAuthUI() {
    if (authToken && currentUser) {
        els.loginBtn.classList.add('hidden');
        els.userInfo.classList.remove('hidden');
        els.usernameDisplay.textContent = currentUser.username;
    } else {
        els.loginBtn.classList.remove('hidden');
        els.userInfo.classList.add('hidden');
    }
}


// --- GENERIC ---
async function pollTelemetry() {
    try {
        const res = await fetch(`${API_URL}/telemetry`);
        const data = await res.json();
        els.status.textContent = data.status;
        els.status.className = `badge ${data.status}`;
        els.hashrate.textContent = `${data.hashrate.toFixed(2)} MH/s`;
        els.temp.textContent = `${Math.round(data.gpu_temp)}°C`;
        els.power.textContent = `${Math.round(data.power_draw)} W`;
        els.shares.textContent = data.gross_shares;
        updateLogs(data.logs);
    } catch (e) {
        els.status.textContent = 'DISCONNECTED';
        els.status.className = 'badge OFFLINE';
    }
}

function updateLogs(logs) {
    els.logs.innerHTML = '';
    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-line';
        div.textContent = log;
        els.logs.appendChild(div);
    });
    els.logs.scrollTop = els.logs.scrollHeight;
}

async function sendAction(endpoint, body) {
    await fetch(`${API_URL}/${endpoint}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SECRET}`
        },
        body: JSON.stringify(body)
    });
}

function showSave() {
    els.saveStatus.classList.add('visible');
    setTimeout(() => els.saveStatus.classList.remove('visible'), 2000);
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

init();
