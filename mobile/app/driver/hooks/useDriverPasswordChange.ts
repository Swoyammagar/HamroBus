import { useState, useCallback } from 'react';
import { driverProfileService } from '../services/driverProfileService';

export interface PasswordChangeError {
  field?: string;
  message: string;
}

export interface PasswordValidation {
  minLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecialChar: boolean;
}

export const useDriverPasswordChange = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<PasswordChangeError | null>(null);
  const [success, setSuccess] = useState(false);

  const validatePassword = useCallback((password: string): PasswordValidation => {
    return {
      minLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
    };
  }, []);

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string, confirmPassword: string) => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(false);

        // Validate inputs
        if (!currentPassword) {
          throw { message: 'Current password is required', field: 'currentPassword' };
        }

        if (!newPassword) {
          throw { message: 'New password is required', field: 'newPassword' };
        }

        if (!confirmPassword) {
          throw { message: 'Confirm password is required', field: 'confirmPassword' };
        }

        // Validate password strength
        const validation = validatePassword(newPassword);
        if (!validation.minLength) {
          throw { message: 'Password must be at least 8 characters', field: 'newPassword' };
        }

        // Check if passwords match
        if (newPassword !== confirmPassword) {
          throw { message: 'Passwords do not match', field: 'confirmPassword' };
        }

        // Check if new password is different from current password
        if (currentPassword === newPassword) {
          throw { message: 'New password must be different from current password', field: 'newPassword' };
        }

        // Call API
        const response = await driverProfileService.changePassword(
          currentPassword,
          newPassword,
          confirmPassword
        );

        setSuccess(true);
        return response;
      } catch (err: any) {
        const errorMessage = err?.message || 'Failed to change password';
        const field = err?.field || undefined;
        const passwordError: PasswordChangeError = { message: errorMessage, field };
        setError(passwordError);
        throw passwordError;
      } finally {
        setLoading(false);
      }
    },
    [validatePassword]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearSuccess = useCallback(() => {
    setSuccess(false);
  }, []);

  return {
    changePassword,
    loading,
    error,
    success,
    validatePassword,
    clearError,
    clearSuccess,
  };
};
