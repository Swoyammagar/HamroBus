// AppNavigator.jsx
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native"; // ✅ only here

import Login from "./pages/login";
import Dashboard from "./pages/dashboard";

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer> {/* Only one container */}
      <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={Login} />
        <Stack.Screen name="Dashboard" component={Dashboard} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
