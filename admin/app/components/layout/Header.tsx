import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/domains';
import type { MenuKey } from './Sidebar';

interface HeaderProps {
  title?: string;
  onSelect?: (key: MenuKey) => void;
  selectedKey?: MenuKey;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Dashboard', onSelect, selectedKey }) => {
  const { user } = useAuth();
  const { unreadIncomingCount, markAllAsRead } = useNotification();

  useEffect(() => {
    if (selectedKey !== 'notifications') {
      return;
    }

    markAllAsRead();
  }, [markAllAsRead, selectedKey]);

  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={styles.title}>{title}</Text>
      </View>

      <View style={styles.right}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => {
            if (onSelect) {
              onSelect('notifications');
            }
          }}
        >
          <Text style={styles.icon}>🔔</Text>
          {unreadIncomingCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadIncomingCount > 99 ? '99+' : String(unreadIncomingCount)}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
        <TouchableOpacity style={styles.profileBtn} onPress={() => { /* open profile menu */ }}>
          <Text style={styles.profileEmail}>{user?.email ?? ''}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    flexDirection: 'row'
  },
  left: {
    flex: 1,
    justifyContent: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: '600'
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBtn: {
    marginRight: 12,
    position: 'relative',
  },
  icon: {
    fontSize: 18,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#dc2626',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  profileBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f3f4f6'
  },
  profileEmail: {
    color: '#111827',
    fontSize: 13
  }
});
