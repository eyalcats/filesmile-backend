/**
 * Authentication Module
 * 
 * Handles user authentication, token management, and session handling.
 */

const Auth = {
    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;
        
        // Check if token is expired
        try {
            const payload = this.parseJWT(token);
            if (payload.exp && Date.now() >= payload.exp * 1000) {
                this.logout();
                return false;
            }
            return true;
        } catch (e) {
            this.logout();
            return false;
        }
    },
    
    /**
     * Get stored auth token
     * @returns {string|null}
     */
    getToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN) || 
               sessionStorage.getItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
    },
    
    /**
     * Store auth token
     * @param {string} token - JWT token
     * @param {boolean} remember - Whether to persist in localStorage
     */
    setToken(token, remember = false) {
        if (remember) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
        } else {
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN, token);
        }
    },
    
    /**
     * Get stored user info
     * @returns {Object|null}
     */
    getUser() {
        const userStr = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO) || 
                       sessionStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO);
        try {
            return userStr ? JSON.parse(userStr) : null;
        } catch (e) {
            return null;
        }
    },
    
    /**
     * Store user info
     * @param {Object} user - User information
     * @param {boolean} remember - Whether to persist in localStorage
     */
    setUser(user, remember = false) {
        const userStr = JSON.stringify(user);
        if (remember) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.USER_INFO, userStr);
        } else {
            sessionStorage.setItem(CONFIG.STORAGE_KEYS.USER_INFO, userStr);
        }
    },
    
    /**
     * Login user
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     * @param {boolean} remember - Remember me option
     * @returns {Promise<Object>} - User data on success
     */
    async login(username, password, remember = false) {
        // For demo purposes, we'll use a simple admin check
        // In production, this should call your backend API
        
        // Simulated admin credentials check
        // Replace this with actual API call to your backend
        if (username === 'admin' && password === 'admin123') {
            const mockToken = this.generateMockToken(username);
            const user = {
                username: username,
                role: 'admin',
                loginTime: new Date().toISOString()
            };
            
            this.setToken(mockToken, remember);
            this.setUser(user, remember);
            
            if (remember) {
                localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, 'true');
            }
            
            return { success: true, user };
        }
        
        throw new Error('Invalid username or password');
    },
    
    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_INFO);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER_INFO);
    },
    
    /**
     * Parse JWT token
     * @param {string} token - JWT token
     * @returns {Object} - Decoded payload
     */
    parseJWT(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
            return JSON.parse(jsonPayload);
        } catch (e) {
            throw new Error('Invalid token');
        }
    },
    
    /**
     * Generate mock JWT token for demo
     * @param {string} username - Username
     * @returns {string} - Mock JWT token
     */
    generateMockToken(username) {
        const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
        const payload = btoa(JSON.stringify({
            sub: username,
            role: 'admin',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60) // 24 hours
        }));
        const signature = btoa('mock-signature');
        return `${header}.${payload}.${signature}`;
    },
    
    /**
     * Require authentication - redirect to login if not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = 'index.html';
            return false;
        }
        return true;
    },
    
    /**
     * Redirect to dashboard if already authenticated
     */
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = 'dashboard.html';
            return true;
        }
        return false;
    }
};
