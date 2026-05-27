import apiClient from './api';

export interface PointsHistoryItem {
  action: string;
  points: number;
  description: string;
  timestamp: string;
}

export interface ReviewData {
  id: string;
  reviewId: string;
  driverId: string;
  driverName: string;
  driverImage: string | null;
  driverRating: number;
  driverRatingCount: number;
  rating: number;
  comment: string;
  isEdited: boolean;
  reviewedAt: string;
  createdAt: string;
  updatedAt: string;
  booking: {
    id: string;
    bookingCode: string;
    serviceDate: string;
    scheduleStartTime: string;
    scheduleEndTime: string;
    route: {
      id: string;
      name: string;
      source: string;
      destination: string;
    } | null;
    bus: {
      id: string;
      busNumber: string;
      busType: string;
    } | null;
    boardingStop: { stopName: string; sequence: number };
    destinationStop: { stopName: string; sequence: number };
    totalFare: number;
    status: string;
  } | null;
}

export interface ReviewsListResponse {
  success: boolean;
  message: string;
  data: {
    reviews: ReviewData[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalReviews: number;
      limit: number;
      hasNextPage: boolean;
      hasPrevPage: boolean;
    };
  };
}

export interface ReviewStatsResponse {
  success: boolean;
  message: string;
  data: {
    totalReviews: number;
    averageRating: number;
    ratingDistribution: {
      5: number;
      4: number;
      3: number;
      2: number;
      1: number;
    };
  };
}

export const reviewService = {
  getMyReviews: async (page: number = 1, limit: number = 10): Promise<ReviewsListResponse> => {
    try {
      const response = await apiClient.get('/passenger/reviews/my-reviews', {
        params: { page, limit, sortBy: 'createdAt', sortOrder: 'desc' }
      });

      const raw = response.data;

      const rawReviews: any[] = raw.data?.reviews ?? raw.reviews ?? [];
      const total: number = raw.data?.pagination?.totalReviews ?? raw.total ?? rawReviews.length;
      const totalPages = Math.ceil(total / limit) || 1;

      const mappedReviews: ReviewData[] = rawReviews.map((item: any) => ({
        id: item._id ?? item.id,
        reviewId: item._id ?? item.id,
        driverId: item.driverId?._id ?? item.driverId,
        driverName: item.driverId?.firstName
          ? `${item.driverId.firstName} ${item.driverId.lastName}`
          : (item.driverName ?? 'Unknown Driver'),
        driverImage: item.driverId?.profileImgUrl ?? item.driverImage ?? null,
        driverRating: item.driverId?.ratingAverage ?? item.driverRating ?? 0,
        driverRatingCount: item.driverId?.ratingCount ?? item.driverRatingCount ?? 0,
        rating: item.rating,
        comment: item.comment,
        isEdited: item.isEdited,
        reviewedAt: item.reviewedAt,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        booking: item.bookingId ? {
          id: item.bookingId._id ?? item.bookingId.id ?? item.bookingId,
          bookingCode: item.bookingId.bookingCode ?? '',
          serviceDate: item.bookingId.serviceDate ?? '',
          scheduleStartTime: item.bookingId.scheduleStartTime ?? '',
          scheduleEndTime: item.bookingId.scheduleEndTime ?? '',
          route: item.bookingId.routeId ? {
            id: item.bookingId.routeId._id ?? item.bookingId.routeId,
            name: item.bookingId.routeId.name ?? '',
            source: item.bookingId.routeId.source ?? '',
            destination: item.bookingId.routeId.destination ?? '',
          } : null,
          bus: item.bookingId.busId ? {
            id: item.bookingId.busId._id ?? item.bookingId.busId,
            busNumber: item.bookingId.busId.busNumber ?? '',
            busType: item.bookingId.busId.busType ?? '',
          } : null,
          boardingStop: item.bookingId.boardingStop ?? null,
          destinationStop: item.bookingId.destinationStop ?? null,
          totalFare: item.bookingId.totalFare ?? 0,
          status: item.bookingId.status ?? '',
        } : null,
      }));

      return {
        success: true,
        message: 'Reviews retrieved successfully',
        data: {
          reviews: mappedReviews,
          pagination: {
            currentPage: page,
            totalPages,
            totalReviews: total,
            limit,
            hasNextPage: raw.hasMore ?? page < totalPages,
            hasPrevPage: page > 1,
          },
        },
      };
    } catch (err: any) {
      console.error('[ReviewService] ❌ Error fetching reviews. Status:', err?.response?.status);
      console.error('[ReviewService] ❌ Error message:', err?.response?.data?.message || err?.message);
      console.error('[ReviewService] ❌ Full error:', JSON.stringify(err?.response?.data));
      throw err;
    }
  },

  getReviewStats: async (): Promise<ReviewStatsResponse> => {
    try {
      const response = await apiClient.get('/passenger/reviews/stats');
      return response.data;
    } catch (error: any) {
      console.error('[ReviewService] ❌ Error fetching review stats status:', error?.response?.status);
      console.error('[ReviewService] ❌ Error data:', error?.response?.data);
      throw error;
    }
  },
};
