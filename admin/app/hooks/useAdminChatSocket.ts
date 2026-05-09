import { useEffect, useState, useCallback } from 'react';
import * as SecureStore from 'expo-secure-store';
import AdminChatSocketService, { SocketChatEvent } from '../services/adminChatSocket';

interface UseAdminChatSocketReturn {
  isConnected: boolean;
  messages: SocketChatEvent[];
  sendMessage: (chatId: string, message: string) => Promise<void>;
  markAsRead: (chatId: string) => Promise<void>;
}

/**
 * React hook for Admin Chat Socket.io integration
 */
export function useAdminChatSocket(chatId: string): UseAdminChatSocketReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<SocketChatEvent[]>([]);

  // Initialize Socket.io on mount
  useEffect(() => {
    const initializeSocket = async () => {
      try {
        const adminId = await SecureStore.getItemAsync('adminId');
        const token = await SecureStore.getItemAsync('adminToken');

        if (!adminId || !token) {
          console.log('❌ Admin credentials not found');
          return;
        }

        const socketService = AdminChatSocketService.getInstance();

        // Initialize if not already connected
        if (!socketService.isConnected()) {
          await socketService.initialize(adminId, token);
        }

        setIsConnected(socketService.isConnected());

        // Join admin room for alerts
        socketService.joinAdminRoom();
      } catch (error) {
        console.error('❌ Socket initialization failed:', error);
      }
    };

    initializeSocket();

    // Cleanup: disconnect when hook unmounts
    return () => {
      const socketService = AdminChatSocketService.getInstance();
      socketService.offMessage(chatId, handleMessage);
      socketService.offConnectionChange(handleConnectionChange);
    };
  }, []);

  // Join chat room and set up message listener
  useEffect(() => {
    const socketService = AdminChatSocketService.getInstance();

    // Join specific chat room
    socketService.joinChat(chatId);

    // Mark messages as read
    socketService.markAsRead(chatId);

    // Set up message listener
    socketService.onMessage(chatId, handleMessage);

    // Set up connection listener
    socketService.onConnectionChange(handleConnectionChange);

    return () => {
      socketService.offMessage(chatId, handleMessage);
      socketService.offConnectionChange(handleConnectionChange);
      socketService.leaveChat(chatId);
    };
  }, [chatId]);

  const handleMessage = useCallback((data: SocketChatEvent) => {
    console.log('📨 Message received:', data);
    setMessages((prev) => {
      // Check if message already exists
      const exists = prev.some((msg) => msg._id === data._id);
      if (exists) {
        return prev;
      }
      return [...prev, data];
    });
  }, []);

  const handleConnectionChange = useCallback((connected: boolean) => {
    console.log('🔄 Connection status changed:', connected);
    setIsConnected(connected);
  }, []);

  const sendMessage = useCallback(
    async (chatId: string, message: string) => {
      try {
        const socketService = AdminChatSocketService.getInstance();
        if (!socketService.isConnected()) {
          throw new Error('Socket not connected');
        }

        socketService.sendMessage(chatId, message);
        console.log('✅ Message sent');
      } catch (error) {
        console.error('❌ Error sending message:', error);
        throw error;
      }
    },
    []
  );

  const markAsRead = useCallback(async (chatId: string) => {
    try {
      const socketService = AdminChatSocketService.getInstance();
      if (!socketService.isConnected()) {
        throw new Error('Socket not connected');
      }

      socketService.markAsRead(chatId);
      console.log('✅ Marked as read');
    } catch (error) {
      console.error('❌ Error marking as read:', error);
      throw error;
    }
  }, []);

  return {
    isConnected,
    messages,
    sendMessage,
    markAsRead,
  };
}
