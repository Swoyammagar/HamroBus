import React from "react";
import { Stack } from "expo-router";
import "./global.css";
import { AuthProvider } from "./src/context/AuthContext";

// Wrap the entire app with AuthProvider so useAuth can be used in pages
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Stack>{children}</Stack>
    </AuthProvider>
  );
}