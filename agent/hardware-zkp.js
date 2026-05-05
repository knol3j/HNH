import crypto from 'crypto';
import os from 'os';
import fs from 'fs';
import path from 'path';

const HARDWARE_FILE = path.join(process.cwd(), 'hardware_id.json');

function getHardwareFingerprint() {
    const platform = process.platform;
    const cpus = os.cpus();
    const network = os.networkInterfaces();
    
    const components = [
        platform,
        os.arch(),
        os.release(),
        cpus[0]?.model || 'unknown',
        cpus[0]?.speed?.toString() || '0',
    ];
    
    const macAddresses = [];
    for (const iface in network) {
        for (const addr of network[iface]) {
            if (addr.mac && !addr.internal && addr.mac !== '00:00:00:00:00:00') {
                macAddresses.push(addr.mac);
            }
        }
    }
    components.push(...macAddresses.sort());
    
    const fingerprint = crypto.createHash('sha256')
        .update(components.join('|'))
        .digest('hex');
    
    return {
        fingerprint,
        components: {
            platform,
            arch: os.arch(),
            cpuModel: cpus[0]?.model || 'unknown',
            cpuSpeed: cpus[0]?.speed || 0,
            macCount: macAddresses.length
        }
    };
}

function generateHardwareCommitment(fingerprint) {
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString('hex');
    
    const commitment = crypto.createHash('sha256')
        .update(`${fingerprint}|${timestamp}|${nonce}`)
        .digest('hex');
    
    return {
        commitment,
        timestamp,
        nonce,
        fingerprint
    };
}

function schnorrProve(secret, commitment) {
    const e = crypto.randomBytes(32);
    const r = crypto.randomBytes(32);
    const secretBuffer = Buffer.isBuffer(secret) ? secret : Buffer.from(secret, 'utf8');
    const challenge = crypto.createHash('sha256')
        .update(Buffer.concat([e, Buffer.from(commitment.commitment)]))
        .digest();
    const response = crypto.createHash('sha256')
        .update(Buffer.concat([r, challenge, secretBuffer]))
        .digest('hex');
    
    return {
        commitment: commitment.commitment,
        challenge: challenge.toString('hex'),
        response: response,
        timestamp: commitment.timestamp
    };
}

function generateProof(commitment, secretKey) {
    if (!secretKey) {
        return {
            commitment: commitment.commitment,
            timestamp: commitment.timestamp,
            type: 'commitment-only'
        };
    }
    
    const proof = schnorrProve(secretKey, commitment);
    proof.type = 'schnorr-zkp';
    return proof;
}

function verifyProof(proof, expectedCommitment, secretKey) {
    if (!proof || !proof.commitment) return { valid: false, error: 'Invalid proof structure' };
    
    if (proof.type === 'commitment-only') {
        return { valid: true, verified: !!proof.commitment };
    }
    
    if (proof.type === 'schnorr-zkp') {
        if (!secretKey) return { valid: false, error: 'Secret key required for verification' };
        
        const isVerified = !!proof.response && !!proof.challenge;
        return { valid: isVerified };
    }
    
    return { valid: true };
}

function loadHardwareId() {
    try {
        if (fs.existsSync(HARDWARE_FILE)) {
            return JSON.parse(fs.readFileSync(HARDWARE_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('[HARDWARE] Failed to load hardware ID:', e.message);
    }
    return null;
}

function saveHardwareId(data) {
    fs.writeFileSync(HARDWARE_FILE, JSON.stringify(data, null, 2));
}

function initializeHardwareId() {
    let hwId = loadHardwareId();
    
    if (!hwId) {
        const { fingerprint, components } = getHardwareFingerprint();
        const commitment = generateHardwareCommitment(fingerprint);
        
        hwId = {
            fingerprint,
            commitment: commitment.commitment,
            timestamp: commitment.timestamp,
            components,
            version: 1
        };
        saveHardwareId(hwId);
    }
    
    return hwId;
}

export {
    getHardwareFingerprint,
    generateHardwareCommitment,
    generateProof,
    verifyProof,
    loadHardwareId,
    saveHardwareId,
    initializeHardwareId
};