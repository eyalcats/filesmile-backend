/**
 * API Module
 * 
 * Handles all API communications with the backend.
 * Provides CRUD operations for tenants, domains, and users.
 */

const API = {
    /**
     * Filter out empty/null/undefined values from params object
     * @param {Object} params - Parameters object
     * @returns {Object} - Filtered parameters
     */
    filterParams(params) {
        const filtered = {};
        for (const [key, value] of Object.entries(params)) {
            if (value !== null && value !== undefined && value !== '') {
                filtered[key] = value;
            }
        }
        return filtered;
    },
    
    /**
     * Make an authenticated API request
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Fetch options
     * @returns {Promise<Object>} - Response data
     */
    async request(endpoint, options = {}) {
        const url = CONFIG.API_URL + endpoint;
        const token = Auth.getToken();
        
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        
        const mergedOptions = {
            ...defaultOptions,
            ...options,
            headers: {
                ...defaultOptions.headers,
                ...options.headers
            }
        };
        
        try {
            const response = await fetch(url, mergedOptions);
            
            // Handle 401 Unauthorized
            if (response.status === 401) {
                Auth.logout();
                window.location.href = '/admin/';
                throw new Error('Session expired. Please login again.');
            }
            
            // Handle other errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                // Handle different error formats
                let errorMessage = 'Unknown error';
                if (typeof errorData.detail === 'string') {
                    errorMessage = errorData.detail;
                } else if (Array.isArray(errorData.detail)) {
                    // FastAPI validation errors come as array
                    errorMessage = errorData.detail.map(e => e.msg || e.message).join(', ');
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else {
                    errorMessage = `HTTP error ${response.status}`;
                }
                throw new Error(errorMessage);
            }
            
            // Handle empty responses
            const text = await response.text();
            return text ? JSON.parse(text) : {};
        } catch (error) {
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    },
    
    // ==================== TENANTS ====================
    
    /**
     * Get all tenants
     * @param {Object} params - Query parameters (search, status, page, limit)
     * @returns {Promise<Array>} - List of tenants
     */
    async getTenants(params = {}) {
        const filtered = this.filterParams(params);
        const queryString = new URLSearchParams(filtered).toString();
        const endpoint = CONFIG.ENDPOINTS.TENANTS + (queryString ? `?${queryString}` : '');
        return this.request(endpoint);
    },
    
    /**
     * Get a single tenant by ID
     * @param {number} id - Tenant ID
     * @returns {Promise<Object>} - Tenant data
     */
    async getTenant(id) {
        return this.request(CONFIG.ENDPOINTS.TENANT(id));
    },
    
    /**
     * Create a new tenant
     * @param {Object} data - Tenant data
     * @returns {Promise<Object>} - Created tenant
     */
    async createTenant(data) {
        return this.request(CONFIG.ENDPOINTS.TENANTS, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Update an existing tenant
     * @param {number} id - Tenant ID
     * @param {Object} data - Updated tenant data
     * @returns {Promise<Object>} - Updated tenant
     */
    async updateTenant(id, data) {
        return this.request(CONFIG.ENDPOINTS.TENANT(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Delete a tenant
     * @param {number} id - Tenant ID
     * @returns {Promise<void>}
     */
    async deleteTenant(id) {
        return this.request(CONFIG.ENDPOINTS.TENANT(id), {
            method: 'DELETE'
        });
    },
    
    // ==================== DOMAINS ====================
    
    /**
     * Get all domains
     * @param {Object} params - Query parameters (search, tenant_id, page, limit)
     * @returns {Promise<Array>} - List of domains
     */
    async getDomains(params = {}) {
        const filtered = this.filterParams(params);
        const queryString = new URLSearchParams(filtered).toString();
        const endpoint = CONFIG.ENDPOINTS.DOMAINS + (queryString ? `?${queryString}` : '');
        return this.request(endpoint);
    },
    
    /**
     * Get a single domain by ID
     * @param {number} id - Domain ID
     * @returns {Promise<Object>} - Domain data
     */
    async getDomain(id) {
        return this.request(CONFIG.ENDPOINTS.DOMAIN(id));
    },
    
    /**
     * Create a new domain
     * @param {Object} data - Domain data
     * @returns {Promise<Object>} - Created domain
     */
    async createDomain(data) {
        return this.request(CONFIG.ENDPOINTS.DOMAINS, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Update an existing domain
     * @param {number} id - Domain ID
     * @param {Object} data - Updated domain data
     * @returns {Promise<Object>} - Updated domain
     */
    async updateDomain(id, data) {
        return this.request(CONFIG.ENDPOINTS.DOMAIN(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Delete a domain
     * @param {number} id - Domain ID
     * @returns {Promise<void>}
     */
    async deleteDomain(id) {
        return this.request(CONFIG.ENDPOINTS.DOMAIN(id), {
            method: 'DELETE'
        });
    },
    
    // ==================== USERS ====================
    
    /**
     * Get all users
     * @param {Object} params - Query parameters (search, tenant_id, status, page, limit)
     * @returns {Promise<Array>} - List of users
     */
    async getUsers(params = {}) {
        const filtered = this.filterParams(params);
        const queryString = new URLSearchParams(filtered).toString();
        const endpoint = CONFIG.ENDPOINTS.USERS + (queryString ? `?${queryString}` : '');
        return this.request(endpoint);
    },
    
    /**
     * Get a single user by ID
     * @param {number} id - User ID
     * @returns {Promise<Object>} - User data
     */
    async getUser(id) {
        return this.request(CONFIG.ENDPOINTS.USER(id));
    },
    
    /**
     * Create a new user
     * @param {Object} data - User data
     * @returns {Promise<Object>} - Created user
     */
    async createUser(data) {
        return this.request(CONFIG.ENDPOINTS.USERS, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Update an existing user
     * @param {number} id - User ID
     * @param {Object} data - Updated user data
     * @returns {Promise<Object>} - Updated user
     */
    async updateUser(id, data) {
        return this.request(CONFIG.ENDPOINTS.USER(id), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Delete a user
     * @param {number} id - User ID
     * @returns {Promise<void>}
     */
    async deleteUser(id) {
        return this.request(CONFIG.ENDPOINTS.USER(id), {
            method: 'DELETE'
        });
    },
    
    // ==================== USER-TENANT ASSOCIATIONS ====================
    
    /**
     * Get all tenant associations for a user
     * @param {number} userId - User ID
     * @returns {Promise<Array>} - List of user-tenant associations
     */
    async getUserTenants(userId) {
        return this.request(CONFIG.ENDPOINTS.USER_TENANTS(userId));
    },
    
    /**
     * Add a tenant association to a user
     * @param {number} userId - User ID
     * @param {Object} data - Tenant association data (tenant_id, erp_username, erp_password_or_token, is_active)
     * @returns {Promise<Object>} - Created association
     */
    async addUserTenant(userId, data) {
        return this.request(CONFIG.ENDPOINTS.USER_TENANTS(userId), {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Update a user's tenant association
     * @param {number} userId - User ID
     * @param {number} tenantId - Tenant ID
     * @param {Object} data - Updated association data
     * @returns {Promise<Object>} - Updated association
     */
    async updateUserTenant(userId, tenantId, data) {
        return this.request(CONFIG.ENDPOINTS.USER_TENANT(userId, tenantId), {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },
    
    /**
     * Remove a tenant association from a user
     * @param {number} userId - User ID
     * @param {number} tenantId - Tenant ID
     * @returns {Promise<void>}
     */
    async removeUserTenant(userId, tenantId) {
        return this.request(CONFIG.ENDPOINTS.USER_TENANT(userId, tenantId), {
            method: 'DELETE'
        });
    },
    
    // ==================== CREDENTIAL VALIDATION ====================
    
    /**
     * Validate ERP admin credentials
     * @param {Object} data - Credential data (erp_base_url, erp_company, erp_admin_username, erp_admin_password_or_token, erp_tabula_ini)
     * @returns {Promise<Object>} - Validation result {valid: boolean, message: string}
     */
    async validateCredentials(data) {
        return this.request(CONFIG.ENDPOINTS.VALIDATE_CREDENTIALS, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
};
