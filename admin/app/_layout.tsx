import React from "react";
import { Stack } from "expo-router";
import "./global.css";
import { AuthProvider } from "./context/AuthContext";
import { AdminProvider } from "./context/AdminContext";


// Wrap the app with auth and shared admin domain provider
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <AdminProvider>
        <Stack>{children}</Stack>
      </AdminProvider>
    </AuthProvider>
  );
}