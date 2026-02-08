import React from "react";
import { Stack } from "expo-router";
import "./global.css";
import { AuthProvider } from "./context/AuthContext";
import { DriverProvider } from "./context/DriverContext";

// Wrap the entire app with providers so useAuth and useDriver can be used in pages
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DriverProvider>
        <Stack>{children}</Stack>
      </DriverProvider>
    </AuthProvider>
  );
}