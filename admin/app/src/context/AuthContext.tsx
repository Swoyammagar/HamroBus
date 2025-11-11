import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import type { AdminUser, ApiResponse, LoginResponse } from '../types/auth.d';

type AuthContextValue = {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiResponse>;
  logout: () => void;
  validateToken: (tokenArg?: string | null) => Promise<boolean>;
  getCurrentUser: () => Promise<AdminUser | null>;
  passwordResetEmail: (email: string) => Promise<ApiResponse>;
  resetPassword: (email: string, newPassword: string) => Promise<ApiResponse>;
  verifyOTP: (email: string, otp: string) => Promise<ApiResponse>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000/api';
const tokenKey = 'hb_token';
const refreshKey = 'hb_refresh_token';


// ...existing code...
// LocalStorage-only token helpers (web / dev-friendly)
function storeTokenSecure(token: string | null) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      if (token) {
        window.localStorage.setItem(tokenKey, token);
        console.log('[Auth] token stored (localStorage):', token);
      } else {
        window.localStorage.removeItem(tokenKey);
        console.log('[Auth] token cleared (localStorage)');
      }
    } else {
      console.warn('[Auth] localStorage not available to store token');
    }
  } catch (e) {
    console.error('[Auth] storeToken error', e);
  }
}

function loadTokenSecure(): string | null {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const t = window.localStorage.getItem(tokenKey);
      console.log('[Auth] loaded token (localStorage):', t);
      return t;
    }
    console.warn('[Auth] localStorage not available to load token');
    return null;
  } catch (e) {
    console.error('[Auth] loadToken error', e);
    return null;
  }
}
// ...existing code...
// Minimal JWT parsing without external dependency. Returns payload or null.
function parseJwt(token: string | undefined | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    let json = '';
    if (typeof atob === 'function') {
      json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    } else {
      // Node environment fallback
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const Buffer = require('buffer').Buffer;
      json = Buffer.from(payload, 'base64').toString('utf8');
    }
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const logoutTimer = React.useRef<number | null>(null);

  // Initialize: load token from SecureStore and validate
  useEffect(() => {
    let mounted = true;
    (async () => {
      const t = await loadTokenSecure();
      if (!mounted) return;
      if (t) {
        console.log('[Auth] found token in storage, validating...');
        // validateToken will set token, axios header and store only if valid
        const valid = await validateToken(t);
        if (!valid) {
          console.log('[Auth] stored token invalid or expired — cleared');
        }
      } else {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep axios Authorization header and schedule auto-logout when token changes
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log('[Auth] axios Authorization set:', axios.defaults.headers.common['Authorization']);

      const payload = parseJwt(token);
      if (payload && payload.exp) {
        const ms = payload.exp * 1000 - Date.now();
        if (ms <= 0) {
          // already expired
          logout();
          return;
        }
        if (logoutTimer.current) clearTimeout(logoutTimer.current);
        logoutTimer.current = window.setTimeout(() => {
          logout();
        }, ms);
      }
    } else {
        delete axios.defaults.headers.common['Authorization'];
        console.log('[Auth] axios Authorization cleared');
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
        logoutTimer.current = null;
      }
    }
    return () => {
      if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
        logoutTimer.current = null;
      }
    };
  }, [token]);

// ...existing code...
  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post<LoginResponse>(`${API_BASE}/admin/login`, { email, password });
      if (data.token) {
        // Do NOT set token/user here yet — validate first.
        const valid = await validateToken(data.token);
        if (!valid) {
          // ensure nothing persisted if validation fails
          await storeTokenSecure(null);
          return { success: false, message: data.message || 'Token validation failed' };
        }
        // validateToken already sets token/user and stores the token on success
        return { success: true, message: data.message || '' };
      }
      return { success: false, message: data.message || 'No token returned' };
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Network error';
      return { success: false, message };
    }
  };
// ...existing code...

  const logout = () => {
    setToken(null);
    setUser(null);
    storeTokenSecure(null);
  };

  const validateToken = async (tokenArg?: string | null): Promise<boolean> => {
    const t = tokenArg ?? token;
    if (!t) {
      setLoading(false);
      return false;
    }
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/admin/current`, { headers: { Authorization: `Bearer ${t}` } });
      if (data && data.success && data.user) {
        setUser(data.user as AdminUser);
        setToken(t);
        await storeTokenSecure(t);
        setLoading(false);
        return true;
      }
      logout();
      setLoading(false);
      return false;
    } catch (err) {
      logout();
      setLoading(false);
      return false;
    }
  };

  const getCurrentUser = async (): Promise<AdminUser | null> => {
    const ok = await validateToken();
    return ok ? user : null;
  };

  const passwordResetEmail = async (email: string) => {
    try {
      const { data } = await axios.post<ApiResponse>(`${API_BASE}/admin/request-password-reset`, { email });
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Network error';
      return { success: false, message };
    }
  };

  const resetPassword = async (email: string, newPassword: string) => {
    try {
      const { data } = await axios.post<ApiResponse>(`${API_BASE}/admin/reset-password`, { email, newPassword });
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Network error';
      return { success: false, message };
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    try {
      const { data } = await axios.post<ApiResponse & { status?: string }>(`${API_BASE}/admin/verify-otp`, { email, otp });
      return { success: data.status === 'success', message: data.message || '' };
    } catch (err: any) {
      const message = err?.response?.data?.message || err.message || 'Network error';
      return { success: false, message };
    }
  };

  const value: AuthContextValue = {
    user,
    token,
    loading,
    login,
    logout,
    validateToken,
    getCurrentUser,
    passwordResetEmail,
    resetPassword,
    verifyOTP,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
// ...existing code...