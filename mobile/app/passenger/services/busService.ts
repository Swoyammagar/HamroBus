import apiClient from './api';

export interface Driver {
  _id: string;
  name: string;
  email: string;
  phone: string;
  licenseNumber: string;
  avatar?: string;
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
  // Get all buses
  getAllBuses: async (): Promise<Bus[]> => {
    const response = await apiClient.get('/passenger/buses');
    return response.data?.buses || response.data || [];
  },

  // Get buses by route
  getBusesByRoute: async (routeId: string): Promise<Bus[]> => {
    const response = await apiClient.get(`/passenger/buses/route/${routeId}`);
    return response.data?.buses || response.data || [];
  },

  // Get single bus
  getBusById: async (busId: string): Promise<Bus> => {
    const response = await apiClient.get(`/passenger/buses/${busId}`);
    return response.data?.bus || response.data;
  },

  // Get driver info
  getDriverById: async (driverId: string): Promise<Driver> => {
    const response = await apiClient.get(`/passenger/drivers/${driverId}`);
    return response.data?.driver || response.data;
  },
};