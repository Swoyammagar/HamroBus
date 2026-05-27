import { useContext, createContext, useState, useCallback, useEffect, useRef } from 'react';
import { Route, Stop, TripSession, StopArrival } from '../services/driverService';
import driverService from '../services/driverService';
import socketService from '../services/socketService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';

type DriverContextType = {
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;

  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  showSOS: boolean;
  setShowSOS: (value: boolean) => void;

  assignedRoute: Route | null;
  schedules: any[];
  routeLoading: boolean;
  routeError: string | null;

  currentTrip: TripSession | null;
  tripLoading: boolean;
  tripError: string | null;
  stopArrivals: StopArrival[] | null;
  stopArrivalsLoading: boolean;

  refreshRoute: () => Promise<void>;
  refreshTrip: () => Promise<void>;
  refreshAll: () => Promise<void>;

  announcement: { show: boolean; message: string; type: 'info' | 'warning' | 'emergency' };
  setAnnouncement: (value: any) => void;
};

export const AppContext = createContext<DriverContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSOS, setShowSOS] = useState(false);

  const [assignedRoute, setAssignedRoute] = useState<Route | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [currentTrip, setCurrentTrip] = useState<TripSession | null>(null);
  const [tripLoading, setTripLoading] = useState(false);
  const [tripError, setTripError] = useState<string | null>(null);
    const [stopArrivals, setStopArrivals] = useState<StopArrival[] | null>(null);
    const [stopArrivalsLoading, setStopArrivalsLoading] = useState(false);


  const [announcement, setAnnouncement] = useState({
    show: false,
    message: '',
    type: 'info' as 'info' | 'warning' | 'emergency',
  });

  const socketInitialized = useRef(false);
  const fallbackIntervalRef = useRef<any>(null);

  const getDriverId = async (): Promise<string | null> => {
    try {
      const userStr = await AsyncStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        return user._id || user.id || null;
      }
      return null;
    } catch (error) {
      console.error('Error getting driver ID:', error);
      return null;
    }
  };

  const fetchAssignedRoute = useCallback(async (silent = false) => {
    if (!silent) setRouteLoading(true);
    setRouteError(null);

    try {
      const data = await driverService.getAssignedRoute();
      setAssignedRoute(data.route);
      setSchedules(data.driverSchedules || []);

      if (!silent) {
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load route';
      setRouteError(errorMsg);
      if (!silent) {
        console.error('Error fetching route:', errorMsg);
      }
    } finally {
      if (!silent) setRouteLoading(false);
    }
  }, []);

  const fetchCurrentTrip = useCallback(async (silent = false) => {
    if (!silent) setTripLoading(true);
    setTripError(null);

    try {
      const trip = await driverService.getCurrentTrip();
      setCurrentTrip(trip);
      if (!silent && trip) {
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || 'Failed to load trip';
      setTripError(errorMsg);
      if (!silent) {
        console.error('Error fetching trip:', errorMsg);
      }
    } finally {
      if (!silent) setTripLoading(false);
    }
  }, []);

  const refreshRoute = useCallback(async () => {
    await fetchAssignedRoute(false);
  }, [fetchAssignedRoute]);

  const refreshTrip = useCallback(async () => {
    await fetchCurrentTrip(false);
  }, [fetchCurrentTrip]);

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchAssignedRoute(false),
      fetchCurrentTrip(false)
    ]);
  }, [fetchAssignedRoute, fetchCurrentTrip]);

  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      const driverId = await getDriverId();
      if (!driverId || !mounted) return;

      await Promise.all([
        fetchAssignedRoute(false),
        fetchCurrentTrip(false)
      ]);

      if (!socketInitialized.current) {
        socketInitialized.current = true;

        await socketService.connect(driverId);

        socketService.on('route:updated', (data: any) => {
          fetchAssignedRoute(true); // Silent fetch
        });

        socketService.on('schedule:assigned', (data: any) => {
          fetchAssignedRoute(true); // Silent fetch
        });

        socketService.on('trip:updated', (data: any) => {
          fetchCurrentTrip(true); // Silent fetch
        });

        socketService.on('trip:started', (data: any) => {
          fetchCurrentTrip(true); // Silent fetch
        });

        socketService.on('trip:ended', (data: any) => {
          fetchCurrentTrip(true); // Silent fetch
        });

        fallbackIntervalRef.current = setInterval(() => {
          if (!socketService.isSocketConnected()) {
            fetchAssignedRoute(true);
            fetchCurrentTrip(true);
          }
        }, 2 * 60 * 1000); // 2 minutes
      }
    };

    initialize();

    return () => {
      mounted = false;
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
      }
    };
  }, [fetchAssignedRoute, fetchCurrentTrip]);

  useEffect(() => {
    if (!currentTrip?.scheduleId || !Array.isArray(schedules)) {
      setStopArrivals(null);
      setStopArrivalsLoading(false);
      return;
    }

    setStopArrivalsLoading(true);
    const matchedSchedule = schedules.find(
      (schedule: any) => String(schedule?._id) === String(currentTrip.scheduleId)
    );

    setStopArrivals(matchedSchedule?.stopArrivals || null);
    setStopArrivalsLoading(false);
  }, [currentTrip?.scheduleId, schedules]);

  return (
    <AppContext.Provider value={{
      isOnline,
      setIsOnline,
      menuOpen,
      setMenuOpen,
      showSOS,
      setShowSOS,
      assignedRoute,
      schedules,
      routeLoading,
      routeError,
      currentTrip,
      tripLoading,
      tripError,
        stopArrivals,
        stopArrivalsLoading,
      refreshRoute,
      refreshTrip,
      refreshAll,
      announcement,
      setAnnouncement
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}

export function useDriver() {
  const { user, driver } = useAuth();
  if (!user) {
    throw new Error('useDriver must be used within AuthProvider');
  }
  return { user, driver };
}
