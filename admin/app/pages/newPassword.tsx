import React, { useState } from "react";
import {
  Text,
  View,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Eye, EyeOff, SearchCheck } from "lucide-react-native";
import { useAuth } from "../src/context/AuthContext";
import mainLogo from "../utils/MainLogo.png";
import NewPassword_icon from "../utils/Newpassword.png";
import { useSearchParams } from "expo-router/build/hooks";

const NewPassword: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || "";

  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = 5;
    const maxLength = 15;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[\W_]/.test(password);

    if (password.length < minLength) return "Password must be at least 5 characters long";
    if (password.length > maxLength) return "Password must be less than 15 characters";
    if (!hasUpperCase) return "Password must contain at least one uppercase letter";
    if (!hasLowerCase) return "Password must contain at least one lowercase letter";
    if (!hasNumber) return "Password must contain at least one number";
    if (!hasSpecialChar) return "Password must contain at least one special character";
    return "";
  };

  const handleResetPassword = async () => {
    setError("");
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email, password);
      if (result.success) {
        router.push("/pages/login");
      } else {
        setError(result.message || "Failed to reset password. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "#f9f9f9" }}>
        <View className="flex-1 min-h-screen bg-[#f9f9f9] items-center px-6 py-10">
          {/* Wrapper */}
          <View className="w-full mt-6 flex-col lg:flex-row items-center justify-between max-w-[1200px]">
            
            {/* Left Side */}
            <View style={{ width: "100%", maxWidth: 510 }}>
              {/* Logo above heading */}
              <View style={{ marginBottom: 40 }}>
                <Image
                  source={mainLogo}
                  style={{ width: 180, height: 80, resizeMode: "contain" }}
                />
              </View>

              {/* Heading */}
              <View className="flex-row mb-4">
                <Text className="text-4xl font-medium text-black">Reset Your</Text>
                <Text className="text-4xl font-medium text-[#27AE60] ml-2">Password</Text>
              </View>

              {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}

              {/* New Password */}
              <Text className="text-lg font-medium text-[#333] mt-3 mb-1">New Password</Text>
              <View className="relative">
                <TextInput
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter new password"
                  editable={!isLoading}
                  className="w-full border border-gray-400 rounded-md p-3 bg-white text-black pr-10"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <EyeOff size={20} color="gray" /> : <Eye size={20} color="gray" />}
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <Text className="text-lg font-medium text-[#333] mt-3 mb-1">Confirm Password</Text>
              <View className="relative">
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  editable={!isLoading}
                  className="w-full border border-gray-400 rounded-md p-3 bg-white text-black pr-10"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color="gray" />
                  ) : (
                    <Eye size={20} color="gray" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Button */}
              <View className="flex-col items-center mt-5 space-y-4">
                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  className="w-full h-[50px] bg-[#27AE60] rounded-lg justify-center items-center"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-medium text-lg">Reset Password</Text>
                  )}
                </TouchableOpacity>

                <Text className="text-sm text-[#333]">
                  Remember your password?{" "}
                  <Text
                    onPress={() => router.push("/pages/login")}
                    className="text-[#27AE60] underline"
                  >
                    Login
                  </Text>
                </Text>
              </View>
            </View>

            {/* Right Side Illustration */}
            <View style={{ marginTop: 10, marginLeft: -40 }}>
              <Image
                source={NewPassword_icon}
                style={{ width: 460, height: 500, resizeMode: "contain" }}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default NewPassword;
