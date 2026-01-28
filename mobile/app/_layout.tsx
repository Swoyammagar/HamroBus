import { Stack } from "expo-router";
import "./global.css";
import { AuthProvider } from "./context/AuthContext";
import { DriverSignupProvider } from "./context/DriverSignupContext";
import { PassengerSignupProvider } from "./context/PassengerSignupContext";

export default function RootLayout() {
  return (
    <AuthProvider>
      <DriverSignupProvider>
        <PassengerSignupProvider>
          <Stack screenOptions={{ headerShown: false }}>
            {/* Onboarding/Login pages */}
            {/* <Stack.Screen name="pages/mobilelogin" />
            <Stack.Screen name="pages/newPassword" />
            <Stack.Screen name="pages/otpPassword" />
            <Stack.Screen name="pages/preference" />
            <Stack.Screen name="pages/resetPassword" /> */}

            <Stack.Screen name="index" />
            <Stack.Screen name="pages" />
            <Stack.Screen name="driver" />


            {/* Passenger screens */}
            <Stack.Screen name="passenger/password" />
            <Stack.Screen name="passenger/email" />
            <Stack.Screen name="passenger/signup" />
            <Stack.Screen name="passenger/(tabs)" />
            
            {/* Passenger modals and screens */}
            <Stack.Screen 
              name="passenger/screens/route-map"
              options={{ presentation: "card" }}
            />
            <Stack.Screen 
              name="passenger/screens/bus-booking"
              options={{ presentation: "card" }}
            />
            <Stack.Screen 
              name="passenger/screens/review"
              options={{ presentation: "card" }}
            />
          </Stack>
        </PassengerSignupProvider>
      </DriverSignupProvider>
    </AuthProvider>
  );
}
