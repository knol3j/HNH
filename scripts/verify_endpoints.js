import fetch from 'node-fetch';

const API_URL = 'http://localhost:8080'; // Local backend
const AGENT_URL = 'http://localhost:4343'; // Local agent

async function verify() {
    console.log('--- SYSTEM VERIFICATION ---');

    // 1. Backend Health
    try {
        const res = await fetch(`${API_URL}/health`);
        const data = await res.json();
        console.log('✅ Backend Health:', data);
    } catch (e) {
        console.log('❌ Backend Health: Failed (Ensure backend is running)');
    }

    // 2. Agent Health
    try {
        const res = await fetch(`${AGENT_URL}/health`);
        const data = await res.json();
        console.log('✅ Agent Health:', data);
    } catch (e) {
        console.log('❌ Agent Health: Failed (Ensure agent is running)');
    }

    // 3. Agent Miner Test
    try {
        const res = await fetch(`${AGENT_URL}/test-miners`, {
            headers: { 'Authorization': 'Bearer HNH_LOCAL_AGENT_SECRET' }
        });
        const data = await res.json();
        console.log('✅ Agent Miner Test:', data.success ? 'OK' : 'FAILED');
    } catch (e) {
        console.log('❌ Agent Miner Test: Failed');
    }

    console.log('--- VERIFICATION COMPLETE ---');
}

verify();
