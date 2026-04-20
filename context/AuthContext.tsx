import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../types';
import * as authService from '../services/authService';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (creds: any) => Promise<User | null>;
    loginWithSocial: (type: 'google' | 'facebook' | 'apple', token: string, referralCode?: string) => Promise<User | null>;
    register: (creds: any) => Promise<User | null>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const currentUser = authService.getCurrentUser();
            if (currentUser) {
                setUser(currentUser);
                // Background refresh to get real data
                try {
                    const freshUser = await authService.fetchCurrentUser();
                    if (freshUser) setUser(freshUser);
                } catch (e) {
                    // Token likely expired
                    setUser(null);
                }
            }
            setLoading(false);
        };

        initAuth();

        // Listen for internal auth changes
        const handleAuthStateChange = () => {
            setUser(authService.getCurrentUser());
        };
        window.addEventListener('auth-state-changed', handleAuthStateChange);
        return () => window.removeEventListener('auth-state-changed', handleAuthStateChange);
    }, []);

    const login = async (creds: any) => {
        const loggedInUser = await authService.loginUser(creds);
        setUser(loggedInUser);
        return loggedInUser;
    };

    const loginWithSocial = async (type: 'google' | 'facebook' | 'apple', token: string, referralCode?: string) => {
        const loggedInUser = await authService.loginWithSocial(type, token, referralCode);
        setUser(loggedInUser);
        return loggedInUser;
    };

    const register = async (creds: any) => {
        const registeredUser = await authService.registerUser(creds);
        setUser(registeredUser);
        return registeredUser;
    };

    const logout = () => {
        authService.logoutUser();
        setUser(null);
    };

    const refreshUser = async () => {
        const freshUser = await authService.fetchCurrentUser();
        setUser(freshUser);
    };

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            login, 
            loginWithSocial,
            register, 
            logout, 
            refreshUser,
            isAuthenticated: !!user 
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
