import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Dimensions, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { palette, spacing, radius, shadow } from '../theme';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { DriverChatService } from '../services/driverChatService';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
}

type MenuItem = {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  route?: string;
};

const menuItems: MenuItem[] = [
  { icon: 'user', label: 'My Profile', route: '/driver/screens/ProfileScreen' },
  { icon: 'file-text', label: 'Documents', route: '/driver/screens/documents' },
  { icon: 'star', label: 'All Reviews', route: '/driver/screens/AllReviewsScreen' },
  { icon: 'message-circle', label: 'Help Centre', route: '/driver/screens/ChatScreen' },
  { icon: 'settings', label: 'Settings' },
  { icon: 'shield', label: 'Safety & Support' },
  { icon: 'moon', label: 'Dark Mode' },
];

export default function SideMenu({ isOpen, onClose, isOnline }: Props) {
  const slide = useRef(new Animated.Value(-Dimensions.get('window').width)).current;
  const router = useRouter();
  const { logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  // Load unread message count
  useEffect(() => {
    if (isOpen) {
      loadUnreadCount();
    }
  }, [isOpen]);

  const loadUnreadCount = async () => {
    try {
      const response = await DriverChatService.getChatHistory(1, 1);
      if (response.unreadCount) {
        setUnreadCount(response.unreadCount);
      }
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  const handleMenuItemPress = (item: MenuItem) => {
    onClose();
    if (item.route) {
      router.push(item.route as any);
    }
  };
  
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      {
        text: 'Logout',
        onPress: () => {
          logout();
          Alert.alert('Success', 'You have been logged out');
          router.push('/pages/mobilelogin');
        },
        style: 'destructive',
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  useEffect(() => {
    Animated.timing(slide, {
      toValue: isOpen ? 0 : -Dimensions.get('window').width,
      duration: 240,
      useNativeDriver: true,
    }).start();
  }, [isOpen, slide]);

  if (!isOpen) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Pressable style={styles.backdrop} onPress={onClose} />
      <Animated.View style={[styles.panel, { transform: [{ translateX: slide }] }]}> 
        <View style={styles.header}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Feather name="x" size={20} color="#FFFFFF" />
          </Pressable>
          <View style={styles.avatar}>
            <Text style={styles.avatarEmoji}>👨‍✈️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>James Rodriguez</Text>
            <Text style={styles.sub}>Driver ID: DR-2847</Text>
            <View style={styles.statusRow}>
              <View
                style={[styles.statusDot, { backgroundColor: isOnline ? palette.success : palette.muted }]} 
              />
              <Text style={styles.sub}>{isOnline ? 'Online' : 'Offline'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.menuList}>
          {menuItems.map((item) => (
            <Pressable
              key={item.label}
              style={styles.menuItem}
              onPress={() => handleMenuItemPress(item)}
            >
              <View style={styles.menuItemContent}>
                <Feather name={item.icon as any} size={18} color={palette.text} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </View>
              {item.label === 'Help Centre' && unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.logout} onPress={handleLogout}>
          <Feather name="log-out" size={18} color={palette.danger} />
          <Text style={styles.logoutText} >Logout</Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  panel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: Dimensions.get('window').width * 0.78,
    backgroundColor: palette.surface,
    ...shadow.card,
    paddingTop: spacing.xl,
  },
  header: {
    backgroundColor: palette.primary,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    paddingTop: spacing.xl,
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: spacing.sm,
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarEmoji: {
    fontSize: 28,
  },
  name: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sub: {
    color: '#E0ECFF',
    marginTop: 2,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  menuList: {
    paddingVertical: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  menuLabel: {
    fontSize: 16,
    color: palette.text,
  },
  badge: {
    backgroundColor: palette.danger,
    borderRadius: radius.md,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  logout: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: palette.border,
  },
  logoutText: {
    color: palette.danger,
    fontWeight: '600',
  },
});
