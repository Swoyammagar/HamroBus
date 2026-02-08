import axios from 'axios';
import React, { createContext, useContext, useState } from 'react';

export type DriverUserSummary = {
  _id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  address?: string;
  profileImgUrl?: string;
};

export type DriverRecord = {
  _id?: string;
  driverId: string;
  licenseNo?: string;
  validationStatus?: 'pending' | 'approved' | 'rejected';
  isActive?: boolean;
  userId?: DriverUserSummary | string;
};

type ActionResult = { success: boolean; message: string };

type DriverContextValue = {
  drivers: DriverRecord[];
  pendingDrivers: DriverRecord[];
  loading: boolean;
  error: string | null;
  fetchAllDrivers: () => Promise<void>;
  fetchPendingDrivers: () => Promise<void>;
  approveDriver: (driverId: string) => Promise<ActionResult>;
  rejectDriver: (driverId: string) => Promise<ActionResult>;
};

const DriverContext = createContext<DriverContextValue | undefined>(undefined);

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:3000/api';

axios.defaults.withCredentials = true;

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<DriverRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ drivers?: DriverRecord[] }>(
        `${API_BASE}/driver/allDrivers`
      );
      setDrivers(data?.drivers || []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch drivers';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingDrivers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ drivers?: DriverRecord[] }>(
        `${API_BASE}/driver/pending`
      );
      setPendingDrivers(data?.drivers || []);
    } catch (err: any) {
      const message =
        err?.response?.data?.message || 'Failed to fetch pending drivers';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const approveDriver = async (
    driverId: string
  ): Promise<ActionResult> => {
    try {
      const { data } = await axios.post<{ message?: string; driver?: DriverRecord }>(
        `${API_BASE}/driver/approve/${driverId}`
      );

      const updated = data?.driver;
      setPendingDrivers((prev) => prev.filter((drv) => drv.driverId !== driverId));
      if (updated) {
        setDrivers((prev) => {
          const existingIndex = prev.findIndex((drv) => drv.driverId === driverId);
          if (existingIndex !== -1) {
            const next = [...prev];
            next[existingIndex] = {
              ...prev[existingIndex],
              ...updated,
              validationStatus: 'approved',
            };
            return next;
          }
          return [...prev, { ...updated, validationStatus: 'approved' }];
        });
      }

      return { success: true, message: data?.message || 'Driver approved' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to approve driver';
      setError(message);
      return { success: false, message };
    }
  };

  const rejectDriver = async (
    driverId: string
  ): Promise<ActionResult> => {
    try {
      const { data } = await axios.post<{ message?: string; driver?: DriverRecord }>(
        `${API_BASE}/driver/reject/${driverId}`
      );

      const updated = data?.driver;
      setPendingDrivers((prev) => prev.filter((drv) => drv.driverId !== driverId));
      if (updated) {
        setDrivers((prev) => {
          const existingIndex = prev.findIndex((drv) => drv.driverId === driverId);
          if (existingIndex !== -1) {
            const next = [...prev];
            next[existingIndex] = {
              ...prev[existingIndex],
              ...updated,
              validationStatus: 'rejected',
            };
            return next;
          }
          return [...prev, { ...updated, validationStatus: 'rejected' }];
        });
      }

      return { success: true, message: data?.message || 'Driver rejected' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to reject driver';
      setError(message);
      return { success: false, message };
    }
  };

  const value: DriverContextValue = {
    drivers,
    pendingDrivers,
    loading,
    error,
    fetchAllDrivers,
    fetchPendingDrivers,
    approveDriver,
    rejectDriver,
  };

  return <DriverContext.Provider value={value}>{children}</DriverContext.Provider>;
};

export const useDriver = () => {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver must be used within DriverProvider');
  return ctx;
};

export default DriverContext;
