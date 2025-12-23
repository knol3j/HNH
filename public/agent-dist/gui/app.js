const API_URL = ''; // Relative path
const SECRET = 'HNH_LOCAL_AGENT_SECRET';

// Elements
const els = {
    status: document.getElementById('status-badge'),
    hashrate: document.getElementById('hashrate'),
    temp: document.getElementById('temp'),
    power: document.getElementById('power'),
    shares: document.getElementById('shares'),
    logs: document.getElementById('terminal'),
    coin: document.getElementById('coin-select'),
    pool: document.getElementById('pool-select'),
    wallet: document.getElementById('wallet-input'),
    saveStatus: document.getElementById('save-status'),
    walletSelect: document.getElementById('wallet-select'),
    walletInput: document.getElementById('wallet-input'),
    cancelEdit: document.getElementById('cancel-edit-btn'),
    startBtn: document.getElementById('start-btn'),
    stopBtn: document.getElementById('stop-btn')
};

// State
let meta = null;
let lastLogTime = 0;

// Init
async function init() {
    // Fetch Meta
    const res = await fetch(`${API_URL}/meta`);
    meta = await res.json();

    // Populate UI
    populateDropdown(els.coin, meta.coins, meta.currentCoin);
    populateDropdown(els.pool, Object.values(meta.pools), meta.pools[meta.currentCoin]);

    // Wallet UI Init
    renderWalletUI(meta.currentCoin);

    // Listeners
    els.coin.addEventListener('change', handleCoinChange);

    // Wallet Dropdown Change
    els.walletSelect.addEventListener('change', (e) => {
        if (e.target.value === 'NEW') {
            toggleWalletEdit(true);
        }
    });

    // Wallet Input Save
    els.walletInput.addEventListener('input', debounce(handleWalletInput, 1000));

    // Cancel Edit
    els.cancelEdit.addEventListener('click', () => {
        toggleWalletEdit(false);
    });

    // Start/Stop
    els.startBtn.addEventListener('click', () => sendAction('switch-coin', { coin: els.coin.value }));
    els.stopBtn.addEventListener('click', () => alert('Please close the window to stop the miner.'));

    // Start Polling
    setInterval(pollTelemetry, 1000);
}

function populateDropdown(el, items, selected) {
    el.innerHTML = '';
    items.forEach(item => {
        const opt = document.createElement('option');
        opt.value = item;
        opt.textContent = item;
        if (item === selected) opt.selected = true;
        el.appendChild(opt);
    });
}

function renderWalletUI(coin) {
    const savedWallet = meta.config.wallets[coin];
    els.walletSelect.innerHTML = '';

    if (savedWallet) {
        // Option 1: Saved Wallet
        const opt = document.createElement('option');
        opt.value = savedWallet;
        opt.textContent = `Saved: ${savedWallet.substring(0, 10)}...${savedWallet.substring(savedWallet.length - 4)}`;
        opt.selected = true;
        els.walletSelect.appendChild(opt);

        // Option 2: New
        const optNew = document.createElement('option');
        optNew.value = 'NEW';
        optNew.textContent = 'Enter New Address...';
        els.walletSelect.appendChild(optNew);

        toggleWalletEdit(false);
    } else {
        // No saved wallet, force edit mode
        const opt = document.createElement('option');
        opt.textContent = 'No Wallet Saved';
        els.walletSelect.appendChild(opt);
        toggleWalletEdit(true);
    }
}

function toggleWalletEdit(showInput) {
    if (showInput) {
        els.walletSelect.classList.add('hidden');
        els.walletInput.classList.remove('hidden');
        els.cancelEdit.classList.remove('hidden');
        els.walletInput.focus();

        // Pre-fill input if there was a saved wallet, else empty
        const saved = meta.config.wallets[els.coin.value];
        if (!els.walletInput.value && saved) els.walletInput.value = saved;

    } else {
        els.walletSelect.classList.remove('hidden');
        els.walletInput.classList.add('hidden');
        els.cancelEdit.classList.add('hidden');
    }
}

async function pollTelemetry() {
    try {
        const res = await fetch(`${API_URL}/telemetry`);
        const data = await res.json();

        // Update Stats
        els.status.textContent = data.status;
        els.status.className = `badge ${data.status}`;
        els.hashrate.textContent = `${data.hashrate.toFixed(2)} MH/s`;
        els.temp.textContent = `${Math.round(data.gpu_temp)}°C`;
        els.power.textContent = `${Math.round(data.power_draw)} W`;
        els.shares.textContent = data.gross_shares;

        // Update Logs
        updateLogs(data.logs);
    } catch (e) {
        els.status.textContent = 'DISCONNECTED';
        els.status.className = 'badge OFFLINE';
    }
}

function updateLogs(logs) {
    // Simple clear & redraw for MVP (optimize later)
    els.logs.innerHTML = '';
    logs.forEach(log => {
        const div = document.createElement('div');
        div.className = 'log-line';
        div.textContent = log;
        els.logs.appendChild(div);
    });
    els.logs.scrollTop = els.logs.scrollHeight;
}

async function handleCoinChange() {
    const newCoin = els.coin.value;

    // 1. Tell backend to switch
    await sendAction('switch-coin', { coin: newCoin });

    // 2. Refresh Meta immediately to get the wallet for this coin
    const res = await fetch(`${API_URL}/meta`);
    meta = await res.json();

    // 3. Update Wallet UI
    renderWalletUI(newCoin);
}

async function handleWalletInput() {
    const newWallet = els.walletInput.value;

    // Only save if changed
    if (newWallet !== meta.wallet) {
        await sendAction('config', { wallet: newWallet });
        // Update local meta so we don't save again unnecessarily
        meta.wallet = newWallet;
        meta.config.wallets[els.coin.value] = newWallet; // Update local cache
        showSave();
    }
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
