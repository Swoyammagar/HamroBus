import { Stack } from "expo-router";
import { useEffect } from "react";
import "./global.css";
import { AuthProvider } from "./context/AuthContext";
import { DriverSignupProvider } from "./context/DriverSignupContext";
import { PassengerSignupProvider } from "./context/PassengerSignupContext";
import { observePushNotificationTaps } from "./services/pushNotificationService";

export default function RootLayout() {
  useEffect(() => {
    const subscription = observePushNotificationTaps();
    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <AuthProvider>
      <DriverSignupProvider>
        <PassengerSignupProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="pages/splash" options={{ headerShown: false }} />

            <Stack.Screen name="pages/mobilelogin" />
            <Stack.Screen name="pages/newPassword" />
            <Stack.Screen name="pages/otpPassword" />
            <Stack.Screen name="pages/preference" />
            <Stack.Screen name="pages/resetPassword" />

            <Stack.Screen name="khalti-return" />

            <Stack.Screen name="legal/terms" />
            <Stack.Screen name="legal/privacy" />
            <Stack.Screen name="legal/about" />

            <Stack.Screen name="driver" />

            <Stack.Screen name="passenger/password" />
            <Stack.Screen name="passenger/email" />
            <Stack.Screen name="passenger/signup" />
            <Stack.Screen name="passenger/(tabs)" />

            <Stack.Screen
              name="passenger/screens/bus-booking"
              options={{ presentation: "card" }}
            />
            <Stack.Screen
              name="passenger/screens/review"
              options={{ presentation: "card" }}
            />
            <Stack.Screen
              name="passenger/screens/profile-edit"
              options={{ presentation: "card" }}
            />
          </Stack>
        </PassengerSignupProvider>
      </DriverSignupProvider>
    </AuthProvider>
  );
}
