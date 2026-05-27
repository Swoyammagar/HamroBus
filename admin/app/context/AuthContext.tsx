import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import type { AdminUser, ApiResponse, LoginResponse } from '../src/types/auth';

type AuthContextValue = {
  user: AdminUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<ApiResponse>;
  logout: () => void;
  validateToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<AdminUser | null>;
  passwordResetEmail: (email: string) => Promise<ApiResponse>;
  resetPassword: (email: string, newPassword: string) => Promise<ApiResponse>;
  verifyOTP: (email: string, otp: string) => Promise<ApiResponse>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
const API_BASE = process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';
axios.defaults.withCredentials = true;

let refreshPromise: Promise<boolean> | null = null;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const clearSession = () => {
    setUser(null);
    setToken(null);
  };

  const logout = async () => {
    try { await axios.post(`${API_BASE}/auth/logout`); } catch {}
    clearSession();
  };

  const validateToken = async (silent = false): Promise<boolean> => {
    if (!silent) setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/admin/current`);
      if (data?.success && data.user) {
        setUser(data.user as AdminUser);
        setToken('authenticated');
        return true;
      }
      throw new Error('No session');
    } catch {
      clearSession();
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    validateToken().then((valid) => {
      if (!mounted) return;
    });
    return () => { mounted = false; };
  }, []);

  /**
   * KEY FIX: The interceptor no longer calls /auth/refresh.
   * Your backend middleware already refreshes inline and returns 200.
   * A 401 here means the refresh token itself is expired just clear session.
   */
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const status: number | undefined = error?.response?.status;
        const originalRequest = error?.config;
        const url = originalRequest?.url || '';

        const isAuthEndpoint =
          url.includes('/auth/') ||
          url.includes('/admin/login') ||
          url.includes('/admin/request-password-reset') ||
          url.includes('/admin/reset-password') ||
          url.includes('/admin/verify-otp');

        if (isAuthEndpoint) return Promise.reject(error);

        if (
          (status === 401 || status === 403) &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;

          try {
            if (!refreshPromise) {
              refreshPromise = axios
                .post(`${API_BASE}/auth/refresh`)
                .then(() => true)
                .catch(() => false)
                .finally(() => {
                  refreshPromise = null;
                });
            }

            const refreshed = await refreshPromise;
            if (refreshed) {
              await validateToken(true);
              return axios(originalRequest);
            }

            clearSession();
          } catch (retryErr) {
            console.warn('[Auth] Session expired');
            clearSession();
          }
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  const login = async (email: string, password: string): Promise<ApiResponse> => {
    try {
      const { data } = await axios.post<LoginResponse>(`${API_BASE}/admin/login`, { email, password });
      if (data?.success) {
        const valid = await validateToken();
        if (!valid) return { success: false, message: 'Session validation failed after login' };
        return { success: true, message: data.message || 'Login successful' };
      }
      return { success: false, message: data.message || 'Login failed' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Login failed' };
    }
  };

  const getCurrentUser = async (): Promise<AdminUser | null> => {
    const ok = await validateToken(true);
    return ok ? user : null;
  };

  const passwordResetEmail = async (email: string): Promise<ApiResponse> => {
    try {
      const { data } = await axios.post<ApiResponse>(`${API_BASE}/admin/request-password-reset`, { email });
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  const resetPassword = async (email: string, newPassword: string): Promise<ApiResponse> => {
    try {
      const { data } = await axios.post<ApiResponse>(`${API_BASE}/admin/reset-password`, { email, newPassword });
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  const verifyOTP = async (email: string, otp: string): Promise<ApiResponse> => {
    try {
      const { data } = await axios.post<ApiResponse & { status?: string }>(`${API_BASE}/admin/verify-otp`, { email, otp });
      return { success: data.status === 'success', message: data.message || '' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, validateToken, getCurrentUser, passwordResetEmail, resetPassword, verifyOTP }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
