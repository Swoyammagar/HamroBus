import { Text, View } from "react-native";
import Login from "./pages/mobilelogin";
import VerifyOTP from "./pages/otpPassword";
export default function Index() {
  return (
    <View>
      <Login />
      {/* <VerifyOTP /> */}
    </View>
  );
}
