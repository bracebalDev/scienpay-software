import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { LoginInput } from '@scienpay/shared';
import {
  apiClient,
  getAccessToken,
  setAccessToken,
  setRefreshHandler,
  setUnauthorizedHandler,
} from '../lib/apiClient.js';
import { queryClient } from '../lib/queryClient.js';
import type { AuthUser, LoginResponse, RefreshResponse } from '../types/api.types.js';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Deduplica renovaciones concurrentes (HANDOFF 3.2).
 * Sin esto, React StrictMode o dos queries simultáneas podrían reutilizar el
 * mismo refresh token y el backend lo interpretaría como replay.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function requestNewAccessToken(): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = (async () => {
      try {
        const response = await apiClient.post<RefreshResponse>('/auth/refresh');
        setAccessToken(response.accessToken);
        return response.accessToken;
      } catch {
        setAccessToken(null);
        return null;
      } finally {
        refreshInFlight = null;
      }
    })();
  }
  return refreshInFlight;
}

function getTokenExpiry(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshTimer = useRef<number | null>(null);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
    queryClient.clear();
  }, []);

  const refreshSession = useCallback(async (): Promise<boolean> => {
    const token = await requestNewAccessToken();
    if (!token) {
      clearSession();
      return false;
    }

    try {
      const profile = await apiClient.get<AuthUser>('/auth/me');
      setUser(profile);
      return true;
    } catch {
      clearSession();
      return false;
    }
  }, [clearSession]);

  // Registro de handlers del cliente HTTP.
  useEffect(() => {
    setRefreshHandler(refreshSession);
    setUnauthorizedHandler(clearSession);
    return () => {
      setRefreshHandler(null);
      setUnauthorizedHandler(null);
    };
  }, [refreshSession, clearSession]);

  // Restauración de sesión al montar: refresh HttpOnly + perfil.
  useEffect(() => {
    let cancelled = false;

    const restore = async () => {
      const token = await requestNewAccessToken();
      if (cancelled) return;

      if (!token) {
        setIsLoading(false);
        return;
      }

      try {
        const profile = await apiClient.get<AuthUser>('/auth/me');
        if (!cancelled) setUser(profile);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    void restore();
    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  // Renovación programada 60 s antes de expirar el access token.
  useEffect(() => {
    if (refreshTimer.current) {
      window.clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (!user) return;

    const schedule = () => {
      const current = getAccessTokenExpiry();
      if (!current) return;
      const delay = Math.max(5_000, current - Date.now() - 60_000);
      refreshTimer.current = window.setTimeout(() => {
        void refreshSession();
      }, delay);
    };

    schedule();
    return () => {
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [user, refreshSession]);

  const login = useCallback(async (input: LoginInput) => {
    const response = await apiClient.post<LoginResponse>('/auth/login', input);
    setAccessToken(response.accessToken);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshSession }),
    [user, isLoading, login, logout, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de AuthProvider');
  }
  return context;
}

/** Lee la expiración del access token actual en memoria. */
function getAccessTokenExpiry(): number | null {
  const token = getAccessToken();
  return token ? getTokenExpiry(token) : null;
}
