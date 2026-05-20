import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

type RefreshResult = { token: string | null; status?: number | null };

let refreshPromise: Promise<RefreshResult> | null = null;

const refreshMobileAccessToken = async (): Promise<RefreshResult> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      console.log('[API] 🔑 Attempting token refresh. RefreshToken present:', !!refreshToken);
      
      if (!refreshToken) {
        console.warn('[API] ❌ No refresh token found in storage');
        return { token: null, status: null };
      }

      try {
        console.log('[API] 🔄 Sending refresh request to:', `${API_BASE_URL}/auth/refresh-mobile`);
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-mobile`, { refreshToken });
        const newToken = response.data?.accessToken;
        
        if (!newToken) {
          console.warn('[API] ❌ No accessToken in refresh response');
          return { token: null, status: response.status ?? null };
        }

        await AsyncStorage.setItem('authToken', newToken);
        console.log('[API] ✅ Token refreshed successfully');
        return { token: newToken, status: response.status ?? null };
      } catch (err: any) {
        const status = err?.response?.status ?? null;
        const errMsg = err?.response?.data?.message || err?.message || 'Unknown error';
        console.error('[API] ❌ Token refresh failed:', status, errMsg);
        return { token: null, status };
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

// Add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem('authToken');
    const url = String(config.url || '');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('[API] 📤 Request to:', url, '| Token attached:', token.substring(0, 20) + '...');
    } else {
      console.warn('[API] ⚠️ Request to:', url, '| No token found');
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const requestUrl = String(originalRequest?.url || '');
    const isRefreshCall = requestUrl.includes('/auth/refresh-mobile');
    const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';

    console.log('[API] Response error interceptor:', {
      status,
      url: requestUrl,
      isRefreshCall,
      hasRetry: !!originalRequest._retry,
      message: errorMsg,
    });

    if (status === 401 && !originalRequest._retry && !isRefreshCall) {
      console.log('[API] 🔄 Attempting token refresh for 401 error...');
      originalRequest._retry = true;

      const refreshResult = await refreshMobileAccessToken();
      if (refreshResult.token) {
        console.log('[API] ✅ Retrying original request with new token');
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
        return apiClient(originalRequest);
      }

      // If refresh failed due to invalid/expired refresh token, perform logout/navigation.
      const invalidStatuses = [400, 401, 403];
      if (refreshResult.status && invalidStatuses.includes(refreshResult.status)) {
        console.log('[API] 🚪 Refresh failed with invalid status, clearing auth and redirecting to login');
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
        router.push('/pages/mobilelogin');
        // reject original error after navigation
        return Promise.reject(error);
      }

      // For network/transient failures (no status), do not force logout — reject and let UI handle it.
      console.warn('[API] ⚠️ Refresh failed with network/transient error, rejecting original request');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;