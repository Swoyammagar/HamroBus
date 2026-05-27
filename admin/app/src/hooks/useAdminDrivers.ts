import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';

export type DriverRecord = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  profileImgUrl?: string;
  licenseNo?: string;
  validationStatus?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  licenseImgUrl?: string;
  assignedBus?: string | { _id?: string; busNumber?: string; model?: string };
  assignedRoute?: string | { _id?: string; routeName?: string; routeNumber?: string };
};

export type ReviewUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  profileImgUrl?: string;
};

export type ReviewBooking = {
  _id?: string;
  bookingCode?: string;
  status?: string;
  completedAt?: string;
};

export type AdminReviewUser = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  profileImgUrl?: string;
};

export type AdminReviewBus = {
  _id?: string;
  busNumber?: string;
  model?: string;
};

export type AdminReviewBooking = {
  _id?: string;
  bookingCode?: string;
  status?: string;
  completedAt?: string;
  bus?: AdminReviewBus;
  busId?: string | AdminReviewBus;
};

export type AdminReviewItem = {
  _id: string;
  rating: number;
  comment?: string;
  reviewedAt?: string;
  createdAt?: string;
  isEdited?: boolean;
  driverId?: string | {
    _id?: string;
    firstName?: string;
    lastName?: string;
    profileImgUrl?: string;
    ratingAverage?: number;
    ratingCount?: number;
  };
  passengerId?: string | AdminReviewUser;
  bookingId?: string | AdminReviewBooking;
};

export type AdminReviewSummary = {
  total: number;
  average: number;
  distribution: Record<string, number>;
};

export type DriverLeaderboardRow = {
  rank: number;
  driverId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  profileImgUrl?: string;
  validationStatus?: string;
  isActive?: boolean;
  averageRating: number;
  ratingCount: number;
  latestReviewAt?: string;
  bayesianScore?: number;
};

export type LeaderboardResponse = {
  leaderboard: DriverLeaderboardRow[];
  total: number;
  hasMore: boolean;
  rankingMode: 'bayesian' | 'average';
  minReviews: number;
  globalAverage: number;
};

export type ActionResult = { success: boolean; message: string };

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

axios.defaults.withCredentials = true;

