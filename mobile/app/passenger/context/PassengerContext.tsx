import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { Route } from '../services/routeService';
import { Bus, busService } from '../services/busService';
import { useAuth } from '../../context/AuthContext';
import passengerNotificationSocket from '../services/passengerNotificationSocket';
import { notificationService, type PassengerNotificationApiRecord } from '../services/notificationService';

export interface Stop {
  _id?: string;
  id?: string;
  name: string;
  latitude: number;
  longitude: number;
  estimatedArrival?: string;
  order?: number;
}

export interface ServiceAlert {
  id: string;
  type: 'alert' | 'info' | 'maintenance' | 'announcement' | 'emergency';
  routeId?: string;
  busId?: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  read: boolean;
}

export interface PassengerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
  totalTrips: number;
  totalSpent: number;
  averageRating: number;
  memberSince: string;
  passengerId: string;
}

export interface Booking {
  id: string;
  bookingId: string;
  passengerId: string;
  busId: string;
  routeId: string;
  token: string;
  seatNumber: string;
  price: number;
  paymentStatus?: boolean;
  bookingDate: string;
  travelDate: string;
  status: 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
  boardingStop: string;
  alightingStop: string;
  tripStarted: boolean;
  tripEnded: boolean;
}

export interface Review {
  id: string;
  bookingId: string;
  busId: string;
  rating: number;
  comment: string;
  date: string;
  categories: {
    cleanliness: number;
    drivingSkill: number;
    comfort: number;
    timelinessCount: number;
  };
}

export interface PassengerToast {
  id: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface LiveBusStopState {
  currentStop: string | null;
  previousStop: string | null;
}

interface PassengerContextType {
  selectedRoute: Route | null;
  setSelectedRoute: (route: Route | null) => void;
  routes: Route[];
  setRoutes: (routes: Route[]) => void;
  selectedBus: Bus | null;
  setSelectedBus: (bus: Bus | null) => void;
  buses: Bus[];
  setBuses: (buses: Bus[]) => void;
  profile: PassengerProfile | null;
  setProfile: (profile: PassengerProfile | null) => void;
  bookings: Booking[];
  addBooking: (booking: Booking) => void;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => void;
  setBookings: (bookings: Booking[]) => void;
  reviews: Review[];
  addReview: (review: Review) => void;
  alerts: ServiceAlert[];
  setAlerts: React.Dispatch<React.SetStateAction<ServiceAlert[]>>;
  getUnreadAlerts: () => ServiceAlert[];
  markAlertRead: (alertId: string) => void;
  currentToast: PassengerToast | null;
  dismissToast: () => void;
  liveBusOccupancy: Record<string, number>;
  liveBusStops: Record<string, LiveBusStopState>;
}

const PassengerContext = createContext<PassengerContextType | undefined>(undefined);

export const PassengerProvider = ({ children }: { children: ReactNode }) => {
  const { passenger } = useAuth();
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [currentToast, setCurrentToast] = useState<PassengerToast | null>(null);
  const [liveBusOccupancy, setLiveBusOccupancy] = useState<Record<string, number>>({});
  const [liveBusStops, setLiveBusStops] = useState<Record<string, LiveBusStopState>>({});
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addBooking = (booking: Booking) => {
    setBookings(prevBookings => [booking, ...prevBookings]);
  };

  const updateBooking = (bookingId: string, updates: Partial<Booking>) => {
    setBookings(prevBookings =>
      prevBookings.map(booking =>
        booking.id === bookingId ? { ...booking, ...updates } : booking
      )
    );
  };

  const addReview = (review: Review) => {
    setReviews(prevReviews => [review, ...prevReviews]);
  };

  const getUnreadAlerts = () => alerts.filter(alert => !alert.read);

  const markAlertRead = (alertId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

  const dismissToast = () => {
    setCurrentToast(null);
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
      toastTimerRef.current = null;
    }
  };

  const mapApiToAlert = (
    item: PassengerNotificationApiRecord,
    passengerId?: string
  ): ServiceAlert | null => {
    const id = String(item?._id || item?.id || '').trim();
    if (!id) return null;

    const isRead = (item.readBy || []).some((entry) => {
      const readUserId = String(entry?.userId || '').trim();
      return passengerId ? readUserId === String(passengerId) : false;
    });

    return {
      id,
      type: (item.type || 'info') as 'alert' | 'info' | 'maintenance' | 'announcement' | 'emergency',
      title: item.title || 'Notification',
      message: item.message || '',
      severity: (item.severity || 'medium') as 'low' | 'medium' | 'high' | 'critical',
      timestamp: item.createdAt || new Date().toISOString(),
      read: isRead,
    };
  };

  useEffect(() => {
    if (!passenger?.id) {
      passengerNotificationSocket.disconnect();
      return;
    }

    let active = true;

    const onIncomingNotification = (payload: PassengerNotificationApiRecord) => {
      if (!active) return;
      const mapped = mapApiToAlert(payload, passenger.id);
      if (!mapped) return;

      setAlerts((prev) => {
        const exists = prev.some((a) => a.id === mapped.id);
        return exists ? prev : [mapped, ...prev];
      });

      setCurrentToast({
        id: mapped.id,
        title: mapped.title,
        message: mapped.message,
        severity: mapped.severity,
      });

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = setTimeout(() => {
        setCurrentToast((prev) => (prev?.id === mapped.id ? null : prev));
        toastTimerRef.current = null;
      }, 3500);
    };

    const onBookingStatusUpdated = (payload: any) => {
      if (!active || !payload?.status) return;

      const bookingId = payload?.bookingId ? String(payload.bookingId) : '';
      const bookingCode = payload?.bookingCode ? String(payload.bookingCode) : '';
      if (!bookingId && !bookingCode) return;

      const rawStatus = String(payload.status);
      const mappedStatus = rawStatus === 'in-progress' ? 'ongoing' : rawStatus;

      if (mappedStatus !== 'confirmed' && mappedStatus !== 'ongoing' && mappedStatus !== 'completed' && mappedStatus !== 'cancelled') {
        return;
      }

      setBookings((prev) =>
        prev.map((booking) =>
          ((bookingId && (booking.id === bookingId || booking.bookingId === bookingId)) ||
            (bookingCode && booking.bookingId === bookingCode))
            ? {
                ...booking,
                status: mappedStatus,
                tripStarted: rawStatus === 'in-progress' || rawStatus === 'completed',
                tripEnded: rawStatus === 'completed',
              }
            : booking
        )
      );
    };

    const onBookingCompleted = (payload: any) => {
      if (!active) return;

      const bookingId = payload?.bookingId ? String(payload.bookingId) : '';
      const bookingCode = payload?.bookingCode ? String(payload.bookingCode) : '';
      if (!bookingId && !bookingCode) return;

      setBookings((prev) =>
        prev.map((booking) =>
          ((bookingId && (booking.id === bookingId || booking.bookingId === bookingId)) ||
            (bookingCode && booking.bookingId === bookingCode))
            ? {
                ...booking,
                status: 'completed',
                tripStarted: true,
                tripEnded: true,
              }
            : booking
        )
      );
    };

    const onOccupancyUpdated = (payload: any) => {
      if (!active) return;
      const busId = String(payload?.busId || '').trim();
      if (!busId) return;

      setLiveBusOccupancy((prev) => ({
        ...prev,
        [busId]: typeof payload?.passengerCount === 'number' ? payload.passengerCount : 0,
      }));
    };

    const onCurrentStopUpdate = (payload: any) => {
      if (!active) return;
      const busId = String(payload?.busId || '').trim();
      if (!busId) return;

      setLiveBusStops((prev) => ({
        ...prev,
        [busId]: {
          currentStop: payload?.currentStop ? String(payload.currentStop) : null,
          previousStop: payload?.previousStop ? String(payload.previousStop) : null,
        },
      }));
    };

    const setup = async () => {
      try {
        const initialNotifications = await notificationService.getPassengerNotifications();
        if (active) {
          const mapped = initialNotifications
            .map((item) => mapApiToAlert(item, passenger.id))
            .filter(Boolean) as ServiceAlert[];
          setAlerts(mapped);
        }
      } catch (error) {
        console.error('Failed to load passenger notifications:', error);
      }

      await passengerNotificationSocket.connect(passenger.id);
      passengerNotificationSocket.onNotification(onIncomingNotification);
      passengerNotificationSocket.onBookingStatusUpdated(onBookingStatusUpdated);
      passengerNotificationSocket.onBookingCompleted(onBookingCompleted);
      passengerNotificationSocket.onOccupancyUpdated(onOccupancyUpdated);
      passengerNotificationSocket.onCurrentStopUpdate(onCurrentStopUpdate);
    };

    setup();

    return () => {
      active = false;
      passengerNotificationSocket.offNotification(onIncomingNotification);
      passengerNotificationSocket.offBookingStatusUpdated(onBookingStatusUpdated);
      passengerNotificationSocket.offBookingCompleted(onBookingCompleted);
      passengerNotificationSocket.offOccupancyUpdated(onOccupancyUpdated);
      passengerNotificationSocket.offCurrentStopUpdate(onCurrentStopUpdate);
      passengerNotificationSocket.disconnect();
      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
        toastTimerRef.current = null;
      }
    };
  }, [passenger?.id]);

