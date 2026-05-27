import apiClient from './api';

export interface Stop {
    stopName: string;
    latitude: number;
    longitude: number;
    sequence: number;
}

export interface StopArrival {
    stopName: string;
    stopSequence: number;
    arrivalTime: string; // HH:MM format
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
    stopArrivals?: StopArrival[];
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
    scheduleId?: string;
    stopArrivals?: StopArrival[];
    status: 'scheduled' | 'in-progress' | 'on-break' | 'completed' | 'cancelled' | 'missed';
    startTime?: Date;
    startDelayMinutes?: number;
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
    previousStop?: string;
    notes?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface DriverSeatReservation {
    seatNumber: string;
    bookingCode?: string;
    status?: string;
    passengerName: string;
    passengerPhone: string;
    paymentStatus?: boolean;
    boarded?: boolean;
    boardedAt?: string | null;
    payment?: {
        status?: 'pending' | 'paid' | 'failed';
        method?: string;
        amount?: number;
    } | null;
}

export interface ScanBookingQrResponse {
    message: string;
    alreadyBoarded: boolean;
    bookingId: string;
    bookingCode: string;
    seatNumbers: string[];
    isBoarded: boolean;
    boardedAt?: string;
    passengerCount?: number;
}

export interface SosAlertPayload {
    busId: string;
    tripId?: string;
    category: string;
    details?: string;
    latitude?: number;
    longitude?: number;
}

export interface DriverScheduleSeatMap {
    routeId: string;
    routeName: string;
    busId: string;
    busNumber: string;
    totalSeats: number;
    schedule: {
        _id: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
    };
    serviceDate: string;
    reservedSeats: DriverSeatReservation[];
}

const driverService = {
    getAssignedRoute: async () => {
        const response = await apiClient.get('/trips/assigned-route');
        return response.data;
    },

    getSchedules: async (days: number = 7) => {
        const response = await apiClient.get('/trips/schedules', {
            params: { days }
        });
        return response.data;
    },

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

    startTrip: async (routeId: string, busId?: string, scheduleId?: string) => {
        const response = await apiClient.post('/trips/start', {
            routeId,
            busId,
            scheduleId
        });
        return response.data;
    },

    endTrip: async (tripId: string) => {
        const response = await apiClient.post('/trips/end', {
            tripId
        });
        return response.data;
    },

    startBreak: async (tripId: string) => {
        const response = await apiClient.post('/trips/break/start', {
            tripId
        });
        return response.data;
    },

    endBreak: async (tripId: string) => {
        const response = await apiClient.post('/trips/break/end', {
            tripId
        });
        return response.data;
    },

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

    getTripHistory: async (limit: number = 20, skip: number = 0) => {
        const response = await apiClient.get('/trips/history', {
            params: { limit, skip }
        });
        return response.data;
    },

    getTodayCompletedTrips: async () => {
        const response = await apiClient.get('/trips/today-completed');
        return response.data;
    },

    getScheduleSeatMap: async (scheduleId: string, serviceDate: string): Promise<DriverScheduleSeatMap> => {
        const response = await apiClient.get('/trips/schedule-seat-map', {
            params: { scheduleId, serviceDate }
        });
        return response.data;
    },

    scanBookingQr: async (qrData: string): Promise<ScanBookingQrResponse> => {
        const response = await apiClient.post('/trips/scan-booking-qr', { qrData });
        return response.data;
    },

    sendSosAlert: async (payload: SosAlertPayload) => {
        const response = await apiClient.post('/sos/send', payload);
        return response.data;
    },

    clearSosAlert: async (payload: { busId: string; tripId?: string }) => {
        const response = await apiClient.post('/sos/clear', payload);
        return response.data;
    },
};

export default driverService;
