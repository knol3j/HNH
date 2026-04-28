import { describe, it, expect, jest } from '@jest/globals';

import { COIN_CONFIG } from '../miners/index.js';
import { XmrMiner } from '../miners/XmrMiner.js';
import { RvnMiner } from '../miners/RvnMiner.js';
import { EtcMiner } from '../miners/EtcMiner.js';
import { ErgMiner } from '../miners/ErgMiner.js';
import { KasMiner } from '../miners/KasMiner.js';

describe('Miner Wrappers', () => {
  it('uses the reachable default pools for XMR and ERG', () => {
    expect(COIN_CONFIG.XMR.defaultPool).toBe('stratum+tcp://gulf.moneroocean.stream:10128');
    expect(COIN_CONFIG.ERG.defaultPool).toBe('stratum+tcp://erg.2miners.com:8888');
  });

  it('builds XMRig args with local API and optional TLS', () => {
    const miner = new XmrMiner({
      poolUrl: 'stratum+ssl://pool.supportxmr.com:443',
      wallet: 'wallet',
      password: 'x',
      workerId: 'worker-1',
      apiToken: 'secret-token'
    });

    const args = miner.buildArgs();

    expect(args).toEqual(expect.arrayContaining([
      '-o', 'pool.supportxmr.com:443',
      '-u', 'wallet',
      '-p', 'x',
      '--http-host', '127.0.0.1',
      '--http-port', '4444',
      '--http-access-token', 'secret-token',
      '--rig-id', 'worker-1',
      '--tls'
    ]));
  });

  it('sends the XMRig API token when fetching telemetry', async () => {
    const miner = new XmrMiner({ apiToken: 'secret-token' });
    miner.status = 'MINING';
    miner.httpGet = jest.fn().mockResolvedValue({
      hashrate: { total: [1234] },
      connection: { accepted: 2, rejected: 1 }
    });

    await miner.fetchTelemetry();

    expect(miner.httpGet).toHaveBeenCalledWith(4444, '/2/summary', false, {
      headers: { Authorization: 'Bearer secret-token' }
    });
    expect(miner.telemetry.hashrate).toBe(1234);
    expect(miner.stats.acceptedShares).toBe(2);
    expect(miner.stats.rejectedShares).toBe(1);
  });

  it('builds RVN and ETC T-Rex args with full stratum URLs', () => {
    const rvnMiner = new RvnMiner({ poolUrl: 'rvn.2miners.com:6060', wallet: 'rvnWallet', password: 'x' });
    const etcMiner = new EtcMiner({ poolUrl: 'etc.2miners.com:1010', wallet: 'etcWallet', password: 'x' });

    expect(rvnMiner.buildArgs()).toEqual(expect.arrayContaining([
      '-a', 'kawpow',
      '-o', 'stratum+tcp://rvn.2miners.com:6060',
      '--api-bind-http', '127.0.0.1:4067'
    ]));

    expect(etcMiner.buildArgs()).toEqual(expect.arrayContaining([
      '-a', 'etchash',
      '-o', 'stratum+tcp://etc.2miners.com:1010',
      '--api-bind-http', '127.0.0.1:4068'
    ]));
  });

  it('builds ERG and KAS args with their expected algorithms', () => {
    const ergMiner = new ErgMiner({ poolUrl: 'erg.2miners.com:8888', wallet: 'ergWallet', password: 'x' });
    const kasMiner = new KasMiner({ poolUrl: 'pool.woolypooly.com:3112', wallet: 'kasWallet', password: 'x' });

    expect(ergMiner.buildArgs()).toEqual(expect.arrayContaining([
      '-a', 'autolykos2',
      '-o', 'stratum+tcp://erg.2miners.com:8888',
      '--api-bind-http', '127.0.0.1:4069'
    ]));

    expect(kasMiner.buildArgs()).toEqual(expect.arrayContaining([
      '--algo', 'KASPA',
      '--pool', 'stratum+tcp://pool.woolypooly.com:3112',
      '--apiport', '4070'
    ]));
  });

  it('parses hashrate units correctly for ERG and KAS miners', () => {
    const ergMiner = new ErgMiner();
    const kasMiner = new KasMiner();

    ergMiner.parseOutput('GPU #0: 123.45 MH/s');
    kasMiner.parseOutput('Total 1.50 GH/s');

    expect(ergMiner.telemetry.hashrate).toBe(123450000);
    expect(kasMiner.telemetry.hashrate).toBe(1500000000);
  });
});
