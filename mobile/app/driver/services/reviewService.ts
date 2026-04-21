import apiClient from './api';

export interface DriverReviewPassenger {
    _id?: string;
    firstName?: string;
    lastName?: string;
    profileImgUrl?: string;
}

export interface DriverReviewBooking {
    _id?: string;
    bookingCode?: string;
    status?: string;
    completedAt?: string;
}

export interface DriverReviewItem {
    _id: string;
    bookingId?: DriverReviewBooking;
    passengerId?: DriverReviewPassenger;
    rating: number;
    comment?: string;
    reviewedAt?: string;
    createdAt?: string;
    isEdited?: boolean;
}

export interface DriverReviewsResponse {
    reviews: DriverReviewItem[];
    total: number;
    hasMore: boolean;
}

export interface DriverReviewSummaryResponse {
    driverId: string;
    firstName: string;
    lastName: string;
    ratingAverage: number;
    ratingCount: number;
    distribution: Record<string, number>;
    latestReviews: DriverReviewItem[];
}

const reviewService = {
getDriverReviews: async (limit: number = 20, skip: number = 0): Promise<DriverReviewsResponse> => {
    const response = await apiClient.get('/driver/reviews', {
        params: { limit, skip },
    });
    return response.data;
},

getDriverReviewSummary: async (): Promise<DriverReviewSummaryResponse> => {
    const response = await apiClient.get('/driver/reviews/summary');
    return response.data;
},
}
export default reviewService;