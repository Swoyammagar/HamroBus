import { useState, useCallback, useEffect } from 'react';
import { PassengerProfileService } from '../services/passengerProfileService';

export interface PassengerProfileData {
  user: {
    _id: string;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    profileImgUrl: string;
    email: string;
    createdAt: string;
  };
  passenger: {
    _id: string;
  };
}

export const usePassengerProfile = () => {
  const [profileData, setProfileData] = useState<PassengerProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await PassengerProfileService.getProfile();
      setProfileData(data);
    } catch (err: any) {
      const errorMsg = err?.message || 'Failed to fetch profile';
      setError(errorMsg);
      console.error('Error fetching passenger profile:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return { profileData, loading, error, refetch: fetchProfile };
};