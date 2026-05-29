import { create } from 'zustand';
import { getToken, setToken, setRefreshToken, clearAuth, setUser, getUser, isTokenExpired } from '@/lib/auth';
import { api } from '@/lib/api-client';

interface User {
  id: string; email: string; firstName: string; lastName: string;
  role: string; tenantId: string; storeId: string | null;
}

interface PlanInfo {
  planName: string; planSlug: string; status: string;
  billingCycle?: string; features?: Record<string, boolean>;
  trialEndsAt?: string | null; trialDaysLeft?: number | null;
  currentPeriodEnd?: string | null;
  monthlyPrice?: number; maxUsers?: number; maxBranches?: number;
}

interface StoreInfo {
  id: string; name: string; slug: string;
}

type ScopeMap = Record<string, string[]>;

interface AuthState {
  user: User | null;
  token: string | null;
  plan: PlanInfo | null;
  scopes: ScopeMap;
  stores: StoreInfo[];
  redirectPath: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<string>;
  register: (data: any) => Promise<string>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  hasScope: (module: string, action: string) => boolean;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: getUser(),
  token: getToken(),
  plan: null,
  scopes: {},
  stores: [],
  redirectPath: null,
  isAuthenticated: !!getToken(),
  isLoading: false,

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/login', { email, password });
      setToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setUser({ ...res.user, scopes: res.scopes });
      set({
        user: res.user,
        token: res.accessToken,
        plan: res.plan || null,
        scopes: res.scopes || {},
        stores: res.stores || [],
        redirectPath: res.redirectPath || '/dashboard',
        isAuthenticated: true,
      });
      // Return the redirect path so the login page can navigate
      return res.redirectPath || '/dashboard';
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (data) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/auth/register', data);
      setToken(res.accessToken);
      setRefreshToken(res.refreshToken);
      setUser({ ...res.user, scopes: res.scopes });
      set({
        user: res.user,
        token: res.accessToken,
        plan: res.plan || null,
        scopes: res.scopes || {},
        stores: res.stores || [],
        redirectPath: res.redirectPath || '/tenant',
        isAuthenticated: true,
      });
      return res.redirectPath || '/tenant';
    } finally {
      set({ isLoading: false });
    }
  },

  logout: () => {
    clearAuth();
    set({ user: null, token: null, plan: null, scopes: {}, stores: [], redirectPath: null, isAuthenticated: false });
  },

  checkAuth: async () => {
    const token = getToken();
    if (!token) return;

    // Clear immediately if token is already expired — no need to hit the server
    if (isTokenExpired()) {
      clearAuth();
      set({ user: null, token: null, plan: null, scopes: {}, stores: [], redirectPath: null, isAuthenticated: false });
      return;
    }

    try {
      const profile = await api.get('/auth/me', { token });
      setUser({ ...profile, scopes: profile.scopes });
      set({
        user: profile,
        token,
        plan: profile.plan || null,
        scopes: profile.scopes || {},
        stores: profile.stores || [],
        redirectPath: profile.redirectPath || '/dashboard',
        isAuthenticated: true,
      });
    } catch {
      clearAuth();
      set({ user: null, token: null, plan: null, scopes: {}, stores: [], redirectPath: null, isAuthenticated: false });
    }
  },

  hasScope: (module: string, action: string): boolean => {
    const { user, scopes } = get();
    if (!user) return false;
    if (user.role === 'superadmin') return true;
    const allScopes = scopes['*'];
    if (allScopes?.includes('manage')) return true;
    const moduleScopes = scopes[module];
    if (!moduleScopes) return false;
    if (moduleScopes.includes('manage')) return true;
    return moduleScopes.includes(action);
  },
}));
