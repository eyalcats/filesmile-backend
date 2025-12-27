/**
 * Application Configuration
 * 
 * Contains API endpoints and application settings.
 * Update API_BASE_URL to match your backend server.
 */

const CONFIG = {
    // API Configuration
    // Use relative URL since frontend is served from same backend
    API_BASE_URL: '',
    API_VERSION: '/api/v1',
    
    // Get full API URL
    get API_URL() {
        return this.API_BASE_URL + this.API_VERSION;
    },
    
    // Admin API endpoints
    ENDPOINTS: {
        // Auth
        LOGIN: '/admin/login',
        LOGOUT: '/admin/logout',
        
        // Tenants
        TENANTS: '/admin/tenants',
        TENANT: (id) => `/admin/tenants/${id}`,
        
        // Domains
        DOMAINS: '/admin/domains',
        DOMAIN: (id) => `/admin/domains/${id}`,
        
        // Users
        USERS: '/admin/users',
        USER: (id) => `/admin/users/${id}`,
        
        // User-Tenant associations
        USER_TENANTS: (userId) => `/admin/users/${userId}/tenants`,
        USER_TENANT: (userId, tenantId) => `/admin/users/${userId}/tenants/${tenantId}`,
        
        // Credential validation
        VALIDATE_CREDENTIALS: '/admin/validate-credentials',
    },
    
    // Storage keys
    STORAGE_KEYS: {
        AUTH_TOKEN: 'filesmile_admin_token',
        USER_INFO: 'filesmile_admin_user',
        REMEMBER_ME: 'filesmile_remember_me',
    },
    
    // Pagination
    ITEMS_PER_PAGE: 10,
    
    // Toast duration (ms)
    TOAST_DURATION: 5000,
    
    // Session timeout (ms) - 24 hours
    SESSION_TIMEOUT: 24 * 60 * 60 * 1000,
};

// Freeze config to prevent modifications
Object.freeze(CONFIG);
Object.freeze(CONFIG.ENDPOINTS);
Object.freeze(CONFIG.STORAGE_KEYS);
