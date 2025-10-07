import React, { useState } from "react";
import { Text, View, Image, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Stack, useRouter } from "expo-router";
import mainLogo from "../utils/MainLogo.png";
import ResetPassword_icon from "../utils/Resetpassword.png";
import { useAuth } from "../src/context/AuthContext";
import { useSearchParams } from "expo-router/build/hooks";

const VerifyOTP: React.FC = () => {
  const router = useRouter();
  const { verifyOTP, passwordResetEmail } = useAuth();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState<String>("");

  const handleVerifyOTP = async () => {
    setError("");
    setSuccess("");
    if (!otp) {
      setError("Please enter the OTP");
      return;
    }
    setIsLoading(true);
    try {
      const result = await verifyOTP(email, otp);
      if (result.success) {
        router.push(`/pages/newPassword?email=${encodeURIComponent(email)}`);
      } else {
        setError(result.message || "Invalid OTP. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Invalid OTP. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    // Logic to resend OTP 
    setError("");
    setSuccess("");
    if (!email){
      setError("No email provided");
      return;
    }
    setIsResending(true);
    try {
      const res = await passwordResetEmail(email);
      if (res.success) {
        setSuccess(res.message || "OTP resent successfully");
      } else {
        setError(res.message || "Failed to resend OTP. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "#f9f9f9" }}>
        <View className="flex-1 min-h-screen bg-[#f9f9f9] items-center px-6 py-10">

          {/* Content Wrapper */}
          <View className="w-full mt-6 flex-col lg:flex-row items-center justify-between max-w-[1200px]">

            {/* Left Side */}
            <View style={{ width: "100%", maxWidth: 510 }}>
              
              {/* Logo */}
              <View style={{ marginBottom: 40 }}>
                <Image source={mainLogo} style={{ width: 180, height: 80, resizeMode: "contain" }} />
              </View>

              {/* Heading */}
              <View className="flex-row mb-4">
                <Text className="text-4xl font-medium text-black">Verify Your</Text>
                <Text className="text-4xl font-medium text-[#27AE60] ml-2">OTP</Text>
              </View>

              {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}
              {success ? <Text className="text-green-500 text-sm mb-4">{success}</Text> : null}
              <Text className="text-lg font-medium text-[#333] mt-3 mb-1">Enter OTP</Text>
              <TextInput
                value={otp}
                onChangeText={setOtp}
                placeholder="Enter 6-digit OTP"
                keyboardType="number-pad"
                editable={!isLoading}
                className="w-full border border-gray-400 rounded-md p-3 bg-white text-black"
              />

              <View className="flex-col items-center mt-5 space-y-4">
                <TouchableOpacity
                  onPress={handleVerifyOTP}
                  disabled={isLoading}
                  className="w-full h-[50px] bg-[#27AE60] rounded-lg justify-center items-center"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-medium text-lg">Verify OTP</Text>
                  )}
                </TouchableOpacity>

                <Text className="text-sm text-[#333]">
                  Didn't receive OTP?{" "}
                  <Text>
                    <TouchableOpacity 
                      onPress={handleResendOTP} 
                      disabled={isResending}>
                        {isResending ? (
                          <ActivityIndicator color="#27AE60" />
                        ) : (
                          <Text className="text-[#27AE60] underline">Resend OTP</Text>
                        )}
                    </TouchableOpacity>
                  </Text>
                </Text>
              </View>
            </View>

            {/* Right Side Illustration */}
            <View style={{ marginTop: 10, marginLeft: -40 }}>
              <Image
                source={ResetPassword_icon}
                style={{ width: 460, height: 500, resizeMode: "contain" }}
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default VerifyOTP;
