/**
 * Authentication Module (Simplified)
 *
 * Handles user authentication and token management.
 * Token validation is done server-side - client just checks if token exists.
 */

const Auth = {
    /**
     * Check if user has a token stored
     * @returns {boolean}
     */
    isAuthenticated() {
        return !!this.getToken();
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
        // Clear both first to avoid duplicates
        this.clearAuth();
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
     * Clear all auth data (token and user info)
     */
    clearAuth() {
        localStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.USER_INFO);
        localStorage.removeItem(CONFIG.STORAGE_KEYS.REMEMBER_ME);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.AUTH_TOKEN);
        sessionStorage.removeItem(CONFIG.STORAGE_KEYS.USER_INFO);
    },

    /**
     * Logout user and redirect to login
     */
    logout() {
        this.clearAuth();
        window.location.href = '/admin/';
    },

    /**
     * Require authentication - redirect to login if no token
     * @returns {boolean}
     */
    requireAuth() {
        if (!this.isAuthenticated()) {
            window.location.href = '/admin/';
            return false;
        }
        return true;
    }
};
