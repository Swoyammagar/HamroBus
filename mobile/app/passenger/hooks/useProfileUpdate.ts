import { useState, useCallback } from 'react';
import { passengerProfileService, PassengerProfileUpdatePayload } from '../services/passengerProfileService';

export interface ProfileUpdateError {
  field?: string;
  message: string;
}

export interface PassengerProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
  // Accepts local file:// URI or existing https:// URL
  profileImageUri?: string;
}

const isLocalUri = (uri?: string) =>
  !!uri && (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/'));

export const useProfileUpdate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProfileUpdateError | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [phoneCheckError, setPhoneCheckError] = useState<string | null>(null);

  /**
   * Core update — accepts already-resolved URLs only.
   */
  const updateProfile = useCallback(async (payload: PassengerProfileUpdatePayload) => {
    try {
      setLoading(true);
      setError(null);
      const response = await passengerProfileService.updateProfile(payload);
      return response;
    } catch (err: any) {
      const profileError: ProfileUpdateError = {
        message: err?.message || 'Failed to update profile',
        field: err?.field,
      };
      setError(profileError);
      throw profileError;
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Full update flow — uploads image to Cloudinary if URI is local, then saves.
   *
   * Pass `uploadFn` from `useAuth().uploadImageToCloudinary` at the call site.
   *
   * Example:
   *   const { uploadImageToCloudinary } = useAuth();
   *   await updateProfileWithImages({ firstName, profileImageUri }, uploadImageToCloudinary);
   */
  const updateProfileWithImages = useCallback(
    async (
      input: PassengerProfileUpdateInput,
      uploadFn: (uri: string, type: 'profile' | 'license') => Promise<string | null>,
    ) => {
      setLoading(true);
      setError(null);
      setUploadProgress(null);

      try {
        const payload: PassengerProfileUpdatePayload = {};

        if (input.firstName !== undefined) payload.firstName = input.firstName;
        if (input.lastName !== undefined) payload.lastName = input.lastName;
        if (input.phoneNumber !== undefined) payload.phoneNumber = input.phoneNumber;
        if (input.address !== undefined) payload.address = input.address;

        // ── Profile image ──────────────────────────────────────────────────
        if (input.profileImageUri) {
          if (isLocalUri(input.profileImageUri)) {
            setUploadProgress('Uploading profile photo…');
            const url = await uploadFn(input.profileImageUri, 'profile');
            if (!url) throw { message: 'Profile image upload failed. Please try again.' };
            payload.profileImgUrl = url;
          } else {
            // Already an https:// Cloudinary URL — no re-upload needed
            payload.profileImgUrl = input.profileImageUri;
          }
        }

        setUploadProgress('Saving profile…');
        const response = await passengerProfileService.updateProfile(payload);
        return response;
      } catch (err: any) {
        const profileError: ProfileUpdateError = {
          message: err?.message || 'Failed to update profile',
          field: err?.field,
        };
        setError(profileError);
        throw profileError;
      } finally {
        setLoading(false);
        setUploadProgress(null);
      }
    },
    [],
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
        setPhoneCheckError(err?.message || 'Failed to check phone availability');
        return false;
      } finally {
        setPhoneCheckLoading(false);
      }
    },
    [],
  );

  const validatePhoneNumber = useCallback(async (phoneNumber: string, userId?: string) => {
    try {
      return await passengerProfileService.validatePhoneNumber(phoneNumber, userId);
    } catch (err: any) {
      return { isValid: false, error: err?.message || 'Unable to validate phone number' };
    }
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setPhoneCheckError(null);
  }, []);

  return {
    updateProfile,
    updateProfileWithImages,
    loading,
    error,
    uploadProgress,
    checkPhoneAvailability,
    phoneCheckLoading,
    phoneCheckError,
    validatePhoneNumber,
    clearErrors,
  };
};