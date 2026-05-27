import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';


export type FAQRole = 'driver' | 'passenger';

export type FAQRecord = {
  _id?: string;
  faqId?: string;
  name?: string;
  phoneNumber?: string;
  email?: string;
  title?: string;
  message?: string;
  role?: FAQRole;
  userId?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type FAQPagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type FAQListResponse = {
  faqs: FAQRecord[];
  pagination: FAQPagination;
};

export type FAQFilters = {
  role?: FAQRole;
  page?: number;
  limit?: number;
};

export type ActionResult = { success: boolean; message: string };


const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

axios.defaults.withCredentials = true;


export const useAdminFAQs = () => {
  const [faqs, setFaqs] = useState<FAQRecord[]>([]);
  const [selectedFAQ, setSelectedFAQ] = useState<FAQRecord | null>(null);
  const [pagination, setPagination] = useState<FAQPagination>({
    total: 0,
    page: 1,
    limit: 10,
    pages: 0,
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [detailLoading, setDetailLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllFAQs = useCallback(
    async (filters: FAQFilters = {}): Promise<FAQListResponse | null> => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | number> = {
          page: filters.page ?? 1,
          limit: filters.limit ?? 10,
        };
        if (filters.role) params.role = filters.role;

        const { data } = await axios.get<{
          success: boolean;
          data: FAQRecord[];
          pagination: FAQPagination;
        }>(`${API_BASE}/faq/admin/all`, { params, withCredentials: true });

        const result: FAQListResponse = {
          faqs: data?.data || [],
          pagination: data?.pagination || { total: 0, page: 1, limit: 10, pages: 0 },
        };

        setFaqs(result.faqs);
        setPagination(result.pagination);
        return result;
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Failed to fetch FAQs';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const getFAQById = useCallback(async (faqId: string): Promise<FAQRecord | null> => {
    setDetailLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ success: boolean; data: FAQRecord }>(
        `${API_BASE}/faq/admin/${faqId}`,
        { withCredentials: true }
      );

      const faq = data?.data || null;
      setSelectedFAQ(faq);
      return faq;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch FAQ';
      setError(message);
      return null;
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const deleteFAQ = useCallback(
    async (faqId: string): Promise<ActionResult> => {
      try {
        const { data } = await axios.delete<{ success: boolean; message: string }>(
          `${API_BASE}/faq/admin/${faqId}`,
          { withCredentials: true }
        );

        setFaqs((prev) => prev.filter((faq) => faq._id !== faqId));
        setPagination((prev) => ({
          ...prev,
          total: Math.max(0, prev.total - 1),
          pages: Math.ceil(Math.max(0, prev.total - 1) / prev.limit),
        }));

        setSelectedFAQ((prev) => (prev?._id === faqId ? null : prev));

        return { success: true, message: data?.message || 'FAQ deleted successfully' };
      } catch (err: any) {
        const message = err?.response?.data?.message || 'Unable to delete FAQ';
        setError(message);
        return { success: false, message };
      }
    },
    []
  );

  const fetchFAQsByRole = useCallback(
    async (role: FAQRole, page = 1, limit = 10): Promise<FAQListResponse | null> => {
      return fetchAllFAQs({ role, page, limit });
    },
    [fetchAllFAQs]
  );

  const goToPage = useCallback(
    async (page: number, filters: Omit<FAQFilters, 'page'> = {}) => {
      return fetchAllFAQs({ ...filters, page });
    },
    [fetchAllFAQs]
  );

  const clearError = useCallback(() => setError(null), []);

  const clearSelectedFAQ = useCallback(() => setSelectedFAQ(null), []);

  useEffect(() => {
    fetchAllFAQs();
  }, [fetchAllFAQs]);

  return {
    faqs,
    selectedFAQ,
    pagination,
    loading,
    detailLoading,
    error,

    fetchAllFAQs,
    fetchFAQsByRole,
    getFAQById,
    deleteFAQ,
    goToPage,

    clearError,
    clearSelectedFAQ,
  };
};

export type UseAdminFAQsReturn = ReturnType<typeof useAdminFAQs>;
