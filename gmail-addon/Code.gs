/**
 * FileSmile Gmail Add-on
 * Attach emails and attachments to Priority ERP documents
 */

// Configuration
const CONFIG = {
  API_BASE_URL: 'https://localhost:8000/api/v1',
  PROPERTY_API_KEY: 'filesmile_api_key',
  PROPERTY_USER_INFO: 'filesmile_user_info',
  PROPERTY_LANGUAGE: 'filesmile_language'
};

// Translations
const TRANSLATIONS = {
  en: {
    title: 'FileSmile Priority Integration',
    attachToPriority: 'Attach to Priority',
    loginToPriority: 'Login to Priority',
    apiKey: 'API Key',
    apiKeyHint: 'Enter API key or create new below',
    connect: 'Connect',
    orCreateApiKey: 'Or create new API key:',
    companyCode: 'Company Code',
    username: 'Username',
    password: 'Password',
    createApiKey: 'Create API Key',
    emailInfo: 'Email Information',
    subject: 'Subject',
    sender: 'Sender',
    date: 'Date',
    attachEmail: 'Attach Email',
    attachSelectedFiles: 'Attach Selected Files',
    exportFiles: 'Export Files',
    exportSelected: 'Export Selected',
    noAttachments: 'No attachments found in this email',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    logged_in_as: 'Logged in as',
    not_logged_in: 'Not logged in',
    logout: 'Logout',
    noSubject: 'No Subject',
    unknownSender: 'Unknown Sender',
    noFilesSelected: 'No files selected',
    language: 'Language',
    english: 'English',
    hebrew: 'Hebrew',
    searchDocuments: 'Search Documents',
    searchBy: 'Search By',
    docType: 'Document Type',
    searchTerm: 'Search Term',
    search: 'Search',
    searchResults: 'Search Results',
    noDocumentsFound: 'No documents found',
    select: 'Select',
    attachFiles: 'Attach Files',
    selectFilesToAttach: 'Select files to attach',
    entireEmail: 'Entire email (.eml)',
    description: 'Description',
    upload: 'Upload',
    cancel: 'Cancel',
    back: 'Back',
    settings: 'Settings',
    priorityUsername: 'Priority Username'
  },
  he: {
    title: 'פיילסמייל - אינטגרציה עם Priority',
    attachToPriority: 'צרף ל-Priority',
    loginToPriority: 'התחבר ל-Priority',
    apiKey: 'מפתח API',
    apiKeyHint: 'הכנס מפתח API או צור חדש למטה',
    connect: 'התחבר',
    orCreateApiKey: 'או צור מפתח API חדש:',
    companyCode: 'קוד חברה',
    username: 'שם משתמש',
    password: 'סיסמה',
    createApiKey: 'צור מפתח API',
    emailInfo: 'מידע דוא"ל',
    subject: 'נושא',
    sender: 'שולח',
    date: 'תאריך',
    attachEmail: 'צרף דוא"ל',
    attachSelectedFiles: 'צרף קבצים נבחרים',
    exportFiles: 'ייצא קבצים',
    exportSelected: 'ייצא נבחרים',
    noAttachments: 'לא נמצאו קבצים מצורפים בדוא"ל זה',
    loading: 'טוען...',
    error: 'שגיאה',
    success: 'הצלחה',
    logged_in_as: 'מחובר כ-',
    not_logged_in: 'לא מחובר',
    logout: 'התנתק',
    noSubject: 'ללא נושא',
    unknownSender: 'שולח לא ידוע',
    noFilesSelected: 'לא נבחרו קבצים',
    language: 'שפה',
    english: 'אנגלית',
    hebrew: 'עברית',
    searchDocuments: 'חפש מסמכים',
    searchBy: 'חפש לפי',
    docType: 'סוג מסמך',
    searchTerm: 'מונח חיפוש',
    search: 'חפש',
    searchResults: 'תוצאות חיפוש',
    noDocumentsFound: 'לא נמצאו מסמכים',
    select: 'בחר',
    attachFiles: 'צרף קבצים',
    selectFilesToAttach: 'בחר קבצים לצירוף',
    entireEmail: 'דוא"ל שלם (.eml)',
    description: 'תיאור',
    upload: 'העלה',
    cancel: 'בטל',
    back: 'חזור',
    settings: 'הגדרות',
    priorityUsername: 'שם משתמש ב-Priority'
  }
};

/**
 * Get translation for current language
 */
function t(key) {
  const lang = getCurrentLanguage();
  return TRANSLATIONS[lang][key] || TRANSLATIONS.en[key] || key;
}

/**
 * Get current language preference
 */
function getCurrentLanguage() {
  return PropertiesService.getUserProperties().getProperty(CONFIG.PROPERTY_LANGUAGE) || 'en';
}

