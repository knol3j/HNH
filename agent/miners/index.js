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
        defaultPool: 'stratum+ssl://pool.supportxmr.com:443'
    },
    RVN: {
        name: 'Ravencoin',
        algorithm: 'KawPow',
        type: 'gpu',
        miner: 'T-Rex',
        binary: 't-rex',
        defaultPool: 'stratum+tcp://stratum.ravenminer.com:3838'
    },
    ETC: {
        name: 'Ethereum Classic',
        algorithm: 'Etchash',
        type: 'gpu',
        miner: 'T-Rex',
        binary: 't-rex',
        defaultPool: 'stratum+tcp://etc.2miners.com:1010'
    },
    ERG: {
        name: 'Ergo',
        algorithm: 'Autolykos2',
        type: 'gpu',
        miner: 'lolMiner',
        binary: 'lolMiner',
        defaultPool: 'stratum+tcp://de.ergo.herominers.com:11800'
    },
    KAS: {
        name: 'Kaspa',
        algorithm: 'kHeavyHash',
        type: 'gpu',
        miner: 'lolMiner',
        binary: 'lolMiner',
        defaultPool: 'stratum+tcp://kas.2miners.com:2020'
    }
};

/**
 * Get miner class for a given coin
 */
export function getMinerClass(coin) {
    switch (coin.toUpperCase()) {
        case 'XMR': return (await import('./XmrMiner.js')).XmrMiner;
        case 'RVN': return (await import('./RvnMiner.js')).RvnMiner;
        case 'ETC': return (await import('./EtcMiner.js')).EtcMiner;
        case 'ERG': return (await import('./ErgMiner.js')).ErgMiner;
        case 'KAS': return (await import('./KasMiner.js')).KasMiner;
        default: throw new Error(`Unknown coin: ${coin}`);
    }
}
