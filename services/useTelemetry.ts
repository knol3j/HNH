import { useState, useEffect } from 'react';
import { HardwareTelemetry } from '../types';

export const useTelemetry = (agentUrl = import.meta.env.VITE_AGENT_URL || '') => {
    const [telemetry, setTelemetry] = useState<HardwareTelemetry | null>(null);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        // Check if user has a custom agent URL override
        const currentUser = localStorage.getItem('hnh_current_user'); // simplified check
        const savedUrl = localStorage.getItem(`hnh_agent_url_${currentUser || 'guest'}`);
        const targetUrl = savedUrl || agentUrl;

        const poll = async () => {
            try {
                const response = await fetch(`${targetUrl}/telemetry`, {
                    signal: AbortSignal.timeout(1000)
                });
                if (response.ok) {
                    const data = await response.json();
                    setTelemetry(data);
                    setIsConnected(true);
                } else {
                    setIsConnected(false);
                }
            } catch (e) {
                setIsConnected(false);
                // Retain last known telemetry if brief disconnect? optional.
                // setTelemetry(null); 
            }
        };

        poll(); // initial
        const interval = setInterval(poll, 1000);
        return () => clearInterval(interval);
    }, [agentUrl]);

    return { telemetry, isConnected };
};
