import React from "react";
import { Stack } from "expo-router";
import "./global.css";
import { AuthProvider } from "./context/AuthContext";
import { DriverProvider } from "./context/DriverContext";
import { RouteProvider } from "./context/RouteContext";
import { BusProvider } from "./context/BusContext";


// Wrap the entire app with providers so useAuth, useDriver, useRoute, and useBus can be used in pages
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <DriverProvider>
        <RouteProvider>
          <BusProvider>
            <Stack>{children}</Stack>
          </BusProvider>
        </RouteProvider>
      </DriverProvider>
    </AuthProvider>
  );
}