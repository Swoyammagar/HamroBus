import apiClient from './api';

export interface BusStop {
  _id?: string;
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  order: number;
}

export interface Route {
  _id: string;
  id?: string;
  name: string;
  stops: BusStop[];
  source?: string;
  destination?: string;
  distance?: number;
  busesCount?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  _id: string;
  routeId?: string;
  busId: any;
  driverId?: any;
  departureTime: string;
  arrivalTime: string;
  days: string[];
  dayOfWeek?: string;
  startTime?: string;
  endTime?: string;
  notes?: string;
  isActive: boolean;
}

export const routeService = {
  // Get all routes
  getAllRoutes: async (): Promise<Route[]> => {
    const response = await apiClient.get('/passenger/routes');
    return response.data?.routes || response.data || [];
  },

  // Get single route by ID
  getRouteById: async (routeId: string): Promise<Route> => {
    const response = await apiClient.get(`/passenger/routes/${routeId}`);
    return response.data?.route || response.data;
  },

  // Get schedules for a specific route
  getSchedulesByRoute: async (routeId: string): Promise<Schedule[]> => {
    const response = await apiClient.get(`/passenger/routes/${routeId}/schedules`);
    return response.data?.schedules || response.data || [];
  },

  searchRoutes: async (query: string): Promise<Route[]> => {
    const response = await apiClient.get(`/passenger/routes/search?q=${encodeURIComponent(query)}`);
    return response.data?.routes || response.data || [];
  },
};