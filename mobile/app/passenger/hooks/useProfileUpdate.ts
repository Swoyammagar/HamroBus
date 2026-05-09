import { useState, useCallback } from 'react';
import { passengerProfileService, PassengerProfileUpdatePayload } from '../services/passengerProfileService';

export interface ProfileUpdateError {
  field?: string;
  message: string;
}

export const useProfileUpdate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProfileUpdateError | null>(null);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [phoneCheckError, setPhoneCheckError] = useState<string | null>(null);

  const updateProfile = useCallback(
    async (payload: PassengerProfileUpdatePayload) => {
      try {
        setLoading(true);
        setError(null);
        const response = await passengerProfileService.updateProfile(payload);
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
    async (phoneNumber: string, userId?: string) => {
      try {
        setPhoneCheckLoading(true);
        setPhoneCheckError(null);
        const result = await passengerProfileService.validatePhoneNumber(phoneNumber, userId);
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

  const validatePhoneNumber = useCallback(async (phoneNumber: string, userId?: string) => {
    try {
      const result = await passengerProfileService.validatePhoneNumber(phoneNumber, userId);
      return result;
    } catch (err: any) {
      return {
        isValid: false,
        error: err?.message || 'Unable to validate phone number',
      };
    }
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setPhoneCheckError(null);
  }, []);

  return {
    updateProfile,
    loading,
    error,
    checkPhoneAvailability,
    phoneCheckLoading,
    phoneCheckError,
    validatePhoneNumber,
    clearErrors,
  };
};
