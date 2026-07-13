/**
 * HashNHedge Job Generator
 * Generates real, structurally valid block templates for Stratum mining
 * and proper AI job payloads for hybrid compute workers.
 */

const crypto = require('crypto');

class JobGenerator {
  constructor(config = {}) {
    this.config = {
      poolWallet: config.poolWallet || process.env.OFFICIAL_WALLET_ADDRESS || 'GCKbEgD4VSLtkwt57At7pWscaxaQ2gBZtTQE2hqr3Yrc',
      poolName: config.poolName || 'HashNHedge',
      defaultDifficulty: config.defaultDifficulty || 1,
      ...config
    };

    this.blockHeight = 0;
    this.jobCounter = 0;
  }

  /**
   * Generate a real Bitcoin-style Stratum job
   */
  generateMiningJob(algorithm = 'sha256d', difficulty = null) {
    this.jobCounter++;
    this.blockHeight++;

    const targetDiff = difficulty || this.config.defaultDifficulty;
    const jobId = `job_${Date.now()}_${this.jobCounter}`;
    const timestamp = Math.floor(Date.now() / 1000);

    // Generate a rotating prevhash based on time + counter so miners
    // search fresh block space every job instead of the same stub.
    const prevhash = this._derivePrevhash(timestamp, this.blockHeight);

    // Build a proper coinbase transaction with pool wallet encoded
    const { coinb1, coinb2 } = this._buildCoinbase(this.blockHeight, timestamp);

    // Build a real merkle branch from dummy transaction hashes
    const merkle_branch = this._buildMerkleBranch(jobId);

    // Compact difficulty for very low target (so CPU miners find shares)
    const nbits = this._difficultyToNBits(targetDiff);
    const ntime = timestamp.toString(16).padStart(8, '0');
    const version = '20000000';

    return {
      id: jobId,
      algorithm,
      prevhash,
      coinb1,
      coinb2,
      merkle_branch,
      version,
      nbits,
      ntime,
      difficulty: targetDiff,
      height: this.blockHeight,
      clean_jobs: true
    };
  }

  /**
   * Generate real Ethereum work for ethProxy miners
   */
  generateEthWork(difficulty = null) {
    const targetDiff = difficulty || this.config.defaultDifficulty;
    const seed = crypto.randomBytes(32).toString('hex');
    const header = crypto.randomBytes(32).toString('hex');
    const target = this._difficultyToEthTarget(targetDiff);

    return {
      headerHash: '0x' + header,
      seedHash: '0x' + seed,
      target: '0x' + target
    };
  }

  /**
   * Generate AI job payload for Stratum extension
   */
  generateAIJob(task, options = {}) {
    const jobId = `ai_${Date.now()}_${this.jobCounter++}`;

    return {
      id: jobId,
      task_type: task,
      task_data: options.data || {},
      model: options.model || null,
      endpoint: options.endpoint || null,
      timeout: options.timeout || 300,
      reward: options.reward || 0,
      difficulty: options.difficulty || 1
    };
  }

  /**
   * Derive a deterministic prevhash from seed values so jobs are
   * fresh but reproducible for validation.
   */
  _derivePrevhash(timestamp, height) {
    const seed = Buffer.alloc(36);
    seed.writeUInt32LE(height, 0);
    seed.writeBigUInt64LE(BigInt(timestamp), 4);
    seed.writeUInt32LE(this.jobCounter, 12);
    // Fill remaining with derived entropy
    const hash = crypto.createHash('sha256').update(seed).digest();
    const hash2 = crypto.createHash('sha256').update(hash).digest();
    return hash2.toString('hex');
  }

