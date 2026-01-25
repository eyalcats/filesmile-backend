import { useAuthStore } from '@/stores/auth-store';
import {
  TenantResolveRequest,
  TenantResolveResponse,
  UserLoginRequest,
  UserRegisterRequest,
  UserLoginResponse,
  Company,
  SearchGroup,
  SearchRequest,
  SearchResponse,
  Document,
  ExtFile,
  AttachmentUploadRequest,
  AttachmentUploadResponse,
  FormPrefixInfo,
  ExportAttachment,
  ApiException,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8002/api/v1';

/**
 * FileSmile API Client
 *
 * Handles all API communication with the FileSmile backend.
 * Automatically includes JWT token in requests and handles 401 errors.
 */
class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get headers for API requests
   */
  private getHeaders(): Headers {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    const token = useAuthStore.getState().jwtToken;
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  }

  /**
   * Make an API request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isAuthEndpoint: boolean = false
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: this.getHeaders(),
    });

    // Handle errors (including 401)
    if (!response.ok) {
      let errorMessage = response.statusText;
      let errorCode: string | undefined;

      try {
        const errorBody = await response.json();
        // Handle different error formats
        if (typeof errorBody.detail === 'string') {
          errorMessage = errorBody.detail;
        } else if (Array.isArray(errorBody.detail)) {
          // FastAPI validation errors return an array
          errorMessage = errorBody.detail.map((e: { msg?: string; loc?: string[] }) =>
            `${e.loc?.join('.')}: ${e.msg}`
          ).join('; ');
        } else if (errorBody.detail) {
          errorMessage = JSON.stringify(errorBody.detail);
        }
        errorCode = response.headers.get('X-Error-Code') || undefined;
      } catch {
        // Ignore JSON parse errors
      }

      // Only logout on 401 for non-auth endpoints
      // Auth endpoints (login, register) can return 401 for invalid credentials
      // which shouldn't trigger a logout
      if (response.status === 401 && !isAuthEndpoint) {
        useAuthStore.getState().logout();
      }

      throw new ApiException(errorMessage, response.status, errorCode);
    }

    // Return empty object for 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ==========================================================================
  // Authentication Endpoints
  // ==========================================================================

  /**
   * Resolve tenant from user's email domain
   */
  async resolveTenant(email: string): Promise<TenantResolveResponse> {
    return this.request<TenantResolveResponse>(
      '/auth/tenant/resolve',
      {
        method: 'POST',
        body: JSON.stringify({ email } as TenantResolveRequest),
      },
      true // isAuthEndpoint - don't logout on 401
    );
  }

  /**
   * Login with email only (for pre-configured users)
   */
  async login(email: string, tenantId?: number): Promise<UserLoginResponse> {
    const payload: UserLoginRequest = { email };
    if (tenantId !== undefined) {
      payload.tenant_id = tenantId;
    }

    return this.request<UserLoginResponse>(
      '/auth/login',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      true // isAuthEndpoint - don't logout on 401
    );
  }

  /**
   * Switch to a different tenant
   */
  async switchTenant(email: string, tenantId: number): Promise<UserLoginResponse> {
    return this.request<UserLoginResponse>(
      '/auth/switch-tenant',
      {
        method: 'POST',
        body: JSON.stringify({ email, tenant_id: tenantId }),
      },
      true // isAuthEndpoint - don't logout on 401
    );
  }

  /**
   * Register user with ERP credentials (creates/updates stored credentials)
   */
  async register(
    email: string,
    erpUsername: string,
    erpPassword: string,
    tenantId?: number
  ): Promise<UserLoginResponse> {
    const payload: UserRegisterRequest = {
      email,
      erp_username: erpUsername,
      erp_password_or_token: erpPassword,
    };
    if (tenantId !== undefined) {
      payload.tenant_id = tenantId;
    }

    return this.request<UserLoginResponse>(
      '/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
      true // isAuthEndpoint - don't logout on 401
    );
  }

  // ==========================================================================
  // Search Endpoints
  // ==========================================================================

  /**
   * Get list of companies
   */
  async getCompanies(): Promise<Company[]> {
    return this.request<Company[]>('/search/companies');
  }

  /**
   * Get search groups (document types)
   */
  async getSearchGroups(): Promise<SearchGroup[]> {
    return this.request<SearchGroup[]>('/search/groups');
  }

  /**
   * Search for documents
   */
  async searchDocuments(
    groupId: number,
    searchTerm: string,
    form?: string
  ): Promise<SearchResponse> {
    const payload: SearchRequest = {
      group_id: groupId,
      search_term: searchTerm,
    };
    if (form) {
      payload.form = form;
    }

    return this.request<SearchResponse>('/search/documents', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get all form prefixes for barcode matching
   * Called once when barcode mode is activated, then cached locally
   */
  async getAllFormPrefixes(): Promise<FormPrefixInfo[]> {
    return this.request<FormPrefixInfo[]>('/search/form-prefixes');
  }

  /**
   * Find a document by form name and document number
   * Used for barcode-based document lookup
   */
  async findDocumentByNumber(formName: string, docNumber: string): Promise<Document> {
    const encodedFormName = encodeURIComponent(formName);
    const encodedDocNumber = encodeURIComponent(docNumber);
    return this.request<Document>(`/search/document/${encodedFormName}/${encodedDocNumber}`);
  }

  // ==========================================================================
  // Attachment Endpoints
  // ==========================================================================

  /**
   * Upload an attachment to a document
   */
  async uploadAttachment(
    form: string,
    formKey: string,
    fileDescription: string,
    fileBase64: string,
    fileExtension: string,
    extFilesForm: string = 'EXTFILES',
    mimeType?: string
  ): Promise<AttachmentUploadResponse> {
    const payload: AttachmentUploadRequest = {
      form,
      form_key: formKey,
      ext_files_form: extFilesForm,
      file_description: fileDescription,
      file_base64: fileBase64,
      file_extension: fileExtension,
    };
    if (mimeType) {
      payload.mime_type = mimeType;
    }

    return this.request<AttachmentUploadResponse>('/attachments/upload', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Get list of attachments for a document
   */
  async getAttachments(
    form: string,
    formKey: string,
    extFilesForm: string = 'EXTFILES'
  ): Promise<ExtFile[]> {
    const params = new URLSearchParams({
      form,
      form_key: formKey,
      ext_files_form: extFilesForm,
    });

    return this.request<ExtFile[]>(`/attachments/list?${params.toString()}`);
  }

  /**
   * Delete an attachment
   */
  async deleteAttachment(
    form: string,
    formKey: string,
    attachmentId: number,
    extFilesForm: string = 'EXTFILES'
  ): Promise<{ message: string }> {
    const encodedFormKey = encodeURIComponent(formKey);
    return this.request<{ message: string }>(
      `/attachments/${form}/${encodedFormKey}/${attachmentId}?ext_files_form=${extFilesForm}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Download an attachment as Blob
   */
  async downloadAttachment(
    form: string,
    formKey: string,
    attachmentId: number,
    extFilesForm: string = 'EXTFILES'
  ): Promise<Blob> {
    const encodedFormKey = encodeURIComponent(formKey);
    const url = `${this.baseUrl}/attachments/download/${form}/${encodedFormKey}/${attachmentId}?ext_files_form=${extFilesForm}`;

    const response = await fetch(url, {
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new ApiException('Failed to download attachment', response.status);
    }

    return response.blob();
  }

  // ==========================================================================
  // Export Attachment Endpoints (Outlook staging area)
  // ==========================================================================

  /**
   * Get export attachments for a user from the staging area
   * @param userLogin - User's ERP login name
   */
  async getExportAttachments(userLogin: string): Promise<ExportAttachment[]> {
    const encodedLogin = encodeURIComponent(userLogin);
    return this.request<ExportAttachment[]>(`/attachments/export/${encodedLogin}`);
  }

  /**
   * Get file content (base64 data) for a single export attachment
   * Used for on-demand loading of file previews
   * @param attachmentId - The EXTFILENUM to fetch content for
   */
  async getExportAttachmentContent(attachmentId: number): Promise<{ EXTFILENUM: number; EXTFILENAME: string }> {
    return this.request<{ EXTFILENUM: number; EXTFILENAME: string }>(
      `/attachments/export/${attachmentId}/content`
    );
  }

  /**
   * Delete an export attachment from the staging area
   * @param attachmentId - The EXTFILENUM to delete
   */
  async deleteExportAttachment(attachmentId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(
      `/attachments/export/${attachmentId}`,
      { method: 'DELETE' }
    );
  }

  /**
   * Move an export attachment to a document (server-side).
   * More efficient than separate content + upload calls as base64
   * content stays on the server.
   * @param attachmentId - The EXTFILENUM to move
   * @param form - Target Priority form name
   * @param formKey - Target document key
   * @param extFilesForm - Target attachments subform
   */
  async moveExportToDocument(
    attachmentId: number,
    form: string,
    formKey: string,
    extFilesForm: string = 'EXTFILES'
  ): Promise<{ success: boolean; message: string; attachment_id?: number }> {
    return this.request<{ success: boolean; message: string; attachment_id?: number }>(
      `/attachments/export/${attachmentId}/move`,
      {
        method: 'POST',
        body: JSON.stringify({
          form,
          form_key: formKey,
          ext_files_form: extFilesForm,
        }),
      }
    );
  }
}

// Export singleton instance
export const api = new ApiClient();

// Export class for testing
export { ApiClient };
