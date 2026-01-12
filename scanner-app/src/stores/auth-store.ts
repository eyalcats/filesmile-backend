import { create } from 'zustand';

// Storage keys matching outlook-addin config.js
const STORAGE_KEYS = {
  JWT_TOKEN: 'filesmile_jwt_token',
  TENANT_ID: 'filesmile_tenant_id',
  USER_EMAIL: 'filesmile_user_email',
  USER_INFO: 'filesmile_user_info',
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
  removeStorageItem(STORAGE_KEYS.USER_EMAIL);
  removeStorageItem(STORAGE_KEYS.USER_INFO);
  // Also clear legacy Zustand persist key if it exists
  removeStorageItem('filesmile-auth');
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
    // Clear localStorage
    clearAuthFromStorage();

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
    });
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
