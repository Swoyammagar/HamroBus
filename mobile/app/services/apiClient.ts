/**
 * CENTRALIZED API CLIENT
 *
 * This is the single source of truth for all API requests.
 * Both driver and passenger apps use this client.
 *
 * Features:
 * - Single axios instance with unified interceptors
 * - Automatic token injection in Authorization header
 * - Automatic token refresh on 401
 * - Proper error handling and retry logic
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

type RefreshResult = { token: string | null; status?: number | null };

class ApiClient {
  private static instance: ApiClient;
  private axiosInstance: AxiosInstance;
  private refreshPromise: Promise<RefreshResult> | null = null;

  private constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  /**
   * Get singleton instance of ApiClient
   */
  public static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  /**
   * Get the underlying axios instance
   * Use this if you need direct access to axios
   */
  public getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    this.axiosInstance.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = (error.config || {}) as any;
        const status = error.response?.status;
        const requestUrl = String(originalRequest?.url || '');
        const isRefreshCall = requestUrl.includes('/auth/refresh-mobile');

        if (status === 401 && !originalRequest._retry && !isRefreshCall) {
          originalRequest._retry = true;

          const refreshResult = await this.refreshAccessToken();

          if (refreshResult.token) {
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
            return this.axiosInstance(originalRequest);
          }

          const invalidStatuses = [400, 401, 403];
          if (refreshResult.status && invalidStatuses.includes(refreshResult.status)) {
            await this.handleAuthFailure();
            return Promise.reject(error);
          }

          return Promise.reject(error);
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<RefreshResult> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
          console.warn('⚠️ No refresh token available');
          return { token: null, status: null };
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh-mobile`, {
          refreshToken: storedRefreshToken,
        });

        const newAccessToken = response.data?.accessToken;
        if (!newAccessToken) {
          console.error('❌ Token refresh failed: no accessToken in response');
          return { token: null, status: response.status ?? null };
        }

        await AsyncStorage.setItem('authToken', newAccessToken);

        return { token: newAccessToken, status: response.status ?? null };
      } catch (err: any) {
        const status = err?.response?.status ?? null;
        console.error('❌ Token refresh failed:', {
          status,
          message: err?.response?.data?.message || err.message,
        });
        return { token: null, status };
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  /**
   * Handle authentication failure
   * This clears local auth state and redirects to login
   */
  private async handleAuthFailure(): Promise<void> {
    try {

      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      if (storedRefreshToken) {
        try {
          await axios.post(`${API_BASE_URL}/auth/logout-mobile`, {
            refreshToken: storedRefreshToken,
          });
        } catch (err) {
          console.warn('Backend logout notification failed:', err);
        }
      }

      await AsyncStorage.multiRemove([
        'authToken',
        'refreshToken',
        'user',
        'driverProfile',
        'passengerProfile',
      ]);

      router.replace('/pages/mobilelogin');
    } catch (err) {
      console.error('Error handling auth failure:', err);
      router.replace('/pages/mobilelogin');
    }
  }

  /**
   * Clear all auth data (used during logout)
   */
  public async clearAuthData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        'authToken',
        'refreshToken',
        'user',
        'driverProfile',
        'passengerProfile',
      ]);
    } catch (err) {
      console.error('Error clearing auth data:', err);
    }
  }

  /**
   * Get current auth token
   */
  public async getAuthToken(): Promise<string | null> {
    return await AsyncStorage.getItem('authToken');
  }

  /**
   * Get current refresh token
   */
  public async getRefreshToken(): Promise<string | null> {
    return await AsyncStorage.getItem('refreshToken');
  }

  /**
   * Set tokens in storage
   */
  public async setTokens(accessToken: string, refreshToken?: string): Promise<void> {
    try {
      await AsyncStorage.setItem('authToken', accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
    } catch (err) {
      console.error('Error saving tokens:', err);
      throw err;
    }
  }
}

export default ApiClient.getInstance();
export { ApiClient };
