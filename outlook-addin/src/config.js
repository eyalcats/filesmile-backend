/**
 * Configuration for FileSmile Outlook Add-in
 */

const CONFIG = {
    // API Configuration (relative path since backend serves frontend)
    API_BASE_URL: '/api/v1',

    // Storage keys for local settings
    STORAGE_KEYS: {
        API_KEY: 'filesmile_api_key', // Legacy - for backward compatibility
        JWT_TOKEN: 'filesmile_jwt_token', // New - multi-tenant JWT
        TENANT_ID: 'filesmile_tenant_id',
        USER_EMAIL: 'filesmile_user_email',
        USER_INFO: 'filesmile_user_info',
        LAST_SEARCH_GROUP: 'filesmile_last_group',
        SELECTED_COMPANY: 'filesmile_selected_company',
        LANGUAGE: 'filesmile_language'
    },

    // File size limits (in bytes)
    MAX_EMAIL_SIZE: 25 * 1024 * 1024, // 25 MB
    MAX_ATTACHMENT_SIZE: 25 * 1024 * 1024, // 25 MB per attachment

    // UI Configuration
    MAX_SEARCH_RESULTS: 50,
    SEARCH_DEBOUNCE_MS: 300
};

// Helper functions for configuration
const ConfigHelper = {
    /**
     * Get the full API endpoint URL
     */
    getApiUrl(endpoint) {
        return `${CONFIG.API_BASE_URL}${endpoint}`;
    },

    /**
     * Get stored API key from local storage
     */
    getApiKey() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.API_KEY);
    },

    /**
     * Store API key in local storage
     */
    setApiKey(apiKey) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.API_KEY, apiKey);
    },

    /**
     * Get stored user info
     */
    getUserInfo() {
        const userInfoJson = localStorage.getItem(CONFIG.STORAGE_KEYS.USER_INFO);
        return userInfoJson ? JSON.parse(userInfoJson) : null;
    },

    /**
     * Store user info
     */
    setUserInfo(userInfo) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_INFO, JSON.stringify(userInfo));
    },

    /**
     * Clear all stored data (logout)
     */
    clearStorage() {
        Object.values(CONFIG.STORAGE_KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
        // Also clear auth-related items not in CONFIG.STORAGE_KEYS
        localStorage.removeItem('filesmile_registration_complete');
        localStorage.removeItem('filesmile_erp_username');
        localStorage.removeItem('filesmile_erp_password');
        localStorage.removeItem('filesmile_tenant_name');
    },

    /**
     * Check if user is logged in (checks both JWT and legacy API key)
     */
    isLoggedIn() {
        return !!this.getJwtToken() || !!this.getApiKey();
    },

    /**
     * Get stored JWT token
     */
    getJwtToken() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.JWT_TOKEN);
    },

    /**
     * Store JWT token
     */
    setJwtToken(token) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.JWT_TOKEN, token);
    },

    /**
     * Get stored tenant ID
     */
    getTenantId() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.TENANT_ID);
    },

    /**
     * Store tenant ID
     */
    setTenantId(tenantId) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.TENANT_ID, tenantId);
    },

    /**
     * Get stored user email
     */
    getUserEmail() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.USER_EMAIL);
    },

    /**
     * Store user email
     */
    setUserEmail(email) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.USER_EMAIL, email);
    },

    /**
     * Get stored selected company
     */
    getCompany() {
        return localStorage.getItem(CONFIG.STORAGE_KEYS.SELECTED_COMPANY);
    },

    /**
     * Store selected company
     */
    setCompany(company) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.SELECTED_COMPANY, company);
    },

    /**
     * Get current language (default to browser language or 'en')
     */
    getLanguage() {
        const stored = localStorage.getItem(CONFIG.STORAGE_KEYS.LANGUAGE);
        if (stored) return stored;
        
        // Detect browser language
        const browserLang = navigator.language || navigator.userLanguage;
        if (browserLang.startsWith('he')) return 'he';
        return 'en';
    },

    /**
     * Set current language
     */
    setLanguage(lang) {
        localStorage.setItem(CONFIG.STORAGE_KEYS.LANGUAGE, lang);
    },

    /**
     * Get translation for current language
     */
    t(key) {
        const lang = this.getLanguage();
        return TRANSLATIONS[lang][key] || TRANSLATIONS['en'][key] || key;
    }
};

