import apiClient from './api';

export interface DeletionStatusResponse {
  success: boolean;
  data: {
    isDeletionPending: boolean;
    remainingDays?: number;
    deletionDate?: string;
    deleted?: boolean;
    message?: string;
    error?: string;
  };
}

export interface DeletionRequestResponse {
  success: boolean;
  message: string;
  deleteScheduledFor?: string;
}

export const accountDeletionService = {
  requestProfileDeletion: async (): Promise<DeletionRequestResponse> => {
    const response = await apiClient.post('/passenger/profile/request-delete');
    return response.data;
  },

  cancelProfileDeletion: async (): Promise<DeletionRequestResponse> => {
    const response = await apiClient.post('/passenger/profile/cancel-delete');
    return response.data;
  },

  checkDeletionStatus: async (): Promise<DeletionStatusResponse> => {
    const response = await apiClient.get('/passenger/profile/deletion-status');
    return response.data;
  }
};
