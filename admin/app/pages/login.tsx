import React from "react";
import { Text, View, Image, TouchableOpacity, TextInput, ScrollView, useWindowDimensions } from "react-native";
import LoginImage from "../utils/Login.png";
import MainLogo from "../utils/HamroBus Logo.png";
import { Stack } from "expo-router";
import { useState } from "react";
const Login = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [email, setEmail] = useState<String>("");
  const [password, setPassword] = useState<String>("");
  const [error, setError] = useState<String>("");

  const handleLogin = () => {
    
  }

  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "white" }} style={{ backgroundColor: "white" }}>
      {/* Main container centered vertically and horizontally */}
      <View className="flex-1 min-h-screen justify-center items-center p-5" style={{ backgroundColor: "white" }}>
        
        {/* Inner container: row for desktop, column for mobile */}
        <View className={`${isDesktop ? "flex-row" : "flex-col"} justify-center items-center`} style={{ maxWidth: isDesktop ? 1000 : "100%" }}>
          
          {/* Left Image (desktop only) */}
          {isDesktop && (
            <View style={{ width: 450, justifyContent: "center", alignItems: "center" }}>
              <Image 
                source={LoginImage} resizeMode="contain"
                style={{ width: "100%", height: 400 }} 
              />
            </View>
          )}

          {/* Login Form */}
          <View style={{ width: 400, marginLeft: isDesktop ? 50 : 0, marginTop: isDesktop ? 0 : 30, backgroundColor: "white", padding: 30, borderRadius: 15, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5 }}>
            
            {/* Logo */}
            <View className="items-center mb-6">
              <Image 
                source={MainLogo} resizeMode="contain" 
                style={{ width: 150, height: 70}}
              />
            </View>

            {/* Title */}
            <Text className="text-3xl font-medium mb-6 text-center">
              Login to Your <Text className="text-[#27AE60]">Account</Text>
            </Text>

            {/* Email */}
            <Text className="text-gray-700 mb-1">Email</Text>
            <TextInput 
              className="rounded-lg shadow p-3 mb-4 border border-gray-300 w-full"
              placeholder="Enter your email"
              keyboardType="email-address"
            />

            {/* Password */}
            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-gray-700">Password</Text>
              <Text className="text-gray-400 text-xs hover:text-gray-900">Forgot Password?</Text>
            </View>
            <TextInput 
              className="rounded-lg shadow p-3 mb-4 border border-gray-300 w-full"
              placeholder="Enter your password"
              secureTextEntry
            />

            {/* Login Button */}
            <TouchableOpacity className="bg-green-500 rounded-lg p-3 items-center mb-4">
              <Text className="text-white font-medium text-lg">Login</Text>
            </TouchableOpacity>

            {/* Divider */}
            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-gray-300" />
              <Text className="px-2 text-gray-400">or</Text>
              <View className="flex-1 h-[1px] bg-gray-300" />
            </View>

            {/* Signup Button */}
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
