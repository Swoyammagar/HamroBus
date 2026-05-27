import apiClient from './api';

export interface BusStop {
  _id?: string;
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  estimatedArrival?: string;
  order: number;
}

export interface Route {
  _id?: string;
  id?: string;
  name: string;
  stops: BusStop[];
  source?: string;
  destination?: string;
  distance?: number;
  busesCount?: number;
  fareInfo?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Schedule {
  _id: string;
  routeId?: string;
  busId: any;
  driverId?: any;
  departureTime?: string;
  arrivalTime?: string;
  days?: string[];
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  notes?: string;
  isActive?: boolean;
  nextServiceDate?: string;
}

export interface StopArrivalItem {
  scheduleId?: string;
  dayOfWeek?: string;
  arrivalTime: string;
  bus?: {
    _id?: string;
    busNumber?: string;
    registrationNumber?: string;
  };
  driver?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface StopArrivalsResponse {
  routeId?: string;
  routeName?: string;
  stop?: {
    stopName?: string;
    sequence?: number;
    latitude?: number;
    longitude?: number;
  };
  arrivals: StopArrivalItem[];
}

export const routeService = {
  getAllRoutes: async (): Promise<Route[]> => {
    const response = await apiClient.get('/passenger/routes');
    return response.data?.routes || response.data || [];
  },

  getRouteById: async (routeId: string): Promise<Route> => {
    const response = await apiClient.get(`/passenger/routes/${routeId}`);
    return response.data?.route || response.data;
  },

  getSchedulesByRoute: async (routeId: string): Promise<Schedule[]> => {
    const response = await apiClient.get(`/passenger/routes/${routeId}/schedules`);
    return response.data?.schedules || response.data || [];
  },

  getStopArrivalsByStop: async (routeId: string, stopName: string): Promise<StopArrivalsResponse> => {
    const encodedStopName = encodeURIComponent(stopName);
    const response = await apiClient.get(`/routes/${routeId}/stops/${encodedStopName}/arrivals`);

    return {
      routeId: response.data?.routeId,
      routeName: response.data?.routeName,
      stop: response.data?.stop,
      arrivals: response.data?.arrivals || [],
    };
  },

  searchRoutes: async (query: string): Promise<Route[]> => {
    const response = await apiClient.get(`/passenger/routes/search?q=${encodeURIComponent(query)}`);
    return response.data?.routes || response.data || [];
  },
};
