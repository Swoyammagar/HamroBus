import { useState, useCallback } from 'react';
import { driverProfileService, DriverProfileUpdatePayload } from '../services/driverProfileService';

export interface ProfileUpdateError {
  field?: string;
  message: string;
}

export interface ProfileUpdateInput {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  licenseNo?: string;
  address?: string;
  profileImageUri?: string;
  licenseImageUri?: string;
}

const isLocalUri = (uri?: string) =>
  !!uri && (uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('/'));

export const useDriverProfileUpdate = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ProfileUpdateError | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const [phoneCheckLoading, setPhoneCheckLoading] = useState(false);
  const [licenseCheckLoading, setLicenseCheckLoading] = useState(false);
  const [phoneCheckError, setPhoneCheckError] = useState<string | null>(null);
  const [licenseCheckError, setLicenseCheckError] = useState<string | null>(null);


  const updateProfile = useCallback(async (payload: DriverProfileUpdatePayload) => {
    try {
      setLoading(true);
      setError(null);
      const response = await driverProfileService.updateProfile(payload);
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


  const updateProfileWithImages = useCallback(
    async (
      input: ProfileUpdateInput,
      uploadFn: (uri: string, type: 'profile' | 'license') => Promise<string | null>,
    ) => {
      setLoading(true);
      setError(null);
      setUploadProgress(null);

      try {
        const payload: DriverProfileUpdatePayload = {};

        if (input.firstName !== undefined) payload.firstName = input.firstName;
        if (input.lastName !== undefined) payload.lastName = input.lastName;
        if (input.phoneNumber !== undefined) payload.phoneNumber = input.phoneNumber;
        if (input.licenseNo !== undefined) payload.licenseNo = input.licenseNo;
        if (input.address !== undefined) payload.address = input.address;

        if (input.profileImageUri) {
          if (isLocalUri(input.profileImageUri)) {
            setUploadProgress('Uploading profile photo…');
            const url = await uploadFn(input.profileImageUri, 'profile');
            if (!url) throw { message: 'Profile image upload failed. Please try again.' };
            payload.profileImgUrl = url;
          } else {
            payload.profileImgUrl = input.profileImageUri;
          }
        }

        if (input.licenseImageUri) {
          if (isLocalUri(input.licenseImageUri)) {
            setUploadProgress('Uploading license image…');
            const url = await uploadFn(input.licenseImageUri, 'license');
            if (!url) throw { message: 'License image upload failed. Please try again.' };
            payload.licenseImgUrl = url;
          } else {
            payload.licenseImgUrl = input.licenseImageUri;
          }
        }

        setUploadProgress('Saving profile…');
        const response = await driverProfileService.updateProfile(payload);
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
        setPhoneCheckError(err?.message || 'Failed to check phone availability');
        return false;
      } finally {
        setPhoneCheckLoading(false);
      }
    },
    [],
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
        setLicenseCheckError(err?.message || 'Failed to check license availability');
        return false;
      } finally {
        setLicenseCheckLoading(false);
      }
    },
    [],
  );

  const validatePhoneNumber = useCallback(async (phoneNumber: string, driverId?: string) => {
    try {
      return await driverProfileService.validatePhoneNumber(phoneNumber, driverId);
    } catch (err: any) {
      return { isValid: false, error: err?.message || 'Unable to validate phone number' };
    }
  }, []);

  const validateLicenseNumber = useCallback(async (licenseNo: string, driverId?: string) => {
    try {
      return await driverProfileService.validateLicenseNumber(licenseNo, driverId);
    } catch (err: any) {
      return { isValid: false, error: err?.message || 'Unable to validate license number' };
    }
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setPhoneCheckError(null);
    setLicenseCheckError(null);
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

    checkLicenseAvailability,
    licenseCheckLoading,
    licenseCheckError,

    validatePhoneNumber,
    validateLicenseNumber,

    clearErrors,
  };
};