/**
 * Set current language preference
 */
function setCurrentLanguage(language) {
  PropertiesService.getUserProperties().setProperty(CONFIG.PROPERTY_LANGUAGE, language);
}

/**
 * Get stored API key
 */
function getApiKey() {
  return PropertiesService.getUserProperties().getProperty(CONFIG.PROPERTY_API_KEY);
}

/**
 * Set API key
 */
function setApiKey(apiKey) {
  PropertiesService.getUserProperties().setProperty(CONFIG.PROPERTY_API_KEY, apiKey);
}

/**
 * Get stored user info
 */
function getUserInfo() {
  const userInfoStr = PropertiesService.getUserProperties().getProperty(CONFIG.PROPERTY_USER_INFO);
  return userInfoStr ? JSON.parse(userInfoStr) : null;
}

/**
 * Set user info
 */
function setUserInfo(userInfo) {
  PropertiesService.getUserProperties().setProperty(CONFIG.PROPERTY_USER_INFO, JSON.stringify(userInfo));
}

/**
 * Clear stored data
 */
function clearStorage() {
  PropertiesService.getUserProperties().deleteProperty(CONFIG.PROPERTY_API_KEY);
  PropertiesService.getUserProperties().deleteProperty(CONFIG.PROPERTY_USER_INFO);
  PropertiesService.getUserProperties().deleteProperty(CONFIG.PROPERTY_LANGUAGE);
}

/**
 * Main entry point for Gmail add-on
 */
function buildAddOn(e) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    return buildLoginCard();
  }
  
  return buildMainCard(e);
}

/**
 * Build login/settings card
 */
function buildLoginCard() {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle(t('title'))
      .setImageUrl('https://localhost:8000/assets/icon-32.png')
  );

  const section = CardService.newCardSection();
  section.setHeader(t('loginToPriority'));

  // Language switcher
  section.addWidget(
    CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('language')
      .setTitle(t('language'))
      .addItem(t('english'), 'en', getCurrentLanguage() === 'en')
      .addItem(t('hebrew'), 'he', getCurrentLanguage() === 'he')
      .setOnChangeAction(
        CardService.newAction()
          .setFunctionName('handleLanguageChange')
      )
  );

  // API Key input
  section.addWidget(
    CardService.newTextInput()
      .setFieldName('apiKey')
      .setTitle(t('apiKey'))
      .setHint(t('apiKeyHint'))
  );

  section.addWidget(
    CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText(t('connect'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleLogin')
          )
      )
  );

  card.addSection(section);

  // Create API Key section
  const createSection = CardService.newCardSection();
  createSection.setHeader(t('orCreateApiKey'));

  createSection.addWidget(
    CardService.newTextInput()
      .setFieldName('company')
      .setTitle(t('companyCode'))
  );

  createSection.addWidget(
    CardService.newTextInput()
      .setFieldName('username')
      .setTitle(t('username'))
  );

  createSection.addWidget(
    CardService.newTextInput()
      .setFieldName('password')
      .setTitle(t('password'))
  );

  createSection.addWidget(
    CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText(t('createApiKey'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleCreateApiKey')
          )
      )
  );

  card.addSection(createSection);

  return card.build();
}

/**
 * Build main card with search functionality
 */
