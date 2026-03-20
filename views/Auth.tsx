import React, { useState } from 'react';
import { UserCredentials, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Key, ArrowRight } from 'lucide-react';

interface AuthProps {
    onLogin: (user: User) => void;
}

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
    const { login, register } = useAuth();
    const [isLogin, setIsLogin] = useState(true);
    const [creds, setCreds] = useState<UserCredentials>({ username: '', password: '' });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        if (!creds.username || !creds.password) {
            setError('Please fill in all fields');
            setLoading(false);
            return;
        }

        try {
            if (isLogin) {
                const user = await login(creds);
                if (user) {
                    onLogin(user);
                }
            } else {
                const user = await register(creds);
                if (user) {
                    onLogin(user);
                }
            }
        } catch (e: any) {
            setError(e.message || 'Authentication failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-surface border border-white/5 rounded-2xl p-8 backdrop-blur-sm shadow-2xl">
                <div className="text-center mb-8">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                        <Lock className="text-primary w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="text-muted text-sm">
                        {isLogin ? 'Enter your credentials to access your mining rig.' : 'Setup a secured profile for your node.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Username</label>
                        <div className="relative">
                            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                            <input
                                type="text"
                                value={creds.username}
                                onChange={(e) => setCreds(prev => ({ ...prev, username: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                                placeholder="Enter username"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold uppercase text-muted mb-1">Password</label>
                        <div className="relative">
                            <Key className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
                            <input
                                type="password"
                                value={creds.password}
                                onChange={(e) => setCreds(prev => ({ ...prev, password: e.target.value }))}
                                className="w-full bg-black/40 border border-white/10 rounded-lg py-3 pl-10 pr-4 text-white focus:outline-none focus:border-primary transition-colors"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-400 text-xs text-center bg-red-500/10 py-2 rounded">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-primary hover:bg-primary-hover text-black font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2 group"
                    >
                        {isLogin ? 'Sign In' : 'Create Account'}
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-muted hover:text-white transition-colors underline decoration-dotted"
                    >
                        {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
