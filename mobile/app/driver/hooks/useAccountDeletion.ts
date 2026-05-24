import { useState, useCallback, useEffect } from 'react';
import { accountDeletionService } from '../services/accountDeletionService';

export interface DeletionState {
  isDeletionPending: boolean;
  remainingDays: number | null;
  deletionDate: string | null;
  message: string | null;
  loading: boolean;
  error: string | null;
}

const calculateRemainingDays = (deletionDate?: string | null) => {
  if (!deletionDate) return null;

  const targetTime = new Date(deletionDate).getTime();
  if (Number.isNaN(targetTime)) return null;

  const millisecondsPerDay = 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((targetTime - Date.now()) / millisecondsPerDay));
};

export const useAccountDeletion = () => {
  const [state, setState] = useState<DeletionState>({
    isDeletionPending: false,
    remainingDays: null,
    deletionDate: null,
    message: null,
    loading: false,
    error: null,
  });

  const checkDeletionStatus = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await accountDeletionService.checkDeletionStatus();
      
      if (response.success) {
        const deletionDate = response.data.deletionDate || null;
        setState(prev => ({
          ...prev,
          isDeletionPending: response.data.isDeletionPending,
          remainingDays: response.data.remainingDays ?? calculateRemainingDays(deletionDate),
          deletionDate,
          message: response.data.message || null,
          loading: false,
        }));
        return response.data;
      } else {
        setState(prev => ({
          ...prev,
          error: 'Failed to check deletion status',
          loading: false,
        }));
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error checking deletion status';
      setState(prev => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
    }
  }, []);

  const requestDeletion = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await accountDeletionService.requestProfileDeletion();
      
      if (response.success) {
        const deletionDate = response.deleteScheduledFor || null;
        setState(prev => ({
          ...prev,
          isDeletionPending: true,
          remainingDays: calculateRemainingDays(deletionDate),
          deletionDate,
          message: response.message,
          loading: false,
        }));
        return { success: true, message: response.message, deleteScheduledFor: response.deleteScheduledFor };
      } else {
        setState(prev => ({
          ...prev,
          error: response.message || 'Failed to request deletion',
          loading: false,
        }));
        return { success: false, error: response.message };
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error requesting deletion';
      setState(prev => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      return { success: false, error: errorMsg };
    }
  }, []);

  const cancelDeletion = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const response = await accountDeletionService.cancelProfileDeletion();
      
      if (response.success) {
        setState(prev => ({
          ...prev,
          isDeletionPending: false,
          remainingDays: null,
          deletionDate: null,
          message: response.message,
          loading: false,
        }));
        return { success: true, message: response.message };
      } else {
        setState(prev => ({
          ...prev,
          error: response.message || 'Failed to cancel deletion',
          loading: false,
        }));
        return { success: false, error: response.message };
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Error cancelling deletion';
      setState(prev => ({
        ...prev,
        error: errorMsg,
        loading: false,
      }));
      return { success: false, error: errorMsg };
    }
  }, []);

  useEffect(() => {
    checkDeletionStatus();
  }, [checkDeletionStatus]);

  return {
    ...state,
    checkDeletionStatus,
    requestDeletion,
    cancelDeletion,
  };
};
