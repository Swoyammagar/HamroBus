import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import apiClient from '../services/apiClient';
import { forceStopDriverTracking } from '../services/driverTrackingControl';
import {
  registerDeviceForPushNotifications,
  unregisterDeviceForPushNotifications,
  type PushUserType,
} from '../services/pushNotificationService';

const API_URL = process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

interface Driver {
  id: string;
  licenseNo: string;
  assignedBus: any;
  assignedRoute: any;
  isActive: boolean;
  licenseImgUrl?: string;
}

interface Passenger {
  id: string;
}

type LoginResult = {
  success: boolean;
  message?: string;
  validationStatus?: string;
  user?: User;
  driver?: Driver;
  passenger?: Passenger;
};

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  profileImgUrl?: string;
  passwordResetVerified: boolean;
  isEmailVerified: boolean;
}

type ApiResponse = {
  success: boolean;
  message?: string;
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  driver: Driver | null;
  passenger: Passenger | null;
  isLoading: boolean;
  loginDriver: (email: string, password: string) => Promise<LoginResult>;
  loginPassenger: (email: string, password: string) => Promise<LoginResult>;
  login: (email: string, password: string, role: 'driver' | 'passenger') => Promise<LoginResult>;
  register: (userData: any, role: 'driver' | 'passenger') => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<void>;
  uploadImageToCloudinary: (uri: string, type: 'profile' | 'license') => Promise<string | null>;
  passwordResetEmail: (email: string, role: 'driver' | 'passenger') => Promise<{ success: boolean; message?: string }>;
  resetPassword: (email: string, newPassword: string, role: 'driver' | 'passenger') => Promise<{ success: boolean; message?: string }>;
  verifyOTP: (email: string, otp: string, role: 'driver' | 'passenger') => Promise<ApiResponse>;
  requestSignupOTP: (email: string, role: 'driver' | 'passenger') => Promise<{ success: boolean; message?: string }>;
  verifySignupOTP: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  checkPhoneExists: (phoneNumber: string, email: string) => Promise<{ exists: boolean; message?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now() + 10_000;
  } catch {
    return true;
  }
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const refreshRequestRef = useRef<Promise<boolean> | null>(null);
  const pushRegistrationRef = useRef<string | null>(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        const storedUser = await AsyncStorage.getItem('user');
        const storedDriver = await AsyncStorage.getItem('driverProfile');
        const storedPassenger = await AsyncStorage.getItem('passengerProfile');

        if (storedToken && storedUser) {
          let activeToken = storedToken;

          if (isTokenExpired(storedToken)) {

            if (storedRefreshToken) {
              try {
                const response = await axios.post(
                  `${API_URL}/auth/refresh-mobile`,
                  { refreshToken: storedRefreshToken },
                  { timeout: 10000 }
                );
                const newToken = response.data?.accessToken;
                if (newToken) {
                  await AsyncStorage.setItem('authToken', newToken);
                  activeToken = newToken;
                }
              } catch (err: any) {
                const status = err?.response?.status;
                console.warn(' Startup refresh failed:', status);

                if (status === 400 || status === 401 || status === 403) {
                  await AsyncStorage.multiRemove([
                    'authToken',
                    'refreshToken',
                    'user',
                    'driverProfile',
                    'passengerProfile',
                  ]);
                  return; // exit early, don't restore state
                }
                console.warn(' Network error during startup refresh, restoring stale token');
              }
            } else {
              await AsyncStorage.multiRemove([
                'authToken',
                'user',
                'driverProfile',
                'passengerProfile',
              ]);
              return;
            }
          }

          setToken(activeToken);
          setUser(JSON.parse(storedUser));
        } else {
        }

        if (storedDriver) setDriver(JSON.parse(storedDriver));
        if (storedPassenger) setPassenger(JSON.parse(storedPassenger));

      } catch (error) {
        console.error(' Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  useEffect(() => {
    if (!token || isLoading) return;

    const userType: PushUserType | null = driver?.id
      ? 'driver'
      : passenger?.id
        ? 'passenger'
        : null;

    if (!userType) return;

    const registrationKey = `${userType}:${driver?.id || passenger?.id}`;
    if (pushRegistrationRef.current === registrationKey) return;
    pushRegistrationRef.current = registrationKey;

    registerDeviceForPushNotifications(userType).catch((error) => {
      console.warn('Unable to register device for push notifications:', error);
      pushRegistrationRef.current = null;
    });
  }, [token, isLoading, driver?.id, passenger?.id]);

  const login = async (
    email: string,
    password: string,
    role: 'driver' | 'passenger'
  ): Promise<LoginResult> => {
    try {
      const endpoint = role === 'driver' ? '/driver/login' : '/passenger/login';
      const axiosInstance = apiClient.getAxiosInstance();
      const response = await axiosInstance.post(`${endpoint}`, { email, password });


      const { accessToken, refreshToken, user: userPayload, driver, passenger } = response.data;

      await apiClient.setTokens(accessToken, refreshToken);
      await AsyncStorage.setItem('user', JSON.stringify(userPayload));

      if (driver) {
        await AsyncStorage.setItem('driverProfile', JSON.stringify(driver));
        setDriver(driver);
      } else {
        await AsyncStorage.removeItem('driverProfile');
        setDriver(null);
      }

      if (passenger) {
        await AsyncStorage.setItem('passengerProfile', JSON.stringify(passenger));
        setPassenger(passenger);
      } else {
        await AsyncStorage.removeItem('passengerProfile');
        setPassenger(null);
      }

      setToken(accessToken);
      setUser(userPayload);

      return { success: true, user: userPayload, driver, passenger };
    } catch (error: any) {
      console.error(' Login error:', error);
      return {
        success: false,
        message: error.response?.data?.message || error.message || 'Login failed',
        validationStatus: error.response?.data?.validationStatus,
      };
    }
  };

  const loginDriver = (email: string, password: string) => login(email, password, 'driver');
  const loginPassenger = (email: string, password: string) => login(email, password, 'passenger');

  const register = async (userData: any, role: 'driver' | 'passenger') => {
    try {
      let profileImgUrl = '';
      let licenseImgUrl = '';

      if (userData.profileImage) {
        const url = await uploadImageToCloudinary(userData.profileImage, 'profile');
        if (!url) throw new Error('Profile image upload failed');
        profileImgUrl = url;
      }

      if (role === 'driver' && userData.licenseImage) {
        const url = await uploadImageToCloudinary(userData.licenseImage, 'license');
        if (!url) throw new Error('License image upload failed');
        licenseImgUrl = url;
      }

      const payload = { ...userData, profileImgUrl, licenseImgUrl };
      delete payload.profileImage;
      delete payload.licenseImage;

      const endpoint = role === 'driver' ? '/driver/register' : '/passenger/register';
      const axiosInstance = apiClient.getAxiosInstance();
      const response = await axiosInstance.post(endpoint, payload, {
        headers: { 'Content-Type': 'application/json' },
      });

      return { success: true, message: response.data.message };
    } catch (error: any) {
      console.error(' Registration error:', error);
      return {
        success: false,
        message: error?.response?.data?.message || error.message || 'Registration failed',
      };
    }
  };

  const logout = async () => {
    try {
      forceStopDriverTracking();
      const currentUserType: PushUserType | undefined = driver?.id
        ? 'driver'
        : passenger?.id
          ? 'passenger'
          : undefined;

      await unregisterDeviceForPushNotifications(currentUserType);

      const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
      if (storedRefreshToken) {
        try {
          await axios.post(`${API_URL}/auth/logout-mobile`, { refreshToken: storedRefreshToken });
        } catch (error) {
          console.warn(' Backend logout notification failed:', error);
        }
      }

      await apiClient.clearAuthData();
      setToken(null);
      setUser(null);
      setDriver(null);
      setPassenger(null);
      pushRegistrationRef.current = null;

    } catch (error) {
      console.error(' Logout error:', error);
      setToken(null);
      setUser(null);
      setDriver(null);
      setPassenger(null);
      pushRegistrationRef.current = null;
    }
  };

  const getCurrentUser = async () => {
    try {
      const activeToken = token || (await AsyncStorage.getItem('authToken'));
      if (!activeToken) {
        return;
      }

      const storedUser = await AsyncStorage.getItem('user');
      if (!storedUser) {
        return;
      }

      const userData = JSON.parse(storedUser);
      const roles = userData.roles || [];
      const storedDriver = await AsyncStorage.getItem('driverProfile');
      const storedPassenger = await AsyncStorage.getItem('passengerProfile');

      let endpoint: string | null = null;
      if (roles.includes('driver') || storedDriver) {
        endpoint = '/driver/profile';
      } else if (roles.includes('passenger') || storedPassenger) {
        endpoint = '/passenger/profile';
      }

      if (!endpoint) {
        console.warn(' getCurrentUser: Missing role information, skipping');
        return;
      }

      const axiosInstance = apiClient.getAxiosInstance();
      const response = await axiosInstance.get(endpoint, {
        headers: { Authorization: `Bearer ${activeToken}` },
        timeout: 10000,
      });

      const updatedUserData = response.data.user;
      await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
      setUser(updatedUserData);

    } catch (error: any) {
      if (error.response?.status === 401) {
        const refreshed = await refreshToken();
        if (refreshed) {
          return await getCurrentUser();
        }
      } else if (error.request) {
        console.error(' getCurrentUser network error:', error.message);
      } else {
        console.error(' getCurrentUser error:', error.message);
      }
    }
  };

  const isInvalidRefreshTokenError = (status?: number) =>
    status === 400 || status === 401 || status === 403;

  const refreshToken = async (): Promise<boolean> => {
    if (refreshRequestRef.current) {
      return refreshRequestRef.current;
    }

    const refreshPromise = (async () => {
      try {
        const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
        if (!storedRefreshToken) {
          console.warn('No refresh token available');
          return false;
        }

        const response = await axios.post(
          `${API_URL}/auth/refresh-mobile`,
          { refreshToken: storedRefreshToken },
          { timeout: 10000 }
        );

        const { accessToken: newToken } = response.data;
        if (!newToken) {
          console.error('Token refresh response missing accessToken');
          return false;
        }

        await AsyncStorage.setItem('authToken', newToken);
        setToken(newToken);
        return true;
      } catch (error: any) {
        const status = error?.response?.status;
        console.error('Token refresh error:', status || error.message);
        if (isInvalidRefreshTokenError(status)) {
          await logout();
        }
        return false;
      } finally {
        refreshRequestRef.current = null;
      }
    })();

    refreshRequestRef.current = refreshPromise;
    return refreshPromise;
  };

  const uploadImageToCloudinary = async (
    uri: string,
    type: 'profile' | 'license'
  ): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append('file', { uri, name: `${type}.jpg`, type: 'image/jpeg' } as any);
      formData.append('upload_preset', 'mobile_upload');
      formData.append('folder', type === 'profile' ? 'profiles' : 'licenses');

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/dkmbm4wdy/image/upload`,
        { method: 'POST', body: formData }
      );

      const data = await response.json();
      if (!data.secure_url) {
        console.error('Cloudinary upload failed:', data);
        return null;
      }
      return data.secure_url;
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    }
  };

  const passwordResetEmail = async (email: string, role: 'driver' | 'passenger') => {
    try {
      const axiosInstance = apiClient.getAxiosInstance();
      const { data } = await axiosInstance.post<{ success: boolean; message?: string }>(
        `/users/request-password-reset`,
        { email, role }
      );
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  const resetPassword = async (email: string, newPassword: string, role: 'driver' | 'passenger') => {
    try {
      const axiosInstance = apiClient.getAxiosInstance();
      const { data } = await axiosInstance.post<{ success: boolean; message?: string }>(
        `/users/reset-password`,
        { email, newPassword, role }
      );
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  const verifyOTP = async (email: string, otp: string, role: 'driver' | 'passenger') => {
    try {
      const axiosInstance = apiClient.getAxiosInstance();
      const { data } = await axiosInstance.post<ApiResponse & { status?: string }>(
        `/users/verify-otp`,
        { email, otp, role }
      );
      return { success: data.status === 'success', message: data.message || '' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  const requestSignupOTP = async (email: string, role: string) => {
    try {
      const axiosInstance = apiClient.getAxiosInstance();
      const { data } = await axiosInstance.post<{ success: boolean; message?: string }>(
        `/users/request-signup-otp`,
        { email, role }
      );
      return { success: !!data.success, message: data.message || '' };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  const verifySignupOTP = async (email: string, otp: string) => {
    try {
      const axiosInstance = apiClient.getAxiosInstance();
      const { data } = await axiosInstance.post<{ success: boolean; status?: string; message?: string }>(
        `/users/verify-signup-otp`,
        { email, otp }
      );
      return {
        success: data.status === 'success' || !!data.success,
        message: data.message || '',
      };
    } catch (err: any) {
      return { success: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  const checkPhoneExists = async (phoneNumber: string, email: string) => {
    try {
      const axiosInstance = apiClient.getAxiosInstance();
      const { data } = await axiosInstance.post<{ exists: boolean; message?: string }>(
        `/users/phone-exists`,
        { phoneNumber, email }
      );
      return { exists: data.exists, message: data.message || '' };
    } catch (err: any) {
      return { exists: false, message: err?.response?.data?.message || 'Network error' };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        driver,
        passenger,
        isLoading,
        login,
        loginDriver,
        loginPassenger,
        register,
        logout,
        refreshToken,
        getCurrentUser,
        uploadImageToCloudinary,
        passwordResetEmail,
        resetPassword,
        verifyOTP,
        requestSignupOTP,
        verifySignupOTP,
        checkPhoneExists,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
