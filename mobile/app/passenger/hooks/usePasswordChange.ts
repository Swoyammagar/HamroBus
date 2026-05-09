import { useState, useCallback } from 'react';
import { passengerProfileService } from '../services/passengerProfileService';

export interface PasswordChangeError {
  message: string;
}

export const usePasswordChange = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PasswordChangeError | null>(null);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      try {
        setLoading(true);
        setError(null);

        // Client-side validation
        if (!currentPassword || !newPassword || !confirmPassword) {
          throw {
            message: 'All fields are required',
          };
        }

        if (newPassword !== confirmPassword) {
          throw {
            message: 'New passwords do not match',
          };
        }

        if (newPassword.length < 8) {
          throw {
            message: 'Password must be at least 8 characters long',
          };
        }

        if (currentPassword === newPassword) {
          throw {
            message: 'New password must be different from current password',
          };
        }

        // Call service
        const response = await passengerProfileService.changePassword(
          currentPassword,
          newPassword,
          confirmPassword
        );
        return response;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to change password';
        const passwordError: PasswordChangeError = { message: errorMessage };
        setError(passwordError);
        throw passwordError;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    changePassword,
    loading,
    error,
    clearError,
  };
};
