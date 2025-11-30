/**
 * FileSmile Outlook Add-in - Mobile/Narrow Layout Logic
 */

// Global state
const state = {
    companies: [],
    searchGroups: [],
    searchResults: [],
    selectedDoc: null,
    attachments: [],
    emailAttachments: [],
    selectedDocument: null,
    attachmentsModalMode: 'attach',  // Initialize modal mode
    tempSelectedDoc: null // For modal selection
};

// Translations
const translations = {
    en: {
        title: "FileSmile - Priority ERP Document Search",
        company: "Company",
        searchBy: "Search By",
        docType: "Doc Type",
        searchTerm: "Search Term",
        search: "Search",
        attachMail: "Attach Email",
        attachFiles: "Attach Selected Files",
        noAttachments: "No attachments found",
        selectDocument: "Please select a document first",
        selectFiles: "Please select files to attach",
        loading: "Loading...",
        noDocumentsFound: "No documents found",
        searchResults: "Search Results",
        attachments: "Attachments",
        close: "Close",
        select: "Select",
        back: "Back",
        emailExported: "Email exported successfully!",
        emailUploaded: "Email attached successfully!"
    },
    he: {
        title: "פיילסמייל - חיפוש מסמכי Priority ERP",
        company: "חברה",
        searchBy: "חיפוש לפי",
        docType: "סוג מסמך",
        searchTerm: "מונח חיפוש",
        search: "חיפוש",
        attachMail: "צרף דוא\"ל",
        attachFiles: "צרף קבצים נבחרים",
        noAttachments: "לא נמצאו קבצים מצורפים",
        selectDocument: "אנא בחר מסמך תחילה",
        selectFiles: "אנא בחר קבצים לצירוף",
        loading: "טוען...",
        noDocumentsFound: "לא נמצאו מסמכים",
        searchResults: "תוצאות חיפוש",
        attachments: "קבצים מצורפים",
        close: "סגור",
        select: "בחר",
        back: "חזור",
        emailExported: "הדוא\"ל יוצא בהצלחה!",
        emailUploaded: "הדוא\"ל צורף בהצלחה!"
    }
};

// Current language (loaded from storage to prevent LTR→RTL jump)
const savedLang = localStorage.getItem('filesmile_language');
console.log('DEBUG: Loading language from localStorage:', savedLang);
// Default to Hebrew if browser language is Hebrew, otherwise English
const browserLang = navigator.language || navigator.userLanguage || '';
const defaultLang = browserLang.startsWith('he') ? 'he' : 'he'; // Default to Hebrew for this app
let currentLang = savedLang || defaultLang;
console.log('DEBUG: currentLang set to:', currentLang);

// Get translation function
function t(key) {
    const result = translations[currentLang][key] || translations.en[key];
    console.log('DEBUG: t() called with key:', key, 'currentLang:', currentLang, 'result:', result);
    return result;
}

// Update UI with translations
function updateUIText() {
    // Update main title
    document.title = t('title');
    const header = document.querySelector('.app-header h1');
    if (header) header.textContent = t('title');
    
    // Set text direction based on language
    const isRTL = currentLang === 'he';
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.dir = isRTL ? 'rtl' : 'ltr'; // Also set document dir for consistency
    document.documentElement.lang = currentLang;
    
    // Update form labels
    const labels = document.querySelectorAll('label');
    labels.forEach(label => {
        const text = label.textContent.trim();
        if (text.includes('Company') || text.includes('חברה')) label.textContent = t('company');
        else if (text.includes('Search By') || text.includes('חיפוש לפי')) label.textContent = t('searchBy');
        else if (text.includes('Doc Type') || text.includes('סוג מסמך')) label.textContent = t('docType');
        else if (text.includes('Search Term') || text.includes('מונח חיפוש')) label.textContent = t('searchTerm');
    });
    
    // Update buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(button => {
        const text = button.textContent.trim();
        if (text.includes('Search') || text.includes('חיפוש')) button.textContent = t('search');
        else if (text.includes('Attach Email') || text.includes('צרף דוא\"ל')) button.textContent = t('attachMail');
        else if (text.includes('Attach Selected Files') || text.includes('צרף קבצים נבחרים')) button.textContent = t('attachFiles');
        else if (text.includes('Close') || text.includes('סגור')) button.textContent = t('close');
        else if (text.includes('Select') || text.includes('בחר')) button.textContent = t('select');
        else if (text.includes('Back') || text.includes('חזור')) button.textContent = t('back');
    });
    
    // Update modal titles
    const modalTitles = document.querySelectorAll('.modal-header h2');
    modalTitles.forEach(title => {
        const text = title.textContent.trim();
        if (text.includes('Search Results') || text.includes('תוצאות חיפוש')) title.textContent = t('searchResults');
        else if (text.includes('Attachments') || text.includes('קבצים מצורפים')) title.textContent = t('attachments');
    });
}