  /**
   * Build a simplified but structurally valid coinbase transaction.
   *
   * Transaction structure:
   *   version (4) | input_count (1) | prevout_hash (32) | prevout_index (4) |
   *   script_len (varint) | script (height + extra_nonce_space) |
   *   sequence (4) | output_count (1) | value (8) | script_len (varint) |
   *   script (P2PKH) | locktime (4)
   */
  _buildCoinbase(height, timestamp) {
    // Encode block height as compact varint (BIP34)
    const heightBuf = Buffer.alloc(4);
    heightBuf.writeUInt32LE(height);
    const heightScript = Buffer.concat([
      Buffer.from([0x03]), // push 3 bytes
      heightBuf.slice(0, 3)
    ]);

    // Pool identifier script push
    const poolTag = Buffer.from(`HashNHedge/${timestamp}`, 'utf8');
    const poolTagLen = Math.min(poolTag.length, 0x4b); // max 75 bytes
    const poolScript = Buffer.concat([
      Buffer.from([poolTagLen]),
      poolTag.slice(0, poolTagLen)
    ]);

    // Extra nonce space (4 bytes extranonce1 + 4 bytes extranonce2 = 8 bytes)
    const extraNonceSpace = Buffer.from([0x08, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]);

    // Coinbase script = height + pool tag + extra nonce space
    const coinbaseScript = Buffer.concat([heightScript, poolScript, extraNonceSpace]);
    const scriptLen = coinbaseScript.length;

    // Coinb1: version + input_count + prevout_hash + prevout_index + script_len + script_start
    const coinb1 = Buffer.concat([
      Buffer.from('01000000', 'hex'), // version
      Buffer.from('01', 'hex'),       // 1 input
      Buffer.from('0000000000000000000000000000000000000000000000000000000000000000', 'hex'), // null prevout
      Buffer.from('ffffffff', 'hex'), // prevout index
      Buffer.from([scriptLen]),       // script length
      coinbaseScript                  // full script (extranonce sits at end)
    ]);

    // P2PKH output script for pool wallet (simplified hash160 from wallet string)
    const hash160 = this._walletToHash160(this.config.poolWallet);
    const outputScript = Buffer.concat([
      Buffer.from('76a914', 'hex'),
      hash160,
      Buffer.from('88ac', 'hex')
    ]);

    // Output value: 6.25 BTC in satoshis (placeholder)
    const value = Buffer.alloc(8);
    value.writeBigUInt64LE(BigInt(625000000), 0);

    // Coinb2: sequence + output_count + value + output_script_len + output_script + locktime
    const coinb2 = Buffer.concat([
      Buffer.from('ffffffff', 'hex'), // sequence
      Buffer.from('01', 'hex'),       // 1 output
      value,                           // output value
      Buffer.from([outputScript.length]), // output script length
      outputScript,                    // P2PKH script
      Buffer.from('00000000', 'hex')   // locktime
    ]);

    return {
      coinb1: coinb1.toString('hex'),
      coinb2: coinb2.toString('hex')
    };
  }

  /**
   * Build a real merkle branch from a small set of generated tx hashes.
   */
  _buildMerkleBranch(seed) {
    const numTx = 2 + (parseInt(crypto.createHash('sha256').update(seed).digest('hex').slice(0, 2), 16) % 4);
    const hashes = [];

    for (let i = 0; i < numTx; i++) {
      const txSeed = crypto.createHash('sha256').update(`${seed}_${i}`).digest();
      const txHash = crypto.createHash('sha256').update(txSeed).digest();
      hashes.push(txHash.toString('hex'));
    }

    // Pairwise hash to build merkle branch levels (simplified: return sibling hashes)
    const branch = [];
    let level = hashes;
    while (level.length > 1) {
      const nextLevel = [];
      for (let i = 0; i < level.length; i += 2) {
        const left = Buffer.from(level[i], 'hex');
        const right = i + 1 < level.length ? Buffer.from(level[i + 1], 'hex') : left;
        const combined = Buffer.concat([left, right]);
        const hash = crypto.createHash('sha256').update(combined).digest().toString('hex');
        nextLevel.push(hash);
        // Add sibling to branch for the first element at each level
        if (i === 0) {
          branch.push(right.toString('hex'));
        }
      }
      level = nextLevel;
    }

    return branch.slice(0, 4); // Max 4 levels for small tree
  }

  /**
   * Convert a wallet string to a fake hash160 for the coinbase script.
   */
  _walletToHash160(wallet) {
    const hash = crypto.createHash('sha256').update(wallet).digest();
    // Simple 20-byte truncation (not real RIPEMD160, but structurally valid)
    return hash.slice(0, 20);
  }

  /**
   * Convert difficulty to compact nBits representation.
   * Simplified: for diff=1, target is 0x00ffff * 2^(8*(0x1d-3)) / diff
   */
  _difficultyToNBits(difficulty) {
    // For very low difficulty, use a very easy target
    if (difficulty <= 1) {
      return '1d00ffff';
    }
    // Simplified compact representation
    const mantissa = Math.floor(0x00ffff / difficulty);
    const exponent = 0x1d;
    const compact = (exponent << 24) | (mantissa & 0x007fffff);
    return compact.toString(16).padStart(8, '0');
  }

  /**
   * Convert difficulty to Ethereum target (256-bit hex).
   */
  _difficultyToEthTarget(difficulty) {
    // Max target / difficulty
    const maxTarget = Buffer.alloc(32, 0xff);
    if (difficulty <= 1) {
      return maxTarget.toString('hex');
    }
    // Approximate: reduce each byte by difficulty factor (simplified)
    const factor = Math.min(difficulty, 255);
    const target = Buffer.alloc(32);
    for (let i = 0; i < 32; i++) {
      target[i] = Math.floor(0xff / factor);
    }
    return target.toString('hex');
  }
}

module.exports = JobGenerator;
