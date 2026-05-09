import { Stack } from "expo-router";

export default function DriverLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      {/* Signup Screens Group */}
      <Stack.Screen name="signupScreens" options={{ headerShown: false }} />
      
      <Stack.Screen name="password" />
      <Stack.Screen name="license" />
      <Stack.Screen name="phonePage" />
      <Stack.Screen name="signupInfo" />

      {/* Custom driver app shell */}
      <Stack.Screen name="app" />

      {/* Expo Router still sees these screens */}
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
      <Stack.Screen name="screens/ChatScreen" />
    </Stack>
  );
}