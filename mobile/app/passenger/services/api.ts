import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE || 'http://10.0.2.2:3000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let refreshPromise: Promise<string | null> | null = null;

const refreshMobileAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem('refreshToken');
      if (!refreshToken) {
        return null;
      }

      try {
        const response = await axios.post(`${API_BASE_URL}/auth/refresh-mobile`, { refreshToken });
        const newToken = response.data?.accessToken;
        if (!newToken) {
          return null;
        }

        await AsyncStorage.setItem('authToken', newToken);
        return newToken;
      } catch (error) {
        return null;
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
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
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

    if (status === 401 && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      const newToken = await refreshMobileAccessToken();
      if (newToken) {
        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(originalRequest);
      }

      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('refreshToken');
      router.push('/pages/mobilelogin');
    }

    return Promise.reject(error);
  }
);

export default apiClient;