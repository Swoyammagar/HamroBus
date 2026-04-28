import apiClient from '../../passenger/services/api';

export interface DriverNotificationApiRecord {
  _id?: string;
  id?: string;
  notificationId?: string;
  title?: string;
  message?: string;
  sentBy?: 'admin' | 'driver' | 'system';
  targetAudience?:
    | 'all'
    | 'drivers'
    | 'passengers'
    | 'admins'
    | 'specific_user'
    | 'specific_route'
    | 'specific_bus';
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
  getDriverNotifications: async (): Promise<DriverNotificationApiRecord[]> => {
    const response = await apiClient.get('/notifications/user/my-notifications', {
      params: {
        userType: 'driver',
      },
    });

    return response.data?.data || [];
  },

  markNotificationRead: async (notificationId: string) => {
    const response = await apiClient.put(`/notifications/${notificationId}/read`, {
      userType: 'Driver',
    });
    return response.data;
  },
};
