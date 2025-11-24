import { View, StyleSheet, Text } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useState } from "react";

import Header from "./component/header";
import Footer, { MenuKey } from "./component/footer";

import Home from "./(tabs)/home";
import Schedules from "./(tabs)/schedules";
import Map from "./(tabs)/map";
import History from "./(tabs)/history";
import Profile from "./(tabs)/profile";

export const Dashboard = () => {
  const [selected, setSelected] = useState<MenuKey>("schedules");

  const renderContent = () => {
    switch (selected) {
      case "home": return <Home />;
      case "schedules": return <Schedules />;
      case "map": return <Map />;
      case "history": return <History />;
      case "profile": return <Profile />;
      default: return <Home />;
    }
  };

  const insets = useSafeAreaInsets();

  const HEADER_HEIGHT = 64;

  return (
    <>

      <SafeAreaView >

        {/* Header (absolute) — reserve space with wrapper height */}
        <View style={[styles.headerWrapper, { height: HEADER_HEIGHT + insets.top }]}>
          <Header />
        </View>

        {/* Content (fills space, DOES NOT push footer) */}
        <View >
          <Home/>
        </View>

        {/* FOOTER — fixed at bottom so map interactions can't push it */}
        {/* <View style={[styles.footerFixed]}>
          <Footer onSelect={setSelected} />
        </View> */}

      </SafeAreaView>
    </>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#f8fafc",
    position: 'relative',
  },

  headerWrapper: {
    width: "100%",
    backgroundColor: "#fff",
    zIndex: 999,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },

  content: {
    flex: 1,
    backgroundColor: "#f1f1f1",
    // leave room for footer (footer is positioned absolute)
    paddingBottom: 80,
  },

  footerFixed: {
  position: "absolute",
  bottom: 0,
  left: 0,
  right: 0,
  height: 60,     // fixed height
  backgroundColor: "transparent",
  zIndex: 999,
  elevation: 10,
}
  
});
export default Dashboard;