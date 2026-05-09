import io, { Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_BASE || 'https://hamrobus-auos.onrender.com';

export class ChatSocketService {
  private static instance: Socket | null = null;
  private static messageListeners: Map<string, Function[]> = new Map();
  private static connectionListeners: Function[] = [];

  /**
   * Initialize Socket.io connection
   */
  static async initialize(driverId: string, token: string): Promise<Socket> {
    if (this.instance && this.instance.connected) {
      return this.instance;
    }

    try {
      this.instance = io(SOCKET_URL, {
        auth: {
          token,
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ['websocket'],
      });

      // Handle connection
      this.instance.on('connect', () => {
        console.log('✅ Socket.io connected:', this.instance?.id);
        
        // Join driver chat room
        this.instance?.emit('driver:join-chat', {
          driverId,
          chatId: null, // Will be set when chat is created
        });

        this.notifyConnectionListeners(true);
      });

      // Handle disconnect
      this.instance.on('disconnect', () => {
        console.log('❌ Socket.io disconnected');
        this.notifyConnectionListeners(false);
      });

      // Listen for admin messages
      this.instance.on('admin:new_message', (data) => {
        console.log('📨 Admin message received:', data);
        this.notifyMessageListeners(data.chatId, data);
      });

      // Listen for chat assigned
      this.instance.on('admin:chat_assigned', (data) => {
        console.log('📌 Chat assigned to admin:', data);
        this.notifyMessageListeners(data.chatId, {
          type: 'chat_assigned',
          ...data,
        });
      });

      // Listen for chat resolved
      this.instance.on('admin:chat_resolved', (data) => {
        console.log('✔️ Chat resolved:', data);
        this.notifyMessageListeners(data.chatId, {
          type: 'chat_resolved',
          ...data,
        });
      });

      // Listen for errors
      this.instance.on('error', (error) => {
        console.error('⚠️ Socket.io error:', error);
      });

      return this.instance;
    } catch (error) {
      console.error('Error initializing Socket.io:', error);
      throw error;
    }
  }

  /**
   * Get socket instance
   */
  static getInstance(): Socket | null {
    return this.instance;
  }

  /**
   * Join chat room
   */
  static joinChat(driverId: string, chatId: string) {
    if (!this.instance) {
      console.warn('Socket.io not initialized');
      return;
    }

    this.instance.emit('driver:join-chat', {
      driverId,
      chatId,
    });

    console.log(`📍 Joined chat room: ${chatId}`);
  }

  /**
   * Send message via Socket.io
   */
  static sendMessage(chatId: string, message: string) {
    if (!this.instance) {
      console.warn('Socket.io not initialized');
      return;
    }

    this.instance.emit('driver:send_message', {
      chatId,
      message,
    });

    console.log('💬 Message sent via Socket.io');
  }

  /**
   * Mark messages as read
   */
  static markAsRead(chatId: string) {
    if (!this.instance) {
      console.warn('Socket.io not initialized');
      return;
    }

    this.instance.emit('chat:mark_read', { chatId });
  }

  /**
   * Subscribe to messages for a specific chat
   */
  static onMessage(chatId: string, callback: Function) {
    if (!this.messageListeners.has(chatId)) {
      this.messageListeners.set(chatId, []);
    }
    this.messageListeners.get(chatId)?.push(callback);
  }

  /**
   * Unsubscribe from messages
   */
  static offMessage(chatId: string, callback: Function) {
    const listeners = this.messageListeners.get(chatId);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * Subscribe to connection status changes
   */
  static onConnectionChange(callback: Function) {
    this.connectionListeners.push(callback);
  }

  /**
   * Unsubscribe from connection changes
   */
  static offConnectionChange(callback: Function) {
    const index = this.connectionListeners.indexOf(callback);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  /**
   * Notify all message listeners
   */
  private static notifyMessageListeners(chatId: string, data: any) {
    const listeners = this.messageListeners.get(chatId);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * Notify all connection listeners
   */
  private static notifyConnectionListeners(isConnected: boolean) {
    this.connectionListeners.forEach(callback => callback(isConnected));
  }

  /**
   * Disconnect socket
   */
  static disconnect() {
    if (this.instance) {
      this.instance.disconnect();
      this.instance = null;
      console.log('Socket.io disconnected');
    }
  }

  /**
   * Check if connected
   */
  static isConnected(): boolean {
    return this.instance?.connected ?? false;
  }
}
