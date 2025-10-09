import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Header from '../src/components/Header';
import Sidebar, { MenuKey } from '../src/components/Sidebar';
import { Buses } from '../src/components/pages/Buses';
import Drivers  from '../src/components/pages/Drivers';
import Routes from '../src/components/pages/Routes';
import Schedules from '../src/components/pages/Schedules';
import Settings from '../src/components/pages/Settings';
import { Stack } from 'expo-router';

export default function Dashboard() {
  const [selected, setSelected] = useState<MenuKey>('buses');

  const pageTitleMap: Record<MenuKey, string> = {
    dashboard: 'Dashboard',
    buses: 'Buses',
    drivers: 'Drivers',
    routes: 'Routes',
    schedules: 'Schedules',
    settings: 'Settings'
  };

  const renderContent = () => {
    switch (selected) {
      case 'buses':
        return <Buses />;
      case 'drivers':
        return <Drivers />;
      case 'routes':
        return <Routes />;
      case 'schedules':
        return <Schedules />;
      case 'settings':
        return <Settings />;
      default:
        return <Buses />;
    }
  };

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <View style={styles.page}>
      <View style={styles.body}>
        <Sidebar onSelect={(k) => setSelected(k)} />
        <View style={styles.content}>
          <Header title={pageTitleMap[selected] ?? 'Dashboard'} />
          <View style={styles.innerContent}>{renderContent()}</View>
        </View>
      </View>
    </View>
    </>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
  body: {
    flex: 1,
    flexDirection: 'row'
  },
  content: {
    flex: 1,
    backgroundColor: '#fff'
  }
  ,innerContent: {
    flex: 1,
    padding: 12
  }
});
