import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { RequireAuth } from '../components/auth';
import { DashboardLayout, type MenuKey } from '../components/layout';
import { Buses } from '../src/mainPages/Buses';
import  Drivers  from '../src/mainPages/Drivers';
import Routes from '../src/mainPages/Routes';
import Schedules from '../src/mainPages/Schedules';
import Settings from '../src/mainPages/Settings';
import Analytics from '../src/mainPages/Analytics';
import Notifications from '../src/mainPages/Notifications';
import SosList from '../src/mainPages/SosList';
import Dashboard from '../src/mainPages/Dashboard';
import Trips from '../src/mainPages/Trips';
import Payments from '../src/mainPages/Payments';
import FAQsPage from '../src/mainPages/FAQ';
import Passengers from '../src/mainPages/Passengers';
import LegalPages from '../src/mainPages/LegalPages';

export default function DashboardPage() {
  const [selected, setSelected] = useState<MenuKey>('dashboard');

  const renderContent = () => {
    switch (selected) {
      case 'dashboard':
        return <Dashboard />;
      case 'buses':
        return <Buses />;
      case 'drivers':
        return <Drivers />;
      case 'passengers':
        return <Passengers />;
      case 'routes':
        return <Routes />;
      case 'schedules':
        return <Schedules />;
      case 'trips':
        return <Trips />;
      case 'payments':
        return <Payments />;
      case 'analytics':
        return <Analytics />;
      case 'notifications':
        return <Notifications />;
      case 'sos':
        return <SosList />;
      case 'settings':
        return <Settings onOpenLegal={() => setSelected('legal')} />;
      case 'faq':
        return <FAQsPage />;
      case 'legal':
        return <LegalPages />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <RequireAuth>
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.page}>
          <DashboardLayout
            selectedPage={selected}
            onPageChange={setSelected}
          >
            {renderContent()}
          </DashboardLayout>
        </View>
      </>
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#f8fafc'
  },
});
