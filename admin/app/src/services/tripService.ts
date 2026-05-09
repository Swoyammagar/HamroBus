import { API_BASE_URL } from '../config/api';

export interface TripBooking {
  bookingCode: string;
  passengerName: string;
  passengerPhone: string;
  passengerProfileImgUrl?: string;
  seats: string;
  seatCount: number;
  boardingStop: string;
  alightingStop: string;
  fare: number;
  paymentStatus: 'pending' | 'paid' | 'failed';
  paymentMethod: string;
  bookingStatus: 'confirmed' | 'cancelled' | 'in-progress' | 'completed';
}

export interface TripListItem {
  tripId: string;
  routeName: string;
  busNumber: string;
  driverName: string;
  driverProfileImgUrl?: string;
  status: 'in-progress' | 'completed' | 'missed';
  startTime: string;
  delayMinutes: number;
  passengerCount: number;
  bookingCount: number;
  totalSeats: number;
  bookings: TripBooking[];
}

export interface TripDetails {
  tripId: string;
  route: {
    startingStop: string;
    endingStop: string;
  };
  bus: {
    busNumber: string;
    capacity: number;
  };
  driver: {
    name: string;
    phone: string;
    profileImgUrl?: string;
    licenseImgUrl?: string;
  };
  status: 'in-progress' | 'completed' | 'missed';
  times: {
    scheduledStart: string;
    actualStart: string;
    scheduledEnd: string;
    actualEnd: string;
    delayMinutes: number;
    restTimeMinutes: number;
  };
  metrics: {
    passengerCount: number;
    totalSeats: number;
    totalFare: number;
    paidBookings: number;
    pendingPayments: number;
  };
  bookings: TripBooking[];
}

const requestInit = {
  headers: {
    'Content-Type': 'application/json',
  },
  credentials: 'include' as const,
};

export const getAllTrips = async (filters?: {
  status?: string;
  routeId?: string;
  startDate?: string;
  endDate?: string;
}): Promise<TripListItem[]> => {
  try {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.routeId) queryParams.append('routeId', filters.routeId);
    if (filters?.startDate) queryParams.append('startDate', filters.startDate);
    if (filters?.endDate) queryParams.append('endDate', filters.endDate);

    const response = await fetch(
      `${API_BASE_URL}/trips/admin/all-trips?${queryParams.toString()}`,
      requestInit
    );

    if (!response.ok) {
      console.error('Failed to fetch trips:', response.status);
      return [];
    }

    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
};

export const getTripById = async (tripId: string): Promise<TripDetails | null> => {
  try {
    const response = await fetch(
      `${API_BASE_URL}/trips/admin/${tripId}`,
      requestInit
    );

    if (!response.ok) {
      console.error('Failed to fetch trip details:', response.status);
      return null;
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error('Error fetching trip details:', error);
    return null;
  }
};
