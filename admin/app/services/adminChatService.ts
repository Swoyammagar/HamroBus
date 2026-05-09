import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE || 'http://localhost:5000';
const apiClient = axios.create({ baseURL: API_BASE_URL });

// Add JWT to requests
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('adminToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear it
      await SecureStore.deleteItemAsync('adminToken');
    }
    return Promise.reject(error);
  }
);

export interface ChatMessage {
  _id: string;
  chatId: string;
  senderId: string;
  senderType: 'driver' | 'admin';
  message: string;
  createdAt: string;
  readAt?: string | null;
  attachments?: any[];
  isDeleted?: boolean;
}

export interface Chat {
  _id: string;
  driverId: string;
  driver?: {
    _id: string;
    name: string;
    email: string;
    phone: string;
    profileImage?: string;
  };
  adminId?: string;
  admin?: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'open' | 'in-progress' | 'resolved';
  subject: string;
  createdAt: string;
  lastMessageAt: string;
  readBy: Array<{
    userId: string;
    userType: 'driver' | 'admin';
    readAt: string;
  }>;
  unreadCount?: number;
}

export interface ChatStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  totalMessages: number;
  averageResponseTime?: number;
}

export interface GetChatsResponse {
  chats: Chat[];
  total: number;
  page: number;
  limit: number;
  stats: {
    open: number;
    inProgress: number;
    resolved: number;
  };
}

class AdminChatService {
  /**
   * Get all chats for admin with optional status filter
   */
  static async getAllChats(
    status?: 'open' | 'in-progress' | 'resolved',
    page: number = 1,
    limit: number = 20
  ): Promise<GetChatsResponse> {
    try {
      const params: any = { page, limit };
      if (status) params.status = status;

      const response = await apiClient.get<GetChatsResponse>('/api/admin/chats', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching chats:', error);
      throw error;
    }
  }

  /**
   * Get specific chat with all messages
   */
  static async getChat(chatId: string): Promise<Chat & { messages: ChatMessage[] }> {
    try {
      const response = await apiClient.get<Chat & { messages: ChatMessage[] }>(
        `/api/admin/chat/${chatId}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching chat:', error);
      throw error;
    }
  }

  /**
   * Assign chat to current admin
   */
  static async assignChat(chatId: string): Promise<Chat> {
    try {
      const response = await apiClient.patch<Chat>(`/api/admin/chat/${chatId}/assign`);
      return response.data;
    } catch (error) {
      console.error('Error assigning chat:', error);
      throw error;
    }
  }

  /**
   * Send reply message to driver
   */
  static async sendReply(chatId: string, message: string): Promise<ChatMessage> {
    try {
      const trimmedMessage = message.trim();
      if (!trimmedMessage) {
        throw new Error('Message cannot be empty');
      }

      const response = await apiClient.post<ChatMessage>(
        `/api/admin/chat/${chatId}/message`,
        { message: trimmedMessage }
      );
      return response.data;
    } catch (error) {
      console.error('Error sending reply:', error);
      throw error;
    }
  }

  /**
   * Update chat status
   */
  static async updateChatStatus(
    chatId: string,
    status: 'open' | 'in-progress' | 'resolved'
  ): Promise<Chat> {
    try {
      const response = await apiClient.patch<Chat>(`/api/admin/chat/${chatId}/status`, {
        status,
      });
      return response.data;
    } catch (error) {
      console.error('Error updating chat status:', error);
      throw error;
    }
  }

  /**
   * Get chat statistics
   */
  static async getChatStats(): Promise<ChatStats> {
    try {
      const response = await apiClient.get<ChatStats>('/api/admin/stats/overview');
      return response.data;
    } catch (error) {
      console.error('Error fetching chat stats:', error);
      throw error;
    }
  }

  /**
   * Get unread chat count for admin
   */
  static async getUnreadCount(): Promise<number> {
    try {
      const response = await apiClient.get<GetChatsResponse>('/api/admin/chats?status=open');
      const unreadChats = response.data.chats.filter((chat) => !chat.adminId || chat.unreadCount > 0);
      return unreadChats.length;
    } catch (error) {
      console.error('Error fetching unread count:', error);
      return 0;
    }
  }
}

export default AdminChatService;
