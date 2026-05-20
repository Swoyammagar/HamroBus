import React, { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useAdminDrivers, type UseAdminDriversReturn } from '../src/hooks/useAdminDrivers';
import { useAdminBuses, type UseAdminBusesReturn } from '../src/hooks/useAdminBuses';
import { useAdminRoutes, type UseAdminRoutesReturn } from '../src/hooks/useAdminRoutes';
import { useAdminNotifications, type UseAdminNotificationsReturn } from '../src/hooks/useAdminNotifications';
import { useAdminFAQs, UseAdminFAQsReturn } from '../src/hooks/useAdminFAQs';
import { UseAdminPassengersReturn, useAdminPassengers } from '../src/hooks/useAdminPassengers';
type AdminContextValue = {
  driver: UseAdminDriversReturn;
  bus: UseAdminBusesReturn;
  route: UseAdminRoutesReturn;
  notification: UseAdminNotificationsReturn;
  faq: UseAdminFAQsReturn;
  passenger: UseAdminPassengersReturn;
};

const AdminContext = createContext<AdminContextValue | undefined>(undefined);

export const AdminProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const auth = useAuth();
  const driver = useAdminDrivers();
  const bus = useAdminBuses();
  const route = useAdminRoutes();
  const notification = useAdminNotifications({ token: auth.token, loading: auth.loading });
  const faq = useAdminFAQs();
  const passenger = useAdminPassengers();
  const value = useMemo(
    () => ({
      driver,
      bus,
      route,
      notification,
      faq,
      passenger,
    }),
    [driver, bus, route, notification, faq, passenger]
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdmin = () => {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
};

export default AdminContext;
