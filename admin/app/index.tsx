import { Text, View } from "react-native";
import "./global.css";
import Login from "./pages/login";
import Dashboard from "./pages/dashboard";
import ResetPassword from "./pages/resetPassword";
import VerifyOTP from "./pages/otp";
import NewPassword from "./pages/newPassword";
export default function Index() {
  return (
    <View>
      <ResetPassword/>
    </View>
  );
}
