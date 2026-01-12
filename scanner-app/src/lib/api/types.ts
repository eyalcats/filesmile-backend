// API Types for FileSmile Scanner App

// ============================================================================
// Authentication Types
// ============================================================================

export interface TenantResolveRequest {
  email: string;
}

export interface TenantInfo {
  tenant_id: number;
  tenant_name: string;
}

export interface TenantResolveResponse {
  tenant_id?: number;
  tenant_name?: string;
  tenants?: TenantInfo[];
  requires_selection: boolean;
}

export interface UserLoginRequest {
  email: string;
  tenant_id?: number;
}

export interface UserRegisterRequest {
  email: string;
  erp_username: string;
  erp_password_or_token: string;
  tenant_id?: number;
}

export interface UserLoginResponse {
  access_token: string;
  token_type: string;
  tenant_id: number;
  user_id: number;
  email: string;
  expires_in: number;
}

// ============================================================================
// Document Types
// ============================================================================

export interface Company {
  DNAME: string;
  TITLE: string;
}

export interface GroupForm {
  ENAME: string;
  TITLE: string;
}

export interface SearchGroup {
  FSGROUP: number;
  FSGROUPNAME: string;
  GROUPFORMS: GroupForm[];
}

export interface ExtFile {
  EXTFILENUM?: number;
  EXTFILEDES?: string;
  EXTFILENAME?: string;
  CURDATE?: string;
  SUFFIX?: string;
  FILESIZE?: number;
}

export interface Document {
  Form: string;
  FormDesc?: string;
  ExtFilesForm: string;
  FormKey: string;
  DocNo?: string;
  DocDate?: string;
  CustName?: string;
  Details?: string;
  ExtFileDesc?: string;
  extFiles?: ExtFile[];
}

export interface SearchRequest {
  group_id: number;
  search_term: string;
  form?: string;
}

export interface SearchResponse {
  documents: Document[];
  errors: Record<string, string>;
}

export interface FormPrefixInfo {
  ENAME: string;
  TITLE: string;
  SUBENAME?: string;
  PREFIX: string;
}

// ============================================================================
// Attachment Types
// ============================================================================

export interface AttachmentUploadRequest {
  form: string;
  form_key: string;
  ext_files_form: string;
  file_description: string;
  file_base64: string;
  file_extension: string;
  mime_type?: string;
}

export interface AttachmentUploadResponse {
  success: boolean;
  message: string;
  attachment_id?: number;
}

// ============================================================================
// Error Types
// ============================================================================

export interface ApiError {
  detail: string;
  status: number;
}

export class ApiException extends Error {
  status: number;
  errorCode?: string;

  constructor(message: string, status: number, errorCode?: string) {
    super(message);
    this.name = 'ApiException';
    this.status = status;
    this.errorCode = errorCode;
  }
}
