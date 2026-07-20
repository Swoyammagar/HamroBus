import apiClient from './api';

export interface QrStop {
  stopName: string;
  sequence: number;
  latitude?: number;
  longitude?: number;
}

export interface QrTripResponse {
  tripSessionId: string;
  status: string;
  startedAt?: string;
  currentStop?: string | null;
  previousStop?: string | null;
  passengerCount?: number;
  bus: {
    _id: string;
    busNumber: string;
    model?: string;
    capacity?: number;
  };
  driver?: {
    _id: string;
    name: string;
  } | null;
  route: {
    _id: string;
    routeNumber?: string;
    routeName: string;
    source: string;
    destination: string;
    fareInfo: number;
    stops: QrStop[];
  };
  schedule?: {
    _id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    stopArrivals?: Array<{
      stopName: string;
      stopSequence: number;
      arrivalTime: string;
    }>;
  } | null;
  boardingStop?: QrStop | null;
  destinations: QrStop[];
}

export interface QrFareResponse {
  fare: number;
  boardingStop: QrStop;
  destinationStop: QrStop;
}

export interface QrKhaltiInitiateResponse {
  success: boolean;
  message: string;
  tripSessionId: string;
  amount: number;
  fare: number;
  pidx?: string;
  paymentUrl?: string;
  expiresAt?: string;
  expiresIn?: number;
  purchaseOrderId?: string;
  boardingStop: QrStop;
  destinationStop: QrStop;
}

export interface QrKhaltiVerifyResponse {
  success: boolean;
  message: string;
  paymentStatus: boolean;
  khaltiStatus?: string;
  paymentId?: string;
}

export const qrPaymentService = {
  resolveTrip: async (qrData: string): Promise<QrTripResponse> => {
    const response = await apiClient.post('/qr-payments/passenger/resolve-trip', { qrData });
    return response.data;
  },

  calculateFare: async (payload: {
    tripSessionId: string;
    boardingStopName?: string;
    destinationStopName: string;
  }): Promise<QrFareResponse> => {
    const response = await apiClient.post('/qr-payments/passenger/calculate-fare', payload);
    return response.data;
  },

  initiateKhaltiPayment: async (
    payload: {
      tripSessionId: string;
      boardingStopName?: string;
      destinationStopName: string;
    },
    options?: { returnUrl?: string; websiteUrl?: string }
  ): Promise<QrKhaltiInitiateResponse> => {
    const response = await apiClient.post('/qr-payments/passenger/initiate-khalti', {
      ...payload,
      returnUrl: options?.returnUrl,
      websiteUrl: options?.websiteUrl,
    });
    return response.data;
  },

  verifyKhaltiPayment: async (payload: {
    tripSessionId: string;
    pidx: string;
    boardingStopName?: string;
    destinationStopName: string;
    purchaseOrderId?: string;
  }): Promise<QrKhaltiVerifyResponse> => {
    const response = await apiClient.post('/qr-payments/passenger/verify-khalti', payload);
    return response.data;
  },
};
