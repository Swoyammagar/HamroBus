import { API_BASE_URL } from '../config/api';
import axios from 'axios';

const requestConfig = {
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
};


/**
 * Change admin password
 * Requires authentication token
 */
export const changeAdminPassword = async (
  currentPassword: string,
  newPassword: string,
  confirmPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const res = await axios.post(
      `${API_BASE_URL}/admin/change-password`,
      {
          currentPassword,
          newPassword,
          confirmPassword,
      },
      requestConfig
    );
    return {
      success: true,
      message: res.data.message || 'Password changed successfully',
    };
  } catch (err: any) {
    console.error('changeAdminPassword error:', err);

    return {
      success: false,
      message:
        err.response?.data?.message ||
        'Network error. Please try again.',
    };
  }
};

export type AdminProfileUpdateRequest = {
  fullname: string;
  email: string;
  phone?: string | null;
};

export type AdminProfileResponse = {
  id: string;
  email: string;
  fullname?: string;
  phone?: string | null;
  role?: string;
  isVerified?: boolean;
};

export type DashboardSummary = {
  totalBuses: number;
  totalDrivers: number;
  totalRoutes: number;
  totalSchedules: number;
};

export const updateAdminProfile = async (
  profileData: AdminProfileUpdateRequest
): Promise<{ success: boolean; message: string; admin?: AdminProfileResponse }> => {
  try {
    const res = await axios.patch(
      `${API_BASE_URL}/admin/profile`,
      profileData,
      requestConfig
    );

    return {
      success: true,
      message: res.data.message || 'Profile updated successfully',
      admin: res.data.admin,
    };
  } catch (err: any) {
    console.error('updateAdminProfile error:', err);

    return {
      success: false,
      message:
        err.response?.data?.message ||
        'Network error. Please try again.',
    };
  }
};

export const getAdminDashboardData = async (): Promise<{
  success: boolean;
  message?: string;
  data?: DashboardSummary;
}> => {
  try {
    const res = await axios.get(`${API_BASE_URL}/admin/dashboard`, requestConfig);

    return {
      success: true,
      data: res.data.data,
    };
  } catch (err: any) {
    console.error('getAdminDashboardData error:', err);

    return {
      success: false,
      message:
        err.response?.data?.message ||
        'Unable to load dashboard data.',
    };
  }
};

