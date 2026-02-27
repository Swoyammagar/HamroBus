import { useState, useCallback, useEffect } from 'react';
import driverService, { Route, ScheduleItem } from '../services/driverService';

export const useAssignedRoute = (pollInterval: number = 15000) => {
    const [route, setRoute] = useState<Route | null>(null);
    const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchAssignedRoute = useCallback(async () => {
        try {
            if (!loading && !refreshing) setLoading(false); // Only set loading on first fetch
            setError(null);
            const data = await driverService.getAssignedRoute();
            setRoute(data.route);
            setSchedules(data.driverSchedules);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch assigned route');
            console.error('Error fetching assigned route:', err);
        } finally {
            if (loading) setLoading(false);
            setRefreshing(false);
        }
    }, [loading]);

    const refreshRoute = useCallback(async () => {
        setRefreshing(true);
        await fetchAssignedRoute();
    }, [fetchAssignedRoute]);

    useEffect(() => {
        // Initial fetch
        fetchAssignedRoute();

        // Set up polling to check for route changes
        if (pollInterval && pollInterval > 0) {
            const intervalId = setInterval(() => {
                fetchAssignedRoute();
            }, pollInterval);

            return () => clearInterval(intervalId);
        }
    }, [fetchAssignedRoute, pollInterval]);

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

export const useCurrentTrip = (pollInterval?: number) => {
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchCurrentTrip = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await driverService.getCurrentTrip();
            setTrip(data);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch current trip');
            console.error('Error fetching current trip:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchCurrentTrip();

        // Optional polling
        if (pollInterval && pollInterval > 0) {
            const intervalId = setInterval(fetchCurrentTrip, pollInterval);
            return () => clearInterval(intervalId);
        }
    }, [fetchCurrentTrip, pollInterval]);

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
