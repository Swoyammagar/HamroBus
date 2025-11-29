import { Stack } from "expo-router";
import "./global.css";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* onboarding pages */}
      <Stack.Screen name="pages/mobilelogin" />
      <Stack.Screen name="pages/newPassword" />
      <Stack.Screen name="pages/otpPassword" />
      <Stack.Screen name="pages/preference" />
      <Stack.Screen name="pages/resetPassword" />

      {/* driver screens */}
      <Stack.Screen name="driver/password" />
      <Stack.Screen name="driver/license" />
      <Stack.Screen name="driver/phonePage" />
      <Stack.Screen name="driver/signupInfo" />
      <Stack.Screen name="driver/(tabs)" />
    </Stack>
  );
}
