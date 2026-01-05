import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TenantInfo {
  tenant_id: number;
  tenant_name: string;
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
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      // Initial state
      isAuthenticated: false,
      jwtToken: null,
      tenantId: null,
      tenantName: null,
      userEmail: null,
      userId: null,
      availableTenants: [],
      requiresTenantSelection: false,

      // Actions
      setAuth: ({ jwtToken, tenantId, tenantName, userEmail, userId }) =>
        set({
          isAuthenticated: true,
          jwtToken,
          tenantId,
          tenantName,
          userEmail,
          userId,
          requiresTenantSelection: false,
        }),

      setAvailableTenants: (availableTenants) =>
        set({ availableTenants }),

      setRequiresTenantSelection: (requiresTenantSelection) =>
        set({ requiresTenantSelection }),

      logout: () =>
        set({
          isAuthenticated: false,
          jwtToken: null,
          tenantId: null,
          tenantName: null,
          userEmail: null,
          userId: null,
          availableTenants: [],
          requiresTenantSelection: false,
        }),
    }),
    {
      name: 'filesmile-auth',
    }
  )
);
