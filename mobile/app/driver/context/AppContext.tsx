import { useContext, createContext, useState, useCallback } from 'react';
import { Route, Stop, TripSession } from '../services/driverService';

type DriverContextType = {
  // Online Status
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;

  // UI State
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  showSOS: boolean;
  setShowSOS: (value: boolean) => void;

  // Route Data
  assignedRoute: Route | null;
  setAssignedRoute: (route: Route | null) => void;

  // Trip Data
  currentTrip: TripSession | null;
  setCurrentTrip: (trip: TripSession | null) => void;

  // Schedules
  schedules: any[];
  setSchedules: (schedules: any[]) => void;

  // Announcements
  announcement: { show: boolean; message: string; type: 'info' | 'warning' | 'emergency' };
  setAnnouncement: (value: any) => void;
};

export const AppContext = createContext<DriverContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [assignedRoute, setAssignedRoute] = useState<Route | null>(null);
  const [currentTrip, setCurrentTrip] = useState<TripSession | null>(null);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [announcement, setAnnouncement] = useState({
    show: false,
    message: '',
    type: 'info' as 'info' | 'warning' | 'emergency',
  });

  return (
    <AppContext.Provider value={{
      isOnline,
      setIsOnline,
      menuOpen,
      setMenuOpen,
      showSOS,
      setShowSOS,
      assignedRoute,
      setAssignedRoute,
      currentTrip,
      setCurrentTrip,
      schedules,
      setSchedules,
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
