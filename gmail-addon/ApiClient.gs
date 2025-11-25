/**
 * API Client for FileSmile Backend
 */

/**
 * Make authenticated API request
 */
function apiRequest(endpoint, options) {
  options = options || {};

  const apiKey = getApiKey();
  const url = CONFIG.API_BASE_URL + endpoint;

  const headers = {
    'Content-Type': 'application/json'
  };

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  }

  const requestOptions = {
    method: options.method || 'GET',
    headers: headers,
    muteHttpExceptions: true
  };

  if (options.payload) {
    requestOptions.payload = JSON.stringify(options.payload);
  }

  try {
    const response = UrlFetchApp.fetch(url, requestOptions);
    const responseCode = response.getResponseCode();
    const responseText = response.getContentText();

    if (responseCode >= 200 && responseCode < 300) {
      return JSON.parse(responseText);
    } else {
      const error = JSON.parse(responseText);
      throw new Error(error.detail || error.error || 'HTTP ' + responseCode);
    }
  } catch (e) {
    Logger.log('API request failed: ' + e.message);
    throw e;
  }
}

/**
 * Create a new API key
 */
function createApiKey(username, password, company) {
  return apiRequest('/auth/api-key', {
    method: 'POST',
    payload: {
      priority_username: username,
      priority_password: password,
      priority_company: company,
      description: 'Gmail Add-on'
    }
  });
}

/**
 * Validate API key
 */
function validateApiKey(apiKey) {
  return apiRequest('/auth/validate?api_key=' + encodeURIComponent(apiKey));
}

/**
 * Get companies
 */
function getCompanies() {
  return apiRequest('/companies');
}

/**
 * Get search groups
 */
function getSearchGroups() {
  return apiRequest('/search/groups');
}

/**
 * Load and cache search groups
 */
function loadSearchGroups() {
  try {
    const cached = PropertiesService.getUserProperties().getProperty('search_groups');

    if (cached) {
      return JSON.parse(cached);
    }

    const groups = getSearchGroups();
    PropertiesService.getUserProperties().setProperty('search_groups', JSON.stringify(groups));

    return groups;
  } catch (e) {
    Logger.log('Failed to load search groups: ' + e.message);
    return [];
  }
}

/**
 * Search for documents
 */
function searchDocuments(groupId, searchTerm) {
  return apiRequest('/search/documents', {
    method: 'POST',
    payload: {
      group_id: groupId,
      search_term: searchTerm
    }
  });
}

/**
 * Upload attachment
 */
function uploadAttachment(data) {
  return apiRequest('/attachments/upload', {
    method: 'POST',
    payload: data
  });
}

/**
 * Get/set API key in user properties
 */
function getApiKey() {
  return PropertiesService.getUserProperties().getProperty(CONFIG.PROPERTY_API_KEY);
}

function setApiKey(apiKey) {
  PropertiesService.getUserProperties().setProperty(CONFIG.PROPERTY_API_KEY, apiKey);
}

/**
 * Get/set user info
 */
function getUserInfo() {
  const userInfoJson = PropertiesService.getUserProperties().getProperty(CONFIG.PROPERTY_USER_INFO);
  return userInfoJson ? JSON.parse(userInfoJson) : null;
}

function setUserInfo(userInfo) {
  PropertiesService.getUserProperties().setProperty(CONFIG.PROPERTY_USER_INFO, JSON.stringify(userInfo));
}

/**
 * Clear storage (logout)
 */
function clearStorage() {
  PropertiesService.getUserProperties().deleteAllProperties();
}
