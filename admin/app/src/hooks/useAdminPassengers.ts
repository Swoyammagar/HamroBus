import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';


export type PassengerSummary = {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImgUrl: string;
  totalPointsEarned: number;
  bookingCount: number;
  reviewCount: number;
  createdAt: string;
};

export type BookingHistoryItem = {
  _id: string;
  bookingCode: string;
  paymentStatus: boolean;
  status: 'confirmed' | 'completed' | 'cancelled' | string;
  createdAt: string;
};

export type ReviewItem = {
  _id: string;
  driverId: string;
  rating: number;
  comment: string;
  isEdited: boolean;
  createdAt: string;
};

export type PassengerStats = {
  totalBookings: number;
  totalReviews: number;
  totalPointsEarned: number;
  averageRating: number;
};

export type PassengerDetail = {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  profileImgUrl: string;
  totalPointsEarned: number;
  consecutiveCancellations: number;
  createdAt: string;
  bookingHistory: BookingHistoryItem[];
  reviews: ReviewItem[];
  stats: PassengerStats;
};

export type UserPagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type PassengerListResponse = {
  passengers: PassengerSummary[];
  pagination: UserPagination;
};

export type UserFilters = {
  page?: number;
  limit?: number;
  search?: string;
};

export type ActionResult = { success: boolean; message: string };


const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

axios.defaults.withCredentials = true;


export const useAdminPassengers = () => {
  const [passengers, setPassengers] = useState<PassengerSummary[]>([]);
  const [selectedPassenger, setSelectedPassenger] = useState<PassengerDetail | null>(null);
  const [pagination, setPagination] = useState<UserPagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllPassengers = useCallback(
    async (filters: UserFilters = {}): Promise<PassengerListResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page: filters.page ?? 1,
          limit: filters.limit ?? 10,
        };
        if (filters.search) params.search = filters.search;

        const { data } = await axios.get<{
          success: boolean;
          data: PassengerSummary[];
          pagination: UserPagination;
        }>(`${API_BASE}/admin/passengers`, { params, withCredentials: true });

        const result: PassengerListResponse = {
          passengers: data?.data || [],
          pagination: data?.pagination || { total: 0, page: 1, limit: 10, pages: 0 },
        };

        setPassengers(result.passengers);
        setPagination(result.pagination);
        return result;
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to fetch passengers';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getPassengerById = useCallback(
    async (passengerId: string): Promise<PassengerDetail | null> => {
      setDetailLoading(true);
      setError(null);
      try {
        const { data } = await axios.get<{
          success: boolean;
          data: PassengerDetail;
        }>(`${API_BASE}/admin/passengers/${passengerId}`, { withCredentials: true });

        const passenger = data?.data || null;
        setSelectedPassenger(passenger);
        return passenger;
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to fetch passenger details';
        setError(message);
        return null;
      } finally {
        setDetailLoading(false);
      }
    },
    []
  );

  const deletePassenger = useCallback(
    async (passengerId: string): Promise<ActionResult> => {
      try {
        const { data } = await axios.delete<{ success: boolean; message: string }>(
          `${API_BASE}/admin/passengers/${passengerId}`,
          { withCredentials: true }
        );

        setPassengers((prev) => prev.filter((p) => p._id !== passengerId));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          pages: Math.ceil(Math.max(0, prev.total - 1) / prev.limit),
        }));
        setSelectedPassenger((prev) => (prev?._id === passengerId ? null : prev));

        return { success: true, message: data?.message || 'Passenger deleted successfully' };
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Unable to delete passenger';
        setError(message);
        return { success: false, message };
      }
    },
    []
  );

  const deleteDriver = useCallback(
    async (driverId: string): Promise<ActionResult> => {
      try {
        const { data } = await axios.delete<{ success: boolean; message: string }>(
          `${API_BASE}/admin/drivers/${driverId}`,
          { withCredentials: true }
        );

        return { success: true, message: data?.message || 'Driver deleted successfully' };
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Unable to delete driver';
        setError(message);
        return { success: false, message };
      }
    },
    []
  );

  const goToPage = useCallback(
    async (page: number, filters: Omit<UserFilters, 'page'> = {}) => {
      return fetchAllPassengers({ ...filters, page });
    },
    [fetchAllPassengers]
  );

  const searchPassengers = useCallback(
    async (search: string, page = 1, limit = 10) => {
      return fetchAllPassengers({ search, page, limit });
    },
    [fetchAllPassengers]
  );

  const clearError = useCallback(() => setError(null), []);
  const clearSelectedPassenger = useCallback(() => setSelectedPassenger(null), []);

  useEffect(() => {
    fetchAllPassengers();
  }, [fetchAllPassengers]);

  return {
    passengers,
    selectedPassenger,
    pagination,
    loading,
    detailLoading,
    error,

    fetchAllPassengers,
    getPassengerById,
    deletePassenger,
    deleteDriver,
    goToPage,
    searchPassengers,

    clearError,
    clearSelectedPassenger,
  };
};

export type UseAdminPassengersReturn = ReturnType<typeof useAdminPassengers>;
