import { useCallback, useState } from 'react';
import axios from 'axios';

export type BusRecord = {
  _id?: string;
  busNumber?: string;
  model?: string;
  capacity?: number;
  status?: string;
  crowdLevel?: 'low' | 'medium' | 'high' | 'full';
  currentPassengers?: number;
  assignedDriverId?: {
    _id?: string;
    firstName?: string;
    lastName?: string;
    licenseNo?: string;
  } | string;
  assignedRouteId?: {
    _id?: string;
    routeName?: string;
    routeNumber?: string;
  } | string;
  registrationDate?: string;
};

type CreateBusInput = {
  busNumber: string;
  model: string;
  capacity: number;
  assignedDriverId?: string;
  assignedRouteId?: string;
};

type UpdateBusInput = Partial<CreateBusInput> & {
  status?: string;
  crowdLevel?: 'low' | 'medium' | 'high' | 'full';
  currentPassengers?: number;
};

export type ActionResult = { success: boolean; message: string };

const API_BASE =
  process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com/api';

axios.defaults.withCredentials = true;

export const useAdminBuses = () => {
  const [buses, setBuses] = useState<BusRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAllBuses = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get<{ buses?: BusRecord[] }>(`${API_BASE}/bus/allBuses`);
      setBuses(data?.buses || []);
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Failed to fetch buses';
      setError(message);
      console.error('Fetch buses error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createBus = useCallback(async (input: CreateBusInput): Promise<ActionResult> => {
    try {
      const { data } = await axios.post<{ message?: string; bus?: BusRecord }>(
        `${API_BASE}/bus/createBus`,
        input
      );

      const newBus = data?.bus;
      if (newBus) {
        setBuses((prev) => [...prev, newBus]);
      }

      return { success: true, message: data?.message || 'Bus created successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || 'Unable to create bus';
      console.error('Create bus error:', err);
      setError(message);
      return { success: false, message };
    }
  }, []);

  const updateBus = useCallback(async (busId: string, input: UpdateBusInput): Promise<ActionResult> => {
    try {
      const { data } = await axios.put<{ message?: string; bus?: BusRecord }>(
        `${API_BASE}/bus/updateBus/${busId}`,
        input
      );

      const updated = data?.bus;
      if (updated) {
        setBuses((prev) => {
          const existingIndex = prev.findIndex((bus) => bus._id === busId);
          if (existingIndex !== -1) {
            const next = [...prev];
            next[existingIndex] = {
              ...prev[existingIndex],
              ...updated,
            };
            return next;
          }
          return prev;
        });
      }

      return { success: true, message: data?.message || 'Bus updated successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to update bus';
      setError(message);
      return { success: false, message };
    }
  }, []);

  const deleteBus = useCallback(async (busId: string): Promise<ActionResult> => {
    try {
      const { data } = await axios.delete<{ message?: string }>(`${API_BASE}/bus/deleteBus/${busId}`);
      setBuses((prev) => prev.filter((bus) => bus._id !== busId));
      return { success: true, message: data?.message || 'Bus deleted successfully' };
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Unable to delete bus';
      setError(message);
      return { success: false, message };
    }
  }, []);

  return {
    buses,
    loading,
    error,
    fetchAllBuses,
    createBus,
    updateBus,
    deleteBus,
  };
};

export type UseAdminBusesReturn = ReturnType<typeof useAdminBuses>;
