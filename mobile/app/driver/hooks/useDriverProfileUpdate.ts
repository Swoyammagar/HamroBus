import { useState, useCallback } from 'react';
import { driverProfileService, DriverProfileUpdatePayload } from '../services/driverProfileService';

export interface ProfileUpdateError {
  field?: string;
  message: string;
}

export const useDriverProfileUpdate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProfileUpdateError | null>(null);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [licenseCheckLoading, setLicenseCheckLoading] = useState(false);
  const [phoneCheckError, setPhoneCheckError] = useState<string | null>(null);
  const [licenseCheckError, setLicenseCheckError] = useState<string | null>(null);

  const updateProfile = useCallback(
    async (payload: DriverProfileUpdatePayload) => {
      try {
        setLoading(true);
        setError(null);
        const response = await driverProfileService.updateProfile(payload);
        return response;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to update profile';
        const field = err?.field || undefined;
        const profileError: ProfileUpdateError = { message: errorMessage, field };
        setError(profileError);
        throw profileError;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const checkPhoneAvailability = useCallback(
    async (phoneNumber: string, driverId?: string) => {
      try {
        setPhoneCheckLoading(true);
        setPhoneCheckError(null);
        const result = await driverProfileService.validatePhoneNumber(phoneNumber, driverId);
        if (!result.isValid) {
          setPhoneCheckError(result.error || 'Invalid phone number');
          return false;
        }
        return true;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to check phone availability';
        setPhoneCheckError(errorMessage);
        return false;
      } finally {
        setPhoneCheckLoading(false);
      }
    },
    []
  );

  const checkLicenseAvailability = useCallback(
    async (licenseNo: string, driverId?: string) => {
      try {
        setLicenseCheckLoading(true);
        setLicenseCheckError(null);
        const result = await driverProfileService.validateLicenseNumber(licenseNo, driverId);
        if (!result.isValid) {
          setLicenseCheckError(result.error || 'Invalid license number');
          return false;
        }
        return true;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to check license availability';
        setLicenseCheckError(errorMessage);
        return false;
      } finally {
        setLicenseCheckLoading(false);
      }
    },
    []
  );

  const validatePhoneNumber = useCallback(async (phoneNumber: string, driverId?: string) => {
    try {
      const result = await driverProfileService.validatePhoneNumber(phoneNumber, driverId);
      return result;
    } catch (err: any) {
      return {
        isValid: false,
        error: err?.message || 'Unable to validate phone number',
      };
    }
  }, []);

  const validateLicenseNumber = useCallback(async (licenseNo: string, driverId?: string) => {
    try {
      const result = await driverProfileService.validateLicenseNumber(licenseNo, driverId);
      return result;
    } catch (err: any) {
      return {
        isValid: false,
        error: err?.message || 'Unable to validate license number',
      };
    }
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setPhoneCheckError(null);
    setLicenseCheckError(null);
  }, []);

  return {
    updateProfile,
    loading,
    error,
    checkPhoneAvailability,
    phoneCheckLoading,
    phoneCheckError,
    checkLicenseAvailability,
    licenseCheckLoading,
    licenseCheckError,
    validatePhoneNumber,
    validateLicenseNumber,
    clearErrors,
  };
};