// Switch language
function switchLanguage(lang) {
    console.log('DEBUG: switchLanguage called with:', lang);
    currentLang = lang;
    // Save to localStorage to persist across sessions
    localStorage.setItem('filesmile_language', lang);
    // Also update ConfigHelper so auth modals use correct language
    ConfigHelper.setLanguage(lang);
    console.log('DEBUG: Saved language to localStorage:', lang);
    updateUIText();
    // Update language switcher buttons
    const switcherButtons = document.querySelectorAll('.language-switcher button');
    switcherButtons.forEach(btn => {
        btn.classList.remove('active');
        if ((lang === 'en' && btn.textContent === '🇺🇸') || 
            (lang === 'he' && btn.textContent === '🇮🇱')) {
            btn.classList.add('active');
        }
    });
}

// Initialize Office.js or run directly in browser
if (typeof Office !== 'undefined') {
    Office.onReady((info) => {
        initializeAddIn();
    });
} else {
    // Running outside of Outlook (in browser for testing)
    initializeAddIn();
}

/**
 * Add language switcher to header
 */
function addLanguageSwitcher() {
    const header = document.querySelector('.app-header');
    if (!header) return;
    
    // Create a container for the title and language switcher
    const titleContainer = document.createElement('div');
    titleContainer.className = 'title-container';
    titleContainer.style.display = 'flex';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.gap = '15px';
    
    // Move the h1 to the title container
    const h1 = header.querySelector('h1');
    if (h1) {
        titleContainer.appendChild(h1);
    }
    
    const switcher = document.createElement('div');
    switcher.className = 'language-switcher';
    switcher.innerHTML = `
        <button onclick="switchLanguage('en')" ${currentLang === 'en' ? 'class="active"' : ''} title="English">🇺🇸</button>
        <button onclick="switchLanguage('he')" ${currentLang === 'he' ? 'class="active"' : ''} title="עברית">🇮🇱</button>
    `;
    
    titleContainer.appendChild(switcher);
    header.appendChild(titleContainer);
}

/**
 * Initialize the add-in
 */
async function initializeAddIn() {
    // Language is already loaded at the top of the file, no need to reload here
    // The currentLang variable already has the correct saved language
    
    // Apply translations BEFORE auth flow so modals use correct language
    updateUIText();
    
    // Also sync to ConfigHelper so auth-flow.js can access the language
    ConfigHelper.setLanguage(currentLang);
    
    // Add language switcher to header
    addLanguageSwitcher();
    
    // Check authentication first
    const isAuthenticated = await AuthFlow.initialize();
    
    if (isAuthenticated) {
        // Add a small delay to ensure JWT token is properly stored
        setTimeout(async () => {
            // Load data only after successful authentication and token storage
            await Promise.all([
                loadCompanies(),
                loadSearchGroups()
            ]);
        }, 100);
    } else {
        // AuthFlow will handle registration and then load data
        // Don't load data yet - AuthFlow will trigger registration and then load data
    }
    
    // Initialize the app when Office is ready
    Office.onReady(() => {
        console.log('DEBUG: Office.onReady fired');
        console.log('DEBUG: currentLang before sync:', currentLang);
        // Sync ConfigHelper language with loaded language to prevent direction override
        ConfigHelper.setLanguage(currentLang);
        console.log('DEBUG: ConfigHelper language synced to:', currentLang);
        
        // Apply translations first
        applyTranslations();
        
        if (typeof Office !== 'undefined' && Office.context && Office.context.mailbox) {
            loadEmailDetails();
            // Fetch attachments asynchronously
            state.emailAttachments = EmailHelper.getEmailAttachments();
        }
    });

    // Setup event listeners
    setupEventListeners();
}

/**
 * Set up all event listeners
 */
