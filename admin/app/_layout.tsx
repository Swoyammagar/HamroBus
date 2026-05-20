import React from "react";
import { Stack } from "expo-router";
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import "./global.css";

import { AuthProvider } from "./context/AuthContext";
import { AdminProvider, useAdmin } from "./context/AdminContext";

const GlobalAdminToast = () => {
  const { notification } = useAdmin();
  const toast = notification.currentToast;

  if (!toast) return null;

  const severityConfig = {
    critical: {
      color: "#dc2626",
      bg: "#fef2f2",
      icon: "warning",
    },
    high: {
      color: "#d97706",
      bg: "#fffbeb",
      icon: "alert-circle",
    },
    medium: {
      color: "#2563eb",
      bg: "#eff6ff",
      icon: "information-circle",
    },
    low: {
      color: "#059669",
      bg: "#ecfdf5",
      icon: "checkmark-circle",
    },
  };

  const config =
    severityConfig[
      toast.severity as keyof typeof severityConfig
    ] || severityConfig.low;

  return (
    <View style={styles.toastWrap} pointerEvents="box-none">
      <View
        style={[
          styles.toastCard,
          {
            backgroundColor: config.bg,
            borderLeftColor: config.color,
          },
        ]}
      >
        {/* LOGO */}
        <View style={styles.leftSection}>
          <Image
            source={require("./utils/MainLogo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        {/* CONTENT */}
        <View style={styles.contentSection}>
          <View style={styles.headerRow}>
            <View style={styles.titleWrap}>
              <Ionicons
                name={config.icon as any}
                size={18}
                color={config.color}
              />

              <Text style={styles.toastTitle} numberOfLines={1}>
                {toast.title}
              </Text>
            </View>

            <Pressable
              onPress={notification.dismissToast}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={18}
                color="#6b7280"
              />
            </Pressable>
          </View>

          <Text style={styles.toastMessage} numberOfLines={2}>
            {toast.message}
          </Text>
        </View>
      </View>
    </View>
  );
};

// Root Layout
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <AdminProvider>
        <View style={{ flex: 1 }}>
          <Stack>{children}</Stack>
          <GlobalAdminToast />
        </View>
      </AdminProvider>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  toastWrap: {
    position: "absolute",
    top: 50,
    right: 16,
    left: 16,
    zIndex: 9999,
  },

  toastCard: {
    flexDirection: "row",
    alignItems: "center",

    borderRadius: 18,
    borderLeftWidth: 5,

    paddingVertical: 14,
    paddingHorizontal: 14,

    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: {
      width: 0,
      height: 6,
    },

    elevation: 8,
  },

  leftSection: {
    marginRight: 12,
  },

  logo: {
    width: 50,
    height: 50,
    borderRadius: 14,
  },

  contentSection: {
    flex: 1,
  },

  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  titleWrap: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    paddingRight: 10,
  },

  toastTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827",
    marginLeft: 6,
    flexShrink: 1,
  },

  toastMessage: {
    fontSize: 13,
    lineHeight: 18,
    color: "#4b5563",
    marginTop: 2,
    paddingRight: 8,
  },

  closeButton: {
    padding: 2,
  },
});