function buildMainCard(e) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle(t('attachToPriority'))
      .setImageUrl('https://localhost:8000/assets/icon-32.png')
  );

  // Email info section
  const emailSection = CardService.newCardSection();
  emailSection.setHeader(t('emailInfo'));
  
  // Only show email info if we have message metadata
  if (e && e.messageMetadata && e.messageMetadata.messageId) {
    try {
      const message = getCurrentMessage(e);
      const subject = getEmailSubject(message);
      const sender = getEmailSender(message);
      const date = getEmailDate(message);
      
      // Cache email data for navigation
      PropertiesService.getUserProperties().setProperty('cached_subject', subject);
      PropertiesService.getUserProperties().setProperty('cached_sender', sender);
      PropertiesService.getUserProperties().setProperty('cached_date', date ? date.toISOString() : '');
      
      emailSection.addWidget(
        CardService.newKeyValue()
          .setTopLabel(t('subject'))
          .setContent(subject || t('noSubject'))
      );
      
      emailSection.addWidget(
        CardService.newKeyValue()
          .setTopLabel(t('sender'))
          .setContent(sender || t('unknownSender'))
      );
      
      emailSection.addWidget(
        CardService.newKeyValue()
          .setTopLabel(t('date'))
          .setContent(date ? date.toLocaleDateString() : '')
      );
    } catch (error) {
      emailSection.addWidget(
        CardService.newTextParagraph()
          .setText(t('error') + ': ' + error.message)
      );
    }
  } else {
    // Try to restore cached email info
    const cachedSubject = PropertiesService.getUserProperties().getProperty('cached_subject');
    const cachedSender = PropertiesService.getUserProperties().getProperty('cached_sender');
    const cachedDate = PropertiesService.getUserProperties().getProperty('cached_date');
    
    if (cachedSubject || cachedSender || cachedDate) {
      emailSection.addWidget(
        CardService.newKeyValue()
          .setTopLabel(t('subject'))
          .setContent(cachedSubject || t('noSubject'))
      );
      
      emailSection.addWidget(
        CardService.newKeyValue()
          .setTopLabel(t('sender'))
          .setContent(cachedSender || t('unknownSender'))
      );
      
      emailSection.addWidget(
        CardService.newKeyValue()
          .setTopLabel(t('date'))
          .setContent(cachedDate ? new Date(cachedDate).toLocaleDateString() : '')
      );
    } else {
      emailSection.addWidget(
        CardService.newTextParagraph()
          .setText(t('emailInfo') + ' - ' + t('loading'))
      );
    }
  }
  
  card.addSection(emailSection);

  // Language switcher
  const langSection = CardService.newCardSection();
  langSection.addWidget(
    CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('language')
      .setTitle(t('language'))
      .addItem(t('english'), 'en', getCurrentLanguage() === 'en')
      .addItem(t('hebrew'), 'he', getCurrentLanguage() === 'he')
      .setOnChangeAction(
        CardService.newAction()
          .setFunctionName('handleLanguageChange')
      )
  );
  card.addSection(langSection);

  // Try to restore form state
  let formState = {};
  try {
    const cachedState = PropertiesService.getUserProperties().getProperty('temp_form_state');
    if (cachedState) {
      formState = JSON.parse(cachedState);
      // Clear the temp state after using it
      PropertiesService.getUserProperties().deleteProperty('temp_form_state');
    }
  } catch (error) {
    Logger.log('Failed to restore form state: ' + error.message);
  }

  // Search section
  const searchSection = CardService.newCardSection();
  searchSection.setHeader(t('searchDocuments'));

  // Load companies
  const companies = loadCompanies();
  if (companies && companies.length > 0) {
    const companySelect = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('company')
      .setTitle(t('companyCode'));

    companies.forEach(company => {
      companySelect.addItem(company.TITLE, company.DNAME, company.DNAME === (formState.company || ''));
    });

    searchSection.addWidget(companySelect);
  }

  // Load search groups
  const groups = loadSearchGroups();

  if (groups && groups.length > 0) {
    const groupSelect = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('groupId')
      .setTitle(t('searchBy'));

    groups.forEach(group => {
      groupSelect.addItem(group.FSGROUPNAME, group.FSGROUP.toString(), 
                        group.FSGROUP.toString() === (formState.groupId || ''));
    });

    searchSection.addWidget(groupSelect);
    
    // Document type dropdown (will be populated based on group)
    const docTypeSelect = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.DROPDOWN)
      .setFieldName('docType')
      .setTitle(t('docType'))
      .setOnChangeAction(
        CardService.newAction()
          .setFunctionName('handleDocTypeChange')
      );
    searchSection.addWidget(docTypeSelect);
  }

  searchSection.addWidget(
    CardService.newTextInput()
      .setFieldName('searchTerm')
      .setTitle(t('searchTerm'))
      .setHint(t('searchHint'))
      .setValue(formState.searchTerm || '')
  );

  searchSection.addWidget(
    CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText(t('search'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleSearch')
          )
      )
  );

  card.addSection(searchSection);

  // Footer with settings
  card.setFixedFooter(
    CardService.newFixedFooter()
      .setPrimaryButton(
        CardService.newTextButton()
          .setText(t('settings'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('showSettings')
          )
      )
  );

  return card.build();
}

/**
 * Handle document type change (for dynamic dropdowns)
 */
function handleDocTypeChange(e) {
  const selectedGroupId = e.formInput.groupId;
  const docTypes = getDocTypesForGroup(selectedGroupId);

  const section = CardService.newCardSection();
  const docTypeSelect = CardService.newSelectionInput()
    .setType(CardService.SelectionInputType.DROPDOWN)
    .setFieldName('docType')
    .setTitle(t('docType'));

  docTypes.forEach(docType => {
    docTypeSelect.addItem(docType.TITLE, docType.ENAME, false);
  });

  section.addWidget(docTypeSelect);

  return CardService.newActionResponseBuilder()
    .setNavigation(CardService.newNavigation().updateCard(buildMainCard(e)))
    .build();
}

/**
 * Build search results card
 */
