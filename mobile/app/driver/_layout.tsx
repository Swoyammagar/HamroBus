import { Stack } from "expo-router";

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="signupScreens" options={{ headerShown: false }} />

      <Stack.Screen name="password" />
      <Stack.Screen name="license" />
      <Stack.Screen name="phonePage" />
      <Stack.Screen name="signupInfo" />

      <Stack.Screen name="app" />

      <Stack.Screen name="screens/HomeScreen" />
      <Stack.Screen name="screens/ProfileScreen" />
      <Stack.Screen name="screens/profile-edit" />
      <Stack.Screen name="screens/password-reset" />
      <Stack.Screen name="screens/documents" />
      <Stack.Screen name="screens/HistoryScreen" />
      <Stack.Screen name="screens/MapScreen" />
      <Stack.Screen name="screens/SchedulesScreen" />
      <Stack.Screen name="screens/NotificationsScreen" />
      <Stack.Screen name="screens/AllReviewsScreen" />
      <Stack.Screen name="screens/HelpCentreScreen" />
    </Stack>
  );
}
