/**
 * API Client for FileSmile Backend
 */

class FileSmileAPI {
    constructor() {
        this.baseUrl = CONFIG.API_BASE_URL;
    }

    /**
     * Make an authenticated API request
     * Supports both JWT Bearer token (preferred) and legacy API key
     */
    async request(endpoint, options = {}) {
        const jwtToken = ConfigHelper.getJwtToken();
        const apiKey = ConfigHelper.getApiKey();

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Prefer JWT Bearer token over legacy API key
        if (jwtToken) {
            headers['Authorization'] = `Bearer ${jwtToken}`;
        } else if (apiKey) {
            headers['X-API-Key'] = apiKey;
        }

        const url = `${this.baseUrl}${endpoint}`;


        let response;
        try {
            response = await fetch(url, {
                ...options,
                headers
            });
        } catch (fetchError) {
            // Network error (server unreachable, no internet, CORS, etc.)
            console.error('Network error:', fetchError);
            const error = new Error(`Unable to connect to server: ${fetchError.message || 'Network error'}`);
            error.code = 'NETWORK_ERROR';
            throw error;
        }

        try {
            // Handle 401 Unauthorized - token expired or invalid
            if (response.status === 401 && jwtToken) {
                console.warn('JWT token expired or invalid, clearing auth');
                ConfigHelper.setJwtToken(null);
                // Trigger re-authentication by throwing special error
                const error = new Error('AUTHENTICATION_REQUIRED');
                error.code = 'AUTH_REQUIRED';
                throw error;
            }

            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({ error: response.statusText }));
                throw new Error(errorBody.detail || errorBody.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // ========================================================================
    // Multi-Tenant Authentication (New)
    // ========================================================================

    /**
     * Resolve tenant from user email
     * @param {string} email - User's email address
     * @returns {Promise<{tenant_id: number, tenant_name: string}>}
     */
    async resolveTenant(email) {
        return await this.request('/auth/tenant/resolve', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    /**
     * Register user with ERP credentials and get JWT token
     * @param {Object} userData - User registration data
     * @param {string} userData.email - User email
     * @param {string} userData.display_name - User display name
     * @param {string} userData.erp_username - ERP username
     * @param {string} userData.erp_password_or_token - ERP password/token
     * @returns {Promise<{access_token: string, tenant_id: number, user_id: number}>}
     */
    async registerUser(userData) {
        return await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    /**
     * Switch to a different tenant using stored credentials on the server
     * @param {string} email - User's email address
     * @param {number} tenantId - Target tenant ID to switch to
     * @returns {Promise<{access_token: string, tenant_id: number, user_id: number}>}
     */
    async switchTenant(email, tenantId) {
        return await this.request('/auth/switch-tenant', {
            method: 'POST',
            body: JSON.stringify({ email, tenant_id: tenantId })
        });
    }

    // ========================================================================
    // Legacy API Key Authentication (Backward Compatibility)
    // ========================================================================

    /**
     * Create a new API key (legacy method)
     */
    async createApiKey(username, password, company) {
        return await this.request('/auth/api-key', {
            method: 'POST',
            body: JSON.stringify({
                priority_username: username,
                priority_password: password,
                priority_company: company,
                description: 'Outlook Add-in'
            })
        });
    }

    /**
     * Validate an existing API key (legacy method)
     */
    async validateApiKey(apiKey) {
        return await this.request(`/auth/validate?api_key=${encodeURIComponent(apiKey)}`);
    }

    /**
     * Get available search groups
     */
    async getSearchGroups() {
        return await this.request('/search/groups');
    }

    /**
     * Search for documents in a group
     */
    async searchDocuments(groupId, searchTerm, form = null) {
        const requestBody = {
            group_id: groupId,
            search_term: searchTerm
        };
        
        if (form && form !== '') {
            requestBody.form = form;
        }
        
        return await this.request('/search/documents', {
            method: 'POST',
            body: JSON.stringify(requestBody)
        });
    }

    /**
     * Find document by number
     */
    async findDocumentByNumber(formName, docNumber) {
        return await this.request(`/search/documents/${formName}/${docNumber}`);
    }

    /**
     * Get available companies from a specific server
     */
    async getCompanies(serverUrl = null) {
        const baseUrl = serverUrl || this.baseUrl;
        const endpoint = '/search/companies';
        
        // Use the standard request method to ensure JWT authentication headers are included
        return await this.request(endpoint);
    }

    /**
     * Upload an attachment to a document
     */
    async uploadAttachment(attachmentData) {
        return await this.request('/attachments/upload', {
            method: 'POST',
            body: JSON.stringify(attachmentData)
        });
    }

    /**
     * Add export attachment (staging)
     */
    async addExportAttachment(exportData) {
        return await this.request('/attachments/export', {
            method: 'POST',
            body: JSON.stringify(exportData)
        });
    }
}

/**
 * Email helper functions for Office.js
 */
class EmailHelper {
    /**
     * Get current email as EML format (base64)
     */
    static async getEmailAsEML() {
        return new Promise((resolve, reject) => {
            Office.context.mailbox.item.getAttachmentContentAsync(
                Office.context.mailbox.item.itemId,
                { asyncContext: null },
                (result) => {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        // EML format from Office API
                        const emlContent = result.value.content;
                        resolve(emlContent);
                    } else {
                        // Fallback: construct EML-like format
                        resolve(null);
                    }
                }
            );
        });
    }

    /**
     * Get current email as MSG format (base64)
     * MSG is Microsoft's native Outlook format
     */
    static async constructMSG() {
        return new Promise((resolve, reject) => {
            Office.context.mailbox.item.getAttachmentContentAsync(
                Office.context.mailbox.item.itemId,
                { asyncContext: null, format: Office.MailboxEnums.AttachmentContentFormat.Base64 },
                (result) => {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        // MSG format from Office API
                        const msgContent = result.value.content;
                        resolve(msgContent);
                    } else {
                        // Fallback to EML if MSG not available
                        console.warn('MSG format not available, falling back to EML');
                        this.constructEML().then(resolve).catch(reject);
                    }
                }
            );
        });
    }

    /**
     * Create a basic MSG file format that Priority can accept
     * This creates a simplified MSG structure with proper UTF-8 encoding
     */
    static async constructMSG() {
        const item = Office.context.mailbox.item;

        return new Promise((resolve, reject) => {
            // Get basic email properties
            const from = item.from.emailAddress;
            const to = item.to.map(r => r.emailAddress).join(', ');
            const subject = item.subject;
            const date = new Date().toISOString();

            // Get body
            item.body.getAsync(Office.CoercionType.Text, (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    reject(new Error(result.error.message));
                    return;
                }

                const body = result.value;

                // Create a simplified MSG-like structure
                // This is a basic format that Priority should accept
                const msgContent = [
                    'From: ' + from,
                    'To: ' + to,
                    'Subject: ' + subject,
                    'Date: ' + date,
                    'X-Generator: FileSmile Outlook Add-in',
                    'MIME-Version: 1.0',
                    'Content-Type: text/plain; charset="UTF-8"',
                    'Content-Transfer-Encoding: 8bit',
                    '',
                    body
                ].join('\r\n');

                // Convert to base64 with proper UTF-8 handling
                const base64 = this.stringToBase64(msgContent);
                resolve(base64);
            });
        });
    }

    /**
     * Convert string to base64 with proper UTF-8 support
     */
    static stringToBase64(str) {
        // Convert UTF-8 string to base64 properly
        try {
            // First encode as UTF-8, then convert to base64
            const utf8Bytes = new TextEncoder().encode(str);
            let binary = '';
            utf8Bytes.forEach(byte => binary += String.fromCharCode(byte));
            return btoa(binary);
        } catch (error) {
            // Fallback to older method if TextEncoder not available
            return btoa(unescape(encodeURIComponent(str)));
        }
    }

    /**
     * Get email as EML using MIME format (fallback)
     */
    static async constructEML() {
        const item = Office.context.mailbox.item;

        return new Promise((resolve, reject) => {
            // Get basic email properties
            const from = item.from.emailAddress;
            const to = item.to.map(r => r.emailAddress).join(', ');
            const subject = item.subject;
            const date = item.dateTimeCreated.toISOString();

            // Get body
            item.body.getAsync(Office.CoercionType.Text, (result) => {
                if (result.status === Office.AsyncResultStatus.Failed) {
                    reject(new Error(result.error.message));
                    return;
                }

                const body = result.value;

                // Construct proper EML format with UTF-8 support
                const eml = [
                    `From: ${from}`,
                    `To: ${to}`,
                    `Subject: ${subject}`,
                    `Date: ${date}`,
                    'MIME-Version: 1.0',
                    'Content-Type: text/plain; charset="UTF-8"',
                    'Content-Transfer-Encoding: 8bit',
                    '',
                    body
                ].join('\r\n');

                // Convert the entire EML to base64 with proper UTF-8 handling
                const base64 = this.stringToBase64(eml);
                resolve(base64);
            });
        });
    }

    /**
     * Get list of email attachments
     */
    static getEmailAttachments() {
        const item = Office.context.mailbox.item;
        return item.attachments.map(att => ({
            id: att.id,
            name: att.name,
            size: att.size,
            contentType: att.contentType,
            isInline: att.isInline
        }));
    }

    /**
     * Download an email attachment as base64
     */
    static async getAttachmentContent(attachmentId) {
        return new Promise((resolve, reject) => {
            Office.context.mailbox.item.getAttachmentContentAsync(
                attachmentId,
                (result) => {
                    if (result.status === Office.AsyncResultStatus.Succeeded) {
                        resolve(result.value.content);
                    } else {
                        reject(new Error(result.error.message));
                    }
                }
            );
        });
    }

    /**
     * Get email subject
     */
    static getSubject() {
        return Office.context.mailbox.item.subject;
    }

    /**
     * Get email sender
     */
    static getSender() {
        const from = Office.context.mailbox.item.from;
        return from ? from.displayName || from.emailAddress : 'Unknown';
    }

    /**
     * Get default attachment description
     */
    static getDefaultDescription() {
        const subject = this.getSubject();
        const sender = this.getSender();
        return `Email from ${sender}: ${subject}`;
    }
}

// Create global API client instance
const apiClient = new FileSmileAPI();
