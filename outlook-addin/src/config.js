/**
 * Configuration for FileSmile Outlook Add-in
 */

const CONFIG = {
    // API Configuration (relative path since backend serves frontend)
    API_BASE_URL: '/api/v1',

    // Storage keys for local settings (shared with scanner-app)
    STORAGE_KEYS: {
        API_KEY: 'filesmile_api_key', // Legacy - for backward compatibility
        JWT_TOKEN: 'filesmile_jwt_token', // New - multi-tenant JWT
        TENANT_ID: 'filesmile_tenant_id',
        USER_EMAIL: 'filesmile_user_email',
        USER_INFO: 'filesmile_user_info',
        LAST_SEARCH_GROUP: 'filesmile_last_group',
        SELECTED_COMPANY: 'filesmile_selected_company',
        LANGUAGE: 'filesmile_language',
        LAST_DOC_TYPE: 'filesmile_last_doc_type'
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
        
        // Check if document is already set to RTL (set by taskpane.js)
        if (document.dir === 'rtl' || document.documentElement.dir === 'rtl') {
            return 'he';
        }
        
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
        cancel: 'Cancel',
        
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
        uploadingFileOf: 'Uploading {current} of {total} files...',
        exportingFileOf: 'Exporting {current} of {total} files...',
        uploadSummary: '{success} succeeded, {failed} failed out of {total}',

        // Headers
        searchDocuments: 'Search Documents',
        selectedDocument: 'Selected Document',
        exportActions: 'Export Actions',
        exportDescription: 'Save files to Priority staging area for later processing',
        attachActions: 'Attach Actions',
        attachDescription: 'Link files directly to the selected document',
        
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
        emailExportedSuccess: 'Email exported successfully!',
        noDocumentsFound: 'No documents found',
        uploadFailed: 'Upload failed',
        uploadedFilesSuccess: 'Uploaded {count} files successfully!',
        documents: 'Documents',
        
        // Auth Flow
        selectOrganization: 'Select Your Organization',
        emailDomainMultiOrg: 'Your email domain is connected to multiple organizations. Please select the one you want to use.',
        selectAnOrganization: 'Select an organization...',
        continue: 'Continue',
        erpLoginRequired: 'ERP Login Required',
        enterErpCredentials: 'Please enter your Priority ERP credentials to continue.',
        erpUsername: 'ERP Username',
        erpPassword: 'ERP Password/Token',
        enterErpUsername: 'Enter your ERP username',
        enterErpPassword: 'Enter your ERP password',
        login: 'Login',
        validating: 'Validating...',
        invalidErpCredentials: 'Invalid ERP credentials. Please check your username and password and try again.',
        authenticationFailed: 'Authentication failed. Please try again.',

        // Error messages
        noAttachmentsInEmail: 'No attachments found in this email.',
        noCompaniesFound: 'No companies found',
        errorLoadingCompanies: 'Error loading companies',
        searchFailed: 'Search failed',
        selectDocumentFirst: 'Please select a document first',
        exportFailed: 'Export failed',
        exportedFilesSuccess: 'Exported {count} files to Priority staging area!',

        // Auth flow (additional)
        loginTitle: 'Login',
        loginSubtitle: 'Enter your email to login',
        emailLabel: 'Email',
        emailPlaceholder: 'your.email@company.com',
        invalidEmail: 'Please enter a valid email address',
        tenantNotFoundTitle: 'Organization Not Found',
        tenantNotFoundMessage: 'No organization found for domain: {domain}',
        tenantNotFoundInstruction: 'Please contact your IT administrator to set up access for your organization.',
        authErrorTitle: 'Authentication Error',
        authErrorInstruction: 'Please try again or contact support.',
        close: 'Close',

        // Email helper
        emailFromSubject: 'Email from {sender}: {subject}'
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
        cancel: 'ביטול',
        
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
        exportDescription: 'שמירת קבצים לאזור ההכנה של Priority לעיבוד מאוחר יותר',
        attachActions: 'פעולות צירוף',
        attachDescription: 'קישור קבצים ישירות למסמך שנבחר',
        
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
        uploadingFileOf: 'מעלה {current} מתוך {total} קבצים...',
        exportingFileOf: 'מייצא {current} מתוך {total} קבצים...',
        uploadSummary: '{success} הצליחו, {failed} נכשלו מתוך {total}',

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
        emailExportedSuccess: 'הדוא"ל יוצא בהצלחה!',
        noDocumentsFound: 'לא נמצאו מסמכים',
        uploadFailed: 'העלאה נכשלה',
        uploadedFilesSuccess: 'הועלו {count} קבצים בהצלחה!',
        documents: 'מסמכים',
        
        // Auth Flow
        selectOrganization: 'בחר את הארגון שלך',
        emailDomainMultiOrg: 'הדומיין של הדוא"ל שלך מחובר למספר ארגונים. אנא בחר את הארגון שברצונך להשתמש בו.',
        selectAnOrganization: 'בחר ארגון...',
        continue: 'המשך',
        erpLoginRequired: 'נדרשת התחברות ל-ERP',
        enterErpCredentials: 'אנא הזן את פרטי ההתחברות שלך ל-Priority ERP כדי להמשיך.',
        erpUsername: 'שם משתמש ERP',
        erpPassword: 'סיסמה/טוקן ERP',
        enterErpUsername: 'הזן את שם המשתמש שלך ב-ERP',
        enterErpPassword: 'הזן את הסיסמה שלך ב-ERP',
        login: 'התחבר',
        validating: 'מאמת...',
        invalidErpCredentials: 'פרטי התחברות ל-ERP שגויים. אנא בדוק את שם המשתמש והסיסמה ונסה שוב.',
        authenticationFailed: 'האימות נכשל. אנא נסה שוב.',

        // Error messages
        noAttachmentsInEmail: 'לא נמצאו קבצים מצורפים בהודעה זו.',
        noCompaniesFound: 'לא נמצאו חברות',
        errorLoadingCompanies: 'שגיאה בטעינת חברות',
        searchFailed: 'החיפוש נכשל',
        selectDocumentFirst: 'אנא בחר מסמך קודם',
        exportFailed: 'הייצוא נכשל',
        exportedFilesSuccess: 'יוצאו {count} קבצים לאזור ההכנה של Priority!',

        // Auth flow (additional)
        loginTitle: 'התחברות',
        loginSubtitle: 'הזן את האימייל שלך להתחברות',
        emailLabel: 'אימייל',
        emailPlaceholder: 'your.email@company.com',
        invalidEmail: 'אנא הזן כתובת אימייל תקינה',
        tenantNotFoundTitle: 'הארגון לא נמצא',
        tenantNotFoundMessage: 'לא נמצא ארגון עבור הדומיין: {domain}',
        tenantNotFoundInstruction: 'אנא פנה למנהל המערכת שלך כדי להגדיר גישה עבור הארגון שלך.',
        authErrorTitle: 'שגיאת אימות',
        authErrorInstruction: 'אנא נסה שוב או פנה לתמיכה.',
        close: 'סגור',

        // Email helper
        emailFromSubject: 'הודעה מ-{sender}: {subject}'
    }
};
