import React, { useState } from 'react';
import { UserCredentials, User } from '../types';
import { useAuth } from '../context/AuthContext';
import { Lock, User as UserIcon, Key, ArrowRight, Github } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';

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

    const handleGoogleLogin = useGoogleLogin({
        onSuccess: async (tokenResponse) => {
            setLoading(true);
            try {
                const user = await loginWithSocial('google', tokenResponse.access_token);
                if (user) onLogin(user);
            } catch (e: any) {
                setError(e.message || 'Google login failed');
            } finally {
                setLoading(false);
            }
        },
        onError: () => setError('Google login failed')
    });

    const handleGithubLogin = () => {
        const clientId = import.meta.env.VITE_GITHUB_CLIENT_ID;
        if (!clientId) {
            setError('GitHub Client ID not configured');
            return;
        }
        const redirectUri = `${window.location.origin}/auth/github/callback`;
        window.location.href = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    };

    const { loginWithSocial } = useAuth();

    return (
        <div className="min-h-screen bg-[#0a0a0b] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full animate-pulse"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
            
            <div className="w-full max-w-md bg-surface/80 border border-white/5 rounded-3xl p-10 backdrop-blur-xl shadow-2xl relative z-10">
                <div className="text-center mb-10">
                    <div className="mx-auto w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 rotate-3 hover:rotate-0 transition-transform duration-500 group">
                        <Lock className="text-primary w-10 h-10 group-hover:scale-110 transition-transform" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-3 tracking-tight">
                        {isLogin ? 'Welcome Back' : 'Join the Network'}
                    </h2>
                    <p className="text-muted text-base">
                        {isLogin ? 'Access your mining operation and earnings.' : 'Start mining and earning rewards today.'}
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

                <div className="mt-8">
                    <div className="relative mb-8">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-white/5"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#121214] px-4 text-muted font-medium">Or continue with</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                        <button
                            onClick={() => handleGoogleLogin()}
                            className="flex items-center justify-center py-4 px-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] transition-all group"
                            title="Continue with Google"
                        >
                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => handleGithubLogin()}
                            className="flex items-center justify-center py-4 px-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] transition-all group"
                            title="Continue with GitHub"
                        >
                            <Github className="w-6 h-6 group-hover:scale-110 transition-transform" />
                        </button>
                        <button
                            onClick={() => setError('Facebook login coming soon')}
                            className="flex items-center justify-center py-4 px-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] transition-all group"
                            title="Continue with Facebook"
                        >
                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setError('Apple login coming soon')}
                            className="flex items-center justify-center py-4 px-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-primary/30 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] transition-all group"
                            title="Continue with Apple"
                        >
                            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M17.05 20.28c-.98.95-2.05 1.61-3.14 1.61-1.11 0-1.57-.68-2.8-.68-1.24 0-1.74.68-2.82.68-1.07 0-2.22-.65-3.21-1.61-2.02-2.02-3.55-5.69-3.55-8.48 0-4.38 2.85-6.69 5.56-6.69 1.45 0 2.67.92 3.49.92s2.05-.92 3.63-.92c1.32 0 2.81.56 3.79 1.72-2.88 1.61-2.4 5.35.53 6.55-.71 1.75-1.63 3.49-2.48 4.9zM12.03 5.07c.85-1.02 1.43-2.45 1.43-3.87 0-.2-.02-.4-.06-.59-1.45.06-2.83.95-3.66 1.93-.74.87-1.39 2.3-1.39 3.73 0 .22.02.44.07.65 1.58.05 2.81-.95 3.61-1.85z" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="mt-8 text-center">
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-muted hover:text-white transition-colors flex items-center justify-center gap-1 mx-auto"
                    >
                        {isLogin ? "New to HNH?" : "Already have an account?"}
                        <span className="text-primary font-bold hover:underline decoration-primary/30">
                            {isLogin ? "Create an account" : "Sign in here"}
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Auth;