function setupEventListeners() {
    // Buttons
    document.getElementById('searchButton').addEventListener('click', handleSearch);
    document.getElementById('clearSearch').addEventListener('click', () => {
        document.getElementById('searchTerm').value = '';
        document.getElementById('searchTerm').focus();
    });
    
    // Selection Management
    document.getElementById('clearSelection').addEventListener('click', clearSelection);

    // Search Results Modal
    document.getElementById('closeResultsModal').addEventListener('click', () => toggleModal('searchResultsModal', false));

    // Attachments Modal
    document.getElementById('btnAttachFiles').addEventListener('click', showAttachmentsModal);
    document.getElementById('btnUploadSelected').addEventListener('click', handleAttachmentsModalSubmit);
    document.getElementById('closeAttachmentsModal').addEventListener('click', () => toggleModal('attachmentsModal', false));

    // Direct Actions
    document.getElementById('btnAttachMail').addEventListener('click', uploadEmailOnly);
    document.getElementById('btnExportMail').addEventListener('click', exportEmailOnly);
    document.getElementById('btnExportFiles').addEventListener('click', showExportAttachmentsModal);

    // Company Change
    const companySelect = document.getElementById('company');
    if (companySelect) {
        companySelect.addEventListener('change', (e) => {
            ConfigHelper.setCompany(e.target.value);
        });
    }

    // Add event listener for search group selection
    document.getElementById('searchBy').addEventListener('change', function() {
        populateDocTypes(this.value);
    });

    // Settings Modal
    document.getElementById('settingsBtn').addEventListener('click', openSettingsModal);
    document.getElementById('closeSettingsModal').addEventListener('click', () => toggleModal('settingsModal', false));
    document.getElementById('btnReenterCredentials').addEventListener('click', handleReenterCredentials);
    document.getElementById('btnChangeTenant').addEventListener('click', handleChangeTenant);
    document.getElementById('btnLogout').addEventListener('click', handleLogout);
}

/**
 * Show attachments modal for export
 */
function showExportAttachmentsModal() {
    // Set modal mode to export
    state.attachmentsModalMode = 'export';
    
    // Update modal title and button text for export
    const modalTitle = document.querySelector('#attachmentsModal .modal-header h3');
    const submitButton = document.getElementById('btnUploadSelected');
    
    if (modalTitle) modalTitle.textContent = ConfigHelper.t('exportFiles');
    if (submitButton) submitButton.textContent = ConfigHelper.t('exportSelected');
    
    // Populate attachments list (same logic as attach modal)
    const container = document.getElementById('attachmentsListBody');
    container.innerHTML = '';
    
    // Filter inline attachments
    const files = state.emailAttachments.filter(att => !att.isInline);
    
    if (files.length === 0) {
        container.innerHTML = '<div style="padding:12px;">No attachments found in this email.</div>';
        toggleModal('attachmentsModal', true);
        return;
    }
    
    // Create attachment list items
    files.forEach(att => {
        const item = document.createElement('div');
        item.className = 'attachment-item';
        item.innerHTML = `
            <label class="attachment-label">
                <input type="checkbox" value="${att.id}" checked>
                <span class="attachment-name">${att.name}</span>
                <span class="attachment-size">(${att.size})</span>
            </label>
        `;
        container.appendChild(item);
    });
    
    // Show the modal
    toggleModal('attachmentsModal', true);
}

/**
 * Show attachments modal for attach
 */
function showAttachmentsModal() {
    // Set modal mode to attach
    state.attachmentsModalMode = 'attach';
    
    // Update modal title and button text for attach
    const modalTitle = document.querySelector('#attachmentsModal .modal-header h3');
    const submitButton = document.getElementById('btnUploadSelected');
    
    if (modalTitle) modalTitle.textContent = ConfigHelper.t('attachFiles');
    if (submitButton) submitButton.textContent = ConfigHelper.t('uploadSelected');
    
    // Show the modal
    toggleModal('attachmentsModal', true);
}

/**
 * Handle modal submit based on current mode
 */
function handleAttachmentsModalSubmit() {
    if (state.attachmentsModalMode === 'export') {
        exportSelectedFiles();
    } else {
        uploadSelectedFiles();
    }
}

/**
 * Helper: Toggle Modal
 */
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (show) {
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
        // Reset modal mode when closing attachments modal
        if (modalId === 'attachmentsModal') {
            state.attachmentsModalMode = 'attach';
        }
    }
}

/**
 * Helper: Format Date
 */
function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString();
}


/**
 * Apply translations to all elements with data-i18n attributes
 */
function applyTranslations() {
    const lang = ConfigHelper.getLanguage();
    
    // Apply text translations
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        element.textContent = ConfigHelper.t(key);
    });
    
    // Apply placeholder translations
    document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
        const key = element.getAttribute('data-i18n-placeholder');
        element.placeholder = ConfigHelper.t(key);
    });
    
    // Apply title translations
    document.querySelectorAll('[data-i18n-title]').forEach(element => {
        const key = element.getAttribute('data-i18n-title');
        element.title = ConfigHelper.t(key);
    });
    
    // Set document direction based on language
    document.dir = lang === 'he' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
}

/**
 * Load email details
 */
