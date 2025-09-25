import React, { useState } from "react";
import { Text, View, Image, TouchableOpacity, TextInput, ScrollView } from "react-native";
import LoginImage from "../utils/Login.png";
import MainLogo from "../utils/MainLogo.png";
import { Stack } from "expo-router";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleLogin = () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{6,}$/;

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!passwordRegex.test(password)) {
      setError("Password must be at least 6 characters long, contain a number and a special character.");
      return;
    }
    setError("");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "white" }}>
        <View className="flex-1 min-h-screen justify-center items-center p-5" style={{ backgroundColor: "white" }}>
          {/* Desktop Row Layout */}
          <View className="flex-row justify-center items-center" style={{ maxWidth: 1000 }}>
            
            {/* Left Image */}
            <View style={{ width: 450, justifyContent: "center", alignItems: "center" }}>
              <Image source={LoginImage} resizeMode="contain" style={{ width: "100%", height: 400 }} />
            </View>

            {/* Login Form */}
            <View style={{ width: 400, marginLeft: 50, backgroundColor: "white", padding: 30, borderRadius: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 3.84, elevation: 5 }}>
              <View className="items-center mb-6">
                <Image source={MainLogo} resizeMode="contain" style={{ width: 150, height: 70 }} />
              </View>

              <Text className="text-3xl font-medium mb-6 text-center">
                Login to Your <Text className="text-[#27AE60]">Account</Text>
              </Text>

              {error ? <Text className="text-red-500 mb-4 text-center">{error}</Text> : null}

              <Text className="text-gray-700 mb-1">Email</Text>
              <TextInput
                className="rounded-lg shadow p-3 mb-4 border border-gray-300 w-full"
                placeholder="Enter your email"
                keyboardType="email-address"
                value={email}
                onChangeText={(text) => setEmail(text)}
              />

              <View className="flex-row justify-between items-center mb-1">
                <Text className="text-gray-700">Password</Text>
                <Text className="text-gray-400 text-xs">Forgot Password?</Text>
              </View>
              <TextInput
                className="rounded-lg shadow p-3 mb-4 border border-gray-300 w-full"
                placeholder="Enter your password"
                secureTextEntry
                value={password}
                onChangeText={(text) => setPassword(text)}
              />

              <TouchableOpacity onPress={handleLogin} className="bg-green-500 rounded-lg p-3 items-center mb-4">
                <Text className="text-white font-medium text-lg">Login</Text>
              </TouchableOpacity>

              <View className="flex-row items-center my-4">
                <View className="flex-1 h-[1px] bg-gray-300" />
                <Text className="px-2 text-gray-400">or</Text>
                <View className="flex-1 h-[1px] bg-gray-300" />
              </View>

              <TouchableOpacity className="bg-green-100 rounded-lg p-3 items-center">
                <Text className="text-green-700 font-medium text-lg">Create New Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default Login;
