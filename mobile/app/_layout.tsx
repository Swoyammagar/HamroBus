import { Stack } from "expo-router";
import "./global.css"
import { SafeAreaView} from "react-native-safe-area-context";

export default function RootLayout() {
  return <Stack
      screenOptions={{
        headerShown: false,}}
      >
    <Stack.Screen name="/driver/(tabs)" options={{headerShown: false}}/>
    
  </Stack>
  
}
