import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../context/AuthContext';
import { Feather } from '@expo/vector-icons';

export type MenuKey = 'dashboard' | 'buses' | 'drivers' | 'routes' | 'schedules' | 'notifications' | 'settings' | 'analytics';

// Use keyof typeof Feather.glyphMap as the Feather icon name type
type FeatherIconName = keyof typeof Feather.glyphMap;

const ICON_MAP: Record<MenuKey, FeatherIconName> = {
  dashboard: 'home',
  buses: 'truck',
  drivers: 'users',
  routes: 'map',
  schedules: 'calendar',
  settings: 'settings',
  analytics: 'bar-chart-2',
  notifications: 'bell',
};

const Sidebar: React.FC<{ onSelect: (key: MenuKey) => void }> = ({ onSelect }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState<MenuKey>('dashboard');
  const [hoverKey, setHoverKey] = useState<MenuKey | null>(null);
  const router = useRouter();
  const { logout } = useAuth();

  const items: { key: MenuKey; label: string }[] = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'buses', label: 'Buses' },
    { key: 'drivers', label: 'Drivers' },
    { key: 'routes', label: 'Routes' },
    { key: 'schedules', label: 'Schedules' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'notifications', label: 'Notifications' },
    { key: 'settings', label: 'Settings' }
  ];

  const handleSelect = (key: MenuKey) => {
    setSelectedKey(key);
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

      <View style={styles.menu}>
        {items.map((it) => {
          const isSelected = selectedKey === it.key;
          const isHovered = hoverKey === it.key;
          return (
            <Pressable
              key={it.key}
              onPress={() => handleSelect(it.key)}
              onHoverIn={() => setHoverKey(it.key)}
              onHoverOut={() => setHoverKey(null)}
              style={[
                styles.item,
                collapsed && styles.itemCollapsed,
                isHovered && styles.itemHover,
                isSelected && styles.itemSelected,
              ]}
            >
              <View style={styles.itemInner}>
                <Feather
                  name={ICON_MAP[it.key]}
                  size={20}
                  color={isSelected ? '#047857' : '#374151'}
                  style={styles.icon}
                />
                {!collapsed && <Text style={[styles.itemText, isSelected && styles.itemTextActive]}>{it.label}</Text>}
              </View>
            </Pressable>
          );
        })}
      </View>

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

  menu: {
    paddingTop: 6,
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

  // Hover (light grey)
  itemHover: {
    backgroundColor: '#f3f4f6',
    borderRadius: 6,
  },

  // Selected: small left border
  itemSelected: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981', // emerald
    backgroundColor: '#f8fffb',
    borderRadius: 2,
  },

  footer: {
    marginTop: 'auto',
    padding: 8,
  },
  logoutItem: {
    // keep minimal styling here, red color applied to icon/text
  },
});

export default Sidebar;