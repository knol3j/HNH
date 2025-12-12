
import { User, UserCredentials } from '../types';

const STORAGE_KEY_USERS = 'hnh_users';
const STORAGE_KEY_SESSION = 'hnh_session';

// Simple hash (for demo privacy, not strong security)
const hashPassword = async (pwd: string): Promise<string> => {
    const msgBuffer = new TextEncoder().encode(pwd);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const registerUser = async (creds: UserCredentials): Promise<User | null> => {
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (users.find(u => u.username === creds.username)) {
        return null; // Already exists
    }

    const newUser: User = {
        id: crypto.randomUUID(),
        username: creds.username,
        passwordHash: await hashPassword(creds.password),
        createdAt: Date.now()
    };

    users.push(newUser);
    localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    return newUser;
};

export const loginUser = async (creds: UserCredentials): Promise<User | null> => {
    const usersStr = localStorage.getItem(STORAGE_KEY_USERS);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    const hash = await hashPassword(creds.password);
    const user = users.find(u => u.username === creds.username && u.passwordHash === hash);

    if (user) {
        localStorage.setItem(STORAGE_KEY_SESSION, JSON.stringify(user));
        return user;
    }
    return null;
};

export const logoutUser = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
};

export const getCurrentUser = (): User | null => {
    const sessionStr = localStorage.getItem(STORAGE_KEY_SESSION);
    return sessionStr ? JSON.parse(sessionStr) : null;
};
