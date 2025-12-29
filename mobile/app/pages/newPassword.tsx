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
import { Feather } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import mainLogo from "../utils/MainLogo.png";
import { useSearchParams } from "expo-router/build/hooks";

const NewPassword: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);

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
        router.push("/pages/mobilelogin");
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
          <View className="w-full mt-6 flex-col lg:flex-row items-center justify-between max-w-[1200px]">

            {/* Left Side */}
            <View style={{ width: "100%", maxWidth: 510 }}>
              <View style={{ marginBottom: 40, justifyContent: "center", alignItems: "center" }}>
                <Image
                  source={mainLogo}
                  style={{ width: 150, height: 70, resizeMode: "contain" }}
                />
              </View>

              {/* Heading */}
              <View className="flex-row mb-4 justify-center">
                <Text className="text-3xl font-medium text-black">Reset Your</Text>
                <Text className="text-3xl font-medium text-[#27AE60] ml-2">Password</Text>
              </View>

              {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}

              {/* New Password */}
              <Text className="font-medium text-[#333] mt-3 mb-1">New Password</Text>
              <View className="relative">
                <TextInput
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter new password"
                  editable={!isLoading}
                  onFocus={() => setIsPasswordFocused(true)}
                  onBlur={() => setIsPasswordFocused(false)}
                  className="w-full rounded-md p-3 bg-white text-black pr-10"
                  style={{
                    borderWidth: 1,
                    borderColor: isPasswordFocused ? "#3b82f6" : "#9ca3af", // active blue, inactive gray
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? <Feather name="eye-off" size={20} color="gray" /> : <Feather name="eye" size={20} color="gray" />}
                </TouchableOpacity>
              </View>

              {/* Confirm Password */}
              <Text className="font-medium text-[#333] mt-3 mb-1">Confirm Password</Text>
              <View className="relative">
                <TextInput
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm new password"
                  editable={!isLoading}
                  onFocus={() => setIsConfirmPasswordFocused(true)}
                  onBlur={() => setIsConfirmPasswordFocused(false)}
                  className="w-full rounded-md p-3 bg-white text-black pr-10"
                  style={{
                    borderWidth: 1,
                    borderColor: isConfirmPasswordFocused ? "#3b82f6" : "#9ca3af",
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showConfirmPassword ? (
                    <Feather name="eye-off" size={20} color="gray" />
                  ) : (
                    <Feather name="eye" size={20} color="gray" />
                  )}
                </TouchableOpacity>
              </View>

              {/* Button */}
                <View className="flex-col items-center mt-5 space-y-4">
                    <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    className="w-full h-[50px] bg-[#27AE60] rounded-lg justify-center items-center mb-4"
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
                        onPress={() => router.push("/pages/mobilelogin")}
                        className="text-[#27AE60] underline"
                    >
                        Login
                    </Text>
                    </Text>
                </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default NewPassword;
