import apiClient from './api';

export interface CreateBookingPayload {
  routeId: string;
  busId: string;
  scheduleId: string;
  serviceDate: string; // "YYYY-MM-DD"
  boardingStopName: string;
  destinationStopName: string;
  seatCount: number;
  preferredSeatNumbers?: string[];
  redeemRewardPoints?: boolean;
}

export interface BookingResponse {
  id: string;
  bookingCode: string;
  passengerId: string;
  routeId: string;
  busId: string;
  busNumber: string;
  scheduleId: string;
  tripSessionId?: string;
  serviceDate: string;
  dayOfWeek: string;
  scheduleStartTime: string;
  scheduleEndTime: string;
  boardingStop: { stopName: string; sequence: number };
  destinationStop: { stopName: string; sequence: number };
  seatNumbers: string[];
  seatCount: number;
  farePerSeat: number;
  totalFare: number;
  rewardPointsRedeemed?: boolean;
  discountCode?: string;
  discountPercentage?: number;
  discountAmount?: number;
  finalFare?: number;
  paymentStatus?: boolean;
  payment?: {
    status?: 'pending' | 'paid' | 'failed';
    method?: string;
    khaltiToken?: string;
    paidAt?: string;
    amount?: number;
    khaltiIdx?: string;
  };
  status: 'confirmed' | 'in-progress' | 'completed' | 'cancelled';
  cancelledAt?: string;
  cancellationReason?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SeatAvailabilityResponse {
  availableSeats: string[];
  takenSeats: string[];
  totalSeats: number;
  availableSeatCount: number;
}

export interface BookingQrResponse {
  bookingId: string;
  bookingCode: string;
  qrToken: string;
  qrPayload: string;
  qrGeneratedAt?: string;
  qrCodeDataUrl: string;
}

export interface ReviewableBookingResponse {
  bookingId: string;
  bookingCode: string;
  busId: string;
  routeId: string;
  boardingStop: { stopName: string; sequence: number };
  destinationStop: { stopName: string; sequence: number };
  seatNumbers: string[];
  totalFare: number;
  completedAt: string;
}

export interface SubmitBookingReviewPayload {
  rating: number;
  comment?: string;
}

export interface SubmitBookingReviewResponse {
  message: string;
  review: {
    id: string;
    bookingId: string;
    passengerId: string;
    driverId: string;
    rating: number;
    comment: string;
    reviewedAt: string;
    createdAt: string;
  };
  driverRating: {
    ratingAverage: number;
    ratingCount: number;
  };
}

export interface CancelBookingResponse {
  message: string;
  booking?: BookingResponse;
  rewardPoints?: number;
  pointsDeducted?: string;
  isBanned?: boolean;
  banUntil?: string;
  warning?: string;
}

export const bookingService = {
  createBooking: async (payload: CreateBookingPayload): Promise<BookingResponse> => {
    const response = await apiClient.post('/passenger/bookings', payload);
    return response.data?.booking || response.data;
  },

  checkSeatAvailability: async (params: {
    routeId: string;
    busId: string;
    scheduleId: string;
    serviceDate: string;
  }): Promise<SeatAvailabilityResponse> => {
    const { routeId, busId, scheduleId, serviceDate } = params;
    const response = await apiClient.get('/passenger/bookings/availability', {
      params: { routeId, busId, scheduleId, serviceDate },
    });
    return response.data;
  },

  getMyBookings: async (status?: string, page: number = 1, limit: number = 20): Promise<BookingResponse[]> => {
    const params: Record<string, any> = { page, limit };
    if (status) params.status = status;
    const response = await apiClient.get('/passenger/bookings', { params });
    return response.data?.bookings || response.data || [];
  },

  cancelBooking: async (bookingId: string, reason?: string): Promise<CancelBookingResponse> => {
    const response = await apiClient.post(`/passenger/bookings/${bookingId}/cancel`, { reason });
    return response.data;
  },

  getBookingQr: async (bookingId: string): Promise<BookingQrResponse> => {
    const response = await apiClient.get(`/passenger/bookings/${bookingId}/qr`);
    return response.data;
  },
  getReviewableBookings: async (): Promise<ReviewableBookingResponse[]> => {
    const response = await apiClient.get('/passenger/bookings/reviewable');
    return response.data?.reviewableBookings || [];
  },

  submitBookingReview: async (
    bookingId: string,
    payload: SubmitBookingReviewPayload
  ): Promise<SubmitBookingReviewResponse> => {
    const response = await apiClient.post('/passenger/bookings/' + bookingId + '/review', payload);
    return response.data;
  },
};
