import React, { useState } from "react";
import { Text, View, Image, TouchableOpacity, TextInput, ScrollView, Dimensions, Alert } from "react-native";
import MainLogo from "../utils/MainLogo.png";
import { router, Stack } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { Feather } from '@expo/vector-icons';
import { accountDeletionService as passengerDeletionService } from "../passenger/services/accountDeletionService";
import { accountDeletionService as driverDeletionService } from "../driver/services/accountDeletionService";
const { height: SCREEN_HEIGHT } = Dimensions.get("window");


const Login = () => {
  const { loginDriver, loginPassenger, getCurrentUser} = useAuth();
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isEmailFocused, setIsEmailFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');

  const accentColor = role === 'driver' ? '#2563EB' : '#27AE60';
  const subtleTint = role === 'driver' ? '#E8F0FF' : '#E8F5E9';
  
  const handleLogin = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const passwordRegex = /^(?=.*[0-9])(?=.*[!@#$%^&*]).{6,}$/;
    if (!emailRegex.test(email)) {
        setError("Please enter a valid email address.");
        return;
      }

      if (!passwordRegex.test(password)) {
        setError("Invalid password format.");
        return;
      }

      setSubmitting(true);
      setError("");

      try {
        const res = role === 'driver'
          ? await loginDriver(email, password)
          : await loginPassenger(email, password);

        if (!res.success || !res.user) {
          setError(res.message || "Login failed");
          return;
        }
        await getCurrentUser();

        // Check deletion status for both passenger and driver
        try {
          if (role === 'driver') {
            const deletionStatus = await driverDeletionService.checkDeletionStatus();
            if (deletionStatus.success && deletionStatus.data.isDeletionPending) {
              Alert.alert(
                'Profile Deletion Pending',
                `Your profile is scheduled for deletion in ${deletionStatus.data.remainingDays} days. You can restore it from the profile settings.`,
                [{ text: 'OK' }]
              );
            }
          } else {
            const deletionStatus = await passengerDeletionService.checkDeletionStatus();
            if (deletionStatus.success && deletionStatus.data.isDeletionPending) {
              Alert.alert(
                'Profile Deletion Pending',
                `Your profile is scheduled for deletion in ${deletionStatus.data.remainingDays} days. You can restore it from the profile settings.`,
                [{ text: 'OK' }]
              );
            }
          }
        } catch (deletionError) {
          // Silently fail - deletion check shouldn't block login
          console.warn('Deletion status check failed:', deletionError);
        }

        if (role === 'driver') {
          router.replace("/driver/app");
        } else if (role === 'passenger') {
          router.replace("/passenger/(tabs)/home");
        } else {
          setError("Unknown user role");
        }

      } catch (err: any) {
        setError("Login error");
      } finally {
        setSubmitting(false);
  }
  };


  return (
    <>
    <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={{ flexGrow: 1, backgroundColor: "white", minHeight: SCREEN_HEIGHT }}>
        <View className="flex-1 min-h-screen justify-center items-center p-5" style={{ backgroundColor: "white" }}>
          
          {/* Mobile Column Layout */}
          <View style={{ width: "100%", marginTop: 30, backgroundColor: "white", padding: 30 }}>
            <View className="items-center mb-6">
              <Image source={MainLogo} resizeMode="contain" style={{ width: 150, height: 70 }} />
            </View>

            <Text className="text-3xl font-medium mb-6 text-center">
              Login to Your <Text className="text-[#27AE60]">Account</Text>
            </Text>

            <View className="flex-row bg-gray-100 rounded-full p-1 mb-5">
              {['passenger', 'driver'].map((option) => (
                <TouchableOpacity
                  key={option}
                  className="flex-1 rounded-full py-3"
                  onPress={() => setRole(option as 'passenger' | 'driver')}
                  style={{ backgroundColor: role === option ? accentColor : 'transparent' }}
                >
                  <Text
                    className="text-center font-medium"
                    style={{ color: role === option ? 'white' : '#6B7280' }}
                  >
                    {option === 'passenger' ? 'Passenger' : 'Driver'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {error ? <Text className="text-red-500 mb-4 text-center">{error}</Text> : null}

            <Text className="text-gray-700 mb-1">Email</Text>
            <TextInput
              className="rounded-lg p-3 mb-4 border w-full"
              placeholder="Enter your email"
              keyboardType="email-address"
              value={email}
              onChangeText={(text) => setEmail(text)}
              onFocus={() => setIsEmailFocused(true)}
              onBlur={() => setIsEmailFocused(false)}
              style={{ borderColor: isEmailFocused ? accentColor : '#D1D5DB' }}
            />

            <View className="flex-row justify-between items-center mb-1">
              <Text className="text-gray-700">Password</Text>
              <Text onPress={()=> router.push("/pages/resetPassword")} className="text-gray-400 text-xs">Forgot Password?</Text>
            </View>
            <View
              className="flex-row items-center rounded-lg border mb-4 px-3"
              style={{ borderColor: isPasswordFocused ? accentColor : '#D1D5DB' }}
            >
              <TextInput
                className="flex-1 py-3"
                placeholder="Enter your password"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => setPassword(text)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
              />

              <Feather
                name={showPassword ? "eye-off" : "eye"}
                size={20}
                color="#9CA3AF"
                onPress={() => setShowPassword(!showPassword)}
              />
            </View>

            <TouchableOpacity
              onPress={handleLogin}
              disabled={submitting}
              className="rounded-lg p-3 items-center mb-4"
              style={{ backgroundColor: submitting ? '#9CA3AF' : accentColor }}
            >
              <Text className="text-white font-medium text-lg">{submitting ? 'Logging in...' : 'Login'}</Text>
            </TouchableOpacity>

            <View className="flex-row items-center my-4">
              <View className="flex-1 h-[1px] bg-gray-300" />
              <Text className="px-2 text-gray-400">or</Text>
              <View className="flex-1 h-[1px] bg-gray-300" />
            </View>

            <TouchableOpacity className="bg-green-100 rounded-lg p-3 items-center">
              <Text onPress={()=>router.push("/pages/preference")} className="text-green-700 font-medium text-lg">Create New Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default Login;
