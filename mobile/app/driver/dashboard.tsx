import { View, StyleSheet } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { useState } from "react";

import Header from "./component/header";
import Footer, { MenuKey } from "./component/footer";

import Home from "./component/dashboard/home";
import Schedules from "./component/dashboard/schedules";
import Map from "./component/dashboard/map";
import History from "./component/dashboard/history";
import Profile from "./component/dashboard/profile";

export const Dashboard = () => {
  const [selected, setSelected] = useState<MenuKey>("home");

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
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView style={styles.page}>

        {/* Header (absolute) — reserve space with wrapper height */}
        <View style={[styles.headerWrapper, { height: HEADER_HEIGHT + insets.top }]}>
          <Header />
        </View>

        {/* Content (fills space, DOES NOT push footer) */}
        <View style={[styles.content, { paddingBottom: 60 + insets.bottom + 10, paddingTop: HEADER_HEIGHT + insets.top }]}>
          {renderContent()}
        </View>

        {/* FOOTER — fixed at bottom so map interactions can't push it */}
        <View style={[styles.footerFixed, { height: 60 + insets.bottom, paddingBottom: insets.bottom }]}>
          <Footer onSelect={setSelected} />
        </View>

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
    height: 60,
    backgroundColor: "transparent",

    // ensures footer is above everything
    zIndex: 999,
    elevation: 10,
  },
  
});
export default Dashboard;