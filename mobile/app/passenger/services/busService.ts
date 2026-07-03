import apiClient from './api';

export interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  avatar?: string;
}

export interface DriverLatestReview {
  _id: string;
  rating: number;
  comment: string;
  reviewedAt?: string;
  passenger?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    profileImgUrl?: string;
  } | null;
}

export interface Bus {
  _id?: string;
  id?: string;
  busNumber: string;
  capacity: number;
  routeId: string;
  driverId?: string;
  driverName?: string;
  driverPhoto?: string;
  driverRatingAverage?: number;
  driverRatingCount?: number;
  currentOccupancy?: number;
  currentPassengers?: number;
  totalCapacity?: number;
  currentStop?: string;
  nextStop?: string;
  estimatedNextStopTime?: string;
  latitude?: number;
  longitude?: number;
  delay?: number;
  status: 'active' | 'inactive' | 'maintenance' | 'delayed';
  lastLocation?: {
    latitude: number;
    longitude: number;
    timestamp: Date;
  };
}

export const busService = {
  getAllBuses: async (lat?: number, lng?: number): Promise<Bus[]> => {
    const hasLocation = typeof lat === 'number' && typeof lng === 'number';
    const url = hasLocation
      ? `/passenger/buses?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`
      : '/passenger/buses';
    const response = await apiClient.get(url);
    return response.data?.buses || response.data || [];
  },

  getBusesByRoute: async (routeId: string): Promise<Bus[]> => {
    const response = await apiClient.get(`/passenger/buses/route/${routeId}`);
    return response.data?.buses || response.data || [];
  },

  getBusById: async (busId: string): Promise<Bus> => {
    const response = await apiClient.get(`/passenger/buses/${busId}`);
    return response.data?.bus || response.data;
  },

  getDriverById: async (driverId: string): Promise<Driver> => {
    const response = await apiClient.get(`/passenger/drivers/${driverId}`);
    return response.data?.driver || response.data;
  },

  getDriverLatestReviews: async (driverId: string): Promise<DriverLatestReview[]> => {
    const response = await apiClient.get(`/passenger/drivers/${driverId}/reviews`);
    return response.data?.reviews || response.data || [];
  },

  getBusOccupancy: async (busId: string): Promise<{ busId: string; passengerCount: number; lastUpdated: string }> => {
    try {
      const response = await apiClient.get(`/bus/${busId}/occupancy`);
      return {
        busId: response.data?.busId || busId,
        passengerCount: response.data?.passengerCount || 0,
        lastUpdated: response.data?.lastUpdated || new Date().toISOString(),
      };
    } catch (error) {
      console.error(`Error fetching occupancy for bus ${busId}:`, error);
      return { busId, passengerCount: 0, lastUpdated: new Date().toISOString() };
    }
  },

  getBusSosState: async (busId: string): Promise<{ busId: string; sosActive: boolean; sosCategory?: string; sosTimestamp?: string }> => {
    try {
      const response = await apiClient.get(`/bus/${busId}/sos-state`);
      return {
        busId: response.data?.busId || busId,
        sosActive: response.data?.sosActive || false,
        sosCategory: response.data?.sosCategory || undefined,
        sosTimestamp: response.data?.sosTimestamp || undefined,
      };
    } catch (error) {
      console.error(`Error fetching SOS state for bus ${busId}:`, error);
      return { busId, sosActive: false };
    }
  },
};
