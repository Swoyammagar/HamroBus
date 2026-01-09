import React, { useState } from "react";
import {
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useForm, Controller } from "react-hook-form";
import { usePassengerSignup } from "../../context/PassengerSignupContext";
import { useAuth } from "../../context/AuthContext";

type FormValues = {
  password: string;
  confirmPassword: string;
};

const NewPassword: React.FC = () => {
  const router = useRouter();
  const { signupData, resetSignupData } = usePassengerSignup();
  const { register } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [isConfirmPasswordFocused, setIsConfirmPasswordFocused] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const passwordValue = watch("password");

  const validatePassword = (value: string) => {
    const minLength = 5;
    const maxLength = 15;
    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecialChar = /[\W_]/.test(value);

    if (value.length < minLength) return "Password must be at least 5 characters long";
    if (value.length > maxLength) return "Password must be less than 15 characters";
    if (!hasUpperCase) return "Password must contain at least one uppercase letter";
    if (!hasLowerCase) return "Password must contain at least one lowercase letter";
    if (!hasNumber) return "Password must contain at least one number";
    if (!hasSpecialChar) return "Password must contain at least one special character";
    return true;
  };

  const onSubmit = async (data: FormValues) => {
    setError("");

    if (data.password !== data.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    try {
      const completeSignupData = {
        ...signupData,
        password: data.password,
      };

      const result = await register(completeSignupData, "passenger");
      console.log("✅ REGISTER SUCCESS:", result);
        Alert.alert("Registration Successful", "Your account has been created successfully!");
        setTimeout(() => {
        resetSignupData();
        router.replace("/pages/mobilelogin");
      }, 300); 
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Registration failed. Please try again.");
      setError(
      err?.response?.data?.message ||
      err?.message ||
      "Registration failed. Please try again."
    );
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

            <View style={{ width: "100%", maxWidth: 510 }}>
              <View className="flex-row mb-4 justify-center">
                <Text className="text-2xl font-medium text-black">Set Your</Text>
                <Text className="text-2xl font-medium text-[#27AE60] ml-2">Password</Text>
              </View>

              {error ? <Text className="text-red-500 text-sm mb-4">{error}</Text> : null}

              <Text className="font-medium text-[#333] mt-3 mb-1">Password</Text>
              <View className="relative">
                <Controller
                  control={control}
                  name="password"
                  rules={{ required: "Password is required", validate: validatePassword }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      secureTextEntry={!showPassword}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Enter password"
                      editable={!isLoading}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => {
                        setIsPasswordFocused(false);
                        onBlur();
                      }}
                      className="w-full rounded-md p-3 bg-white text-black pr-10"
                      style={{
                        borderWidth: 1,
                        borderColor: isPasswordFocused ? "#3b82f6" : "#9ca3af",
                      }}
                    />
                  )}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  {showPassword ? (
                    <Feather name="eye-off" size={20} color="gray" />
                  ) : (
                    <Feather name="eye" size={20} color="gray" />
                  )}
                </TouchableOpacity>
              </View>
              {errors.password ? (
                <Text className="text-red-500 text-xs mt-1">{errors.password.message as string}</Text>
              ) : null}

              <Text className="font-medium text-[#333] mt-3 mb-1">Confirm Password</Text>
              <View className="relative">
                <Controller
                  control={control}
                  name="confirmPassword"
                  rules={{
                    required: "Confirm your password",
                    validate: (value) =>
                      value === passwordValue || "Passwords do not match",
                  }}
                  render={({ field: { onChange, onBlur, value } }) => (
                    <TextInput
                      secureTextEntry={!showConfirmPassword}
                      value={value}
                      onChangeText={onChange}
                      placeholder="Confirm password"
                      editable={!isLoading}
                      onFocus={() => setIsConfirmPasswordFocused(true)}
                      onBlur={() => {
                        setIsConfirmPasswordFocused(false);
                        onBlur();
                      }}
                      className="w-full rounded-md p-3 bg-white text-black pr-10"
                      style={{
                        borderWidth: 1,
                        borderColor: isConfirmPasswordFocused ? "#3b82f6" : "#9ca3af",
                      }}
                    />
                  )}
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
              {errors.confirmPassword ? (
                <Text className="text-red-500 text-xs mt-1">{errors.confirmPassword.message as string}</Text>
              ) : null}

              <View className="flex-col items-center mt-5 space-y-4">
                <TouchableOpacity
                  onPress={handleSubmit(onSubmit)}
                  disabled={isLoading}
                  className="w-full h-[50px] bg-[#27AE60] rounded-lg justify-center items-center mb-4"
                >
                  {isLoading ? <ActivityIndicator color="#fff" /> : (
                    <Text className="text-white font-medium text-lg">Set Password</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default NewPassword;
