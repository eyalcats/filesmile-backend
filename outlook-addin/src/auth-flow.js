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
            // Step 1: Get user email from Outlook (or manual input as fallback)
            let userEmail = await this.getUserEmail();

            if (!userEmail) {
                console.warn('Could not get email from Outlook, showing manual input');
                // Fallback: ask user to enter email manually
                userEmail = await this.showEmailInputForm();
                if (!userEmail) {
                    return false; // User cancelled
                }
            }

            ConfigHelper.setUserEmail(userEmail);

            // Step 2: Resolve tenant from email domain
            let tenantInfo;
            let selectedTenantId = null;
            let selectedTenantName = null;
            try {
                tenantInfo = await apiClient.resolveTenant(userEmail);
                
                // Check if user needs to select a tenant
                if (tenantInfo.requires_selection && tenantInfo.tenants && tenantInfo.tenants.length > 1) {
                    // Show tenant selection UI
                    const selectedTenant = await this.showTenantSelectionUI(userEmail, tenantInfo.tenants);
                    if (!selectedTenant) {
                        return false; // User cancelled
                    }
                    selectedTenantId = selectedTenant.tenant_id;
                    selectedTenantName = selectedTenant.tenant_name;
                } else {
                    selectedTenantId = tenantInfo.tenant_id;
                    selectedTenantName = tenantInfo.tenant_name;
                }
                
                ConfigHelper.setTenantId(selectedTenantId);
            } catch (error) {
                if (error.message.includes('TENANT_NOT_FOUND')) {
                    await this.showTenantNotFoundUI(userEmail);
                    return false;
                }
                throw error;
            }

            // Step 3: Show ERP credentials form and validate (also registers user)
            const result = await this.showCredentialsForm(userEmail, selectedTenantName, selectedTenantId);
            if (!result) {
                return false;
            }
            
            // The form already called registerUser and got the response
            const { credentials: erpCredentials, response } = result;

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
            localStorage.setItem('filesmile_tenant_id', selectedTenantId.toString());
            localStorage.setItem('filesmile_tenant_name', selectedTenantName);
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
            const storedTenantId = localStorage.getItem('filesmile_tenant_id');
            
            if (!userEmail || !erpUsername || !erpPassword) {
                console.error('Missing stored credentials for auto-reauthentication');
                return false;
            }

            console.log(`🔄 Silent auto-reauthentication for: ${userEmail}`);

            // Use stored tenant_id if available (for multi-tenant domains)
            let tenantId = storedTenantId ? parseInt(storedTenantId) : null;
            
            if (!tenantId) {
                // Resolve tenant from email domain
                const tenantInfo = await apiClient.resolveTenant(userEmail);
                if (tenantInfo.requires_selection) {
                    // Can't auto-reauthenticate without stored tenant_id
                    throw new Error('Tenant selection required');
                }
                tenantId = tenantInfo.tenant_id;
            }
            
            ConfigHelper.setTenantId(tenantId);

            // Register user and get new JWT using stored credentials
            const response = await apiClient.registerUser({
                email: userEmail,
                display_name: Office.context.mailbox.userProfile.displayName,
                erp_username: erpUsername,
                erp_password_or_token: erpPassword,
                tenant_id: tenantId  // Include tenant_id for multi-tenant domains
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
            localStorage.removeItem('filesmile_tenant_id');
            localStorage.removeItem('filesmile_tenant_name');
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
                // Check if Office.js is available
                if (typeof Office === 'undefined') {
                    console.warn('Office.js not loaded - running outside Outlook');
                    resolve(null);
                    return;
                }

                // Check if Office.context is available
                if (!Office.context) {
                    console.warn('Office.context is undefined - Office.js may not be fully initialized');
                    resolve(null);
                    return;
                }

                // Check if mailbox context is available
                if (!Office.context.mailbox) {
                    console.warn('Office.context.mailbox is undefined - add-in may not be loaded in mail context');
                    console.log('Office.context.host:', Office.context.host);
                    console.log('Office.context.platform:', Office.context.platform);
                    resolve(null);
                    return;
                }

                // Try to get email from user profile
                if (Office.context.mailbox.userProfile && Office.context.mailbox.userProfile.emailAddress) {
                    const email = Office.context.mailbox.userProfile.emailAddress;
                    resolve(email);
                    return;
                }

                // Fallback: try to get from current mail item
                if (Office.context.mailbox.item && Office.context.mailbox.item.from) {
                    resolve(Office.context.mailbox.item.from.emailAddress);
                    return;
                }

                // If all else fails
                console.warn('Could not get user email from any source');
                resolve(null);
            } catch (error) {
                console.error('Error getting user email:', error);
                resolve(null);
            }
        });
    }

    /**
     * Show manual email input form (fallback when Outlook context unavailable)
     * @returns {Promise<string|null>} - Email address or null if cancelled
     */
    static async showEmailInputForm() {
        return new Promise((resolve) => {
            const lang = ConfigHelper.getLanguage();
            const isRTL = lang === 'he';
            const dir = isRTL ? 'rtl' : 'ltr';

            const messages = {
                en: {
                    title: 'Login',
                    subtitle: 'Enter your email to login',
                    emailLabel: 'Email',
                    emailPlaceholder: 'your.email@company.com',
                    login: 'Login',
                    cancel: 'Cancel',
                    invalidEmail: 'Please enter a valid email address'
                },
                he: {
                    title: 'התחברות',
                    subtitle: 'הזן את האימייל שלך להתחברות',
                    emailLabel: 'אימייל',
                    emailPlaceholder: 'your.email@company.com',
                    login: 'התחבר',
                    cancel: 'ביטול',
                    invalidEmail: 'אנא הזן כתובת אימייל תקינה'
                }
            };
            const t = messages[lang] || messages.en;

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                border-radius: 12px;
                padding: 24px;
                max-width: 340px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
                direction: ${dir};
            `;

            modal.innerHTML = `
                <div style="text-align: center; margin-bottom: 20px;">
                    <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #333;">${t.title}</h2>
                    <p style="margin: 0; font-size: 13px; color: #666;">${t.subtitle}</p>
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 6px; font-size: 13px; font-weight: 500; color: #333;">${t.emailLabel}</label>
                    <input type="email" id="email-input" placeholder="${t.emailPlaceholder}" style="
                        width: 100%;
                        padding: 12px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        font-size: 14px;
                        box-sizing: border-box;
                        direction: ltr;
                        text-align: left;
                    ">
                    <p id="email-error" style="display: none; margin: 6px 0 0 0; font-size: 12px; color: #d32f2f;">${t.invalidEmail}</p>
                </div>
                <div style="display: flex; gap: 10px;">
                    <button id="cancel-btn" style="
                        flex: 1;
                        padding: 12px;
                        background: #f5f5f5;
                        color: #333;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        font-size: 14px;
                        cursor: pointer;
                    ">${t.cancel}</button>
                    <button id="login-btn" style="
                        flex: 1;
                        padding: 12px;
                        background: #FFC107;
                        color: #000;
                        border: none;
                        border-radius: 8px;
                        font-size: 14px;
                        font-weight: 600;
                        cursor: pointer;
                    ">${t.login}</button>
                </div>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const emailInput = modal.querySelector('#email-input');
            const emailError = modal.querySelector('#email-error');
            const loginBtn = modal.querySelector('#login-btn');
            const cancelBtn = modal.querySelector('#cancel-btn');

            // Focus input
            setTimeout(() => emailInput.focus(), 100);

            // Email validation regex
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

            const validateAndSubmit = () => {
                const email = emailInput.value.trim();
                if (!emailRegex.test(email)) {
                    emailError.style.display = 'block';
                    emailInput.style.borderColor = '#d32f2f';
                    return;
                }
                document.body.removeChild(overlay);
                resolve(email);
            };

            loginBtn.addEventListener('click', validateAndSubmit);

            emailInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') validateAndSubmit();
            });

            emailInput.addEventListener('input', () => {
                emailError.style.display = 'none';
                emailInput.style.borderColor = '#ddd';
            });

            cancelBtn.addEventListener('click', () => {
                document.body.removeChild(overlay);
                resolve(null);
            });
        });
    }

    /**
     * Show UI for entering ERP credentials
     * @param {string} email - User email
     * @param {string} tenantName - Tenant name
     * @param {number} tenantId - Tenant ID for registration
     * @returns {Promise<{username: string, password: string, displayName?: string} | null>}
     */
    static async showCredentialsForm(email, tenantName, tenantId) {
        return new Promise((resolve) => {
            // Get current language and direction
            const lang = ConfigHelper.getLanguage();
            const isRTL = lang === 'he';
            const dir = isRTL ? 'rtl' : 'ltr';
            
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
                direction: ${dir};
                text-align: ${isRTL ? 'right' : 'left'};
            `;

            modal.innerHTML = `
                <h3 style="margin-top: 0;">🔐 ${ConfigHelper.t('erpLoginRequired')}</h3>
                <p style="color: #666; font-size: 14px;">
                    <strong>${ConfigHelper.t('organization')}</strong> ${tenantName}<br>
                    <strong>${ConfigHelper.t('email')}</strong> ${email}
                </p>
                <p style="color: #666; font-size: 13px;">
                    ${ConfigHelper.t('enterErpCredentials')}
                </p>
                <div id="error-message" style="display: none; margin-bottom: 12px; padding: 8px; background: #ffebee; border: 1px solid #f44336; border-radius: 4px; color: #c62828; font-size: 13px;"></div>
                <form id="erp-credentials-form" autocomplete="off">
                    <div style="margin-bottom: 12px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500;">
                            ${ConfigHelper.t('erpUsername')} *
                        </label>
                        <input
                            type="text"
                            id="erp-username-input"
                            required
                            placeholder="${ConfigHelper.t('enterErpUsername')}"
                            autocomplete="off"
                            style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box;"
                        />
                    </div>
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500;">
                            ${ConfigHelper.t('erpPassword')} *
                        </label>
                        <input
                            type="password"
                            id="erp-password-input"
                            required
                            placeholder="${ConfigHelper.t('enterErpPassword')}"
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
                            ${ConfigHelper.t('cancel')}
                        </button>
                        <button
                            type="submit"
                            id="login-btn"
                            style="padding: 8px 16px; border: none; background: linear-gradient(135deg, #FDB913 0%, #FFD54F 100%); color: #2C2C2C; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"
                        >
                            ${ConfigHelper.t('login')}
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
                    loginBtn.textContent = ConfigHelper.t('validating');
                    errorMessage.style.display = 'none';

                    try {
                        // Validate credentials by attempting registration
                        console.log('DEBUG: Registering with tenant_id:', tenantId);
                        const requestData = {
                            email: email,
                            erp_username: username,
                            erp_password_or_token: password,
                            tenant_id: tenantId
                        };
                        console.log('DEBUG: Request data:', JSON.stringify(requestData));
                        const response = await apiClient.registerUser(requestData);

                        // Success - close modal and resolve with credentials AND response
                        document.body.removeChild(overlay);
                        resolve({ credentials: { username, password }, response });
                        
                    } catch (error) {
                        // Handle 401 Unauthorized specifically
                        if (error.status === 401) {
                            errorMessage.textContent = '❌ ' + ConfigHelper.t('invalidErpCredentials');
                            errorMessage.style.display = 'block';
                        } else {
                            errorMessage.textContent = `❌ ${error.message || ConfigHelper.t('authenticationFailed')}`;
                            errorMessage.style.display = 'block';
                        }
                        
                        // Re-enable button and restore text
                        loginBtn.disabled = false;
                        loginBtn.textContent = ConfigHelper.t('login');
                        
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
     * Show tenant selection UI when domain has multiple tenants
     * @param {string} email - User email
     * @param {Array} tenants - List of available tenants
     * @returns {Promise<{tenant_id: number, tenant_name: string} | null>}
     */
    static async showTenantSelectionUI(email, tenants) {
        return new Promise((resolve) => {
            // Get current language and direction
            const lang = ConfigHelper.getLanguage();
            const isRTL = lang === 'he';
            const dir = isRTL ? 'rtl' : 'ltr';
            
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
                direction: ${dir};
                text-align: ${isRTL ? 'right' : 'left'};
            `;

            const tenantOptions = tenants.map(t => 
                `<option value="${t.tenant_id}">${t.tenant_name}</option>`
            ).join('');

            modal.innerHTML = `
                <h3 style="margin-top: 0;">🏢 ${ConfigHelper.t('selectOrganization')}</h3>
                <p style="color: #666; font-size: 14px;">
                    <strong>${ConfigHelper.t('email')}</strong> ${email}
                </p>
                <p style="color: #666; font-size: 13px;">
                    ${ConfigHelper.t('emailDomainMultiOrg')}
                </p>
                <form id="tenant-selection-form">
                    <div style="margin-bottom: 16px;">
                        <label style="display: block; margin-bottom: 4px; font-size: 13px; font-weight: 500;">
                            ${ConfigHelper.t('organization')} *
                        </label>
                        <select
                            id="tenant-select"
                            required
                            style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; font-size: 14px;"
                        >
                            <option value="">${ConfigHelper.t('selectAnOrganization')}</option>
                            ${tenantOptions}
                        </select>
                    </div>
                    <div style="display: flex; gap: 8px; justify-content: flex-end;">
                        <button
                            type="button"
                            id="cancel-btn"
                            style="padding: 8px 16px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;"
                        >
                            ${ConfigHelper.t('cancel')}
                        </button>
                        <button
                            type="submit"
                            id="continue-btn"
                            style="padding: 8px 16px; border: none; background: linear-gradient(135deg, #FDB913 0%, #FFD54F 100%); color: #2C2C2C; border-radius: 4px; cursor: pointer; font-weight: 600; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);"
                        >
                            ${ConfigHelper.t('continue')}
                        </button>
                    </div>
                </form>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            // Handle form submission
            const form = modal.querySelector('#tenant-selection-form');
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const select = modal.querySelector('#tenant-select');
                const selectedId = parseInt(select.value);
                
                if (selectedId) {
                    const selectedTenant = tenants.find(t => t.tenant_id === selectedId);
                    document.body.removeChild(overlay);
                    resolve(selectedTenant);
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
        const lang = ConfigHelper.getLanguage();
        const isRTL = lang === 'he';

        const messages = {
            en: {
                title: 'Organization Not Found',
                message: `No organization found for domain: ${domain}`,
                instruction: 'Please contact your IT administrator to set up access for your organization.',
                close: 'Close'
            },
            he: {
                title: 'הארגון לא נמצא',
                message: `לא נמצא ארגון עבור הדומיין: ${domain}`,
                instruction: 'אנא פנה למנהל המערכת שלך כדי להגדיר גישה עבור הארגון שלך.',
                close: 'סגור'
            }
        };
        const t = messages[lang] || messages.en;

        await this.showErrorModal(t.title, t.message, t.instruction, t.close, isRTL);
    }

    /**
     * Show general error UI
     * @param {string} message - Error message
     */
    static async showErrorUI(message) {
        const lang = ConfigHelper.getLanguage();
        const isRTL = lang === 'he';

        const messages = {
            en: {
                title: 'Authentication Error',
                instruction: 'Please try again or contact support.',
                close: 'Close'
            },
            he: {
                title: 'שגיאת אימות',
                instruction: 'אנא נסה שוב או פנה לתמיכה.',
                close: 'סגור'
            }
        };
        const t = messages[lang] || messages.en;

        await this.showErrorModal(t.title, message, t.instruction, t.close, isRTL);
    }

    /**
     * Show error modal dialog (replacement for alert())
     * @param {string} title - Modal title
     * @param {string} message - Error message
     * @param {string} instruction - Additional instruction
     * @param {string} closeText - Close button text
     * @param {boolean} isRTL - Right-to-left layout
     */
    static async showErrorModal(title, message, instruction, closeText, isRTL = false) {
        return new Promise((resolve) => {
            const dir = isRTL ? 'rtl' : 'ltr';

            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;

            const modal = document.createElement('div');
            modal.style.cssText = `
                background: white;
                border-radius: 8px;
                padding: 24px;
                max-width: 350px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
                direction: ${dir};
                text-align: ${isRTL ? 'right' : 'left'};
            `;

            modal.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                    <span style="font-size: 24px;">❌</span>
                    <h3 style="margin: 0; color: #d32f2f; font-size: 18px;">${title}</h3>
                </div>
                <p style="margin: 0 0 12px 0; color: #333; font-size: 14px; line-height: 1.5;">${message}</p>
                <p style="margin: 0 0 20px 0; color: #666; font-size: 13px; line-height: 1.4;">${instruction}</p>
                <button id="error-close-btn" style="
                    width: 100%;
                    padding: 12px;
                    background: #d32f2f;
                    color: white;
                    border: none;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 600;
                    cursor: pointer;
                ">${closeText}</button>
            `;

            overlay.appendChild(modal);
            document.body.appendChild(overlay);

            const closeModal = () => {
                document.body.removeChild(overlay);
                resolve();
            };

            modal.querySelector('#error-close-btn').addEventListener('click', closeModal);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) closeModal();
            });
        });
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
