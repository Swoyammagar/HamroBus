import { Stack } from "expo-router";

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="password" />
      <Stack.Screen name="license" />
      <Stack.Screen name="phonePage" />
      <Stack.Screen name="signupInfo" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
