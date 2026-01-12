/**
 * Shared preferences storage that syncs with the Outlook add-in.
 * Uses the same localStorage keys as the Outlook add-in to share settings.
 *
 * Auth keys are handled separately by auth-store.ts:
 * - filesmile_jwt_token: JWT authentication token
 * - filesmile_tenant_id: Current tenant ID
 * - filesmile_user_email: User email address
 * - filesmile_user_info: JSON object with user details
 */

// Keys matching the outlook-addin config.js STORAGE_KEYS
const STORAGE_KEYS = {
  SELECTED_COMPANY: 'filesmile_selected_company',
  LAST_SEARCH_GROUP: 'filesmile_last_group',
  LANGUAGE: 'filesmile_language',
  LAST_DOC_TYPE: 'filesmile_last_doc_type',
} as const;

export const sharedPreferences = {
  /**
   * Get selected company
   */
  getCompany(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.SELECTED_COMPANY);
  },

  /**
   * Set selected company
   */
  setCompany(company: string | null): void {
    if (typeof window === 'undefined') return;
    if (company) {
      localStorage.setItem(STORAGE_KEYS.SELECTED_COMPANY, company);
    } else {
      localStorage.removeItem(STORAGE_KEYS.SELECTED_COMPANY);
    }
  },

  /**
   * Get last search group ID
   */
  getSearchGroupId(): number | null {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEYS.LAST_SEARCH_GROUP);
    return stored ? parseInt(stored, 10) : null;
  },

  /**
   * Set last search group ID
   */
  setSearchGroupId(groupId: number | null): void {
    if (typeof window === 'undefined') return;
    if (groupId !== null) {
      localStorage.setItem(STORAGE_KEYS.LAST_SEARCH_GROUP, groupId.toString());
    } else {
      localStorage.removeItem(STORAGE_KEYS.LAST_SEARCH_GROUP);
    }
  },

  /**
   * Get last document type (form)
   */
  getDocType(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(STORAGE_KEYS.LAST_DOC_TYPE);
  },

  /**
   * Set last document type (form)
   */
  setDocType(docType: string | null): void {
    if (typeof window === 'undefined') return;
    if (docType) {
      localStorage.setItem(STORAGE_KEYS.LAST_DOC_TYPE, docType);
    } else {
      localStorage.removeItem(STORAGE_KEYS.LAST_DOC_TYPE);
    }
  },

  /**
   * Get language preference
   */
  getLanguage(): string {
    if (typeof window === 'undefined') return 'en';
    const stored = localStorage.getItem(STORAGE_KEYS.LANGUAGE);
    if (stored) return stored;

    // Detect browser language
    const browserLang = navigator.language;
    if (browserLang.startsWith('he')) return 'he';
    return 'en';
  },

  /**
   * Set language preference
   */
  setLanguage(lang: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
  },

  /**
   * Load all shared preferences
   */
  loadAll() {
    return {
      company: this.getCompany(),
      searchGroupId: this.getSearchGroupId(),
      docType: this.getDocType(),
      language: this.getLanguage(),
    };
  },
};
