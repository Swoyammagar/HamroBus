import { useState, useEffect, useCallback, useRef } from 'react';
import { ChatSocketService } from '../services/chatSocket';
import { useAuth } from '../../context/AuthContext';

export function useChatSocket(chatId: string | null) {
  const { user, token } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const messageHandlerRef = useRef<Function | null>(null);
  const connectionHandlerRef = useRef<Function | null>(null);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!user || !token) return;

    const initializeSocket = async () => {
      try {
        await ChatSocketService.initialize(user.id, token);
        
        // Join chat if available
        if (chatId) {
          ChatSocketService.joinChat(user.id, chatId);
          ChatSocketService.markAsRead(chatId);
        }

        setIsConnected(ChatSocketService.isConnected());
      } catch (error) {
        console.error('Error initializing Socket.io:', error);
      }
    };

    initializeSocket();

    return () => {
      // Cleanup on unmount
      if (messageHandlerRef.current && chatId) {
        ChatSocketService.offMessage(chatId, messageHandlerRef.current);
      }
      if (connectionHandlerRef.current) {
        ChatSocketService.offConnectionChange(connectionHandlerRef.current);
      }
    };
  }, [user, token]);

  // Join chat room when chatId changes
  useEffect(() => {
    if (!chatId || !user) return;

    ChatSocketService.joinChat(user.id, chatId);
    ChatSocketService.markAsRead(chatId);
  }, [chatId, user]);

  // Set up message listener
  useEffect(() => {
    if (!chatId) return;

    messageHandlerRef.current = (data: any) => {
      if (data.type === 'chat_assigned') {
        // Update chat status
      } else if (data.type === 'chat_resolved') {
        // Update chat status
      } else if (data.message) {
        // Add message to list
        setMessages(prev => [...prev, data.message]);
        setUnreadCount(prev => prev + 1);
      }
    };

    ChatSocketService.onMessage(chatId, messageHandlerRef.current);

    return () => {
      if (messageHandlerRef.current && chatId) {
        ChatSocketService.offMessage(chatId, messageHandlerRef.current);
      }
    };
  }, [chatId]);

  // Set up connection listener
  useEffect(() => {
    connectionHandlerRef.current = (connected: boolean) => {
      setIsConnected(connected);
    };

    ChatSocketService.onConnectionChange(connectionHandlerRef.current);

    return () => {
      if (connectionHandlerRef.current) {
        ChatSocketService.offConnectionChange(connectionHandlerRef.current);
      }
    };
  }, []);

  // Send message handler
  const sendMessage = useCallback((message: string) => {
    if (!chatId) return;
    ChatSocketService.sendMessage(chatId, message);
  }, [chatId]);

  // Mark as read handler
  const markAsRead = useCallback(() => {
    if (!chatId) return;
    ChatSocketService.markAsRead(chatId);
    setUnreadCount(0);
  }, [chatId]);

  return {
    isConnected,
    messages,
    unreadCount,
    sendMessage,
    markAsRead,
  };
}
