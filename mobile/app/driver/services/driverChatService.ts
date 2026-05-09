import apiClient from './api';

export interface ChatMessage {
  _id: string;
  chatId: string;
  senderId: string;
  senderType: 'driver' | 'admin';
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface Chat {
  _id: string;
  driverId: string;
  adminId: string | null;
  status: 'open' | 'in-progress' | 'resolved';
  subject: string;
  createdAt: string;
  lastMessageAt: string;
  readBy: Array<{
    userId: string;
    userType: 'driver' | 'admin';
    readAt: string;
  }>;
}

export interface ChatHistoryResponse {
  success: boolean;
  chats: Chat[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
}

export class DriverChatService {
  /**
   * Get or create chat for driver
   */
  static async getOrCreateChat() {
    try {
      const response = await apiClient.get('/driver/chat');
      return response.data;
    } catch (error) {
      console.error('Error getting/creating chat:', error);
      throw error;
    }
  }

  /**
   * Get messages for a specific chat
   */
  static async getChatMessages(chatId: string, page = 1, limit = 50) {
    try {
      const response = await apiClient.get(`/driver/chat/${chatId}/messages`, {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chat messages:', error);
      throw error;
    }
  }

  /**
   * Send a message
   */
  static async sendMessage(chatId: string, message: string) {
    try {
      const response = await apiClient.post(`/driver/chat/${chatId}/message`, {
        chatId,
        message,
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get chat history
   */
  static async getChatHistory(page = 1, limit = 10) {
    try {
      const response = await apiClient.get('/driver/chat-history', {
        params: { page, limit },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  }
}
