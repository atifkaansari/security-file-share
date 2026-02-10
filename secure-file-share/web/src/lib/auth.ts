// Auth token management
export const setAuthToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
    }
};

export const getAuthToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem('auth_token');
    }
    return null;
};

export const removeAuthToken = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
    }
};

export const isAuthenticated = (): boolean => {
    return !!getAuthToken();
};

// Decode JWT to check role
export const isAdmin = (): boolean => {
    const token = getAuthToken();
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.role === 'ADMIN';
    } catch {
        return false;
    }
};

export const getUserFromToken = () => {
    const token = getAuthToken();
    if (!token) return null;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role,
        };
    } catch {
        return null;
    }
};
