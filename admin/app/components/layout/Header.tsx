import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import type { MenuKey } from './Sidebar';

interface HeaderProps {
  title?: string;
  onSelect?: (key: MenuKey) => void;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Dashboard', onSelect }) => {
  const { user } = useAuth();

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
  },
  icon: {
    fontSize: 18,
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
