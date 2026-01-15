import { create } from 'zustand';

// Storage keys matching outlook-addin config.js
const STORAGE_KEYS = {
  JWT_TOKEN: 'filesmile_jwt_token',
  TENANT_ID: 'filesmile_tenant_id',
  TENANT_NAME: 'filesmile_tenant_name',
  USER_EMAIL: 'filesmile_user_email',
  USER_INFO: 'filesmile_user_info',
  // Local credential storage for device-based trust (matching Outlook add-in)
  REGISTRATION_COMPLETE: 'filesmile_registration_complete',
  ERP_USERNAME: 'filesmile_erp_username',
  ERP_PASSWORD: 'filesmile_erp_password',
} as const;

interface TenantInfo {
  tenant_id: number;
  tenant_name: string;
}

interface UserInfo {
  user_id: number;
  email: string;
  tenant_id: number;
  tenant_name?: string;
}

type ReauthMode = 'none' | 'credentials' | 'tenant-select';

interface AuthState {
  // Auth state
  isAuthenticated: boolean;
  jwtToken: string | null;
  tenantId: number | null;
  tenantName: string | null;
  userEmail: string | null;
  userId: number | null;

  // Multi-tenant
  availableTenants: TenantInfo[];
  requiresTenantSelection: boolean;

  // Re-authentication mode
  reauthMode: ReauthMode;

  // Actions
  setAuth: (data: {
    jwtToken: string;
    tenantId: number;
    tenantName: string;
    userEmail: string;
    userId: number;
  }) => void;
  setAvailableTenants: (tenants: TenantInfo[]) => void;
  setRequiresTenantSelection: (requires: boolean) => void;
  logout: () => void;
  triggerReauthentication: () => void;
  triggerTenantChange: () => void;
  clearReauthMode: () => void;

  // Local credential management (device-based trust)
  setLocalCredentials: (username: string, password: string) => void;
  getLocalCredentials: () => { username: string; password: string } | null;
  isRegistrationComplete: () => boolean;
  clearLocalCredentials: () => void;

  // Initialize from localStorage (call on app start)
  initFromStorage: () => void;
}

// Helper to safely access localStorage (SSR-safe)
const getStorageItem = (key: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(key);
};

const setStorageItem = (key: string, value: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, value);
};

const removeStorageItem = (key: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
};

// Load auth state from localStorage (shared with outlook-addin)
const loadAuthFromStorage = (): Partial<AuthState> => {
  const jwtToken = getStorageItem(STORAGE_KEYS.JWT_TOKEN);
  const tenantIdStr = getStorageItem(STORAGE_KEYS.TENANT_ID);
  const userEmail = getStorageItem(STORAGE_KEYS.USER_EMAIL);
  const userInfoStr = getStorageItem(STORAGE_KEYS.USER_INFO);

  if (!jwtToken) {
    return {
      isAuthenticated: false,
      jwtToken: null,
      tenantId: null,
      tenantName: null,
      userEmail: null,
      userId: null,
    };
  }

  let userInfo: UserInfo | null = null;
  if (userInfoStr) {
    try {
      userInfo = JSON.parse(userInfoStr);
    } catch {
      // Invalid JSON, ignore
    }
  }

  return {
    isAuthenticated: true,
    jwtToken,
    tenantId: tenantIdStr ? parseInt(tenantIdStr, 10) : (userInfo?.tenant_id ?? null),
    tenantName: userInfo?.tenant_name ?? null,
    userEmail: userEmail ?? userInfo?.email ?? null,
    userId: userInfo?.user_id ?? null,
  };
};

// Save auth state to localStorage (shared with outlook-addin)
const saveAuthToStorage = (data: {
  jwtToken: string;
  tenantId: number;
  tenantName: string;
  userEmail: string;
  userId: number;
}): void => {
  setStorageItem(STORAGE_KEYS.JWT_TOKEN, data.jwtToken);
  setStorageItem(STORAGE_KEYS.TENANT_ID, data.tenantId.toString());
  setStorageItem(STORAGE_KEYS.TENANT_NAME, data.tenantName);
  setStorageItem(STORAGE_KEYS.USER_EMAIL, data.userEmail);
  setStorageItem(STORAGE_KEYS.USER_INFO, JSON.stringify({
    user_id: data.userId,
    email: data.userEmail,
    tenant_id: data.tenantId,
    tenant_name: data.tenantName,
  }));
};

