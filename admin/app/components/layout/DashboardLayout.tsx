import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Sidebar, type MenuKey } from './Sidebar';
import { Header } from './Header';

interface DashboardLayoutProps {
  children: React.ReactNode;
  selectedPage?: MenuKey;
  onPageChange?: (key: MenuKey) => void;
  pageTitle?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  selectedPage,
  onPageChange,
  pageTitle,
}) => {
  const [internalSelected, setInternalSelected] = useState<MenuKey>('dashboard');

  const selected = selectedPage ?? internalSelected;

  const handlePageChange = (key: MenuKey) => {
    setInternalSelected(key);
    onPageChange?.(key);
  };

  const pageTitleMap: Record<MenuKey, string> = {
    dashboard: 'Dashboard',
    buses: 'Buses',
    drivers: 'Drivers',
    routes: 'Routes',
    schedules: 'Schedules',
    trips: 'Trips',
    settings: 'Settings',
    analytics: 'Analytics',
    notifications: 'Notifications'
  };

  return (
    <View style={styles.container}>
      <Sidebar onSelect={handlePageChange} selectedKey={selected} />
      <View style={styles.content}>
        <Header
          title={pageTitle ?? pageTitleMap[selected]}
          onSelect={handlePageChange}
          selectedKey={selected}
        />
        <View style={styles.innerContent}>{children}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    backgroundColor: '#fff',
  },
  innerContent: {
    flex: 1,
    padding: 12,
  },
});
