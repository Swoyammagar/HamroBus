import { Text, View } from "react-native";
import Login from "./pages/mobilelogin";
import VerifyOTP from "./pages/otpPassword";
import Preference from "./pages/preference";
import PersonalInfo from "./driver/signupInfo";
import License from "./driver/license";
export default function Index() {
  return (
    <View>
      <License />
    </View>
  );
}
