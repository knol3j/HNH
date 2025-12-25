import React, { useState, useEffect } from 'react';
import { X, Smartphone, Check, RefreshCw, Copy } from 'lucide-react';

interface MobileConnectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const MobileConnectModal: React.FC<MobileConnectModalProps> = ({ isOpen, onClose }) => {
    const [pairingCode, setPairingCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(300); // 5 minutes
    const [copied, setCopied] = useState(false);

    // Generate code on open
    useEffect(() => {
        if (isOpen) {
            generateCode();
        }
    }, [isOpen]);

    // Timer
    useEffect(() => {
        if (!isOpen) return;
        const interval = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 0) {
                    generateCode();
                    return 300;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [isOpen]);

    const generateCode = () => {
        const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        setPairingCode(result);
        setTimeLeft(300);
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(pairingCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (!isOpen) return null;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    // QR Code Data: JSON payload for the mobile app
    const qrData = JSON.stringify({
        type: 'hnh_pairing',
        code: pairingCode,
        endpoint: window.location.origin
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-surface border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Smartphone className="text-primary" /> Connect Mobile
                    </h2>
                    <button onClick={onClose} className="text-muted hover:text-white transition-colors" aria-label="Close Modal" title="Close">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 flex flex-col items-center text-center">
                    <p className="text-muted mb-6">
                        Scan this QR code with the <span className="text-white font-bold">HashNHedge Mobile App</span> to pair this node.
                    </p>

                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-xl mb-6 shadow-inner">
                        <img
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrData)}&bgcolor=ffffff&color=000000&margin=0`}
                            alt="Pairing QR Code"
                            className="w-48 h-48 mix-blend-multiply"
                        />
                    </div>

                    {/* Pairing Code */}
                    <div className="w-full bg-black/40 rounded-xl p-4 border border-white/10 mb-4 group relative">
                        <p className="text-xs text-muted uppercase mb-1">Pairing Code</p>
                        <div className="flex items-center justify-center gap-4">
                            <span className="text-3xl font-mono font-bold text-primary tracking-widest">{pairingCode}</span>
                        </div>
                        <button
                            onClick={handleCopy}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-white transition-colors"
                            title="Copy Code"
                        >
                            {copied ? <Check size={20} className="text-green-500" /> : <Copy size={20} />}
                        </button>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted">
                        <RefreshCw size={12} className="animate-spin" />
                        Code expires in {formatTime(timeLeft)}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-white/5 border-t border-white/10 text-center">
                    <p className="text-xs text-muted">
                        Don't have the app? <a href="#" className="text-primary hover:underline">Download for iOS & Android</a>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default MobileConnectModal;