export const useAdminDrivers = () => {
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<DriverRecord[]>([]);
  const [approvedDrivers, setApprovedDrivers] = useState<DriverRecord[]>([]);
  const [adminReviews, setAdminReviews] = useState<AdminReviewItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeDriverRecord = useCallback((drv: DriverRecord): DriverRecord => {
    const profileImgUrl = drv.profileImgUrl || (drv as any).profileImage || (drv as any).avatarUrl;
    const licenseImgUrl = drv.licenseImgUrl || (drv as any).licenseImageUrl || (drv as any).licenseImage;
    return {
      ...drv,
      profileImgUrl,
      licenseImgUrl,
    };
  }, []);

  const fetchAllDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ drivers?: DriverRecord[] }>(
        `${API_BASE}/driver/allDrivers`
      );
      setDrivers((data?.drivers || []).map(normalizeDriverRecord));
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch drivers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [normalizeDriverRecord]);

  const fetchPendingDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ drivers?: DriverRecord[] }>(
        `${API_BASE}/driver/pending`
      );
      setPendingDrivers((data?.drivers || []).map(normalizeDriverRecord));
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch pending drivers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [normalizeDriverRecord]);

  const fetchApprovedDrivers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ drivers?: DriverRecord[] }>(
        `${API_BASE}/driver/approvedDrivers`
      );
      setApprovedDrivers((data?.drivers || []).map(normalizeDriverRecord));
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch approved drivers';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [normalizeDriverRecord]);

  const approveDriver = useCallback(async (driverId: string): Promise<ActionResult> => {
    try {
      const { data } = await axios.post<{ message?: string; driver?: DriverRecord }>(
        `${API_BASE}/driver/approve/${driverId}`
      );

      const updated = data?.driver ? normalizeDriverRecord(data.driver) : undefined;
      setPendingDrivers((prev) => prev.filter((drv) => drv._id !== driverId));
      if (updated) {
        setDrivers((prev) => {
          const existingIndex = prev.findIndex((drv) => drv._id === driverId);
          if (existingIndex !== -1) {
            const next = [...prev];
            next[existingIndex] = {
              ...prev[existingIndex],
              ...updated,
              validationStatus: 'approved',
            };
            return next;
          }
          return [...prev, { ...updated, validationStatus: 'approved' }];
        });
      }

      return { success: true, message: data?.message || 'Driver approved' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to approve driver';
      return { success: false, message };
    }
  }, [normalizeDriverRecord]);

  const rejectDriver = useCallback(async (driverId: string): Promise<ActionResult> => {
    try {
      const { data } = await axios.post<{ message?: string; driver?: DriverRecord }>(
        `${API_BASE}/driver/reject/${driverId}`
      );

      const updated = data?.driver ? normalizeDriverRecord(data.driver) : undefined;
      setPendingDrivers((prev) => prev.filter((drv) => drv._id !== driverId));
      if (updated) {
        setDrivers((prev) => {
          const existingIndex = prev.findIndex((drv) => drv._id === driverId);
          if (existingIndex !== -1) {
            const next = [...prev];
            next[existingIndex] = {
              ...prev[existingIndex],
              ...updated,
              validationStatus: 'rejected',
            };
            return next;
          }
          return [...prev, { ...updated, validationStatus: 'rejected' }];
        });
      }

      return { success: true, message: data?.message || 'Driver rejected' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to reject driver';
      return { success: false, message };
    }
  }, [normalizeDriverRecord]);

  const getDriverReviewSummary = useCallback(async (driverId: string) => {
    const { data } = await axios.get<AdminReviewSummary>(`${API_BASE}/admin/reviews/summary`, {
      params: { driverId },
      withCredentials: true,
    });
    return data;
  }, []);

  const getDriverReviews = useCallback(
    async (driverId: string, options?: { limit?: number; skip?: number; sort?: 'asc' | 'desc' }) => {
      const { data } = await axios.get<{ reviews: AdminReviewItem[]; total: number; hasMore: boolean }>(
        `${API_BASE}/admin/reviews`,
        {
          params: {
            driverId,
            limit: options?.limit ?? 20,
            skip: options?.skip ?? 0,
            sort: options?.sort ?? 'desc',
          },
          withCredentials: true,
        }
      );
      return data;
    },
    []
  );

  const getDriverReviewInsights = useCallback(async (driverId: string, latestLimit = 5) => {
    const [summary, reviewsPayload] = await Promise.all([
      getDriverReviewSummary(driverId),
      getDriverReviews(driverId, { limit: latestLimit, sort: 'desc' }),
    ]);

    return {
      summary,
      reviews: reviewsPayload?.reviews || [],
    };
  }, [getDriverReviewSummary, getDriverReviews]);

  const getAllReviews = useCallback(
    async (options?: { limit?: number; skip?: number; sort?: 'asc' | 'desc' }) => {
      const { data } = await axios.get<{ reviews: AdminReviewItem[]; total: number; hasMore: boolean }>(
        `${API_BASE}/admin/reviews`,
        {
          params: {
            limit: options?.limit ?? 20,
            skip: options?.skip ?? 0,
            sort: options?.sort ?? 'desc',
          },
          withCredentials: true,
        }
      );
      setAdminReviews(data?.reviews || []);
      return data;
    },
    []
  );

  const deleteReview = useCallback(async (reviewId: string): Promise<ActionResult> => {
    try {
      const { data } = await axios.delete<{ success?: boolean; message?: string; deletedReviewId?: string }>(
        `${API_BASE}/admin/reviews/${reviewId}`,
        { withCredentials: true }
      );

      setAdminReviews((prev) => prev.filter((review) => review._id !== reviewId));
      return {
        success: data?.success !== false,
        message: data?.message || 'Review deleted successfully',
      };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to delete review';
      return { success: false, message };
    }
  }, []);

  const getDriverLeaderboard = useCallback(
  async (options?: { limit?: number; skip?: number; minReviews?: number; mode?: 'bayesian' | 'average' }) => {
    const { data } = await axios.get<LeaderboardResponse>(
      `${API_BASE}/admin/reviews/leaderboard`,
      {
        params: {
          limit: options?.limit ?? 20,
          skip: options?.skip ?? 0,
          minReviews: options?.minReviews ?? 1,
          mode: options?.mode ?? 'bayesian',
        },
        withCredentials: true,
      }
    );

    return data;
  },
  []
);

  useEffect(() => {
    fetchAllDrivers();
  }, [fetchAllDrivers]);

  return {
    drivers,
    pendingDrivers,
    approvedDrivers,
    adminReviews,
    loading,
    error,
    fetchAllDrivers,
    fetchPendingDrivers,
    fetchApprovedDrivers,
    approveDriver,
    rejectDriver,
    getDriverReviewSummary,
    getDriverReviews,
    getDriverReviewInsights,
    getAllReviews,
    deleteReview,
    getDriverLeaderboard,
  };
};

export type UseAdminDriversReturn = ReturnType<typeof useAdminDrivers>;
