import React, { useState, useEffect } from 'react';
import { Server, Plus, Trash2, Wifi, WifiOff, ExternalLink } from 'lucide-react';
import { getCurrentUser } from '../services/authService';
import { API_BASE_URL } from '../services/apiClient';
import { notifySuccess, notifyError } from '../services/notification';

interface Agent {
    id: string;
    name: string;
    ipAddress: string | null;
    port: number;
    status: string;
    lastSeen: string;
}

const Farm: React.FC = () => {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [showAdd, setShowAdd] = useState(false);
    const [newName, setNewName] = useState('');
    const [newIp, setNewIp] = useState('');
    const [newPort, setNewPort] = useState(4343);
    const currentUser = getCurrentUser();

    const fetchAgents = async () => {
        if (!currentUser) return;
        try {
            const res = await fetch(`${API_BASE_URL}/user/agents`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hnh_token')}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAgents(data);
            }
        } catch (e) {
            console.error('Failed to fetch agents', e);
        }
    };

    useEffect(() => {
        fetchAgents();
    }, []);

    const handleAdd = async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/user/agents`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('hnh_token')}`
                },
                body: JSON.stringify({ name: newName, ipAddress: newIp, port: newPort })
            });
            if (res.ok) {
                notifySuccess('Agent registered');
                setShowAdd(false);
                setNewName('');
                setNewIp('');
                fetchAgents();
            } else {
                notifyError('Failed to add agent');
            }
        } catch (e: any) {
            notifyError(e.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Remove this agent from your farm?')) return;
        try {
            const res = await fetch(`${API_BASE_URL}/user/agents/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${localStorage.getItem('hnh_token')}` }
            });
            if (res.ok) {
                notifySuccess('Agent removed');
                fetchAgents();
            }
        } catch (e) {
            notifyError('Failed to delete agent');
        }
    };

    const connectToAgent = (agent: Agent) => {
        const url = `http://${agent.ipAddress || 'localhost'}:${agent.port}`;
        localStorage.setItem('hnh_agent_url', url);
        window.location.reload();
    };

    if (!currentUser) return <div className="p-8 text-white">Please log in.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <Server className="text-primary" /> Agent Farm
                    </h1>
                    <p className="text-muted text-sm">Manage multiple mining agents across your machines.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="bg-primary text-black px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-primary-hover"
                >
                    <Plus size={18} /> Add Agent
                </button>
            </div>

            {showAdd && (
                <div className="bg-surface border border-white/10 rounded-xl p-6 max-w-lg">
                    <h3 className="text-white font-bold mb-4">Register New Agent</h3>
                    <div className="space-y-4">
                        <input
                            type="text"
                            placeholder="Agent Name (e.g., Gaming PC)"
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                        <input
                            type="text"
                            placeholder="IP Address or hostname"
                            value={newIp}
                            onChange={e => setNewIp(e.target.value)}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                        <input
                            type="number"
                            placeholder="Port (default 4343)"
                            value={newPort}
                            onChange={e => setNewPort(parseInt(e.target.value))}
                            className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-white"
                        />
                        <div className="flex gap-3">
                            <button onClick={handleAdd} className="flex-1 bg-primary text-black py-2 rounded-lg font-bold">Add</button>
                            <button onClick={() => setShowAdd(false)} className="flex-1 bg-white/5 text-white py-2 rounded-lg">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {agents.map(agent => (
                    <div key={agent.id} className="bg-surface border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all">
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${agent.status === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                                <h3 className="font-bold text-white text-lg">{agent.name}</h3>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => connectToAgent(agent)}
                                    className="p-2 text-muted hover:text-white"
                                    title="Connect to this agent"
                                >
                                    <ExternalLink size={16} />
                                </button>
                                <button
                                    onClick={() => handleDelete(agent.id)}
                                    className="p-2 text-muted hover:text-red-500"
                                    title="Remove agent"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-muted">
                            <p>Address: {agent.ipAddress || 'localhost'}:{agent.port}</p>
                            <p>Status: <span className={agent.status === 'online' ? 'text-green-400' : 'text-red-400'}>{agent.status}</span></p>
                            <p>Last seen: {new Date(agent.lastSeen).toLocaleString()}</p>
                        </div>
                    </div>
                ))}
                {agents.length === 0 && (
                    <div className="col-span-full text-center text-muted py-12">
                        No agents registered yet. Add your first machine to get started.
                    </div>
                )}
            </div>
        </div>
    );
};

export default Farm;
