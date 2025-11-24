import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react"; 

const Header = () => {
  const [online, setOnline] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const screenWidth = Dimensions.get("window").width;
  const [sidebarX] = useState(new Animated.Value(-screenWidth));

  const openSidebar = () => {
    setSidebarOpen(true);
    Animated.timing(sidebarX, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const closeSidebar = () => {
    Animated.timing(sidebarX, {
      toValue: -screenWidth,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setSidebarOpen(false));
  };

  return (
    <>
      <SafeAreaView style={styles.safe}>
        <View style={styles.container}>

        {/* LEFT: HAMBURGER */}
        <TouchableOpacity style={styles.leftBtn}>
          <Text style={styles.icon} onPress={openSidebar}>☰</Text>
        </TouchableOpacity>

        {/* CENTER SWITCH */}
        <View style={styles.switchWrapper}>
          <View style={styles.switchBackground}>
            <TouchableOpacity
              style={[
                styles.activeTab,
                { backgroundColor: online ? "#8fd628" : "#cccccc",
                  transform: [{ translateX: online ? 90 : 0 }] }
              ]}
              onPress={() => setOnline(!online)}
            >
              <Text style={styles.activeText}>
                {online ? "Online" : "Offline"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RIGHT: SETTINGS */}
        <TouchableOpacity style={styles.rightBtn}>
          <Text style={styles.icon}>⚙️</Text>
        </TouchableOpacity>

        </View>
      </SafeAreaView>

      {/* Overlay (click to close) */}
      {/* {sidebarOpen && (
        <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={closeSidebar} />
      )} */}

      {/* SLIDING SIDEBAR (full-height) */}
      {/* <Animated.View style={[styles.sidebarPanel, { transform: [{ translateX: sidebarX }] }]}> */}

        {/* <TouchableOpacity onPress={closeSidebar} style={styles.closeBtn}>
          <Text style={styles.sidebarTitle}>Menu</Text>
          <Text style={{ fontSize: 20 }}>✕</Text>
        </TouchableOpacity> */}

        {/* Add menu items here */}
        {/* <Text style={styles.menuItem}>Profile</Text>
        <Text style={styles.menuItem}>Settings</Text>
        <Text style={styles.menuItem}>Logout</Text>
      </Animated.View> */}
    </>
  );
};

const styles = StyleSheet.create({
  safe: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    backgroundColor: "#fff",
  },
  container: {
    height: 64,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#fff",
    flexDirection: "row",
    alignItems: "center",
  },

  /* LEFT */
  leftBtn: {
    padding: 6,
  },

  icon: {
    fontSize: 20,
  },

  /* CENTER SWITCH */
  switchWrapper: {
    flex: 1,
    alignItems: "center",
  },

  switchBackground: {
    width: 150,
    height: 36,
    backgroundColor: "#f0f0f0",
    borderRadius: 30,
    justifyContent: "center",
    padding: 3,
    position: "relative",
  },

  activeTab: {
    position: "absolute",
    width: 75,
    height: 30,
    backgroundColor: "#8fd628",
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
  },

  activeText: {
    color: "#111",
    fontWeight: "600",
    fontSize: 13,
  },

  /* RIGHT */
  rightBtn: {
    padding: 6,
  },
overlay: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.4)",
},

sidebarPanel: {
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  width: "70%",
  backgroundColor: "#fff",
  paddingTop: 80,
  paddingHorizontal: 20,
  elevation: 10,
  shadowColor: "#000",
  shadowOpacity: 0.3,
  shadowOffset: { width: 0, height: 2 },
  zIndex: 1000,
},

sidebarTitle: {
  fontSize: 22,
  fontWeight: "700",
  marginBottom: 20,
  paddingRight: 170,
},

menuItem: {
  fontSize: 18,
  paddingVertical: 12,
},

closeBtn: {
  position: "absolute",
  flexDirection: "row",
  justifyContent: "space-between",
  top: 40,
  right: 20,
},

});

export default Header;