function loadEmailDetails() {
    try {
        const subject = EmailHelper.getSubject();
        const sender = EmailHelper.getSender();
        
        document.getElementById('emailSubject').textContent = subject || ConfigHelper.t('noSubject');
        document.getElementById('emailSender').textContent = sender || ConfigHelper.t('unknownSender');
        document.getElementById('remarks').value = subject || ''; // Default remarks
        
        if (Office.context && Office.context.mailbox && Office.context.mailbox.item) {
            const date = Office.context.mailbox.item.dateTimeCreated;
            document.getElementById('emailDate').textContent = formatDate(date);
        }
    } catch (error) {
        console.error('Error loading email details:', error);
    }
}

/**
 * Load companies
 */
async function loadCompanies() {
    // Check authentication before making API calls
    const jwtToken = ConfigHelper.getJwtToken();
    const apiKey = ConfigHelper.getApiKey();
    
    if (!jwtToken && !apiKey) {
        return;
    }
    
    try {
        const companies = await apiClient.getCompanies();
        
        const companySelect = document.getElementById('company');
        companySelect.innerHTML = '';
        
        if (companies.length === 0) {
            companySelect.innerHTML = '<option value="">No companies found</option>';
            return;
        }
        
        companies.forEach(company => {
            const option = document.createElement('option');
            option.value = company.DNAME;
            option.textContent = company.TITLE;
            companySelect.appendChild(option);
        });

        // Auto-select previous company
        const savedCompany = ConfigHelper.getCompany();
        if (savedCompany) {
            // Verify it exists in the list
            const exists = Array.from(companySelect.options).some(opt => opt.value === savedCompany);
            if (exists) {
                companySelect.value = savedCompany;
            }
        }
    } catch (error) {
        console.error('Error loading companies:', error);
        document.getElementById('company').innerHTML = '<option>Error loading companies</option>';
    }
}

/**
 * Populate Doc Type dropdown based on selected search group
 */
function populateDocTypes(groupId) {
    const docTypeSelect = document.getElementById('searchGroup');
    
    if (!groupId) {
        docTypeSelect.innerHTML = '<option value="">' + ConfigHelper.t('selectSearchGroupFirst') + '</option>';
        return;
    }
    
    const group = state.searchGroups.find(g => g.FSGROUP === parseInt(groupId));
    if (!group || !group.GROUPFORMS) {
        docTypeSelect.innerHTML = '<option value="">' + ConfigHelper.t('noFormsAvailable') + '</option>';
        return;
    }
    
    docTypeSelect.innerHTML = '';
    
    // Add empty first row option
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '';
    docTypeSelect.appendChild(emptyOption);
    
    group.GROUPFORMS.forEach(form => {
        const option = document.createElement('option');
        option.value = form.ENAME;
        option.textContent = form.TITLE;
        docTypeSelect.appendChild(option);
    });
}

/**
 * Load Search Groups
 */
async function loadSearchGroups() {
    // Check authentication before making API calls
    const jwtToken = ConfigHelper.getJwtToken();
    const apiKey = ConfigHelper.getApiKey();
    
    if (!jwtToken && !apiKey) {
        return;
    }
    
    try {
        const groups = await apiClient.getSearchGroups();
        state.searchGroups = groups;
        
        // Populate "Search By" with groups
        const searchBySelect = document.getElementById('searchBy');
        searchBySelect.innerHTML = '';
        
        groups.forEach(group => {
            const option = document.createElement('option');
            option.value = group.FSGROUP;
            option.textContent = group.FSGROUPNAME;
            searchBySelect.appendChild(option);
        });

        // Auto-select first group and populate Doc Types
        if (groups.length > 0) {
            searchBySelect.value = groups[0].FSGROUP;
            populateDocTypes(groups[0].FSGROUP);
        } else {
            // Clear "Doc Type" if no groups
            const docTypeSelect = document.getElementById('searchGroup');
            docTypeSelect.innerHTML = '<option value="">' + ConfigHelper.t('selectSearchGroupFirst') + '</option>';
        }
    } catch (error) {
        console.error('Error loading search groups:', error);
    }
}

/**
 * Handle Search
 */
