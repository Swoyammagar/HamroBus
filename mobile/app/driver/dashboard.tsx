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

  
});
export default Dashboard;