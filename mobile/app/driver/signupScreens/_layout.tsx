import { Stack } from "expo-router";

export default function SignupScreensLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="emailPage" />
      <Stack.Screen name="otp" />
      <Stack.Screen name="password" />
      <Stack.Screen name="license" />
      <Stack.Screen name="signupInfo" />
    </Stack>
  );
}