  useEffect(() => {
    if (!passenger?.id || buses.length === 0) return;

    const busIds = buses
      .map((bus) => String(bus._id || bus.id || '').trim())
      .filter(Boolean);

    let active = true;

    // ========== NEW: Hydrate occupancy from backend before socket listeners ==========
    const hydrateOccupancy = async () => {
      try {
        const occupancyData = await Promise.all(
          busIds.map((busId) => busService.getBusOccupancy(busId))
        );

        if (active) {
          const occupancyMap: Record<string, number> = {};
          occupancyData.forEach((data) => {
            occupancyMap[data.busId] = data.passengerCount;
          });
          setLiveBusOccupancy((prev) => ({ ...prev, ...occupancyMap }));
          console.log('✅ Occupancy hydrated from backend:', occupancyMap);
        }
      } catch (error) {
        console.error('Error hydrating occupancy:', error);
      }
    };

    hydrateOccupancy();
    // ========== END NEW ==========

    busIds.forEach((busId) => {
      passengerNotificationSocket.joinBusRoom(busId);
    });

    return () => {
      active = false;
      busIds.forEach((busId) => {
        passengerNotificationSocket.leaveBusRoom(busId);
      });
    };
  }, [passenger?.id, buses]);

  return (
    <PassengerContext.Provider
      value={{
        selectedRoute,
        setSelectedRoute,
        routes,
        setRoutes,
        selectedBus,
        setSelectedBus,
        buses,
        setBuses,
        profile,
        setProfile,
        bookings,
        addBooking,
        updateBooking,
        setBookings,
        reviews,
        addReview,
        alerts,
        setAlerts,
        getUnreadAlerts,
        markAlertRead,
        currentToast,
        dismissToast,
        liveBusOccupancy,
        liveBusStops,
      }}
    >
      {children}
    </PassengerContext.Provider>
  );
};

export const usePassenger = () => {
  const context = useContext(PassengerContext);
  if (!context) {
    throw new Error('usePassenger must be used within PassengerProvider');
  }
  return context;
};

// Export types
export type { Route, Bus };