// Clear auth from localStorage
const clearAuthFromStorage = (): void => {
  removeStorageItem(STORAGE_KEYS.JWT_TOKEN);
  removeStorageItem(STORAGE_KEYS.TENANT_ID);
  removeStorageItem(STORAGE_KEYS.TENANT_NAME);
  removeStorageItem(STORAGE_KEYS.USER_EMAIL);
  removeStorageItem(STORAGE_KEYS.USER_INFO);
  // Also clear legacy Zustand persist key if it exists
  removeStorageItem('filesmile-auth');
};

// Local credential storage helpers (device-based trust matching Outlook add-in)
const saveLocalCredentials = (username: string, password: string): void => {
  setStorageItem(STORAGE_KEYS.ERP_USERNAME, username);
  setStorageItem(STORAGE_KEYS.ERP_PASSWORD, password);
  setStorageItem(STORAGE_KEYS.REGISTRATION_COMPLETE, 'true');
};

const getLocalCredentialsFromStorage = (): { username: string; password: string } | null => {
  const username = getStorageItem(STORAGE_KEYS.ERP_USERNAME);
  const password = getStorageItem(STORAGE_KEYS.ERP_PASSWORD);
  return username && password ? { username, password } : null;
};

const isRegistrationCompleteInStorage = (): boolean => {
  return getStorageItem(STORAGE_KEYS.REGISTRATION_COMPLETE) === 'true';
};

const clearLocalCredentialsFromStorage = (): void => {
  removeStorageItem(STORAGE_KEYS.ERP_USERNAME);
  removeStorageItem(STORAGE_KEYS.ERP_PASSWORD);
  removeStorageItem(STORAGE_KEYS.REGISTRATION_COMPLETE);
};

export const useAuthStore = create<AuthState>()((set) => ({
  // Initial state (will be hydrated from localStorage)
  isAuthenticated: false,
  jwtToken: null,
  tenantId: null,
  tenantName: null,
  userEmail: null,
  userId: null,
  availableTenants: [],
  requiresTenantSelection: false,
  reauthMode: 'none',

  // Initialize from localStorage
  initFromStorage: () => {
    const storedAuth = loadAuthFromStorage();
    set(storedAuth);
  },

  // Actions
  setAuth: ({ jwtToken, tenantId, tenantName, userEmail, userId }) => {
    // Save to localStorage (shared with outlook-addin)
    saveAuthToStorage({ jwtToken, tenantId, tenantName, userEmail, userId });

    // Update Zustand state
    set({
      isAuthenticated: true,
      jwtToken,
      tenantId,
      tenantName,
      userEmail,
      userId,
      requiresTenantSelection: false,
    });
  },

  setAvailableTenants: (availableTenants) =>
    set({ availableTenants }),

  setRequiresTenantSelection: (requiresTenantSelection) =>
    set({ requiresTenantSelection }),

  logout: () => {
    // Clear localStorage (including local credentials)
    clearAuthFromStorage();
    clearLocalCredentialsFromStorage();

    // Reset Zustand state
    set({
      isAuthenticated: false,
      jwtToken: null,
      tenantId: null,
      tenantName: null,
      userEmail: null,
      userId: null,
      availableTenants: [],
      requiresTenantSelection: false,
      reauthMode: 'none',
    });
  },

  triggerReauthentication: () => {
    set({ reauthMode: 'credentials' });
  },

  triggerTenantChange: () => {
    set({ reauthMode: 'tenant-select' });
  },

  clearReauthMode: () => {
    set({ reauthMode: 'none' });
  },

  // Local credential management (device-based trust)
  setLocalCredentials: (username: string, password: string) => {
    saveLocalCredentials(username, password);
  },

  getLocalCredentials: () => {
    return getLocalCredentialsFromStorage();
  },

  isRegistrationComplete: () => {
    return isRegistrationCompleteInStorage();
  },

  clearLocalCredentials: () => {
    clearLocalCredentialsFromStorage();
  },
}));

// Auto-initialize on client side
if (typeof window !== 'undefined') {
  // Initialize from localStorage on load
  useAuthStore.getState().initFromStorage();

  // Listen for storage events (for cross-tab sync with outlook-addin)
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.JWT_TOKEN) {
      useAuthStore.getState().initFromStorage();
    }
  });
}
