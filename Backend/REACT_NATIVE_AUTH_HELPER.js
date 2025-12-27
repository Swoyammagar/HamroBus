/**
 * Authentication Helper for React Native
 * Implements secure token storage and API authentication
 * 
 * Requirements:
 * npm install expo-secure-store axios
 */

import * as SecureStore from 'expo-secure-store';
import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://your-api-url/api'; // Change this to your API URL

// Token keys
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_DATA_KEY = 'userData';

/**
 * Store authentication tokens securely
 */
export const storeTokens = async (accessToken, refreshToken) => {
  try {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
    return true;
  } catch (error) {
    console.error('Error storing tokens:', error);
    return false;
  }
};

/**
 * Get access token from secure storage
 */
export const getAccessToken = async () => {
  try {
    return await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
};

/**
 * Get refresh token from secure storage
 */
export const getRefreshToken = async () => {
  try {
    return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
  } catch (error) {
    console.error('Error getting refresh token:', error);
    return null;
  }
};

/**
 * Store user data
 */
export const storeUserData = async (userData) => {
  try {
    await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(userData));
    return true;
  } catch (error) {
    console.error('Error storing user data:', error);
    return false;
  }
};

/**
 * Get user data
 */
export const getUserData = async () => {
  try {
    const data = await SecureStore.getItemAsync(USER_DATA_KEY);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

/**
 * Clear all authentication data (logout)
 */
export const clearAuthData = async () => {
  try {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing auth data:', error);
    return false;
  }
};

/**
 * Create axios instance with authentication
 */
export const createAuthenticatedAxios = () => {
  const instance = axios.create({
    baseURL: API_BASE_URL,
    timeout: 10000,
  });

  // Request interceptor - Add token to headers
  instance.interceptors.request.use(
    async (config) => {
      const token = await getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor - Handle token refresh
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If error is 401 and we haven't tried to refresh yet
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        try {
          const refreshToken = await getRefreshToken();
          if (!refreshToken) {
            // No refresh token, logout user
            await clearAuthData();
            throw error;
          }

          // Try to refresh the token
          const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
            refreshToken,
          });

          const { accessToken } = response.data;
          await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);

          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return instance(originalRequest);
        } catch (refreshError) {
          // Refresh failed, logout user
          await clearAuthData();
          return Promise.reject(refreshError);
        }
      }

      return Promise.reject(error);
    }
  );

  return instance;
};

/**
 * Driver Authentication Functions
 */

export const driverRegister = async (registrationData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/driver/register`, registrationData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Registration failed' 
    };
  }
};

export const driverLogin = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/driver/login`, {
      email,
      password,
    });

    const { accessToken, refreshToken, user, driver } = response.data;

    // Store tokens and user data
    await storeTokens(accessToken, refreshToken);
    await storeUserData({ ...user, driver });

    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Login failed' 
    };
  }
};

export const updateDriverLocation = async (longitude, latitude, tripId = null) => {
  try {
    const api = createAuthenticatedAxios();
    const response = await api.post('/driver/location', {
      longitude,
      latitude,
      tripId,
    });
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Location update failed' 
    };
  }
};

export const getDriverProfile = async () => {
  try {
    const api = createAuthenticatedAxios();
    const response = await api.get('/driver/profile');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch profile' 
    };
  }
};

/**
 * Passenger Authentication Functions
 */

export const passengerRegister = async (registrationData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/passenger/register`, registrationData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Registration failed' 
    };
  }
};

export const passengerLogin = async (email, password) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/passenger/login`, {
      email,
      password,
    });

    const { accessToken, refreshToken, user, passenger } = response.data;

    // Store tokens and user data
    await storeTokens(accessToken, refreshToken);
    await storeUserData({ ...user, passenger });

    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Login failed' 
    };
  }
};

export const getPassengerProfile = async () => {
  try {
    const api = createAuthenticatedAxios();
    const response = await api.get('/passenger/profile');
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Failed to fetch profile' 
    };
  }
};

export const updatePassengerProfile = async (profileData) => {
  try {
    const api = createAuthenticatedAxios();
    const response = await api.put('/passenger/profile', profileData);
    return { success: true, data: response.data };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data?.message || 'Profile update failed' 
    };
  }
};

/**
 * Logout (for both driver and passenger)
 */
export const logout = async () => {
  try {
    const api = createAuthenticatedAxios();
    await api.post('/auth/logout');
    await clearAuthData();
    return { success: true };
  } catch (error) {
    // Even if API call fails, clear local data
    await clearAuthData();
    return { success: true };
  }
};

/**
 * Check if user is authenticated
 */
export const isAuthenticated = async () => {
  const token = await getAccessToken();
  return !!token;
};

/**
 * Example usage in React Native component:
 * 
 * import { driverLogin, getUserData, logout } from './authHelper';
 * 
 * const LoginScreen = () => {
 *   const handleLogin = async () => {
 *     const result = await driverLogin('email@example.com', 'password');
 *     if (result.success) {
 *       const userData = await getUserData();
 *       console.log('Logged in user:', userData);
 *       // Navigate to home screen
 *     } else {
 *       alert(result.error);
 *     }
 *   };
 * 
 *   const handleLogout = async () => {
 *     await logout();
 *     // Navigate to login screen
 *   };
 * };
 */
