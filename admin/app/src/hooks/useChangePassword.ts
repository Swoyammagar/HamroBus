import { useState, useCallback } from 'react';
import { changeAdminPassword } from '../services/authService';

export type PasswordChangeRequest = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export type PasswordChangeResult = {
  success: boolean;
  message: string;
};

export const useChangePassword = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleChangePassword = useCallback(
    async (passwordData: PasswordChangeRequest): Promise<PasswordChangeResult> => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
          const err = 'All password fields are required';
          setError(err);
          setLoading(false);
          return { success: false, message: err };
        }

        if (passwordData.newPassword !== passwordData.confirmPassword) {
          const err = 'New passwords do not match';
          setError(err);
          setLoading(false);
          return { success: false, message: err };
        }

        if (passwordData.newPassword.length < 8) {
          const err = 'New password must be at least 8 characters';
          setError(err);
          setLoading(false);
          return { success: false, message: err };
        }

        if (passwordData.currentPassword === passwordData.newPassword) {
          const err = 'New password must be different from current password';
          setError(err);
          setLoading(false);
          return { success: false, message: err };
        }

        const result = await changeAdminPassword(
          passwordData.currentPassword,
          passwordData.newPassword,
          passwordData.confirmPassword
        );

        if (result.success) {
          setSuccess(true);
          setLoading(false);
          return { success: true, message: result.message };
        } else {
          setError(result.message);
          setLoading(false);
          return { success: false, message: result.message };
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(errorMsg);
        setLoading(false);
        return { success: false, message: errorMsg };
      }
    },
    []
  );

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
    setSuccess(false);
  }, []);

  return {
    changePassword: handleChangePassword,
    loading,
    error,
    success,
    reset,
  };
};
