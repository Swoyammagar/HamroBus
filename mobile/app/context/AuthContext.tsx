import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

// For Expo emulator development:
// Android Emulator: 10.0.2.2 (host machine gateway) on port 5000
// iOS Simulator: localhost or your machine IP on port 5000
// Physical device: your machine's local IP (192.168.x.x) on port 5000
const API_URL = process.env.EXPO_PUBLIC_API_BASE || 'http://10.0.2.2:3000/api' ;
interface Driver {
  id: string; // MongoDB _id
  licenseNo: string;
  assignedBus: any;
  assignedRoute: any;
  isActive: boolean;
  licenseImgUrl?: string;
}

interface Passenger {
  id: string; // MongoDB _id
}

/* =======================
   API RESPONSES
======================= */
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
  login: (
    email: string,
    password: string,
    role: 'driver' | 'passenger'
  ) => Promise<LoginResult>;

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
    email: string,
    role: 'driver' | 'passenger'
  ) => Promise<{ success: boolean; message?: string }>;
  resetPassword: (
    email: string,
    newPassword: string,
    role: 'driver' | 'passenger'
  ) => Promise<{ success: boolean; message?: string }>;
  verifyOTP: (email: string, otp: string, role: 'driver' | 'passenger') => Promise<ApiResponse>;
  requestSignupOTP: (email: string, role: 'driver' | 'passenger') => Promise<{ success: boolean; message?: string }>;
  verifySignupOTP: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  checkPhoneExists: (phoneNumber: string, email: string) => Promise<{ exists: boolean; message?: string }>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [driver, setDriver] = useState<Driver | null>(null);
  const [passenger, setPassenger] = useState<Passenger | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize auth state from AsyncStorage
  useEffect(() => {
    loadStoredAuth();
  }, []);
  // Add this after the AuthContext is created, inside AuthProvider component

