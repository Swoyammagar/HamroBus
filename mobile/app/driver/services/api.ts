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
      if (!refreshToken) {
        return { token: null, status: null };
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-mobile`, { refreshToken });
        const newToken = response.data?.accessToken;
        if (!newToken) {
          return { token: null, status: response.status ?? null };
        }

        await AsyncStorage.setItem('authToken', newToken);
        return { token: newToken, status: response.status ?? null };
      } catch (err: any) {
        const status = err?.response?.status ?? null;
        return { token: null, status };
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
};

apiClient.interceptors.request.use(
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

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config || {};
    const status = error.response?.status;
    const requestUrl = String(originalRequest?.url || '');
    const isRefreshCall = requestUrl.includes('/auth/refresh-mobile');

    if (status === 401 && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      const refreshResult = await refreshMobileAccessToken();
      if (refreshResult.token) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${refreshResult.token}`;
        return apiClient(originalRequest);
      }

      const invalidStatuses = [400, 401, 403];
      if (refreshResult.status && invalidStatuses.includes(refreshResult.status)) {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('refreshToken');
        router.push('/pages/mobilelogin');
        return Promise.reject(error);
      }

      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
