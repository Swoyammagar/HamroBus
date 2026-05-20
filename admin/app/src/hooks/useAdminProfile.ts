import { useCallback, useState } from 'react';
import {
  updateAdminProfile,
  type AdminProfileResponse,
  type AdminProfileUpdateRequest,
} from '../services/authService';

export type ProfileUpdateResult = {
  success: boolean;
  message: string;
  admin?: AdminProfileResponse;
};

export const useAdminProfile = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const updateProfile = useCallback(
    async (profileData: AdminProfileUpdateRequest): Promise<ProfileUpdateResult> => {
      setLoading(true);
      setError(null);
      setSuccess(false);

      try {
        const fullname = profileData.fullname.trim();
        const email = profileData.email.trim();
        const phone = profileData.phone === null ? null : profileData.phone?.trim();

        if (!fullname || !email) {
          const message = 'Full name and email are required';
          setError(message);
          return { success: false, message };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          const message = 'Please enter a valid email address';
          setError(message);
          return { success: false, message };
        }

        const result = await updateAdminProfile({
          fullname,
          email,
          phone: phone || null,
        });

        if (!result.success) {
          setError(result.message);
          return result;
        }

        setSuccess(true);
        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(message);
        return { success: false, message };
      } finally {
        setLoading(false);
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
    updateProfile,
    loading,
    error,
    success,
    reset,
  };
};

export type UseAdminProfileReturn = ReturnType<typeof useAdminProfile>;