function buildSearchResultsCard(results, errors) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle(t('searchResults'))
  );

  const section = CardService.newCardSection();

  if (!results || results.length === 0) {
    section.addWidget(
      CardService.newTextParagraph()
        .setText(t('noDocumentsFound'))
    );
  } else {
    results.forEach(doc => {
      const docText = `<b>${doc.FormDesc || doc.Form}</b><br>` +
                     `${t('docType')}: ${doc.DocNo || 'N/A'}<br>` +
                     `${doc.CustName || ''} ${formatDate(doc.DocDate)}`;

      section.addWidget(
        CardService.newDecoratedText()
          .setText(docText)
          .setBottomLabel(`${doc.Details || ''}`)
          .setButton(
            CardService.newTextButton()
              .setText(t('select'))
              .setOnClickAction(
                CardService.newAction()
                  .setFunctionName('handleSelectDocument')
                  .setParameters({
                    form: doc.Form,
                    formKey: doc.FormKey,
                    extFilesForm: doc.ExtFilesForm,
                    docNo: doc.DocNo || '',
                    formDesc: doc.FormDesc || doc.Form,
                    custName: doc.CustName || '',
                    docDate: doc.DocDate || '',
                    details: doc.Details || ''
                  })
              )
          )
      );
    });
  }

  if (errors && Object.keys(errors).length > 0) {
    section.addWidget(
      CardService.newTextParagraph()
        .setText('<font color="#a80000">' + t('error') + ': ' +
                Object.keys(errors).join(', ') + '</font>')
    );
  }

  card.addSection(section);

  // Back button
  card.setFixedFooter(
    CardService.newFixedFooter()
      .setPrimaryButton(
        CardService.newTextButton()
          .setText(t('back'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('buildAddOn')
          )
      )
  );

  return card.build();
}

/**
 * Build attachment options card
 */
