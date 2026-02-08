import React, { useEffect, useState } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { useAuth } from "./context/AuthContext";

export default function Index() {
  const { validateToken } = useAuth();
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const valid = await validateToken();
        if (valid) {
          router.replace("/pages/dashboard");
        } else {
          router.replace("/pages/login");
        }
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // simple loading UI while decision is made
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" />
    </View>
  );
}