// Translations for English and Hebrew
const TRANSLATIONS = {
    en: {
        // Header
        settings: 'Settings',
        info: 'Info',
        
        // Settings Modal
        accountInfo: 'Account Info',
        email: 'Email:',
        organization: 'Organization:',
        actions: 'Actions',
        reenterCredentials: 'Re-enter Credentials',
        reenterCredentialsDesc: 'Update your ERP login details',
        changeTenant: 'Change Organization',
        changeTenantDesc: 'Switch to a different organization',
        logout: 'Logout',
        logoutDesc: 'Sign out and clear all data',
        credentialsUpdated: 'Credentials updated successfully!',
        authFailed: 'Authentication failed',
        noEmailFound: 'No email found. Please restart the add-in.',
        singleTenantOnly: 'You only have access to one organization.',
        tenantChanged: 'Organization changed successfully!',
        tenantNotFound: 'Organization not found.',
        changeTenantFailed: 'Failed to change organization',
        logoutConfirm: 'Are you sure you want to logout? This will clear all stored data.',
        
        // Form labels
        company: 'Company',
        searchBy: 'Search By',
        docType: 'Doc Type',
        searchValue: 'Search Value',
        remarks: 'Remarks / Description',
        
        // Email fields
        from: 'From:',
        date: 'Date:',
        subject: 'Subject:',
        
        // Document fields
        selectedDocument: 'Selected Document',
        type: 'Type:',
        desc: 'Desc:',
        details: 'Details:',
        
        // Buttons
        search: 'Search',
        attachMail: 'Attach Mail',
        exportMail: 'Export Mail',
        attachFiles: 'Attach Files',
        exportFiles: 'Exp. Files',
        uploadSelected: 'Upload Selected',
        exportSelected: 'Export Selected',
        noFilesSelected: 'No files selected',
        
        // Placeholders
        enterNumber: 'Enter number...',
        description: 'Description...',
        
        // Loading states
        loading: 'Loading...',
        processing: 'Processing...',
        
        // Headers
        searchDocuments: 'Search Documents',
        selectedDocument: 'Selected Document',
        exportActions: 'Export Actions',
        attachActions: 'Attach Actions',
        
        // Modals
        selectDocument: 'Select Document',
        selectAttachments: 'Select Attachments',
        
        // Tooltips
        clear: 'Clear',
        clearSelection: 'Clear Selection',
        
        // Messages
        noSubject: 'No subject',
        unknownSender: 'Unknown sender',
        selectSearchGroupFirst: 'Select search group first...',
        noFormsAvailable: 'No forms available',
        emailAttachment: 'Email Attachment',
        attachment: 'Attachment',
        emailAttachedSuccess: 'Email attached successfully!',
        uploadFailed: 'Upload failed',
        uploadedFilesSuccess: 'Uploaded {count} files successfully!',
        documents: 'Documents'
    },
    he: {
        // Header
        settings: 'הגדרות',
        info: 'מידע',
        
        // Settings Modal
        accountInfo: 'פרטי חשבון',
        email: 'דוא"ל:',
        organization: 'ארגון:',
        actions: 'פעולות',
        reenterCredentials: 'הזן מחדש פרטי התחברות',
        reenterCredentialsDesc: 'עדכן את פרטי ההתחברות ל-ERP',
        changeTenant: 'החלף ארגון',
        changeTenantDesc: 'עבור לארגון אחר',
        logout: 'התנתק',
        logoutDesc: 'התנתק ונקה את כל הנתונים',
        credentialsUpdated: 'פרטי ההתחברות עודכנו בהצלחה!',
        authFailed: 'האימות נכשל',
        noEmailFound: 'לא נמצא דוא"ל. אנא הפעל מחדש את התוסף.',
        singleTenantOnly: 'יש לך גישה לארגון אחד בלבד.',
        tenantChanged: 'הארגון הוחלף בהצלחה!',
        tenantNotFound: 'הארגון לא נמצא.',
        changeTenantFailed: 'החלפת הארגון נכשלה',
        logoutConfirm: 'האם אתה בטוח שברצונך להתנתק? פעולה זו תמחק את כל הנתונים השמורים.',
        
        // Form labels
        company: 'חברה',
        searchBy: 'חיפוש לפי',
        docType: 'סוג מסמך',
        searchValue: 'ערך חיפוש',
        remarks: 'הערות / תיאור',
        
        // Email fields
        from: 'מאת:',
        date: 'תאריך:',
        subject: 'נושא:',
        
        // Document fields
        selectedDocument: 'מסמך נבחר',
        type: 'סוג:',
        desc: 'תיאור:',
        details: 'פרטים:',
        
        // Headers
        searchDocuments: 'חיפוש מסמכים',
        exportActions: 'פעולות ייצוא',
        attachActions: 'פעולות צירוף',
        
        // Buttons
        search: 'חיפוש',
        attachMail: 'צרף דוא"ל',
        exportMail: 'ייצא דוא"ל',
        attachFiles: 'צרף קבצים',
        exportFiles: 'ייצא קבצים',
        uploadSelected: 'העלה נבחרים',
        exportSelected: 'ייצא נבחרים',
        noFilesSelected: 'לא נבחרו קבצים',
        
        // Placeholders
        enterNumber: 'הכנס מספר...',
        description: 'תיאור...',
        
        // Loading states
        loading: 'טוען...',
        processing: 'מעבד...',
        
        // Modals
        selectDocument: 'בחר מסמך',
        selectAttachments: 'בחר קבצים מצורפים',
        
        // Tooltips
        clear: 'נקה',
        clearSelection: 'נקה בחירה',
        
        // Messages
        noSubject: 'אין נושא',
        unknownSender: 'שולח לא ידוע',
        selectSearchGroupFirst: 'בחר קבוצת חיפוש קודם...',
        noFormsAvailable: 'אין טפסים זמינים',
        emailAttachment: 'צירוף דוא"ל',
        attachment: 'קובץ מצורף',
        emailAttachedSuccess: 'הדוא"ל צורף בהצלחה!',
        uploadFailed: 'העלאה נכשלה',
        uploadedFilesSuccess: 'הועלו {count} קבצים בהצלחה!',
        documents: 'מסמכים'
    }
};
