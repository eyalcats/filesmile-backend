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

        // Check if token is valid and not expired
        try {
            const payload = this.parseJWT(token);

            // Check if token has admin claim (required for new secure tokens)
            if (!payload.admin) {
                console.log('Token missing admin claim - forcing re-login');
                this.logout();
                return false;
            }

            // Check if token is expired
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
     * Login user via backend API
     * @param {string} username - Admin username
     * @param {string} password - Admin password
     * @param {boolean} remember - Remember me option
     * @returns {Promise<Object>} - User data on success
     */
    async login(username, password, remember = false) {
        // Call backend login endpoint
        const response = await fetch(CONFIG.API_URL + CONFIG.ENDPOINTS.LOGIN, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || 'Invalid username or password');
        }

        const data = await response.json();

        // Store the JWT token from backend
        this.setToken(data.access_token, remember);

        const user = {
            username: data.username,
            role: 'admin',
            loginTime: new Date().toISOString()
        };

        this.setUser(user, remember);

        if (remember) {
            localStorage.setItem(CONFIG.STORAGE_KEYS.REMEMBER_ME, 'true');
        }

        return { success: true, user };
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
     * Require authentication - redirect to login if not authenticated
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/admin/';
            return false;
        }
        return true;
    },

    /**
     * Redirect to dashboard if already authenticated
     */
    redirectIfAuthenticated() {
        if (this.isAuthenticated()) {
            window.location.href = '/admin/dashboard.html';
            return true;
        }
        return false;
    }
};
