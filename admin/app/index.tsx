import React, { useEffect } from "react";
import { View, ActivityIndicator, Image, StyleSheet, Text } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "./context/AuthContext";
import MainLogo from "./utils/MainLogo.png";

export default function Index() {
  const { validateToken } = useAuth();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const valid = await validateToken();
        if (valid) {
          router.replace("/pages/dashboard");
        } else {
          router.replace("/pages/login");
        }
      } catch {
        router.replace("/pages/login");
      }
    })();
  }, []);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.brandMark}>
        <Image source={MainLogo} style={styles.logo} resizeMode="contain" />
      </View>
      <Text style={styles.title}>Hamro Bus Admin</Text>
      <Text style={styles.subtitle}>Preparing your dashboard</Text>
      <ActivityIndicator size="large" color="#0f766e" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 24,
  },
  brandMark: {
    width: 96,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 24,
    backgroundColor: "#ffffff",
    shadowColor: "#0f172a",
    shadowOpacity: 0.08,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
  logo: {
    width: 74,
    height: 74,
  },
  title: {
    marginTop: 22,
    color: "#111827",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    color: "#64748b",
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  spinner: {
    marginTop: 24,
  },
});
