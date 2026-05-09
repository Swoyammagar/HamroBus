import apiClient from './api';

export interface DriverProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImgUrl?: string;
  licenseNo?: string;
  licenseImgUrl?: string;
  address?: string;
}

export interface DriverProfileResponse {
  message: string;
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    address: string;
    profileImgUrl: string;
  };
  driver: {
    id: string;
    licenseNo: string;
    licenseImgUrl: string;
  };
}

export interface PhoneAvailabilityResponse {
  available: boolean;
  phoneNumber: string;
  message: string;
}

export interface LicenseAvailabilityResponse {
  available: boolean;
  licenseNo: string;
  message: string;
}

export class DriverProfileService {
  /**
   * Fetch current driver profile
   */
  static async getProfile() {
    try {
      const response = await apiClient.get('/driver/profile');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  }

  /**
   * Update driver profile
   */
  static async updateProfile(
    payload: DriverProfileUpdatePayload
  ): Promise<DriverProfileResponse> {
    try {
      const response = await apiClient.put('/driver/profile', payload);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  }

  /**
   * Check if a phone number is available
   */
  static async checkPhoneAvailability(
    phoneNumber: string,
    driverId?: string
  ): Promise<PhoneAvailabilityResponse> {
    try {
      const params = new URLSearchParams();
      params.append('phoneNumber', phoneNumber);
      if (driverId) {
        params.append('driverId', driverId);
      }

      const response = await apiClient.get(
        `/driver/check-phone-availability?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to check phone availability' };
    }
  }

  /**
   * Check if a license number is available
   */
  static async checkLicenseAvailability(
    licenseNo: string,
    driverId?: string
  ): Promise<LicenseAvailabilityResponse> {
    try {
      const params = new URLSearchParams();
      params.append('licenseNo', licenseNo);
      if (driverId) {
        params.append('driverId', driverId);
      }

      const response = await apiClient.get(
        `/driver/check-license-availability?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to check license availability' };
    }
  }

  /**
   * Validate phone number format and availability
   */
  static async validatePhoneNumber(
    phoneNumber: string,
    driverId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      return { isValid: false, error: 'Phone number is required' };
    }

    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    if (cleaned.length < 7) {
      return { isValid: false, error: 'Phone number is too short' };
    }

    if (cleaned.length > 15) {
      return { isValid: false, error: 'Phone number is too long' };
    }

    try {
      const availability = await this.checkPhoneAvailability(phoneNumber, driverId);
      if (!availability.available) {
        return { isValid: false, error: 'Phone number is already in use' };
      }
      return { isValid: true };
    } catch (error: any) {
      return { isValid: false, error: error.message || 'Unable to validate phone number' };
    }
  }

  /**
   * Validate license number format and availability
   */
  static async validateLicenseNumber(
    licenseNo: string,
    driverId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    if (!licenseNo || licenseNo.trim().length === 0) {
      return { isValid: false, error: 'License number is required' };
    }

    const cleaned = licenseNo.trim();

    if (cleaned.length < 3) {
      return { isValid: false, error: 'License number is too short' };
    }

    try {
      const availability = await this.checkLicenseAvailability(licenseNo, driverId);
      if (!availability.available) {
        return { isValid: false, error: 'License number is already registered' };
      }
      return { isValid: true };
    } catch (error: any) {
      return { isValid: false, error: error.message || 'Unable to validate license number' };
    }
  }

  /**
   * Change driver password
   */
  static async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/driver/change-password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to change password' };
    }
  }
}

export const driverProfileService = DriverProfileService;