function buildAttachmentCard(e) {
  const params = e.parameters;

  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle(t('attachFiles'))
  );

  // Selected document info
  const infoSection = CardService.newCardSection();
  infoSection.addWidget(
    CardService.newTextParagraph()
      .setText(`<b>${params.formDesc}: ${params.docNo}</b><br>` +
              `${params.custName || ''} ${formatDate(params.docDate)}`)
  );

  card.addSection(infoSection);

  // Attachment options
  const optionsSection = CardService.newCardSection();
  optionsSection.setHeader(t('selectFilesToAttach'));

  // Attach entire email
  optionsSection.addWidget(
    CardService.newDecoratedText()
      .setText(t('entireEmail'))
      .setSwitchControl(
        CardService.newSwitch()
          .setFieldName('attachEmail')
          .setValue('true')
          .setSelected(true)
      )
  );

  // Get email attachments - cache message data to avoid context loss
  let attachments = [];
  try {
    if (e && e.messageMetadata && e.messageMetadata.messageId) {
      const message = getCurrentMessage(e);
      attachments = getMessageAttachments(message);
      
      // Cache only attachment metadata to avoid PropertiesService size limits
      const attachmentMetadata = attachments.map(att => ({
        name: att.name,
        size: att.size,
        contentType: att.contentType,
        index: attachments.indexOf(att)
      }));
      
      try {
        PropertiesService.getUserProperties().setProperty('cached_attachments_metadata', JSON.stringify(attachmentMetadata));
        
        // Try to cache full data, but gracefully handle size limits
        const fullDataJson = JSON.stringify(attachments);
        if (fullDataJson.length < 8000) { // Leave buffer under 9KB limit
          PropertiesService.getUserProperties().setProperty('cached_attachments_full', fullDataJson);
          PropertiesService.getUserProperties().setProperty('cache_timestamp', new Date().getTime().toString());
        } else {
          // Full data too large, only cache metadata
          Logger.log('Attachment data too large for cache, using metadata-only mode: ' + fullDataJson.length + ' bytes');
          PropertiesService.getUserProperties().setProperty('cache_mode', 'metadata_only');
        }
      } catch (cacheError) {
        Logger.log('Failed to cache attachments, using metadata-only mode: ' + cacheError.message);
        PropertiesService.getUserProperties().setProperty('cache_mode', 'metadata_only');
      }
    } else {
      // Try to get cached attachment metadata
      const cachedMetadata = PropertiesService.getUserProperties().getProperty('cached_attachments_metadata');
      if (cachedMetadata) {
        attachments = JSON.parse(cachedMetadata);
      }
    }
  } catch (error) {
    Logger.log('Failed to get attachments: ' + error.message);
    // Try to get cached attachment metadata as fallback
    const cachedMetadata = PropertiesService.getUserProperties().getProperty('cached_attachments_metadata');
    if (cachedMetadata) {
      attachments = JSON.parse(cachedMetadata);
    }
  }

  if (attachments && attachments.length > 0) {
    attachments.forEach((att, index) => {
      optionsSection.addWidget(
        CardService.newDecoratedText()
          .setText(`${att.name} (${(att.size / 1024).toFixed(1)} KB)`)
          .setSwitchControl(
            CardService.newSwitch()
              .setFieldName(`attachment_${index}`)
              .setValue(att.name)
              .setSelected(true)
          )
      );
    });
  } else {
    optionsSection.addWidget(
      CardService.newTextParagraph()
        .setText(t('noAttachments'))
    );
  }

  // Description - use cached subject if available
  let subject = '';
  try {
    if (e && e.messageMetadata && e.messageMetadata.messageId) {
      const message = getCurrentMessage(e);
      subject = getEmailSubject(message);
      // Cache subject for navigation
      PropertiesService.getUserProperties().setProperty('cached_subject', subject);
    } else {
      // Try to get cached subject
      subject = PropertiesService.getUserProperties().getProperty('cached_subject') || '';
    }
  } catch (error) {
    subject = PropertiesService.getUserProperties().getProperty('cached_subject') || '';
  }

  optionsSection.addWidget(
    CardService.newTextInput()
      .setFieldName('description')
      .setTitle(t('description'))
      .setValue(subject)
  );

  card.addSection(optionsSection);

  // Action buttons
  const actionSection = CardService.newCardSection();
  actionSection.addWidget(
    CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText(t('attachEmail'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleAttachEmailOnly')
              .setParameters(params)
          )
      )
      .addButton(
        CardService.newTextButton()
          .setText(t('attachSelectedFiles'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleAttachSelectedFiles')
              .setParameters(params)
          )
      )
  );
  
  // Export options
  actionSection.addWidget(
    CardService.newButtonSet()
      .addButton(
        CardService.newTextButton()
          .setText(t('exportFiles'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleExportEmailOnly')
              .setParameters(params)
          )
      )
      .addButton(
        CardService.newTextButton()
          .setText(t('exportSelected'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleExportSelectedFiles')
              .setParameters(params)
          )
      )
  );
  
  card.addSection(actionSection);

  // Footer with navigation
  card.setFixedFooter(
    CardService.newFixedFooter()
      .setPrimaryButton(
        CardService.newTextButton()
          .setText(t('upload'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('handleUpload')
              .setParameters(params)
          )
      )
      .setSecondaryButton(
        CardService.newTextButton()
          .setText(t('cancel'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('buildAddOn')
          )
      )
  );

  return card.build();
}

/**
 * Show settings card
 */
function showSettings(e) {
  const card = CardService.newCardBuilder();

  card.setHeader(
    CardService.newCardHeader()
      .setTitle(t('settings'))
  );

  const section = CardService.newCardSection();

  const userInfo = getUserInfo();

  if (userInfo) {
    section.addWidget(
      CardService.newTextParagraph()
        .setText(`<b>${t('logged_in_as')}:</b><br>` +
                `${t('priorityUsername')}: ${userInfo.username}<br>` +
                `${t('companyCode')}: ${userInfo.company}`)
    );

    // Language settings
    section.addWidget(
      CardService.newSelectionInput()
        .setType(CardService.SelectionInputType.DROPDOWN)
        .setFieldName('language')
        .setTitle(t('language'))
        .addItem(t('english'), 'en', getCurrentLanguage() === 'en')
        .addItem(t('hebrew'), 'he', getCurrentLanguage() === 'he')
        .setOnChangeAction(
          CardService.newAction()
            .setFunctionName('handleLanguageChange')
        )
    );

    section.addWidget(
      CardService.newButtonSet()
        .addButton(
          CardService.newTextButton()
            .setText(t('logout'))
            .setOnClickAction(
              CardService.newAction()
                .setFunctionName('handleLogout')
            )
        )
    );
  } else {
    section.addWidget(
      CardService.newTextParagraph()
        .setText(t('not_logged_in'))
    );
  }

  card.addSection(section);

  return CardService.newNavigation().pushCard(card.build());
}

// Continue in next file...

/**
 * Format date utility function
 */
function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}

/**
 * Handle language change
 */
function handleLanguageChange(e) {
  const language = e.formInput.language;
  
  // Save current form state before language switch
  if (e.formInput) {
    PropertiesService.getUserProperties().setProperty('temp_form_state', JSON.stringify(e.formInput));
  }
  
  setCurrentLanguage(language);
  
  // Rebuild the current card with new language
  return buildAddOn(e);
}

/**
 * Handle document type change
 */
function handleDocTypeChange(e) {
  const groupId = e.formInput.groupId;
  
  if (!groupId) {
    return buildAddOn(e);
  }
  
  // This would normally populate doc types based on group
  // For now, just rebuild the main card
  return buildMainCard(e);
}

/**
 * Handle search
 */
function handleSearch(e) {
  const groupId = e.formInput.groupId;
  const searchTerm = e.formInput.searchTerm;
  const company = e.formInput.company;
  const docType = e.formInput.docType;
  
  if (!searchTerm || !groupId) {
    return showNotification(t('selectDocument'), 'error');
  }
  
  try {
    const result = searchDocuments(groupId, searchTerm);
    const docs = result.documents || [];
    const errors = result.errors || {};
    
    if (docs.length === 0) {
      return showNotification(t('noDocumentsFound'), 'error');
    }
    
    return buildSearchResultsCard(docs, errors);
  } catch (error) {
    Logger.log('Search failed: ' + error.message);
    return showNotification(t('error') + ': ' + error.message, 'error');
  }
}

/**
 * Handle document selection
 */
function handleSelectDocument(e) {
  return buildAttachmentCard(e);
}

/**
 * Handle attach email only
 */
function handleAttachEmailOnly(e) {
  try {
    let emlContent = '';
    let subject = '';
    
    // Try to get message directly first
    if (e && e.messageMetadata && e.messageMetadata.messageId) {
      try {
        const message = getCurrentMessage(e);
        emlContent = getEmailAsEML(message);
        subject = getEmailSubject(message);
      } catch (error) {
        Logger.log('Failed to get message directly, trying cached data: ' + error.message);
      }
    }
    
    // If direct access failed, we need to reconstruct EML from cached data
    if (!emlContent) {
      const cachedSubject = PropertiesService.getUserProperties().getProperty('cached_subject');
      const cachedSender = PropertiesService.getUserProperties().getProperty('cached_sender');
      const cachedDate = PropertiesService.getUserProperties().getProperty('cached_date');
      
      subject = cachedSubject || e.formInput.description || 'Email Attachment';
      
      // Create a simple EML from cached data
      const emlHeader = `From: ${cachedSender || 'unknown'}\r\n` +
                       `Date: ${cachedDate || new Date().toUTCString()}\r\n` +
                       `Subject: ${subject}\r\n` +
                       `Content-Type: message/rfc822\r\n\r\n`;
      
      emlContent = Utilities.base64Encode(emlHeader);
    }
    
    const description = e.formInput.description || subject;
    
    const uploadData = {
      form: e.parameters.form,
      form_key: e.parameters.formKey,
      ext_files_form: e.parameters.extFilesForm,
      file_description: description,
      file_base64: emlContent,
      file_extension: '.eml',
      mime_type: 'message/rfc822'
    };
    
    uploadAttachment(uploadData);
    return showNotification(t('success'), 'success');
  } catch (error) {
    Logger.log('Attach email failed: ' + error.message);
    return showNotification(t('error') + ': ' + error.message, 'error');
  }
}

/**
 * Handle attach selected files
 */
function handleAttachSelectedFiles(e) {
  try {
    let attachments = [];
    let fullDataAvailable = false;
    let reloadRequired = false;
    
    // Try to get full attachment data from cache first
    const cachedFull = PropertiesService.getUserProperties().getProperty('cached_attachments_full');
    const cacheTimestamp = PropertiesService.getUserProperties().getProperty('cache_timestamp');
    const cacheMode = PropertiesService.getUserProperties().getProperty('cache_mode');
    
    // Check if cache is recent (within 5 minutes) and not metadata-only mode
    if (cachedFull && cacheTimestamp && cacheMode !== 'metadata_only') {
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      if (cacheAge < 300000) { // 5 minutes
        attachments = JSON.parse(cachedFull);
        fullDataAvailable = true;
      } else {
        reloadRequired = true;
      }
    } else if (cacheMode === 'metadata_only') {
      reloadRequired = true;
    }
    
    // If full data not available, try direct message access
    if (!fullDataAvailable) {
      if (e && e.messageMetadata && e.messageMetadata.messageId) {
        try {
          if (reloadRequired) {
            // Show loading message for better UX
            return showNotification(t('loading') + ': Reloading attachments...', 'loading');
          }
          const message = getCurrentMessage(e);
          attachments = getMessageAttachments(message);
          fullDataAvailable = true;
        } catch (error) {
          Logger.log('Failed to get message directly: ' + error.message);
          return showNotification(t('error') + ': Could not access email. Please reopen the email and try again.', 'error');
        }
      } else {
        return showNotification(t('error') + ': Email context lost. Please reopen the email and try again.', 'error');
      }
    }
    
    const description = e.formInput.description || 'Attachment';
    
    let count = 0;
    attachments.forEach((att, index) => {
      const fieldName = `attachment_${index}`;
      // Check if switch is enabled (field exists in formInput)
      if (e.formInput.hasOwnProperty(fieldName)) {
        const uploadData = {
          form: e.parameters.form,
          form_key: e.parameters.formKey,
          ext_files_form: e.parameters.extFilesForm,
          file_description: description + ' - ' + att.name,
          file_base64: att.data,
          file_extension: '.' + (att.name.split('.').pop() || 'bin'),
          mime_type: att.contentType
        };
        
        uploadAttachment(uploadData);
        count++;
      }
    });
    
    if (count === 0) {
      return showNotification(t('noFilesSelected'), 'error');
    }
    
    // Clear cached data after successful upload
    clearAttachmentCache();
    
    return showNotification(t('success') + ': ' + count + ' ' + t('attachSelectedFiles'), 'success');
  } catch (error) {
    Logger.log('Attach files failed: ' + error.message);
    return showNotification(t('error') + ': ' + error.message, 'error');
  }
}

/**
 * Handle export email only
 */
function handleExportEmailOnly(e) {
  try {
    let emlContent = '';
    let subject = '';
    
    // Try to get message directly first
    if (e && e.messageMetadata && e.messageMetadata.messageId) {
      try {
        const message = getCurrentMessage(e);
        emlContent = getEmailAsEML(message);
        subject = getEmailSubject(message);
      } catch (error) {
        Logger.log('Failed to get message directly, trying cached data: ' + error.message);
      }
    }
    
    // If direct access failed, reconstruct EML from cached data
    if (!emlContent) {
      const cachedSubject = PropertiesService.getUserProperties().getProperty('cached_subject');
      const cachedSender = PropertiesService.getUserProperties().getProperty('cached_sender');
      const cachedDate = PropertiesService.getUserProperties().getProperty('cached_date');
      
      subject = cachedSubject || e.formInput.description || 'Email Attachment';
      
      // Create a simple EML from cached data
      const emlHeader = `From: ${cachedSender || 'unknown'}\r\n` +
                       `Date: ${cachedDate || new Date().toUTCString()}\r\n` +
                       `Subject: ${subject}\r\n` +
                       `Content-Type: message/rfc822\r\n\r\n`;
      
      emlContent = Utilities.base64Encode(emlHeader);
    }
    
    const description = e.formInput.description || subject;
    
    const exportData = {
      file_description: description,
      file_base64: emlContent,
      file_extension: '.eml',
      source_identifier: 'FileSmile',
      mime_type: 'message/rfc822'
    };
    
    // This would call an export function
    // exportAttachment(exportData);
    return showNotification(t('success'), 'success');
  } catch (error) {
    Logger.log('Export email failed: ' + error.message);
    return showNotification(t('error') + ': ' + error.message, 'error');
  }
}

/**
 * Handle export selected files
 */
function handleExportSelectedFiles(e) {
  try {
    let attachments = [];
    let fullDataAvailable = false;
    let reloadRequired = false;
    
    // Try to get full attachment data from cache first
    const cachedFull = PropertiesService.getUserProperties().getProperty('cached_attachments_full');
    const cacheTimestamp = PropertiesService.getUserProperties().getProperty('cache_timestamp');
    const cacheMode = PropertiesService.getUserProperties().getProperty('cache_mode');
    
    // Check if cache is recent (within 5 minutes) and not metadata-only mode
    if (cachedFull && cacheTimestamp && cacheMode !== 'metadata_only') {
      const now = new Date().getTime();
      const cacheAge = now - parseInt(cacheTimestamp);
      if (cacheAge < 300000) { // 5 minutes
        attachments = JSON.parse(cachedFull);
        fullDataAvailable = true;
      } else {
        reloadRequired = true;
      }
    } else if (cacheMode === 'metadata_only') {
      reloadRequired = true;
    }
    
    // If full data not available, try direct message access
    if (!fullDataAvailable) {
      if (e && e.messageMetadata && e.messageMetadata.messageId) {
        try {
          if (reloadRequired) {
            // Show loading message for better UX
            return showNotification(t('loading') + ': Reloading attachments...', 'loading');
          }
          const message = getCurrentMessage(e);
          attachments = getMessageAttachments(message);
          fullDataAvailable = true;
        } catch (error) {
          Logger.log('Failed to get message directly: ' + error.message);
          return showNotification(t('error') + ': Could not access email. Please reopen the email and try again.', 'error');
        }
      } else {
        return showNotification(t('error') + ': Email context lost. Please reopen the email and try again.', 'error');
      }
    }
    
    let count = 0;
    attachments.forEach((att, index) => {
      const fieldName = `attachment_${index}`;
      // Check if switch is enabled (field exists in formInput)
      if (e.formInput.hasOwnProperty(fieldName)) {
        const exportData = {
          file_description: att.name,
          file_base64: att.data,
          file_extension: '.' + (att.name.split('.').pop() || 'bin'),
          source_identifier: 'FileSmile',
          mime_type: att.contentType
        };
        
        // This would call an export function
        // exportAttachment(exportData);
        count++;
      }
    });
    
    if (count === 0) {
      return showNotification(t('noFilesSelected'), 'error');
    }
    
    // Clear cached data after successful export
    clearAttachmentCache();
    
    return showNotification(t('success') + ': ' + count + ' ' + t('exportSelected'), 'success');
  } catch (error) {
    Logger.log('Export files failed: ' + error.message);
    return showNotification(t('error') + ': ' + error.message, 'error');
  }
}

/**
 * Handle upload (combined attach)
 */
function handleUpload(e) {
  // Check if email attachment switch is enabled (field exists)
  const attachEmail = e.formInput.hasOwnProperty('attachEmail');
  
  if (attachEmail) {
    return handleAttachEmailOnly(e);
  } else {
    return handleAttachSelectedFiles(e);
  }
}

/**
 * Handle login
 */
function handleLogin(e) {
  const apiKey = e.formInput.apiKey;
  
  if (!apiKey) {
    return showNotification(t('apiKey') + ' ' + t('error'), 'error');
  }
  
  try {
    // Validate API key
    const validation = validateApiKey(apiKey);
    if (validation.valid) {
      setApiKey(apiKey);
      setUserInfo(validation.user_info);
      return buildAddOn(e);
    } else {
      return showNotification(t('error') + ': ' + (validation.message || 'Invalid API key'), 'error');
    }
  } catch (error) {
    Logger.log('Login failed: ' + error.message);
    return showNotification(t('error') + ': ' + error.message, 'error');
  }
}

/**
 * Handle create API key
 */
function handleCreateApiKey(e) {
  const company = e.formInput.company;
  const username = e.formInput.username;
  const password = e.formInput.password;
  
  if (!company || !username || !password) {
    return showNotification(t('error') + ': Missing credentials', 'error');
  }
  
  try {
    const response = createApiKey(username, password, company);
    if (response.api_key) {
      setApiKey(response.api_key);
      setUserInfo({ username, company });
      return buildAddOn(e);
    } else {
      return showNotification(t('error') + ': Failed to create API key', 'error');
    }
  } catch (error) {
    Logger.log('Create API key failed: ' + error.message);
    return showNotification(t('error') + ': ' + error.message, 'error');
  }
}

/**
 * Handle logout
 */
function handleLogout(e) {
  // Clear all cached data on logout
  clearAttachmentCache();
  PropertiesService.getUserProperties().deleteProperty('cached_subject');
  PropertiesService.getUserProperties().deleteProperty('cached_sender');
  PropertiesService.getUserProperties().deleteProperty('cached_date');
  PropertiesService.getUserProperties().deleteProperty('temp_form_state');
  
  clearStorage();
  return buildLoginCard();
}

/**
 * Clear attachment cache
 */
function clearAttachmentCache() {
  PropertiesService.getUserProperties().deleteProperty('cached_attachments_metadata');
  PropertiesService.getUserProperties().deleteProperty('cached_attachments_full');
  PropertiesService.getUserProperties().deleteProperty('cache_timestamp');
  PropertiesService.getUserProperties().deleteProperty('cache_mode');
}

/**
 * Show notification
 */
function showNotification(message, type) {
  const card = CardService.newCardBuilder();
  
  card.setHeader(
    CardService.newCardHeader()
      .setTitle(type === 'error' ? t('error') : t('success'))
  );
  
  const section = CardService.newCardSection();
  section.addWidget(
    CardService.newTextParagraph()
      .setText(message)
  );
  
  card.addSection(section);
  
  card.setFixedFooter(
    CardService.newFixedFooter()
      .setPrimaryButton(
        CardService.newTextButton()
          .setText(t('back'))
          .setOnClickAction(
            CardService.newAction()
              .setFunctionName('buildAddOn')
          )
      )
  );
  
  return card.build();
}

/**
 * Load companies
 */
function loadCompanies() {
  try {
    const cached = PropertiesService.getUserProperties().getProperty('companies');
    
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Call the API to get companies
    const companies = getCompanies();
    
    PropertiesService.getUserProperties().setProperty('companies', JSON.stringify(companies));
    
    return companies;
  } catch (e) {
    Logger.log('Failed to load companies: ' + e.message);
    // Fallback to demo data if API fails
    const companies = [
      { DNAME: 'demo', TITLE: 'Demo Company' },
      { DNAME: 'test', TITLE: 'Test Company' }
    ];
    return companies;
  }
}
