import axios from 'axios';
import { API_BASE_URL } from '../config/api';

export interface AdminPaymentRecord {
  paymentId: string;
  passenger: { id: string | null; name: string };
  driver: { id: string | null; name: string } | null;
  booking: { id: string; code: string | null } | null;
  totalFare: number;
  paymentType: 'Cash' | 'Online' | 'Wallet' | string;
  paymentStatus: 'pending' | 'paid' | 'failed' | string;
  paymentDate: string;
}

export interface AdminPaymentPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

const requestConfig = {
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
};

export const getAdminPayments = async (filters: {
  page?: number;
  limit?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
  paymentType?: string;
  paymentStatus?: string;
}): Promise<{ records: AdminPaymentRecord[]; pagination: AdminPaymentPagination }> => {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.append(key, String(value));
    }
  });

  const { data } = await axios.get(`${API_BASE_URL}/admin/payments?${params.toString()}`, requestConfig);

  return {
    records: data?.data || [],
    pagination: data?.pagination || {
      page: filters.page || 1,
      limit: filters.limit || 10,
      total: 0,
      totalPages: 1,
      hasNextPage: false,
      hasPrevPage: false,
    },
  };
};
