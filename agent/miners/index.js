/**
 * Miner Module Index
 * Exports all available miners and the MinerManager
 */

export { BaseMiner } from './BaseMiner.js';
export { XmrMiner } from './XmrMiner.js';
export { RvnMiner } from './RvnMiner.js';
export { EtcMiner } from './EtcMiner.js';
export { ErgMiner } from './ErgMiner.js';
export { KasMiner } from './KasMiner.js';

/**
 * Coin configuration with miner mappings
 */
export const COIN_CONFIG = {
    XMR: {
        name: 'Monero',
        algorithm: 'RandomX',
        type: 'cpu',
        miner: 'XMRig',
        binary: 'xmrig',
        scriptWin: 'start_xmr_cpu.bat',
        scriptLinux: 'start_xmr_cpu.sh',
        defaultPool: 'stratum+ssl://pool.supportxmr.com:443',
        description: 'CPU-only mining with XMRig'
    },
    RVN: {
        name: 'Ravencoin',
        algorithm: 'KawPow',
        type: 'gpu',
        miner: 'T-Rex',
        binary: 't-rex',
        scriptWin: 'start_rvn_gpu.bat',
        scriptLinux: 'start_rvn_gpu.sh',
        defaultPool: 'stratum+tcp://stratum.ravenminer.com:3838',
        description: 'GPU mining with T-Rex (NVIDIA optimized)'
    },
    ETC: {
        name: 'Ethereum Classic',
        algorithm: 'Etchash',
        type: 'gpu',
        miner: 'T-Rex',
        binary: 't-rex',
        scriptWin: 'start_etc_gpu.bat',
        scriptLinux: 'start_etc_gpu.sh',
        defaultPool: 'stratum+tcp://etc.2miners.com:1010',
        description: 'GPU mining with T-Rex (NVIDIA optimized)'
    },
    ERG: {
        name: 'Ergo',
        algorithm: 'Autolykos2',
        type: 'gpu',
        miner: 'lolMiner',
        binary: 'lolMiner',
        scriptWin: 'start_erg_gpu.bat',
        scriptLinux: 'start_erg_gpu.sh',
        defaultPool: 'stratum+tcp://de.ergo.herominers.com:11800',
        description: 'GPU mining with lolMiner (AMD/NVIDIA)'
    },
    KAS: {
        name: 'Kaspa',
        algorithm: 'kHeavyHash',
        type: 'gpu',
        miner: 'lolMiner',
        binary: 'lolMiner',
        scriptWin: 'start_kas_gpu.bat',
        scriptLinux: 'start_kas_gpu.sh',
        defaultPool: 'stratum+tcp://kas.2miners.com:2020',
        description: 'GPU mining with lolMiner (AMD/NVIDIA)'
    }
};

/**
 * Get miner class for a given coin
 */
export async function getMinerClass(coin) {
    switch (coin.toUpperCase()) {
        case 'XMR': return (await import('./XmrMiner.js')).XmrMiner;
        case 'RVN': return (await import('./RvnMiner.js')).RvnMiner;
        case 'ETC': return (await import('./EtcMiner.js')).EtcMiner;
        case 'ERG': return (await import('./ErgMiner.js')).ErgMiner;
        case 'KAS': return (await import('./KasMiner.js')).KasMiner;
        default: throw new Error(`Unknown coin: ${coin}`);
    }
}
