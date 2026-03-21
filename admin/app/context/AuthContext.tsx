import React, { createContext, useContext, useEffect, useState } from 'react';
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

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

// Always send cookies
axios.defaults.withCredentials = true;

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(null); // FLAG ONLY
  const [loading, setLoading] = useState<boolean>(true);

  /**
   * Validate session on app load
   */
  useEffect(() => {
    let mounted = true;
    (async () => {
      const valid = await validateToken();
      if (!mounted) return;
      if (!valid) console.log('[Auth] no valid session');
    })();
    return () => {
      mounted = false;
    };
  }, []);

  /**
   * Login
   */
  const login = async (email: string, password: string) => {
    try {
      const { data } = await axios.post<LoginResponse>(
        `${API_BASE}/admin/login`,
        { email, password }
      );

      if (data?.success) {
        const valid = await validateToken();
        if (!valid) {
          return { success: false, message: 'Session validation failed' };
        }
        return { success: true, message: data.message || 'Login successful' };
      }

      return { success: false, message: data.message || 'Login failed' };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Login failed',
      };
    }
  };

  /**
   * Logout
   */
  const logout = async () => {
    try {
      await axios.post(`${API_BASE}/auth/logout`);
    } catch {}
    setUser(null);
    setToken(null);
  };

  /**
   * Validate access token (cookie-based)
   */
  const validateToken = async (): Promise<boolean> => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/admin/current`);
      if (data?.success && data.user) {
        setUser(data.user as AdminUser);
        setToken('authenticated'); // FLAG ONLY
        setLoading(false);
        return true;
      }
      throw new Error('No session');
    } catch {
      try {
        await axios.post(`${API_BASE}/auth/refresh`);
        const { data } = await axios.get(`${API_BASE}/admin/current`);
        if (data?.success && data.user) {
          setUser(data.user as AdminUser);
          setToken('authenticated');
          setLoading(false);
          return true;
        }
      } catch {
        logout();
      }
      setLoading(false);
      return false;
    }
  };

  /**
   * Axios interceptor: auto refresh on 401 / 403
   */
  useEffect(() => {
    const id = axios.interceptors.response.use(
      (res) => res,
      async (error) => {
        const status = error?.response?.status;
        const originalRequest = error?.config;

        // Prevent refresh loop
        if (originalRequest?.url?.includes('/auth/refresh')) {
          return Promise.reject(error);
        }

        if (
          (status === 401 || status === 403) &&
          originalRequest &&
          !originalRequest._retry
        ) {
          originalRequest._retry = true;
          try {
            await axios.post(`${API_BASE}/auth/refresh`);
            return axios(originalRequest);
          } catch {
            logout();
          }
        }

        return Promise.reject(error);
      }
    );

    return () => axios.interceptors.response.eject(id);
  }, []);

  /**
   * Get current user
   */
  const getCurrentUser = async (): Promise<AdminUser | null> => {
    const ok = await validateToken();
    return ok ? user : null;
  };

  /**
   * Password reset email
   */
  const passwordResetEmail = async (email: string) => {
    try {
      const { data } = await axios.post<ApiResponse>(
        `${API_BASE}/admin/request-password-reset`,
        { email }
      );
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Network error',
      };
    }
  };

  /**
   * Reset password
   */
  const resetPassword = async (email: string, newPassword: string) => {
    try {
      const { data } = await axios.post<ApiResponse>(
        `${API_BASE}/admin/reset-password`,
        { email, newPassword }
      );
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Network error',
      };
    }
  };

  /**
   * Verify OTP
   */
  const verifyOTP = async (email: string, otp: string) => {
    try {
      const { data } = await axios.post<ApiResponse & { status?: string }>(
        `${API_BASE}/admin/verify-otp`,
        { email, otp }
      );
      return {
        success: data.status === 'success',
        message: data.message || '',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Network error',
      };
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

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;
