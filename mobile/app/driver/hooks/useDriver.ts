import { useState, useCallback, useEffect } from 'react';
import driverService, { Route, ScheduleItem } from '../services/driverService';
import socketService from '../services/socketService';

// Helper to get driver ID from storage
const getDriverId = async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const userStr = await AsyncStorage.getItem('user');
    if (userStr) {
        const user = JSON.parse(userStr);
        return user._id;
    }
    return null;
};

export const useAssignedRoute = (enablePolling: boolean = false) => {
    const [route, setRoute] = useState<Route | null>(null);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAssignedRoute = useCallback(async (silent: boolean = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);
            const data = await driverService.getAssignedRoute();
            setRoute(data.route);
            setSchedules(data.driverSchedules);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch assigned route');
            console.error('Error fetching assigned route:', err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const refreshRoute = useCallback(async () => {
        setRefreshing(true);
        await fetchAssignedRoute();
    }, [fetchAssignedRoute]);

    useEffect(() => {
        // Initial fetch
        fetchAssignedRoute();

        // Setup WebSocket connection
        const setupSocket = async () => {
            const driverId = await getDriverId();
            if (driverId) {
                await socketService.connect(driverId);
                
                // Listen for route updates via WebSocket
                const handleRouteUpdate = (updatedData: any) => {
                    console.log('📍 Route updated via WebSocket, fetching latest data...');
                    fetchAssignedRoute(true); // Fetch silently
                };

                socketService.on('route:updated', handleRouteUpdate);
                socketService.on('schedule:assigned', handleRouteUpdate);

                return () => {
                    socketService.off('route:updated', handleRouteUpdate);
                    socketService.off('schedule:assigned', handleRouteUpdate);
                };
            }
        };

        setupSocket();

        // Smart polling: Only poll every 2 minutes as fallback if enabled
        if (enablePolling) {
            const pollInterval = setInterval(() => {
                if (!socketService.isSocketConnected()) {
                    console.log('⏰ Fallback polling (socket disconnected)');
                    fetchAssignedRoute(true);
                }
            }, 120000); // 2 minutes

            return () => clearInterval(pollInterval);
        }
    }, [fetchAssignedRoute, enablePolling]);

    return {
        route,
        schedules,
        loading,
        error,
        refreshing,
        refetch: fetchAssignedRoute,
        refresh: refreshRoute
    };
};

export const useDriverSchedules = () => {
    const [schedules, setSchedules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchSchedules = useCallback(async (days: number = 7) => {
        try {
            setLoading(true);
            setError(null);
            const data = await driverService.getSchedules(days);
            setSchedules(data.upcomingTrips || data.schedules);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch schedules');
            console.error('Error fetching schedules:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchSchedules();
    }, [fetchSchedules]);

    return {
        schedules,
        loading,
        error,
        refetch: fetchSchedules
    };
};

export const useCurrentTrip = (enablePolling: boolean = false) => {
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCurrentTrip = useCallback(async (silent: boolean = false) => {
        try {
            if (!silent) setLoading(true);
            setError(null);
            const data = await driverService.getCurrentTrip();
            setTrip(data);
        } catch (err: any) {
            if (err.response?.status !== 404) {
                setError(err.message || 'Failed to fetch current trip');
                console.error('Error fetching current trip:', err);
            } else {
                // No active trip is not an error
                setTrip(null);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Initial fetch
        fetchCurrentTrip();

        // Setup WebSocket connection
        const setupSocket = async () => {
            const driverId = await getDriverId();
            if (driverId) {
                await socketService.connect(driverId);
                
                // Listen for trip updates via WebSocket
                const handleTripUpdate = (updatedTrip: any) => {
                    console.log('🚌 Trip updated via WebSocket');
                    setTrip(updatedTrip);
                };

                const handleTripStarted = (newTrip: any) => {
                    console.log('🟢 Trip started via WebSocket');
                    setTrip(newTrip);
                };

                const handleTripEnded = (endedTrip: any) => {
                    console.log('🔴 Trip ended via WebSocket');
                    setTrip(null);
                };

                socketService.on('trip:updated', handleTripUpdate);
                socketService.on('trip:started', handleTripStarted);
                socketService.on('trip:ended', handleTripEnded);

                return () => {
                    socketService.off('trip:updated', handleTripUpdate);
                    socketService.off('trip:started', handleTripStarted);
                    socketService.off('trip:ended', handleTripEnded);
                };
            }
        };

        setupSocket();

        // Smart polling: Only poll every minute as fallback if enabled
        if (enablePolling) {
            const pollInterval = setInterval(() => {
                if (!socketService.isSocketConnected()) {
                    console.log('⏰ Fallback polling for trip (socket disconnected)');
                    fetchCurrentTrip(true);
                }
            }, 60000); // 1 minute

            return () => clearInterval(pollInterval);
        }
    }, [fetchCurrentTrip, enablePolling]);

    return {
        trip,
        loading,
        error,
        refetch: fetchCurrentTrip
    };
};

export const useTripActions = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const startTrip = useCallback(async (routeId: string, busId?: string, scheduleId?: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await driverService.startTrip(routeId, busId, scheduleId);
            return data.trip;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to start trip';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const endTrip = useCallback(async (tripId: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await driverService.endTrip(tripId);
            return data.trip;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to end trip';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const startBreak = useCallback(async (tripId: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await driverService.startBreak(tripId);
            return data.trip;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to start break';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const endBreak = useCallback(async (tripId: string) => {
        try {
            setIsLoading(true);
            setError(null);
            const data = await driverService.endBreak(tripId);
            return data.trip;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to end break';
            setError(errorMsg);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updatePassengers = useCallback(
        async (
            tripId: string,
            stopId: string,
            passengersBoarded: number,
            passengersAlighted: number
        ) => {
            try {
                setIsLoading(true);
                setError(null);
                const data = await driverService.updatePassengers(
                    tripId,
                    stopId,
                    passengersBoarded,
                    passengersAlighted
                );
                return data.trip;
            } catch (err: any) {
                const errorMsg = err.message || 'Failed to update passengers';
                setError(errorMsg);
                throw err;
            } finally {
                setIsLoading(false);
            }
        },
        []
    );

    return {
        isLoading,
        error,
        startTrip,
        endTrip,
        startBreak,
        endBreak,
        updatePassengers
    };
};

export const useTripHistory = () => {
    const [trips, setTrips] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [skip, setSkip] = useState(0);

    const fetchHistory = useCallback(async (limit: number = 20, offset: number = 0) => {
        try {
            setLoading(true);
            setError(null);
            const data = await driverService.getTripHistory(limit, offset);
            if (offset === 0) {
                setTrips(data.trips);
            } else {
                setTrips(prev => [...prev, ...data.trips]);
            }
            setHasMore(data.hasMore);
            setSkip(offset + data.trips.length);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch history');
            console.error('Error fetching history:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    const loadMore = useCallback(() => {
        if (hasMore && !loading) {
            fetchHistory(20, skip);
        }
    }, [hasMore, loading, skip, fetchHistory]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    return {
        trips,
        loading,
        error,
        hasMore,
        refetch: fetchHistory,
        loadMore
    };
};
