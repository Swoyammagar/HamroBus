import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Dimensions,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import mainLogo from "../utils/MainLogo.png";
import { useAuth } from "../context/AuthContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const ResetPassword: React.FC = () => {
  const router = useRouter();

  const { passwordResetEmail } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [role, setRole] = useState<'driver' | 'passenger'>('passenger');
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isEmailFocused, setIsEmailFocused] = useState(false);

  const accentColor = role === 'driver' ? '#2563EB' : '#27AE60';

  const handleResetPassword = async () => {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    try {
      const result = await passwordResetEmail(email, role);
      if (result.success) {
        setSuccess("Password reset email sent. Please check your inbox.");
        router.push(`/pages/otpPassword?email=${encodeURIComponent(email)}&role=${role}`);
      } else {
        setError(result.message || "Failed to send reset email. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to send reset email. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        contentContainerStyle={{ flexGrow: 1, minHeight: SCREEN_HEIGHT }}
        keyboardShouldPersistTaps="handled"
        className="bg-[#f9f9f9]"
      >
        <View className="flex-1 min-h-screen bg-[#f9f9f9] px-6 py-10 items-center justify-center">
          <View className="items-center mb-6">
            <Image
              source={mainLogo}
              resizeMode="contain"
              style={{ width: 150, height: 70 }}
            />
          </View>

          <View className="flex-row mb-8 w-full justify-center">
            <Text className="text-3xl font-semibold text-black">Forgot Your</Text>
            <Text className="text-3xl font-semibold text-[#27AE60] ml-2">
              Password?
            </Text>
          </View>

          {error ? <Text className="text-red-500 text-sm mb-2">{error}</Text> : null}
          {success ? (
            <Text className="text-green-500 text-sm mb-2">{success}</Text>
          ) : null}

          <View className="w-80 mb-4">
            <Text className="text-base font-medium text-[#333] mb-2">
              I am a
            </Text>
            <View className="flex-row gap-3">
              {['passenger', 'driver'].map((option) => (
                <TouchableOpacity
                  key={option}
                  onPress={() => setRole(option as 'passenger' | 'driver')}
                  style={{ backgroundColor: role === option ? accentColor : 'transparent' }}
                  className={`flex-1 py-3 rounded-lg border ${
                    role === option ? 'border-transparent' : 'border-gray-300'
                  }`}
                >
                  <Text
                    style={{ color: role === option ? 'white' : '#6B7280' }}
                    className="text-center font-medium capitalize"
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View className="w-80">
            <Text className="text-base font-medium text-[#333] mb-2 self-start">
              Email Address
            </Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email address"
              keyboardType="email-address"
              editable={!isLoading}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              className={`border rounded-md p-3 bg-white text-black mb-5 shadow ${
                isEmailFocused
                  ? "border-blue-500" : "border-gray-300"
              }`}
            />

            <TouchableOpacity
              onPress={handleResetPassword}
              disabled={isLoading}
              style={{ backgroundColor: isLoading ? `${accentColor}b3` : accentColor }}
              className="h-12 rounded-lg justify-center items-center w-full"
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-medium text-lg">
                  Send Reset Link
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View className="mt-5 flex-row items-center">
            <Text className="text-sm text-[#333]">Remember your password?</Text>
            <TouchableOpacity onPress={() => router.push("/pages/mobilelogin")}>
              <Text style={{ color: accentColor }} className="underline text-sm ml-1">Login</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default ResetPassword;
