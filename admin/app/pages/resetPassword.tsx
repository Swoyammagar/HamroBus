import React, { useState } from "react";
import { Text, View, Image, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import { Stack, router } from "expo-router";
import mainLogo from "../utils/MainLogo.png";
import ResetPassword_icon from "../utils/Resetpassword.png";

// import { useAuth } from "../../src/context/AuthContext";

const ResetPassword: React.FC = () => {
  //   const { sendPasswordResetEmail } = useAuth();
  const [email, setEmail] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleResetPassword = async () => {
    setError("");
    setSuccess("");
    if (!email) {
      setError("Please enter your email address");
      return;
    }

    setIsLoading(true);
    // try {
    //   const result = await sendPasswordResetEmail(email);
    //   if (result.success) {
    //     setSuccess("Password reset email sent. Please check your inbox.");
    //     router.push(`/resetVerify?email=${encodeURIComponent(email)}`);
    //   } else {
    //     setError(result.message || "Failed to send reset email. Please try again.");
    //   }
    // } catch (err: any) {
    //   setError(err.message || "Failed to send reset email. Please try again.");
    // } finally {
    //   setIsLoading(false);
    // }
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
              
              {/* Logo above Forgot Password */}
              <View style={{ marginBottom: 40 }}>
                <Image
                  source={mainLogo}
                  style={{ width: 180, height: 80, resizeMode: "contain" }}
                />
              </View>

              {/* Heading */}
              <View className="flex-row mb-4">
                <Text className="text-4xl font-medium text-black">Forgot Your</Text>
                <Text className="text-4xl font-medium text-[#27AE60] ml-2">Password?</Text>
              </View>

              {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}
              {success ? <Text className="text-green-500 text-sm mb-4">{success}</Text> : null}

              <Text className="text-lg font-medium text-[#333] mt-3 mb-1">Email Address</Text>
              <TextInput
                value={email}
                onChangeText={(text) => setEmail(text)}
                placeholder="Enter your email address"
                keyboardType="email-address"
                editable={!isLoading}
                className="w-full border border-gray-400 rounded-md p-3 bg-white text-black"
              />

              <View className="flex-col items-center mt-5 space-y-4">
                <TouchableOpacity
                  onPress={handleResetPassword}
                  disabled={isLoading}
                  className="w-full h-[50px] bg-[#27AE60] rounded-lg justify-center items-center"
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-white font-medium text-lg">Send Reset Link</Text>
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
                source={ResetPassword_icon}
                style={{ width: 460, height: 500, resizeMode: "contain" }} // bigger size
              />
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default ResetPassword;
