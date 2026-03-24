import apiClient from './api';

export interface PassengerNotificationApiRecord {
  _id?: string;
  id?: string;
  notificationId?: string;
  title?: string;
  message?: string;
  sentBy?: 'admin' | 'driver' | 'system';
  targetAudience?: 'all' | 'drivers' | 'passengers';
    type?: 'alert' | 'info' | 'maintenance' | 'announcement' | 'emergency';
    severity?: 'low' | 'medium' | 'high' | 'critical';
  createdAt?: string;
  readBy?: Array<{
    userId?: string;
    readAt?: string;
    userType?: string;
  }>;
}

export const notificationService = {
  getPassengerNotifications: async (): Promise<PassengerNotificationApiRecord[]> => {
    const response = await apiClient.get('/notifications/user/my-notifications', {
      params: {
        userType: 'passenger',
      },
    });

    return response.data?.data || [];
  },

  markNotificationRead: async (notificationId: string) => {
    const response = await apiClient.put(`/notifications/${notificationId}/read`, {
      userType: 'Passenger',
    });
    return response.data;
  },
};
