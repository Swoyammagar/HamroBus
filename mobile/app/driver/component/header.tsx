import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useState } from "react";

const Header = () => {
  const [online, setOnline] = useState(true);

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>

        {/* CENTER: Toggle Switch */}
        <View style={styles.center}>
          <TouchableOpacity 
            style={[
              styles.toggleContainer,
              { backgroundColor: online ? "#27AE60" : "#d1d5db" }
            ]}
            onPress={() => setOnline(!online)}
            activeOpacity={0.8}
          >
            <View 
              style={[
                styles.toggleCircle,
                { transform: [{ translateX: online ? 20 : 0 }] }
              ]}
            />
          </TouchableOpacity>
          <Text style={styles.toggleLabel}>
            {online ? "Online" : "Offline"}
          </Text>
        </View>

        {/* RIGHT: Hamburger Menu */}
        <TouchableOpacity style={styles.menuBtn}>
          <Text style={styles.hamburger}>☰</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
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
    justifyContent: "center",
  },

  /* CENTER TOGGLE */
  center: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
  },
  toggleContainer: {
    width: 45,
    height: 24,
    borderRadius: 20,
    padding: 2,
    flexDirection: "row",
    alignItems: "center",
  },
  toggleCircle: {
    width: 20,
    height: 20,
    borderRadius: 20,
    backgroundColor: "#fff",
  },
  toggleLabel: {
    marginTop: 4,
    fontSize: 12,
    color: "#111827",
    fontWeight: "600",
  },

  /* HAMBURGER MENU */
  menuBtn: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
  },
  hamburger: {
    fontSize: 20,
    color: "#111827",
  },
});

export default Header;
