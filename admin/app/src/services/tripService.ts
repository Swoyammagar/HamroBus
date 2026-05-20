import axios from 'axios';
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

export interface OccupancyRecord {
  timestamp: string;
  stopName: string;
  passengersBoarded: number;
  passengersAlighted: number;
  currentOccupancy: number;
  eventType: 'boarding' | 'alighting' | 'manual-update';
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
  currentOccupancy: number;
  occupancyHistory: OccupancyRecord[];
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
    currentOccupancy: number;
    totalSeats: number;
    totalFare: number;
    paidBookings: number;
    pendingPayments: number;
  };
  occupancyHistory: OccupancyRecord[];
  bookings: TripBooking[];
}

const requestConfig = {
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
};

// ── Driver helpers ────────────────────────────────────────────────────────────
//
// The getAllTrips backend controller populates driverId and then manually
// builds flat fields: driverName (string) and driverProfileImgUrl (string|null)
// directly on each trip object.  We read those first before falling back to
// any nested driver object shape.

const resolveDriverName = (trip: any): string => {
  // 1. Flat field built by the backend controller
  if (trip.driverName && trip.driverName !== 'Unknown Driver') return trip.driverName;
  // 2. Nested driver / driverId object (other endpoints)
  const d = trip.driver || trip.driverId;
  if (!d) return 'Unknown Driver';
  if (d.name) return d.name;
  const full = [d.firstName, d.lastName].filter(Boolean).join(' ').trim();
  return full || d.email || 'Unknown Driver';
};

const resolveDriverImage = (trip: any): string | undefined => {
  // 1. Flat field from controller
  if (trip.driverProfileImgUrl) return trip.driverProfileImgUrl;
  // 2. Nested object
  const d = trip.driver || trip.driverId;
  return d?.profileImgUrl || d?.profileImage || d?.avatarUrl || undefined;
};

// ── Normalizers ───────────────────────────────────────────────────────────────

const normalizeTripListItem = (trip: any): TripListItem => ({
  tripId: String(trip.tripId || trip._id || ''),
  routeName: trip.routeName || trip.route?.routeName || 'Unknown Route',
  busNumber: trip.busNumber || trip.bus?.busNumber || 'Unknown Bus',
  driverName: resolveDriverName(trip),
  driverProfileImgUrl: resolveDriverImage(trip),
  status: trip.status,
  startTime: trip.startTime || trip.times?.scheduledStart || trip.createdAt || '',
  delayMinutes: trip.delayMinutes ?? trip.times?.delayMinutes ?? 0,
  passengerCount: trip.passengerCount ?? trip.metrics?.passengerCount ?? 0,
  bookingCount: trip.bookingCount ?? trip.bookings?.length ?? 0,
  totalSeats: trip.totalSeats ?? trip.metrics?.totalSeats ?? 0,
  currentOccupancy: trip.currentOccupancy ?? trip.passengerCount ?? 0,
  occupancyHistory: (trip.occupancyHistory || []).map((occ: any) => ({
    timestamp: occ.timestamp,
    stopName: occ.stopName,
    passengersBoarded: occ.passengersBoarded ?? 0,
    passengersAlighted: occ.passengersAlighted ?? 0,
    currentOccupancy: occ.currentOccupancy ?? 0,
    eventType: occ.eventType || 'manual-update',
  })),
  bookings: trip.bookings || [],
});

const normalizeTripDetails = (trip: any): TripDetails => ({
  ...trip,
  tripId: String(trip.tripId || trip._id || ''),
  driver: {
    // getTripDetailsById populates a nested driver object
    name: resolveDriverName({ driver: trip.driver }),
    phone: trip.driver?.phone || trip.driver?.phoneNumber || '',
    profileImgUrl: trip.driver?.profileImgUrl || trip.driver?.profileImage || undefined,
    licenseImgUrl: trip.driver?.licenseImgUrl || trip.driver?.licenseImageUrl || undefined,
  },
});

// ── API calls ─────────────────────────────────────────────────────────────────

export const getAllTrips = async (filters?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  routeId?: string;
}): Promise<TripListItem[]> => {
  try {
    const params = new URLSearchParams();
    if (filters?.status)    params.append('status',    filters.status);
    if (filters?.startDate) params.append('startDate', filters.startDate);
    if (filters?.endDate)   params.append('endDate',   filters.endDate);
    if (filters?.routeId)   params.append('routeId',   filters.routeId);

    const { data } = await axios.get(
      `${API_BASE_URL}/trips/admin/all-trips?${params.toString()}`,
      requestConfig,
    );
    if (!data?.data) { console.error('getAllTrips: no data'); return []; }
    return (data.data || []).map(normalizeTripListItem);
  } catch (err) {
    console.error('getAllTrips error:', err);
    return [];
  }
};

export const getTripById = async (tripId: string): Promise<TripDetails | null> => {
  try {
    const { data } = await axios.get(
      `${API_BASE_URL}/trips/admin/${tripId}`,
      requestConfig,
    );
    if (!data?.data) { console.error('getTripById: no data'); return null; }
    return normalizeTripDetails(data.data);
  } catch (err) {
    console.error('getTripById error:', err);
    return null;
  }
};