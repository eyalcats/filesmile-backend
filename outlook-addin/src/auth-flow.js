/**
 * Multi-Tenant Authentication Flow for Outlook Add-in
 *
 * Handles:
 * 1. Getting user email from Outlook
 * 2. Resolving tenant from email domain
 * 3. User registration/login with ERP credentials
 * 4. JWT token management
 * 5. Re-authentication on token expiry
 */

class AuthFlow {
    /**
     * Initialize authentication flow on add-in startup
     * @returns {Promise<boolean>} - True if authenticated, false if needs login
     */
    static async initialize() {
        // Check for existing authentication with JWT
        const jwtToken = ConfigHelper.getJwtToken();
        if (jwtToken) {
            return true;
        }

        // Check for one-time registration completion flag
        const registrationComplete = localStorage.getItem('filesmile_registration_complete');
        if (registrationComplete === 'true') {
            // Registration completed previously but JWT expired, auto-reauthenticating
            return await this.autoReauthenticate();
        }

        // Check for legacy API key (backward compatibility)
        const apiKey = ConfigHelper.getApiKey();
        if (apiKey) {
            // User has legacy API key, consider migrating to JWT
            return true;
        }

        // Need to authenticate
        return await this.startLoginFlow();
    }

    /**
     * Start the multi-tenant login flow
     * @returns {Promise<boolean>} - True if successful, false otherwise
     */
    static async startLoginFlow() {
        try {
            // Step 1: Get user email from Outlook
            const userEmail = await this.getUserEmail();
            if (!userEmail) {
                throw new Error('Could not retrieve user email from Outlook');
            }

            ConfigHelper.setUserEmail(userEmail);

            // Step 2: Resolve tenant from email domain
            let tenantInfo;
            try {
                tenantInfo = await apiClient.resolveTenant(userEmail);
                ConfigHelper.setTenantId(tenantInfo.tenant_id);
            } catch (error) {
                if (error.message.includes('TENANT_NOT_FOUND')) {
                    await this.showTenantNotFoundUI(userEmail);
                    return false;
                }
                throw error;
            }

            // Step 3: Show ERP credentials form and validate
            const erpCredentials = await this.showCredentialsForm(userEmail, tenantInfo.tenant_name);
            if (!erpCredentials) {
                return false;
            }

            // Step 4: Register user and get JWT (credentials already validated in form)
            const response = await apiClient.registerUser({
                email: userEmail,
                erp_username: erpCredentials.username,
                erp_password_or_token: erpCredentials.password
            });

            // Step 5: Store JWT token and mark registration complete
            ConfigHelper.setJwtToken(response.access_token);
            ConfigHelper.setTenantId(response.tenant_id);
            ConfigHelper.setUserInfo({
                user_id: response.user_id,
                email: response.email,
                tenant_id: response.tenant_id
            });
            
            // Store encrypted credentials for silent re-authentication
            localStorage.setItem('filesmile_registration_complete', 'true');
            localStorage.setItem('filesmile_user_email', userEmail);
            // Note: In production, you might want to encrypt these locally
            localStorage.setItem('filesmile_erp_username', erpCredentials.username);
            localStorage.setItem('filesmile_erp_password', erpCredentials.password);

            // Step 6: Load application data after successful registration
            // This ensures JWT token is stored before making API calls
            try {
                // Import and call the data loading functions from taskpane.js
                const { loadCompanies, loadSearchGroups } = await import('./taskpane.js');
                await Promise.all([
                    loadCompanies(),
                    loadSearchGroups()
                ]);
            } catch (loadError) {
                console.error('❌ Failed to load application data:', loadError);
            }
            
            return true;

        } catch (error) {
            console.error('❌ Authentication flow failed:', error);
            await this.showErrorUI(error.message);
            return false;
        }
    }

    /**
     * Auto-reauthenticate user silently without showing registration form
     * Used when registration was completed before but JWT expired
     * @returns {Promise<boolean>} - True if successful, false otherwise
     */
    static async autoReauthenticate() {
        try {
            // Get stored credentials
            const userEmail = localStorage.getItem('filesmile_user_email');
            const erpUsername = localStorage.getItem('filesmile_erp_username');
            const erpPassword = localStorage.getItem('filesmile_erp_password');
            
            if (!userEmail || !erpUsername || !erpPassword) {
                console.error('Missing stored credentials for auto-reauthentication');
                return false;
            }

            console.log(`🔄 Silent auto-reauthentication for: ${userEmail}`);

            // Resolve tenant from email domain
            const tenantInfo = await apiClient.resolveTenant(userEmail);
            ConfigHelper.setTenantId(tenantInfo.tenant_id);

            // Register user and get new JWT using stored credentials
            const response = await apiClient.registerUser({
                email: userEmail,
                display_name: Office.context.mailbox.userProfile.displayName,
                erp_username: erpUsername,
                erp_password_or_token: erpPassword
            });

            // Store new JWT token
            ConfigHelper.setJwtToken(response.access_token);
            ConfigHelper.setTenantId(response.tenant_id);
            ConfigHelper.setUserInfo({
                user_id: response.user_id,
                email: response.email,
                tenant_id: response.tenant_id
            });

            return true;

        } catch (error) {
            console.error('❌ Silent re-authentication failed:', error);
            // Clear stored credentials and fall back to full registration
            localStorage.removeItem('filesmile_registration_complete');
            localStorage.removeItem('filesmile_user_email');
            localStorage.removeItem('filesmile_erp_username');
            localStorage.removeItem('filesmile_erp_password');
            return await this.startLoginFlow();
        }
    }

