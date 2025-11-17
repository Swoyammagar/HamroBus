import { View, Text } from "react-native";
import Header from "./component/header";
import { Stack } from "expo-router";
import { StyleSheet } from "react-native";
import Footer, { MenuKey } from "./component/footer";
import { useState } from "react";
import  Schedules  from "./component/dashboard/schedules";
import  Map  from "./component/dashboard/map";
import History  from "./component/dashboard/history";
import  Profile  from "./component/dashboard/profile";
import Home from "./component/dashboard/home";

export const Dashboard = () => {
  const [selected, setSelected] = useState<MenuKey>('home');
  const pageTitleMap: Record<MenuKey, string> = {
    home: 'Home',
    schedules: 'Schedules',
    map: 'Map',
    history: 'History',
    profile: 'Profile'
  };
  const renderContent = () => {
    switch (selected) {
      case 'home':
        return<Home/>;
      case 'schedules':
        return <Schedules/>;
      case 'map':
        return <Map/>;
      case 'history':
        return <History/>;
      case 'profile':
        return <Profile/>;
      default:
        return <Home/>;
    }
  };

  return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.page}>
          <View style={styles.body}>
            <View style={styles.content}>
              <Header />
              {renderContent()}
              <Footer onSelect={(k) => setSelected(k)} />
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