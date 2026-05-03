import toast from 'react-hot-toast';
import React from 'react';

export const notifySuccess = (message: string, duration?: number) => {
    toast.success(message, { duration: duration || 3000, style: { background: '#065f46', color: '#fff' }, iconTheme: { primary: '#10b981', secondary: '#fff' } });
};

export const notifyError = (message: string, duration?: number) => {
    toast.error(message, { duration: duration || 5000, style: { background: '#991b1b', color: '#fff' } });
};

export const notifyInfo = (message: string, duration?: number) => {
    toast(message, { icon: 'ℹ️', duration: duration || 3000, style: { background: '#1e3a8a', color: '#fff' } });
};

export const notifyWarning = (message: string, duration?: number) => {
    toast(message, { icon: '⚠️', duration: duration || 4000, style: { background: '#92400e', color: '#fff' } });
};

export const notifyAgentOffline = () => {
    toast.custom((t) => (
        <div style={{ background: '#7f1d1d', border: '1px solid #ef4444', color: 'white', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🔴</span>
            <div>
                <strong>Agent Offline</strong>
                <p style={{ fontSize: '12px', opacity: 0.8 }}>Mining agent not detected. Features disabled.</p>
                <button onClick={() => toast.dismiss(t.id)} style={{ fontSize: '11px', textDecoration: 'underline', marginTop: '4px' }}>Dismiss</button>
            </div>
        </div>
    ), { duration: 8000 });
};

export const notifyAgentOnline = () => {
    toast.custom((t) => (
        <div style={{ background: '#064e3b', border: '1px solid #10b981', color: 'white', padding: '12px 16px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '20px' }}>🟢</span>
            <div>
                <strong>Agent Connected</strong>
                <p style={{ fontSize: '12px', opacity: 0.8 }}>Real-time telemetry active.</p>
                <button onClick={() => toast.dismiss(t.id)} style={{ fontSize: '11px', textDecoration: 'underline', marginTop: '4px' }}>Dismiss</button>
            </div>
        </div>
    ), { duration: 4000 });
};