    /**
     * Get user email from Outlook context
     * @returns {Promise<string>} - User's email address
     */
    static async getUserEmail() {
        return new Promise((resolve) => {
            try {
                // Try to get email from user profile
                const email = Office.context.mailbox.userProfile.emailAddress;
                if (email) {
                    resolve(email);
                    return;
                }

                // Fallback: try to get from mailbox
                if (Office.context.mailbox.item && Office.context.mailbox.item.from) {
                    resolve(Office.context.mailbox.item.from.emailAddress);
                    return;
                }

                // If all else fails
                resolve(null);
            } catch (error) {
                console.error('Error getting user email:', error);
                resolve(null);
            }
        });
    }

    /**
     * Show UI for entering ERP credentials
     * @param {string} email - User email
     * @param {string} tenantName - Tenant name
     * @returns {Promise<{username: string, password: string, displayName?: string} | null>}
     */
    static async showCredentialsForm(email, tenantName) {
        return new Promise((resolve) => {
            // Create modal overlay
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                padding: 20px;
                border-radius: 8px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            `;

            modal.innerHTML = `
                <h3 style="margin-top: 0;">🔐 ERP Login Required</h3>
                <p style="color: #666; font-size: 14px;">
                    <strong>Organization:</strong> ${tenantName}<br>
                    <strong>Email:</strong> ${email}
                </p>
                <p style="color: #666; font-size: 13px;">
                    Please enter your Priority ERP credentials to continue.
                </p>
                <div id="error-message" style="display: none; margin-bottom: 12px; padding: 8px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; font-size: 13px;"></div>
                <form id="erp-credentials-form" autocomplete="off">
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500;">
                            ERP Username *
                        </label>
                        <input
                            type="text"
                            id="erp-username-input"
                            required
                            placeholder="Enter your ERP username"
                            autocomplete="off"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                        />
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500;">
                            ERP Password/Token *
                        </label>
                        <input
                            type="password"
                            id="erp-password-input"
                            required
                            placeholder="Enter your ERP password"
                            autocomplete="new-password"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                        />
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button
                            type="button"
                            id="cancel-btn"
                            style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            id="login-btn"
                            style="padding: 8px 16px; border: none; background: linear-gradient(135deg, #FDB913 0%, #FFD54F 100%); color: #2C2C2C; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"
                        >
                            Login
                        </button>
                    </div>
                </form>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Focus first input
            setTimeout(() => {
                modal.querySelector('#erp-username-input').focus();
            }, 100);

            // Handle form submission
            const form = modal.querySelector('#erp-credentials-form');
            const errorMessage = modal.querySelector('#error-message');
            const loginBtn = modal.querySelector('#login-btn');
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const username = modal.querySelector('#erp-username-input').value.trim();
                const password = modal.querySelector('#erp-password-input').value;

                if (username && password) {
                    // Disable button and show loading state
                    loginBtn.disabled = true;
                    loginBtn.textContent = 'Validating...';
                    errorMessage.style.display = 'none';

                    try {
                        // Validate credentials by attempting registration
                        await apiClient.registerUser({
                            email: email,
                            erp_username: username,
                            erp_password_or_token: password
                        });

                        // Success - close modal and resolve
                        document.body.removeChild(overlay);
                        resolve({ username, password });
                        
                    } catch (error) {
                        // Handle 401 Unauthorized specifically
                        if (error.status === 401) {
                            errorMessage.textContent = '❌ Invalid ERP credentials. Please check your username and password and try again.';
                            errorMessage.style.display = 'block';
                        } else {
                            errorMessage.textContent = `❌ ${error.message || 'Authentication failed. Please try again.'}`;
                            errorMessage.style.display = 'block';
                        }
                        
                        // Re-enable button and restore text
                        loginBtn.disabled = false;
                        loginBtn.textContent = 'Login';
                        
                        // Focus back to username field for retry
                        modal.querySelector('#erp-username-input').focus();
                    }
                }
            });

            // Handle cancel
            modal.querySelector('#cancel-btn').addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(null);
            });
        });
    }

    /**
     * Show error when tenant is not found
     * @param {string} email - User email
     */
    static async showTenantNotFoundUI(email) {
        const domain = email.split('@')[1];
        alert(`❌ No organization found for domain: ${domain}\n\nPlease contact your IT administrator to set up multi-tenant access for your organization.`);
    }

    /**
     * Show general error UI
     * @param {string} message - Error message
     */
    static async showErrorUI(message) {
        alert(`❌ Authentication Error\n\n${message}\n\nPlease try again or contact support.`);
    }

    /**
     * Handle authentication required error (token expired)
     * @returns {Promise<boolean>} - True if re-authenticated successfully
     */
    static async handleAuthRequired() {
        // Authentication required, starting re-login flow

        // Clear old JWT
        ConfigHelper.setJwtToken(null);

        // Try to re-authenticate
        return await this.startLoginFlow();
    }

    /**
     * Logout user and clear all stored data
     */
    static logout() {
        ConfigHelper.clearStorage();
        window.location.reload();
    }
}
