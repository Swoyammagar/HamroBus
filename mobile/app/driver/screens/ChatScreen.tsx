import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { DriverChatService, Chat, ChatMessage } from '../services/driverChatService';
import { ChatSocketService } from '../services/chatSocket';
import { palette, spacing, radius, shadow } from '../theme';

const ChatScreen = () => {
  const router = useRouter();
  const { user } = useAuth();
  
  const [chat, setChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [chatStatus, setChatStatus] = useState<'open' | 'in-progress' | 'resolved'>('open');
  
  const flatListRef = useRef<FlatList>(null);

  // Load chat and messages
  useEffect(() => {
    loadChat();
  }, []);

  const loadChat = async () => {
    try {
      setLoading(true);
      
      // Get or create chat
      const chatResponse = await DriverChatService.getOrCreateChat();
      const chatData = chatResponse.chat;
      setChat(chatData);
      setChatStatus(chatData.status);

      // Load messages
      if (chatData._id) {
        const messagesResponse = await DriverChatService.getChatMessages(chatData._id, 1, 50);
        setMessages(messagesResponse.messages || []);
      }

      // Initialize Socket.io
      if (user?.id) {
        try {
          const token = await require('@react-native-async-storage/async-storage').default.getItem('token');
          await ChatSocketService.initialize(user.id, token);
          setIsConnected(ChatSocketService.isConnected());

          // Join chat room
          if (chatData._id) {
            ChatSocketService.joinChat(user.id, chatData._id);
          }

          // Listen for admin messages
          if (chatData._id) {
            ChatSocketService.onMessage(chatData._id, (data: any) => {
              if (data.message) {
                setMessages(prev => [...prev, data.message]);
              } else if (data.type === 'chat_resolved') {
                setChatStatus('resolved');
                Alert.alert('Chat Resolved', 'This chat has been resolved by admin');
              }
            });
          }

          // Listen for connection changes
          ChatSocketService.onConnectionChange((connected: boolean) => {
            setIsConnected(connected);
          });
        } catch (error) {
          console.error('Error initializing Socket.io:', error);
        }
      }
    } catch (error: any) {
      console.error('Error loading chat:', error);
      Alert.alert('Error', error.message || 'Failed to load chat');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim()) return;
    
    if (!chat) {
      Alert.alert('Error', 'Chat not initialized');
      return;
    }

    try {
      setSending(true);
      const trimmedMessage = messageInput.trim();

      // Send via REST API first (for persistence)
      await DriverChatService.sendMessage(chat._id, trimmedMessage);

      // Send via Socket.io for real-time
      ChatSocketService.sendMessage(chat._id, trimmedMessage);

      // Add message to local state
      const newMessage: ChatMessage = {
        _id: Date.now().toString(),
        chatId: chat._id,
        senderId: user?.id || '',
        senderType: 'driver',
        message: trimmedMessage,
        createdAt: new Date().toISOString(),
        readAt: null,
      };

      setMessages(prev => [...prev, newMessage]);
      setMessageInput('');

      // Scroll to bottom
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error: any) {
      console.error('Error sending message:', error);
      Alert.alert('Error', error.message || 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const renderMessage = ({ item }: { item: ChatMessage }) => {
    const isDriver = item.senderType === 'driver';
    
    return (
      <View style={[styles.messageRow, isDriver && styles.messageRowDriver]}>
        <View style={[styles.messageBubble, isDriver && styles.messageBubbleDriver]}>
          <Text style={[styles.messageText, isDriver && styles.messageTextDriver]}>
            {item.message}
          </Text>
          <Text style={[styles.messageTime, isDriver && styles.messageTimeDriver]}>
            {new Date(item.createdAt).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
        </View>
      </View>
    );
  };

  const getStatusColor = () => {
    switch (chatStatus) {
      case 'open':
        return palette.warning;
      case 'in-progress':
        return palette.info;
      case 'resolved':
        return palette.success;
      default:
        return palette.muted;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={palette.primary} />
          <Text style={styles.loaderText}>Loading chat...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color={palette.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Help Centre</Text>
            <View style={styles.statusBadge}>
              <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
              <Text style={styles.statusText}>{chatStatus}</Text>
            </View>
          </View>
          <View style={styles.connectionIndicator}>
            <View
              style={[
                styles.connectionDot,
                { backgroundColor: isConnected ? palette.success : palette.danger },
              ]}
            />
          </View>
        </View>

        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          scrollEnabled={true}
          nestedScrollEnabled={true}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Feather name="message-square" size={48} color={palette.muted} />
              <Text style={styles.emptyText}>No messages yet</Text>
              <Text style={styles.emptySubText}>
                Send a message to get help from our admin
              </Text>
            </View>
          }
        />

        {/* Input Area */}
        {chatStatus !== 'resolved' ? (
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor={palette.muted}
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              maxLength={1000}
              editable={!sending}
            />
            <TouchableOpacity
              style={[
                styles.sendButton,
                (!messageInput.trim() || sending) && styles.sendButtonDisabled,
              ]}
              onPress={handleSendMessage}
              disabled={!messageInput.trim() || sending}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resolvedContainer}>
            <Feather name="check-circle" size={24} color={palette.success} />
            <Text style={styles.resolvedText}>This chat has been resolved</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: palette.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: palette.text,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: spacing.xs,
  },
  statusText: {
    fontSize: 12,
    color: palette.textSecondary,
    textTransform: 'capitalize',
  },
  connectionIndicator: {
    marginLeft: spacing.md,
  },
  connectionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  messagesList: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexGrow: 1,
    justifyContent: 'flex-end',
  },
  messageRow: {
    marginBottom: spacing.md,
    alignItems: 'flex-start',
  },
  messageRowDriver: {
    alignItems: 'flex-end',
  },
  messageBubble: {
    maxWidth: '85%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  messageBubbleDriver: {
    backgroundColor: palette.primary,
    borderColor: palette.primary,
  },
  messageText: {
    fontSize: 14,
    color: palette.text,
    lineHeight: 20,
  },
  messageTextDriver: {
    color: '#FFFFFF',
  },
  messageTime: {
    fontSize: 11,
    color: palette.textSecondary,
    marginTop: spacing.xs,
  },
  messageTimeDriver: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: palette.text,
    marginTop: spacing.md,
  },
  emptySubText: {
    fontSize: 13,
    color: palette.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
    gap: spacing.md,
  },
  input: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: palette.border,
    fontSize: 14,
    color: palette.text,
    backgroundColor: palette.background,
    maxHeight: 100,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: palette.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: palette.muted,
    opacity: 0.5,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    fontSize: 14,
    color: palette.textSecondary,
    marginTop: spacing.md,
  },
  resolvedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
    backgroundColor: palette.surface,
    gap: spacing.md,
  },
  resolvedText: {
    fontSize: 14,
    color: palette.success,
    fontWeight: '600',
  },
});

export default ChatScreen;
