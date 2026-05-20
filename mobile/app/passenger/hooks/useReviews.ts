import { useState, useCallback } from 'react';
import { reviewService, ReviewData, ReviewStatsResponse } from '../services/reviewService';

export interface ReviewsState {
  reviews: ReviewData[];
  stats: ReviewStatsResponse['data'] | null;
  loading: boolean;
  error: string | null;
  currentPage: number;
  totalPages: number;
  totalReviews: number;
}

export const useReviews = () => {
  const [state, setState] = useState<ReviewsState>({
    reviews: [],
    stats: null,
    loading: false,
    error: null,
    currentPage: 1,
    totalPages: 1,
    totalReviews: 0,
  });

const fetchReviews = useCallback(async (page: number = 1) => {
  console.log('[useReviews] 🔄 Fetching reviews for page:', page);
  setState(prev => ({ ...prev, loading: true, error: null }));
  try {
    const response = await reviewService.getMyReviews(page, 10);
    console.log('[useReviews] ✅ Reviews fetched successfully');
    if (response.success) {
      setState(prev => ({
        ...prev,
        reviews: response.data.reviews,
        currentPage: response.data.pagination.currentPage,
        totalPages: response.data.pagination.totalPages,
        totalReviews: response.data.pagination.totalReviews,
        loading: false,
      }));
    } else {
      console.error('[useReviews] ❌ API returned success=false');
      setState(prev => ({ ...prev, error: 'Failed to fetch reviews', loading: false }));
    }
  } catch (error: any) {
    const errorMsg = error?.response?.data?.message || error?.message || 'Error fetching reviews';
    console.error('[useReviews] ❌ Exception during fetch:', errorMsg);
    setState(prev => ({ ...prev, error: errorMsg, loading: false }));
  }
}, []);

  const fetchStats = useCallback(async () => {
    console.log('[useReviews] 📊 Fetching review stats...');
    try {
      const response = await reviewService.getReviewStats();
      console.log('[useReviews] ✅ Stats fetched successfully');
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          stats: response.data,
        }));
        return response.data;
      }
    } catch (error: any) {
      console.error('[useReviews] ❌ Error fetching review stats:', error?.message);
    }
  }, []);

  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= state.totalPages) {
      fetchReviews(page);
    }
  }, [state.totalPages, fetchReviews]);

  return {
    ...state,
    fetchReviews,
    fetchStats,
    goToPage,
    refetch: () => fetchReviews(state.currentPage),
  };
};
