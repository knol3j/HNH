import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { AgentTelemetry } from '../types';

interface SocketContextType {
    socket: Socket | null;
    isConnected: boolean;
    telemetry: AgentTelemetry | null;
    agentStatus: string;
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    telemetry: null,
    agentStatus: 'OFFLINE'
});

export const useSocket = () => useContext(SocketContext);

interface SocketProviderProps {
    children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [telemetry, setTelemetry] = useState<AgentTelemetry | null>(null);
    const [agentStatus, setAgentStatus] = useState('OFFLINE');

    useEffect(() => {
        const agentUrl = localStorage.getItem('hnh_agent_url') || 'http://localhost:4343';
        const secret = import.meta.env.VITE_AGENT_SECRET || 'HNH_LOCAL_AGENT_SECRET';

        const newSocket = io(agentUrl, {
            transports: ['websocket', 'polling'],
            auth: { token: secret },
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            timeout: 10000
        });

        newSocket.on('connect', () => {
            console.log('[Socket] Connected');
            setIsConnected(true);
        });

        newSocket.on('disconnect', () => {
            console.log('[Socket] Disconnected');
            setIsConnected(false);
            setAgentStatus('OFFLINE');
        });

        newSocket.on('telemetry', (data: AgentTelemetry) => {
            setTelemetry(data);
            setAgentStatus(data.status);
        });

        newSocket.on('status', (status: string) => {
            setAgentStatus(status);
        });

        newSocket.on('log', (logs: string[]) => {
            // Could persist logs to state if needed
        });

        setSocket(newSocket);

        return () => {
            newSocket.close();
        };
    }, []);

    return (
        <SocketContext.Provider value={{ socket, isConnected, telemetry, agentStatus }}>
            {children}
        </SocketContext.Provider>
    );
};
