import { Text, View } from "react-native";
import Login from "./pages/mobilelogin";
import VerifyOTP from "./pages/otpPassword";
import Preference from "./pages/preference";
import PersonalInfo from "./driver/signupInfo";
import License from "./driver/license";
import { Dashboard } from "./driver/dashboard";
import Header from "./driver/component/header";
export default function Index() {
  return (
    <View>
      <Dashboard />
    </View>
  );
}
