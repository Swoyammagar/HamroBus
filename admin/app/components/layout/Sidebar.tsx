import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Image, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { Feather } from '@expo/vector-icons';

export type MenuKey = 'dashboard' | 'buses' | 'drivers' | 'routes' | 'schedules' | 'trips' | 'payments' | 'notifications' | 'sos' | 'settings' | 'analytics' | 'faq' | 'passengers' | 'legal';

type FeatherIconName = keyof typeof Feather.glyphMap;

const ICON_MAP: Record<MenuKey, FeatherIconName> = {
  dashboard: 'home',
  buses: 'truck',
  drivers: 'users',
  passengers: 'user',
  routes: 'map',
  schedules: 'calendar',
  trips: 'navigation',
  payments: 'credit-card',
  settings: 'settings',
  analytics: 'bar-chart-2',
  notifications: 'bell',
  sos: 'alert-triangle',
  faq: 'help-circle',
  legal: 'file-text'
};

interface SidebarProps {
  onSelect: (key: MenuKey) => void;
  selectedKey?: MenuKey;
}

export const Sidebar: React.FC<SidebarProps> = ({ onSelect, selectedKey: externalSelectedKey }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [internalSelectedKey, setInternalSelectedKey] = useState<MenuKey>('dashboard');
  const [hoverKey, setHoverKey] = useState<MenuKey | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const router = useRouter();
  const { logout } = useAuth();

  const selectedKey = externalSelectedKey ?? internalSelectedKey;

  const items: { key: MenuKey; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'buses', label: 'Buses' },
    { key: 'drivers', label: 'Drivers' },
    { key: 'routes', label: 'Routes' },
    { key: 'trips', label: 'Trips' },
    { key: 'payments', label: 'Payments' },
    { key: 'schedules', label: 'Schedules' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'sos', label: 'SOS' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'faq', label: 'FAQ' },
    { key: 'passengers', label: 'Passengers' },
    { key: 'legal', label: 'Legal' },
    { key: 'settings', label: 'Settings' }
  ];

  const handleSelect = (key: MenuKey) => {
    setInternalSelectedKey(key);
    onSelect(key);
  };

  const handleLogout = async () => {
    await logout();
    router.replace({ pathname: '/pages/login' });
  };

  return (
    <View style={[styles.container, collapsed && styles.collapsed]}>
      <View style={styles.topRow}>
        <Image
          source={require('../../utils/MainLogo.png')}
          style={[styles.logo, collapsed && styles.logoCollapsed]}
          resizeMode="contain"
        />
        <Pressable onPress={() => setCollapsed(!collapsed)} style={styles.collapseBtn}>
          <Text style={styles.collapseText}>{collapsed ? '→' : '←'}</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.menuScroll}
        contentContainerStyle={styles.menu}
        showsVerticalScrollIndicator={false}
      >
        {items.map((it) => {
          const isSelected = selectedKey === it.key;
          const isHovered = hoverKey === it.key;

          return (
            <Pressable
              key={it.key}
              onPress={() => {
                handleSelect(it.key);
              }}
              onHoverIn={() => setHoverKey(it.key)}
              onHoverOut={() => setHoverKey(null)}
              style={[
                styles.item,
                collapsed && styles.itemCollapsed,
                isHovered && styles.itemHover,
                isSelected && styles.itemSelected,
              ]}
            >
              <View style={[styles.itemInner, { justifyContent: 'space-between' }]}>
                <View style={styles.itemInner}>
                  <Feather
                    name={ICON_MAP[it.key]}
                    size={20}
                    color={isSelected ? '#047857' : '#374151'}
                    style={styles.icon}
                  />
                  {!collapsed && <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>{it.label}</Text>}
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          onPress={handleLogout}
          onHoverIn={() => setHoverKey('settings')}
          onHoverOut={() => setHoverKey(null)}
          style={({ pressed }) => [
            styles.item,
            styles.logoutItem,
            collapsed && styles.itemCollapsed,
            pressed && styles.itemHover,
          ]}
        >
          <View style={styles.itemInner}>
            <Feather name="log-out" size={20} color="#ef4444" />
            {!collapsed && <Text style={[styles.itemText, { color: '#ef4444' }]}>Logout</Text>}
          </View>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 220,
    backgroundColor: '#ffffff',
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    paddingVertical: 8,
  },
  collapsed: {
    width: 56,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  logo: {
    width: 120,
    height: 70,
    alignSelf: 'center',
    marginHorizontal: 18,
  },
  logoCollapsed: {
    width: 0,
    height: 0,
    marginHorizontal: -18,
  },
  collapseBtn: {
    padding: 8,
    alignItems: 'center',
  },
  collapseText: {
    fontSize: 18,
    color: '#333',
  },

  menuScroll: {
    flex: 1,
    marginTop: 6,
  },
  menu: {
    paddingTop: 6,
    paddingBottom: 12,
  },
  item: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginVertical: 4,
  },
  itemCollapsed: {
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  itemInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    marginRight: 4,
  },
  itemText: {
    fontSize: 16,
    color: '#111827',
  },
  itemTextActive: {
    color: '#047857',
    fontWeight: '600',
  },

  itemHover: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },

  itemSelected: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
    backgroundColor: '#f8fffb',
    borderRadius: 2,
  },

  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },

  footer: {
    marginTop: 'auto',
    padding: 8,
  },
  logoutItem: {},
});
