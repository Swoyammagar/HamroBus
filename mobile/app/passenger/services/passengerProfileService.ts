import apiClient from './api';

export interface PassengerProfileUpdatePayload {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  profileImgUrl?: string;
  address?: string;
}

export interface PassengerProfileResponse {
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
}

export interface PhoneAvailabilityResponse {
  available: boolean;
  phoneNumber: string;
  message: string;
}

export class PassengerProfileService {
  /**
   * Fetch current passenger profile
   */
  static async getProfile() {
    try {
      const response = await apiClient.get('/passenger/profile');
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to fetch profile' };
    }
  }

  /**
   * Update passenger profile (firstName, lastName, phoneNumber, profileImgUrl, address)
   */
  static async updateProfile(
    payload: PassengerProfileUpdatePayload
  ): Promise<PassengerProfileResponse> {
    try {
      const response = await apiClient.put('/passenger/profile', payload);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to update profile' };
    }
  }

  /**
   * Check if a phone number is available (not in use by another user)
   * @param phoneNumber Phone number to check
   * @param userId Optional: user ID to exclude from check (for updates)
   */
  static async checkPhoneAvailability(
    phoneNumber: string,
    userId?: string
  ): Promise<PhoneAvailabilityResponse> {
    try {
      const params = new URLSearchParams();
      params.append('phoneNumber', phoneNumber);
      if (userId) {
        params.append('userId', userId);
      }

      const response = await apiClient.get(
        `/passenger/check-phone-availability?${params.toString()}`
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || { message: 'Failed to check phone availability' };
    }
  }

  /**
   * Validate phone number format and availability
   */
  static async validatePhoneNumber(
    phoneNumber: string,
    userId?: string
  ): Promise<{ isValid: boolean; error?: string }> {
    // Basic format validation
    if (!phoneNumber || phoneNumber.trim().length === 0) {
      return { isValid: false, error: 'Phone number is required' };
    }

    // Remove common formatting characters
    const cleaned = phoneNumber.replace(/[\s\-\(\)]/g, '');

    if (cleaned.length < 7) {
      return { isValid: false, error: 'Phone number is too short' };
    }

    if (cleaned.length > 15) {
      return { isValid: false, error: 'Phone number is too long' };
    }

    // Check availability
    try {
      const availability = await this.checkPhoneAvailability(phoneNumber, userId);
      if (!availability.available) {
        return { isValid: false, error: 'Phone number is already in use' };
      }
      return { isValid: true };
    } catch (error: any) {
      return { isValid: false, error: error.message || 'Unable to validate phone number' };
    }
  }

  /**
   * Change passenger password
   * @param currentPassword Current password for verification
   * @param newPassword New password to set
   * @param confirmPassword Confirmation of new password
   */
  static async changePassword(
    currentPassword: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ message: string }> {
    try {
      const response = await apiClient.post('/passenger/change-password', {
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

export const passengerProfileService = PassengerProfileService;
