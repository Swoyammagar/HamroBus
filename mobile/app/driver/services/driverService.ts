import apiClient from './api';

export interface Stop {
    stopName: string;
    latitude: number;
    longitude: number;
    sequence: number;
}

export interface ScheduleItem {
    _id: string;
    dayOfWeek: string;
    driverId: string;
    busId: {
        _id: string;
        busNumber: string;
    };
    startTime: string;
    endTime: string;
    notes?: string;
}

export interface Route {
    _id: string;
    routeNumber: string;
    routeName: string;
    source: string;
    destination: string;
    distance: number;
    estimatedDuration: number;
    stops: Stop[];
    operatingDays: string[];
    firstBusTiming: string;
    lastBusTiming: string;
    fareInfo: number;
}

export interface TripSession {
    _id: string;
    driverId: string;
    routeId: Route;
    busId?: {
        _id: string;
        busNumber: string;
    };
    status: 'scheduled' | 'in-progress' | 'on-break' | 'completed' | 'cancelled';
    startTime?: Date;
    endTime?: Date;
    breakHistory: Array<{
        breakStartTime: Date;
        breakEndTime?: Date;
        duration?: number;
    }>;
    totalBreakTime: number;
    passengerCount: number;
    completedStops: Array<{
        stopId: string;
        completionTime: Date;
        passengersBoarded: number;
        passengersAlighted: number;
    }>;
    currentStop?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

const driverService = {
    // Get assigned route with schedules
    getAssignedRoute: async () => {
        const response = await apiClient.get('/trips/assigned-route');
        return response.data;
    },

    // Get driver's schedules
    getSchedules: async (days: number = 7) => {
        const response = await apiClient.get('/trips/schedules', {
            params: { days }
        });
        return response.data;
    },

    // Get current active trip
    getCurrentTrip: async () => {
        try {
            const response = await apiClient.get('/trips/current');
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw error;
        }
    },

    // Start a trip
    startTrip: async (routeId: string, busId?: string, scheduleId?: string) => {
        const response = await apiClient.post('/trips/start', {
            routeId,
            busId,
            scheduleId
        });
        return response.data;
    },

    // End a trip
    endTrip: async (tripId: string) => {
        const response = await apiClient.post('/trips/end', {
            tripId
        });
        return response.data;
    },

    // Start a break
    startBreak: async (tripId: string) => {
        const response = await apiClient.post('/trips/break/start', {
            tripId
        });
        return response.data;
    },

    // End a break
    endBreak: async (tripId: string) => {
        const response = await apiClient.post('/trips/break/end', {
            tripId
        });
        return response.data;
    },

    // Update passenger count at a stop
    updatePassengers: async (
        tripId: string,
        stopId: string,
        passengersBoarded: number,
        passengersAlighted: number
    ) => {
        const response = await apiClient.post('/trips/update-passengers', {
            tripId,
            stopId,
            passengersBoarded,
            passengersAlighted
        });
        return response.data;
    },

    // Get trip history
    getTripHistory: async (limit: number = 20, skip: number = 0) => {
        const response = await apiClient.get('/trips/history', {
            params: { limit, skip }
        });
        return response.data;
    },

    // Get today's completed trips
    getTodayCompletedTrips: async () => {
        const response = await apiClient.get('/trips/today-completed');
        return response.data;
    }
};

export default driverService;
