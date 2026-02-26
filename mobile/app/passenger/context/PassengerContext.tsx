import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Route } from '../services/routeService';
import { Bus } from '../services/busService';

export interface Stop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  estimatedArrival?: string;
  order?: number;
}

export interface ServiceAlert {
  id: string;
  type: 'delay' | 'detour' | 'accident' | 'cancellation' | 'maintenance' | 'info';
  routeId?: string;
  busId?: string;
  title: string;
  message: string;
  severity: 'critical' | 'warning' | 'info';
  timestamp: string;
  read: boolean;
}

export interface PassengerProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  totalTrips: number;
  totalSpent: number;
  averageRating: number;
  memberSince: string;
  passengerId: string;
}

export interface Booking {
  bookingId: string;
  token: string;
  seatNumber: string;
  price: number;
  bookingDate: string;
  travelDate: string;
  boardingStop: string;
  alightingStop: string;
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
  alerts: ServiceAlert[];
  setAlerts: (alerts: ServiceAlert[]) => void;
  getUnreadAlerts: () => ServiceAlert[];
  markAlertRead: (alertId: string) => void;
}

const PassengerContext = createContext<PassengerContextType | undefined>(undefined);

export const PassengerProvider = ({ children }: { children: ReactNode }) => {
  const [selectedRoute, setSelectedRoute] = useState<Route | null>(null);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedBus, setSelectedBus] = useState<Bus | null>(null);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [alerts, setAlerts] = useState<ServiceAlert[]>([]);

  const getUnreadAlerts = () => alerts.filter(alert => !alert.read);

  const markAlertRead = (alertId: string) => {
    setAlerts(prevAlerts =>
      prevAlerts.map(alert =>
        alert.id === alertId ? { ...alert, read: true } : alert
      )
    );
  };

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
        alerts,
        setAlerts,
        getUnreadAlerts,
        markAlertRead,
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