useEffect(() => {
  // Setup axios interceptor for token refresh
  const requestInterceptor = axios.interceptors.request.use(
    (config) => {
      if (token && !config.headers.Authorization) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => Promise.reject(error)
  );

  const responseInterceptor = axios.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      // If 401 and we haven't already tried to refresh
      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;

        const refreshed = await refreshToken();
        if (refreshed) {
          // Update header with new token and retry
          const newToken = await AsyncStorage.getItem('authToken');
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return axios(originalRequest);
        } else {
          // Refresh failed, logout
          await logout();
          return Promise.reject(error);
        }
      }

      return Promise.reject(error);
    }
  );

  return () => {
    axios.interceptors.request.eject(requestInterceptor);
    axios.interceptors.response.eject(responseInterceptor);
  };
}, [token]);

  const loadStoredAuth = async () => {
    try {
      const storedToken = await AsyncStorage.getItem('authToken');
      const storedUser = await AsyncStorage.getItem('user');
      const storedDriver = await AsyncStorage.getItem('driverProfile');
      const storedPassenger = await AsyncStorage.getItem('passengerProfile');
      
      if (storedToken && storedUser) {
        setToken(storedToken);
        setUser(JSON.parse(storedUser));
      }

      if (storedDriver) {
        setDriver(JSON.parse(storedDriver));
      }

      if (storedPassenger) {
        setPassenger(JSON.parse(storedPassenger));
      }
    } catch (error) {
      console.error('Error loading auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string,
    role: 'driver' | 'passenger'
  ): Promise<LoginResult> => {
    try {
      const endpoint = role === 'driver' ? '/driver/login' : '/passenger/login';

      const response = await axios.post(`${API_URL}${endpoint}`, {
        email,
        password,
      });
      console.log('LOGIN API RESPONSE:', JSON.stringify(response.data, null, 2));
      const { accessToken, refreshToken, user: userPayload, driver, passenger } = response.data;

      await AsyncStorage.setItem('authToken', accessToken);
      if (refreshToken) {
        await AsyncStorage.setItem('refreshToken', refreshToken);
      }
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

      return {
        success: true,
        user: userPayload,
        driver,
        passenger,
      };

    } catch (error: any) {
      console.error('Login error:', error);
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

    // 1️⃣ Upload images first
    if (userData.profileImage) {
      const url = await uploadImageToCloudinary(
        userData.profileImage,
        'profile'
      );
      if (!url) throw new Error('Profile image upload failed');
      profileImgUrl = url;
    }

    if (role === 'driver' && userData.licenseImage) {
      const url = await uploadImageToCloudinary(
        userData.licenseImage,
        'license'
      );
      if (!url) throw new Error('License image upload failed');
      licenseImgUrl = url;
    }

    // 2️⃣ Send JSON only
    const payload = {
      ...userData,
      profileImgUrl,
      licenseImgUrl,
    };

    delete payload.profileImage;
    delete payload.licenseImage;

    const endpoint =
      role === 'driver' ? '/driver/register' : '/passenger/register';

    const response = await axios.post(
      `${API_URL}${endpoint}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      message: response.data.message,
    };
  } catch (error: any) {
    console.error('Registration error:', error);
    return {
      success: false,
      message:
        error?.response?.data?.message ||
        error.message ||
        'Registration failed',
    };
  }
};



const logout = async () => {
  try {
    // Try to notify backend about logout
    const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
    if (storedRefreshToken) {
      try {
        await axios.post(`${API_URL}/auth/logout-mobile`, {
          refreshToken: storedRefreshToken
        });
      } catch (error) {
        console.warn('Backend logout notification failed:', error);
        // Continue with local logout even if backend fails
      }
    }

    // Clear all local storage
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('driverProfile');
    await AsyncStorage.removeItem('passengerProfile');
    
    // Clear all state
    setToken(null);
    setUser(null);
    setDriver(null);
    setPassenger(null);

    console.log('✅ User logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
    // Force local logout even if something fails
    setToken(null);
    setUser(null);
    setDriver(null);
    setPassenger(null);
  }
};

const getCurrentUser = async () => {
  try {
    if (!token) return;
    
    // Get user role from stored data to determine correct endpoint
    const storedUser = await AsyncStorage.getItem('user');
    if (!storedUser) return;
    
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
      console.warn('Get current user skipped: missing role information');
      return;
    }
    
    const response = await axios.get(`${API_URL}${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const updatedUserData = response.data.user;
    await AsyncStorage.setItem('user', JSON.stringify(updatedUserData));
    setUser(updatedUserData);
  } catch (error: any) {
    console.error('Get current user error:', error.response?.status, error.message);
    // Don't throw - user data is already loaded from login
  }
};

// ✅ FIX: Implement proper refresh token handling for mobile
const refreshToken = async () => {
  try {
    const storedRefreshToken = await AsyncStorage.getItem('refreshToken');
    if (!storedRefreshToken) {
      console.warn('No refresh token available');
      return false;
    }

    const response = await axios.post(
      `${API_URL}/auth/refresh-mobile`, 
      { refreshToken: storedRefreshToken }
    );
    
    const { accessToken: newToken } = response.data;
    await AsyncStorage.setItem('authToken', newToken);
    setToken(newToken);
    
    console.log('✅ Token refreshed successfully');
    return true;
  } catch (error: any) {
    console.error('Token refresh error:', error.message);
    // If refresh fails, logout user
    await logout();
    return false;
  }
};


const uploadImageToCloudinary = async (
  uri: string,
  type: 'profile' | 'license'
): Promise<string | null> => {
  try {
    const formData = new FormData();

    formData.append('file', {
      uri,
      name: `${type}.jpg`,
      type: 'image/jpeg',
    } as any);

    formData.append('upload_preset', 'mobile_upload');
    formData.append('folder', type === 'profile' ? 'profiles' : 'licenses');

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/dkmbm4wdy/image/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    const data = await response.json();

    console.log('☁️ Cloudinary response:', data);

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


  /**
   * Password reset email
   */
  const passwordResetEmail = async (email: string, role: 'driver' | 'passenger') => {
    try {
      const { data } = await axios.post<{ success: boolean; message?: string }>(
        `${API_URL}/users/request-password-reset`,
        { email, role }
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
  const resetPassword = async (email: string, newPassword: string, role: 'driver' | 'passenger') => {
    try {
      const { data } = await axios.post<{ success: boolean; message?: string }>(
        `${API_URL}/users/reset-password`,
        { email, newPassword, role }
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
  const verifyOTP = async (email: string, otp: string, role: 'driver' | 'passenger') => {
    try {
      const { data } = await axios.post<ApiResponse & { status?: string }>(
        `${API_URL}/users/verify-otp`,
        { email, otp, role }
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
  
const requestSignupOTP = async (email: string, role: string) => {
  try {
    const { data } = await axios.post<{ success: boolean; message?: string }>(
      `${API_URL}/users/request-signup-otp`,
      { email, role }
    );
    return { success: !!data.success, message: data.message || '' };
  } catch (err: any) {
    return {
      success: false,
      message: err?.response?.data?.message || 'Network error',
    };
  }
};

const verifySignupOTP = async (email: string, otp: string) => {
  try {
    const { data } = await axios.post<{ success: boolean; status?: string; message?: string }>(
      `${API_URL}/users/verify-signup-otp`,
      { email, otp }
    );
    return {
      success: data.status === 'success' || !!data.success,
      message: data.message || '',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.response?.data?.message || 'Network error',
    };
  }
};

const checkPhoneExists = async (phoneNumber: string, email: string) => {
  try {
    const { data } = await axios.post<{ exists: boolean; message?: string }>(
      `${API_URL}/users/phone-exists`,
      { phoneNumber, email }
    );
    return { exists: data.exists, message: data.message || '' };
  } catch (err: any) {
    return {
      exists: false,
      message: err?.response?.data?.message || 'Network error',
    };
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
