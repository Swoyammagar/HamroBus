import React, { createContext, useContext, useState, useCallback } from 'react';

export interface Route {
  id: string;
  name: string;
  source: string;
  destination: string;
  stops: Stop[];
  busesCount: number;
  distance: number;
}

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  estimatedArrival: string;
  order: number;
}

export interface Bus {
  id: string;
  busNumber: string;
  routeId: string;
  driverName: string;
  currentStop: string;
  latitude: number;
  longitude: number;
  totalCapacity: number;
  currentPassengers: number;
  status: 'active' | 'inactive' | 'delayed' | 'cancelled';
  nextStop: string;
  estimatedNextStopTime: string;
  delay: number; // in minutes
}

export interface Booking {
  id: string;
  bookingId: string;
  passengerId: string;
  busId: string;
  routeId: string;
  seatNumber: string;
  bookingDate: string;
  travelDate: string;
  status: 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
  boardingStop: string;
  alightingStop: string;
  price: number;
  token: string;
  tripStarted: boolean;
  tripEnded: boolean;
}

export interface ServiceAlert {
  id: string;
  type: 'delay' | 'detour' | 'accident' | 'cancellation' | 'maintenance';
  routeId?: string;
  busId?: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  timestamp: string;
  read: boolean;
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

export interface PassengerProfile {
  id: string;
  passengerId: string;
  name: string;
  email: string;
  phone: string;
  profilePicture?: string;
  totalTrips?: number;
  totalSpent?: number;
  averageRating?: number;
  memberSince: string;
}

interface PassengerContextType {
  // State
  routes: Route[];
  buses: Bus[];
  bookings: Booking[];
  alerts: ServiceAlert[];
  reviews: Review[];
  profile: PassengerProfile | null;
  selectedRoute: Route | null;
  selectedBus: Bus | null;
  currentBooking: Booking | null;

  // Actions
  setRoutes: (routes: Route[]) => void;
  setBuses: (buses: Bus[]) => void;
  addBooking: (booking: Booking) => void;
  updateBooking: (bookingId: string, updates: Partial<Booking>) => void;
  addAlert: (alert: ServiceAlert) => void;
  markAlertRead: (alertId: string) => void;
  addReview: (review: Review) => void;
  setProfile: (profile: PassengerProfile | null) => void;
  setSelectedRoute: (route: Route | null) => void;
  setSelectedBus: (bus: Bus | null) => void;
  setCurrentBooking: (booking: Booking | null) => void;
  getBusesByRoute: (routeId: string) => Bus[];
  getBookingById: (bookingId: string) => Booking | undefined;
  getUnreadAlerts: () => ServiceAlert[];
  getCompletedBookings: () => Booking[];
  getUpcomingBookings: () => Booking[];
}

const PassengerContext = createContext<PassengerContextType | undefined>(undefined);

export const PassengerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [routes, setRoutes] = useState<Route[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profile, setProfile] = useState<PassengerProfile | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [currentBooking, setCurrentBooking] = useState<Booking | null>(null);

  const addBooking = useCallback((booking: Booking) => {
    setBookings(prev => [...prev, booking]);
  }, []);

  const updateBooking = useCallback((bookingId: string, updates: Partial<Booking>) => {
    setBookings(prev =>
      prev.map(booking =>
        booking.id === bookingId ? { ...booking, ...updates } : booking
      )
    );
  }, []);

  const addAlert = useCallback((alert: ServiceAlert) => {
    setAlerts(prev => [alert, ...prev]);
  }, []);

  const markAlertRead = useCallback((alertId: string) => {
    setAlerts(prev =>
      prev.map(alert => (alert.id === alertId ? { ...alert, read: true } : alert))
    );
  }, []);

  const addReview = useCallback((review: Review) => {
    setReviews(prev => [...prev, review]);
  }, []);

  const getBusesByRoute = useCallback(
    (routeId: string) => buses.filter(bus => bus.routeId === routeId),
    [buses]
  );

  const getBookingById = useCallback(
    (bookingId: string) => bookings.find(booking => booking.id === bookingId),
    [bookings]
  );

  const getUnreadAlerts = useCallback(() => alerts.filter(alert => !alert.read), [alerts]);

  const getCompletedBookings = useCallback(
    () => bookings.filter(booking => booking.status === 'completed'),
    [bookings]
  );

  const getUpcomingBookings = useCallback(
    () => bookings.filter(booking => booking.status === 'confirmed'),
    [bookings]
  );

  const value: PassengerContextType = {
    routes,
    buses,
    bookings,
    alerts,
    reviews,
    profile,
    selectedRoute,
    selectedBus,
    currentBooking,
    setRoutes,
    setBuses,
    addBooking,
    updateBooking,
    addAlert,
    markAlertRead,
    addReview,
    setProfile,
    setSelectedRoute,
    setSelectedBus,
    setCurrentBooking,
    getBusesByRoute,
    getBookingById,
    getUnreadAlerts,
    getCompletedBookings,
    getUpcomingBookings,
  };

  return (
    <PassengerContext.Provider value={value}>
      {children}
    </PassengerContext.Provider>
  );
};

export const usePassenger = () => {
  const context = useContext(PassengerContext);
  if (context === undefined) {
    throw new Error('usePassenger must be used within a PassengerProvider');
  }
  return context;
};
