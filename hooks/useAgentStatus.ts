import { useState, useEffect } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';

export const useAgentStatus = (user: User | null) => {
    const [isAgentOffline, setIsAgentOffline] = useState(false);
    const [isWalletSetupRequired, setIsWalletSetupRequired] = useState(false);

    useEffect(() => {
        if (!user) return;

        const checkStatus = async () => {
            const agentUrl = localStorage.getItem('hnh_agent_url') || import.meta.env.VITE_AGENT_URL || '';
            if (!agentUrl) {
                setIsAgentOffline(true);
                return;
            }

            try {
                const res = await fetch(`${agentUrl}/health`, { signal: AbortSignal.timeout(3000) });
                setIsAgentOffline(!res.ok);
            } catch (e) {
                setIsAgentOffline(true);
            }

            // Wallet check
            const apiBase = import.meta.env.VITE_API_URL || 'https://api.hashnhedge.com';
            const token = localStorage.getItem('hnh_token');
            if (token) {
                try {
                    const res = await fetch(`${apiBase}/user/wallets`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const wallets = await res.json();
                        setIsWalletSetupRequired(wallets.length === 0);
                    }
                } catch (e) {
                    // Ignore wallet check errors
                }
            }
        };

        checkStatus();
        const interval = setInterval(checkStatus, 30000); // 30s poll
        return () => clearInterval(interval);
    }, [user]);

    return { isAgentOffline, isWalletSetupRequired };
};
