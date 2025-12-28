import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// For Expo emulator development:
// Android Emulator: 10.0.2.2 (host machine gateway) on port 5000
// iOS Simulator: localhost or your machine IP on port 5000
// Physical device: your machine's local IP (192.168.x.x) on port 5000
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api';

interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  roles: string[];
  profileImgUrl?: string;
  isVerified: boolean;
}
interface LoginResponse {
  success: boolean;
  message?: string;
  user?: User;
}


interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;

  login: (
    email: string,
    password: string
  ) => Promise<LoginResponse>;

  register: (
    userData: any,
    role: 'driver' | 'passenger'
  ) => Promise<{ success: boolean; message?: string }>;

  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  getCurrentUser: () => Promise<void>;
  uploadImageToCloudinary: (
    uri: string,
    type: 'profile' | 'license'
  ) => Promise<string | null>;
  passwordResetEmail: (
    email: string
  ) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (
    email: string,
    newPassword: string
  ) => Promise<{ success: boolean; message?: string }>;
  verifyOTP: (
    email: string,
    otp: string
  ) => Promise<{ success: boolean; message?: string }>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from AsyncStorage
  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

const login = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email,
      password,
    });

    const { accessToken, user, driver, passenger } = response.data;

    await AsyncStorage.setItem('authToken', accessToken);
    await AsyncStorage.setItem('user', JSON.stringify(user));

    if (driver) {
      await AsyncStorage.setItem('driverProfile', JSON.stringify(driver));
    }

    if (passenger) {
      await AsyncStorage.setItem('passengerProfile', JSON.stringify(passenger));
    }

    setToken(accessToken);
    setUser(user);

    return {
      success: true,
      user,
    };

  } catch (error: any) {
    console.error('Login error:', error);
    return {
      success: false,
      message: error.response?.data?.message || error.message || 'Login failed',
    };
  }
};



  const register = async (userData: any, role: 'driver' | 'passenger') => {
    try {
      const endpoint = role === 'driver' ? '/driver/register' : '/passenger/register';
      
      // Create FormData for multipart/form-data
      const formData = new FormData();
      
      // Add all text fields
      Object.keys(userData).forEach(key => {
        if (key !== 'profileImage' && key !== 'licenseImage' && userData[key]) {
          formData.append(key, userData[key]);
        }
      });
      
      // Add images if they exist
      if (userData.profileImage) {
        const profileImageFile: any = {
          uri: userData.profileImage,
          type: 'image/jpeg',
          name: 'profile.jpg',
        };
        formData.append('profileImg', profileImageFile);
      }
      
      if (userData.licenseImage && role === 'driver') {
        const licenseImageFile: any = {
          uri: userData.licenseImage,
          type: 'image/jpeg',
          name: 'license.jpg',
        };
        formData.append('licenseImg', licenseImageFile);
      }
      
      const response = await axios.post(`${API_URL}${endpoint}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return { success: true, message: response.data.message };
    } catch (error: any) {
      console.error('Registration error:', error);
      return { 
        success: false, 
        message: error.response?.data?.message || 'Registration failed' 
      };
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await axios.post(`${API_URL}/auth/refresh`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const { accessToken: newToken } = response.data;
      await AsyncStorage.setItem('authToken', newToken);
      setToken(newToken);
      
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  };

  const getCurrentUser = async () => {
    try {
      if (!token) return;
      
      const response = await axios.get(`${API_URL}/user/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const userData = response.data.user;
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch (error) {
      console.error('Get current user error:', error);
    }
  };

  const uploadImageToCloudinary = async (uri: string, type: 'profile' | 'license'): Promise<string | null> => {
    try {
      const formData = new FormData();
      const imageFile: any = {
        uri,
        type: 'image/jpeg',
        name: `${type}.jpg`,
      };
      formData.append('image', imageFile);
      formData.append('type', type);
      
      const response = await axios.post(`${API_URL}/upload/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return response.data.url;
    } catch (error) {
      console.error('Image upload error:', error);
      return null;
    }
  };
  /**
   * Password reset email
   */
  const passwordResetEmail = async (email: string) => {
    try {
      const { data } = await axios.post<{ success: boolean; message?: string }>(
        `${API_URL}/users/request-password-reset`,
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
      const { data } = await axios.post<{ success: boolean; message?: string }>(
        `${API_URL}/users/reset-password`,
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
      const { data } = await axios.post<{ success: boolean; message?: string }>(
        `${API_URL}/users/verify-otp`,
        { email, otp }
      );
      return {
        success: data.success || false,
        message: data.message || '',
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.response?.data?.message || 'Network error',
      };
    }
  };

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        token, 
        isLoading, 
        login, 
        register, 
        logout, 
        refreshToken, 
        getCurrentUser,
        uploadImageToCloudinary,
        passwordResetEmail,
        resetPassword,
        verifyOTP,
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