async function handleSearch() {
    const searchTerm = document.getElementById('searchTerm').value.trim();
    // Get groupId from "Search By" dropdown
    const groupId = parseInt(document.getElementById('searchBy').value);
    // Get selected form from "Doc Type" dropdown
    const docTypeSelect = document.getElementById('searchGroup');
    const selectedForm = docTypeSelect.value;
    

    if (!searchTerm || !groupId) {
        showStatus(t('selectDocument'), 'error');
        return;
    }

    showLoading(true);
    try {
        const result = await apiClient.searchDocuments(groupId, searchTerm, selectedForm);
        state.searchResults = result.documents;
        
        if (state.searchResults.length === 0) {
            showStatus(t('noDocumentsFound'), 'error');
        } else {
            populateResultsList(result.documents);
            toggleModal('searchResultsModal', true);
        }
    } catch (error) {
        showStatus('Search failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Populate Search Results List (Modal)
 */
function populateResultsList(docs) {
    const container = document.getElementById('resultsListBody');
    container.innerHTML = '';
    
    docs.forEach(doc => {
        const item = document.createElement('div');
        item.className = 'list-item';
        
        item.innerHTML = `
            <div class="item-title">${doc.FormDesc || doc.Form} - ${doc.DocNo || doc.FormKey}</div>
            <div class="item-details">
                ${doc.CustName || 'No Name'} | ${formatDate(doc.DocDate)}
            </div>
        `;
        
        item.addEventListener('click', () => selectDocument(doc));
        container.appendChild(item);
    });
}

/**
 * Select Document
 */
function selectDocument(doc) {
    state.selectedDocument = doc;
    
    // Update Selected Doc UI
    document.getElementById('selDocType').textContent = doc.FormDesc || doc.Form;
    document.getElementById('selDocDate').textContent = formatDate(doc.DocDate);
    document.getElementById('selDocDesc').textContent = doc.CustName || '';
    document.getElementById('selDocDetails').textContent = doc.Details || '';
    
    // Show Sections
    document.getElementById('selectedDocSection').style.display = 'block';
    document.getElementById('actionsSection').style.display = 'flex';
    document.getElementById('exportSection').style.display = 'none';
    
    // Close Modal
    toggleModal('searchResultsModal', false);
    
    // Scroll to selection
    document.getElementById('selectedDocSection').scrollIntoView({ behavior: 'smooth' });
}

/**
 * Clear Selection
 */
function clearSelection() {
    state.selectedDocument = null;
    document.getElementById('selectedDocSection').style.display = 'none';
    document.getElementById('actionsSection').style.display = 'none';
    document.getElementById('exportSection').style.display = 'block';
}

/**
 * Attachments Modal Logic
 */
function showAttachmentsModal() {
    if (!state.selectedDocument) {
        showStatus('Please select a document first', 'error');
        return;
    }
    
    const container = document.getElementById('attachmentsListBody');
    container.innerHTML = '';
    
    // Filter inline attachments
    const files = state.emailAttachments.filter(att => !att.isInline);
    
    if (files.length === 0) {
        container.innerHTML = '<div style="padding:12px;">No attachments found in this email.</div>';
        toggleModal('attachmentsModal', true);
        return;
    }

    files.forEach(att => {
        const item = document.createElement('div');
        item.className = 'list-item';
        const sizeKB = (att.size / 1024).toFixed(1);
        const ext = att.name.split('.').pop();

        // Checkbox wrapper
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = att.id;
        checkbox.checked = true;
        checkbox.style.marginRight = '10px';

        item.appendChild(checkbox);
        
        const textDiv = document.createElement('div');
        textDiv.innerHTML = `
            <div class="item-title">${att.name}</div>
            <div class="item-details">${sizeKB} KB | .${ext}</div>
        `;
        item.appendChild(textDiv);
        
        // Allow clicking row to toggle checkbox
        item.addEventListener('click', (e) => {
            if (e.target !== checkbox) checkbox.checked = !checkbox.checked;
        });

        container.appendChild(item);
    });
    
    toggleModal('attachmentsModal', true);
}

/**
 * Ensure API key exists, create one if needed
 */
async function ensureApiKey() {
    let apiKey = ConfigHelper.getApiKey();
    
    if (apiKey) {
        return apiKey;
    }
    
    // No API key found, creating new one...
    
    // Try to get credentials from user or use defaults
    let credentials = {
        username: prompt('Enter Priority username:') || 'admin',
        password: prompt('Enter Priority password:') || 'admin',
        company: prompt('Enter Priority company:') || 'demo'
    };
    
    // If user cancels prompts, try default values
    if (!credentials.username || !credentials.password || !credentials.company) {
        // Using default credentials for development
        credentials = {
            username: 'admin',
            password: 'admin', 
            company: 'demo'
        };
    }
    
    try {
        // Creating API key with credentials
        const response = await apiClient.createApiKey(
            credentials.username,
            credentials.password,
            credentials.company
        );
        
        if (response.api_key) {
            ConfigHelper.setApiKey(response.api_key);
            return response.api_key;
        } else {
            throw new Error('No API key returned from server');
        }
    } catch (error) {
        console.error('Failed to create API key:', error);
        
        // Provide more helpful error message
        if (error.message.includes('401') || error.message.includes('403')) {
            throw new Error('Invalid Priority credentials. Please check your username, password, and company.');
        } else if (error.message.includes('404')) {
            throw new Error('Auth endpoint not found. Please check if the server is running.');
        } else {
            throw new Error('Authentication failed: ' + error.message);
        }
    }
}

/**
 * Upload Actions
 */
async function exportEmailOnly() {
    try {
        // Constructing EML for export to Priority staging
        const emlContent = await EmailHelper.constructEML();
        
        // Generate description from subject
        const subject = EmailHelper.getSubject() || 'Email Attachment';
        const description = document.getElementById('exportRemarks').value.trim() || subject;
        
        // Prepare export request (backend will handle user authentication)
        const exportData = {
            file_description: description,
            file_base64: emlContent,
            file_extension: '.eml',
            source_identifier: 'FileSmile',
            mime_type: 'message/rfc822'
        };
        
        // Exporting to Priority staging area
        const result = await apiClient.addExportAttachment(exportData);
        
        showStatus(t('emailExported'), 'success');
    } catch (error) {
        console.error('Export failed:', error);
        showStatus('Export failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function exportSelectedFiles() {
    const checkboxes = document.querySelectorAll('#attachmentsListBody input:checked');
    if (checkboxes.length === 0) {
        showStatus(ConfigHelper.t('noFilesSelected'), 'error');
        return;
    }
    
    showLoading(true);
    try {
        let count = 0;
        for (const cb of checkboxes) {
            const attId = cb.value;
            const att = state.emailAttachments.find(a => a.id === attId);
            if (!att) continue;
            
            const content = await EmailHelper.getAttachmentContent(att.id);
            
            // Prepare export request for each attachment (backend will handle user authentication)
            const exportData = {
                file_description: att.name,
                file_base64: content,
                file_extension: '.' + (att.name.split('.').pop() || 'bin'),
                source_identifier: 'FileSmile',
                mime_type: att.contentType
            };
            
            // Exporting attachment to Priority staging area
            const result = await apiClient.addExportAttachment(exportData);
            count++;
        }
        
        showStatus(`Exported ${count} files to Priority staging area!`, 'success');
        toggleModal('attachmentsModal', false);
        
    } catch (error) {
        console.error('Export failed:', error);
        showStatus('Export failed: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function uploadEmailOnly() {
    if (!state.selectedDocument) {
        return;
    }
    
    const description = document.getElementById('remarks').value.trim() || ConfigHelper.t('emailAttachment');

    try {
        // Constructing EML
        const emlBase64 = await EmailHelper.constructEML();
        
        const uploadData = {
            form: state.selectedDocument.Form,
            form_key: state.selectedDocument.FormKey,
            ext_files_form: state.selectedDocument.ExtFilesForm,
            file_description: description,
            file_base64: emlBase64,
            file_extension: '.eml',
            mime_type: 'message/rfc822'
        };
        
        // Calling apiClient.uploadAttachment
        const result = await apiClient.uploadAttachment(uploadData);
        
        showStatus(t('emailUploaded'), 'success');
    } catch (error) {
        console.error('Upload failed with error:', error);
        console.error('Error details:', {
            message: error.message,
            stack: error.stack
        });
        showStatus(ConfigHelper.t('uploadFailed') + ': ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function uploadSelectedFiles() {
    const checkboxes = document.querySelectorAll('#attachmentsListBody input:checked');
    if (checkboxes.length === 0) {
        toggleModal('attachmentsModal', false);
        return;
    }
    
    const baseDescription = document.getElementById('remarks').value.trim() || ConfigHelper.t('attachment');

    showLoading(true);
    try {
        let count = 0;
        for (const cb of checkboxes) {
            const attId = cb.value;
            const att = state.emailAttachments.find(a => a.id === attId);
            if (!att) continue;
            
            const content = await EmailHelper.getAttachmentContent(att.id);
            const ext = att.name.split('.').pop();
            
            await apiClient.uploadAttachment({
                form: state.selectedDocument.Form,
                form_key: state.selectedDocument.FormKey,
                ext_files_form: state.selectedDocument.ExtFilesForm,
                file_description: baseDescription + ' - ' + att.name,
                file_base64: content,
                file_extension: ext
            });
            count++;
        }
        
        showStatus(ConfigHelper.t('uploadedFilesSuccess').replace('{count}', count), 'success');
        toggleModal('attachmentsModal', false);
        clearSelection();
    } catch (error) {
        showStatus(ConfigHelper.t('uploadFailed') + ': ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * UI Utilities
 */
function showLoading(show) {
    document.getElementById('loadingOverlay').style.display = show ? 'flex' : 'none';
}

function showStatus(msg, type = 'success') {
    console.log('DEBUG: showStatus called with msg:', msg, 'type:', type);
    const el = type === 'error' ? document.getElementById('errorMessage') : document.getElementById('statusMessage');
    console.log('DEBUG: status element found:', el);
    console.log('DEBUG: setting textContent to:', msg);
    el.textContent = msg;
    el.style.display = 'block';
    console.log('DEBUG: element display set to block, computed style:', window.getComputedStyle(el));
    
    // Auto hide after 4 seconds
    setTimeout(() => el.style.display = 'none', 4000);
}

/**
 * Settings Modal Functions
 */

/**
 * Open settings modal and populate user info
 */
function openSettingsModal() {
    // Populate user info
    const userEmail = ConfigHelper.getUserEmail() || localStorage.getItem('filesmile_user_email') || '-';
    const userInfo = ConfigHelper.getUserInfo();
    
    document.getElementById('settingsUserEmail').textContent = userEmail;
    
    // Get tenant name - we need to fetch it or use stored value
    const tenantId = ConfigHelper.getTenantId() || localStorage.getItem('filesmile_tenant_id');
    if (tenantId) {
        // Try to get tenant name from stored info or display tenant ID
        const storedTenantName = localStorage.getItem('filesmile_tenant_name');
        document.getElementById('settingsTenantName').textContent = storedTenantName || `Tenant #${tenantId}`;
    } else {
        document.getElementById('settingsTenantName').textContent = '-';
    }
    
    // Apply translations to modal
    applyTranslations();
    
    // Show modal
    toggleModal('settingsModal', true);
}

/**
 * Handle re-enter credentials action
 * Clears stored credentials and triggers re-authentication
 */
async function handleReenterCredentials() {
    toggleModal('settingsModal', false);
    
    // Clear JWT token to force re-authentication
    ConfigHelper.setJwtToken(null);
    localStorage.removeItem('filesmile_erp_username');
    localStorage.removeItem('filesmile_erp_password');
    
    // Keep registration complete flag but force credential re-entry
    // by clearing the stored credentials
    
    showLoading(true);
    try {
        // Get user email
        const userEmail = ConfigHelper.getUserEmail() || localStorage.getItem('filesmile_user_email');
        const tenantId = ConfigHelper.getTenantId() || localStorage.getItem('filesmile_tenant_id');
        const tenantName = localStorage.getItem('filesmile_tenant_name') || `Tenant #${tenantId}`;
        
        if (userEmail && tenantId) {
            // Show credentials form directly
            const result = await AuthFlow.showCredentialsForm(userEmail, tenantName, parseInt(tenantId));
            
            if (result) {
                // Store new JWT token and credentials
                ConfigHelper.setJwtToken(result.response.access_token);
                ConfigHelper.setTenantId(result.response.tenant_id);
                ConfigHelper.setUserInfo({
                    user_id: result.response.user_id,
                    email: result.response.email,
                    tenant_id: result.response.tenant_id
                });
                
                // Store credentials for future auto-reauthentication
                localStorage.setItem('filesmile_erp_username', result.credentials.username);
                localStorage.setItem('filesmile_erp_password', result.credentials.password);
                
                showStatus(ConfigHelper.t('credentialsUpdated'), 'success');
                
                // Reload data
                await Promise.all([
                    loadCompanies(),
                    loadSearchGroups()
                ]);
            }
        } else {
            // Fall back to full login flow
            await AuthFlow.startLoginFlow();
        }
    } catch (error) {
        console.error('Re-authentication failed:', error);
        showStatus(ConfigHelper.t('authFailed') + ': ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

/**
 * Handle change tenant action
 * Allows user to switch to a different tenant if they have access to multiple
 * Tries existing credentials first, only prompts if they fail
 */
async function handleChangeTenant() {
    toggleModal('settingsModal', false);
    
    showLoading(true);
    try {
        // Get user email
        const userEmail = ConfigHelper.getUserEmail() || localStorage.getItem('filesmile_user_email');
        
        if (!userEmail) {
            showStatus(ConfigHelper.t('noEmailFound'), 'error');
            return;
        }
        
        // Resolve tenants for this email
        const tenantInfo = await apiClient.resolveTenant(userEmail);
        
        if (!tenantInfo.requires_selection || !tenantInfo.tenants || tenantInfo.tenants.length <= 1) {
            // User only has access to one tenant
            showStatus(ConfigHelper.t('singleTenantOnly'), 'error');
            return;
        }
        
        // Show tenant selection UI
        const selectedTenant = await AuthFlow.showTenantSelectionUI(userEmail, tenantInfo.tenants);
        
        if (selectedTenant) {
            let authSuccess = false;
            
            // Try to switch tenant using server-stored credentials first
            try {
                console.log('Attempting to switch tenant using server-stored credentials...');
                const response = await apiClient.switchTenant(userEmail, selectedTenant.tenant_id);
                
                // Success with server-stored credentials
                ConfigHelper.setJwtToken(response.access_token);
                ConfigHelper.setTenantId(response.tenant_id);
                localStorage.setItem('filesmile_tenant_id', response.tenant_id.toString());
                localStorage.setItem('filesmile_tenant_name', selectedTenant.tenant_name);
                ConfigHelper.setUserInfo({
                    user_id: response.user_id,
                    email: response.email,
                    tenant_id: response.tenant_id
                });
                
                authSuccess = true;
                showStatus(ConfigHelper.t('tenantChanged'), 'success');
                console.log('Tenant switch successful using server-stored credentials!');
                
            } catch (switchError) {
                console.log('Server-stored credentials not available or invalid:', switchError.message);
                // Will prompt for credentials below
            }
            
            // If server credentials failed, prompt for new ones
            if (!authSuccess) {
                // Clear JWT since we're switching tenants
                ConfigHelper.setJwtToken(null);
                
                // Store new tenant info
                ConfigHelper.setTenantId(selectedTenant.tenant_id);
                localStorage.setItem('filesmile_tenant_id', selectedTenant.tenant_id.toString());
                localStorage.setItem('filesmile_tenant_name', selectedTenant.tenant_name);
                
                // Show credentials form for new tenant
                const result = await AuthFlow.showCredentialsForm(userEmail, selectedTenant.tenant_name, selectedTenant.tenant_id);
                
                if (result) {
                    // Store new JWT token and credentials
                    ConfigHelper.setJwtToken(result.response.access_token);
                    ConfigHelper.setTenantId(result.response.tenant_id);
                    ConfigHelper.setUserInfo({
                        user_id: result.response.user_id,
                        email: result.response.email,
                        tenant_id: result.response.tenant_id
                    });
                    
                    // Store credentials locally for future use
                    localStorage.setItem('filesmile_erp_username', result.credentials.username);
                    localStorage.setItem('filesmile_erp_password', result.credentials.password);
                    
                    showStatus(ConfigHelper.t('tenantChanged'), 'success');
                } else {
                    // User cancelled, revert tenant selection
                    return;
                }
            }
            
            // Reload data for new tenant
            await Promise.all([
                loadCompanies(),
                loadSearchGroups()
            ]);
        }
    } catch (error) {
        console.error('Change tenant failed:', error);
        if (error.message.includes('TENANT_NOT_FOUND')) {
            showStatus(ConfigHelper.t('tenantNotFound'), 'error');
        } else {
            showStatus(ConfigHelper.t('changeTenantFailed') + ': ' + error.message, 'error');
        }
    } finally {
        showLoading(false);
    }
}

/**
 * Handle logout action
 * Clears all stored data and reloads the add-in
 */
async function handleLogout() {
    // Show custom confirmation dialog since confirm() may not work in Outlook add-ins
    const confirmed = await showLogoutConfirmation();
    if (confirmed) {
        toggleModal('settingsModal', false);
        showLoading(true);
        
        // Clear all storage
        ConfigHelper.clearStorage();
        
        // Small delay to show loading, then reload
        setTimeout(() => {
            window.location.reload();
        }, 500);
    }
}

/**
 * Show custom logout confirmation dialog
 * @returns {Promise<boolean>} - True if user confirms, false otherwise
 */
function showLogoutConfirmation() {
    return new Promise((resolve) => {
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
            max-width: 300px;
            width: 90%;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            text-align: center;
        `;

        modal.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 12px;">🚪</div>
            <h3 style="margin: 0 0 12px 0; font-size: 16px;">${ConfigHelper.t('logout')}</h3>
            <p style="color: #666; font-size: 13px; margin-bottom: 20px;">
                ${ConfigHelper.t('logoutConfirm')}
            </p>
            <div style="display: flex; gap: 8px; justify-content: center;">
                <button id="cancel-logout-btn" style="padding: 8px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">
                    ${ConfigHelper.t('cancel') || 'Cancel'}
                </button>
                <button id="confirm-logout-btn" style="padding: 8px 20px; border: none; background: #a80000; color: white; border-radius: 4px; cursor: pointer; font-weight: 600;">
                    ${ConfigHelper.t('logout')}
                </button>
            </div>
        `;

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        modal.querySelector('#confirm-logout-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(true);
        });

        modal.querySelector('#cancel-logout-btn').addEventListener('click', () => {
            document.body.removeChild(overlay);
            resolve(false);
        });
    });
}
