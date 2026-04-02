import apiClient from './api';

export interface KhaltiInitiateResponse {
  success: boolean;
  message: string;
  bookingId: string;
  amount: number;
  pidx?: string;
  paymentUrl?: string;
  expiresAt?: string;
  expiresIn?: number;
}

export interface KhaltiVerifyResponse {
  success: boolean;
  message: string;
  paymentStatus: boolean;
  khaltiStatus?: string;
  payment?: {
    status?: 'pending' | 'paid' | 'failed';
    method?: string;
    khaltiToken?: string;
    paidAt?: string;
    amount?: number;
    khaltiIdx?: string;
  };
}

export const paymentService = {
  initiateKhaltiPayment: async (
    bookingId: string,
    options?: { returnUrl?: string; websiteUrl?: string }
  ): Promise<KhaltiInitiateResponse> => {
    const response = await apiClient.post('/passenger/payments/initiate-khalti', {
      bookingId,
      returnUrl: options?.returnUrl,
      websiteUrl: options?.websiteUrl,
    });
    return response.data;
  },

  verifyKhaltiPayment: async (bookingId: string, pidx: string): Promise<KhaltiVerifyResponse> => {
    const response = await apiClient.post('/passenger/payments/verify-khalti', {
      bookingId,
      pidx,
    });
    return response.data;
  },
};
