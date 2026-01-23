import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Image,
  Dimensions,
  
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSearchParams } from "expo-router/build/hooks";
import { useAuth } from "../../context/AuthContext";
import { usePassengerSignup } from "../../context/PassengerSignupContext";
import mainLogo from "../../utils/MainLogo.png";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const SignupOTPVerification: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const role = searchParams.get("role") || "passenger"; // passenger or driver

  const { verifySignupOTP, requestSignupOTP } = useAuth();
  const { updateSignupData } = usePassengerSignup();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);

  const handleVerifyOTP = async () => {
    setError("");
    setSuccess("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifySignupOTP(email, otp);
      if (result.success) {
        setSuccess("Email verified successfully!");
        updateSignupData({ email, emailVerified: true });
        
        setTimeout(() => {
          if (role === "driver") {
            router.push("/driver/signupScreens/signupInfo");
          } else {
            router.push("/passenger/signupScreens/signup");
          }
        }, 1000);
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
    setError("");
    setSuccess("");
    if (!email) {
      setError("No email provided");
      return;
    }

    setIsResending(true);
    try {
      const res = await requestSignupOTP(email);
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
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Logo */}
            <Image source={mainLogo} style={styles.logo} />
  
            {/* Heading */}
            <Text style={styles.heading}>
              Verify Your <Text style={styles.highlight}>OTP</Text>
            </Text>
  
            {/* Messages */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            {success ? <Text style={styles.successText}>{success}</Text> : null}
  
            {/* OTP Input */}
            <Text style={styles.label}>Enter OTP</Text>
            <TextInput
              value={otp}
              onChangeText={setOtp}
              placeholder="Enter 6-digit OTP"
              keyboardType="number-pad"
              editable={!isLoading}
              style={[styles.input , isOtpFocused && { borderColor: "#3b82f6", shadowColor: "#27AE60", shadowOpacity: 0.3, shadowRadius: 5 }]}
              maxLength={6}
              onFocus={() => setIsOtpFocused(true)}
              onBlur={() => setIsOtpFocused(false)}
  
            />
  
            {/* Verify Button */}
            <TouchableOpacity
              onPress={handleVerifyOTP}
              disabled={isLoading}
              style={[styles.button, isLoading && styles.disabledButton]}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Verify OTP</Text>
              )}
            </TouchableOpacity>
  
            {/* Resend OTP */}
            <View style={styles.resendContainer}>
              <Text style={styles.resendText}>Didn’t receive OTP?</Text>
              <TouchableOpacity onPress={handleResendOTP} disabled={isResending}>
                {isResending ? (
                  <ActivityIndicator color="#27AE60" />
                ) : (
                  <Text style={styles.resendLink}> Resend OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </>
    );
  };
  
  export default SignupOTPVerification;
  
  const styles = StyleSheet.create({
    scrollContainer: {
      flexGrow: 1,
      backgroundColor: "#f9f9f9",
      minHeight: SCREEN_HEIGHT,
    },
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 25,
      paddingVertical: 50,
      backgroundColor: "#f9f9f9",
      marginBottom: 90,
    },
    logo: {
      width: 150,
      height: 70,
      resizeMode: "contain",
      marginBottom: 30,
    },
    heading: {
      fontSize: 28,
      fontWeight: "600",
      color: "#000",
      marginBottom: 25,
    },
    highlight: {
      color: "#27AE60",
    },
    label: {
      fontSize: 16,
      color: "#333",
      alignSelf: "flex-start",
      marginBottom: 6,
    },
    input: {
      width: "100%",
      borderWidth: 1,
      borderColor: "#ccc",
      borderRadius: 8,
      padding: 12,
      backgroundColor: "#fff",
      fontSize: 16,
      marginBottom: 20,
      color: "#000",
    },
    button: {
      width: "100%",
      backgroundColor: "#27AE60",
      paddingVertical: 14,
      borderRadius: 10,
      alignItems: "center",
    },
    disabledButton: {
      opacity: 0.8,
    },
    buttonText: {
      color: "#fff",
      fontSize: 17,
      fontWeight: "600",
    },
    resendContainer: {
      flexDirection: "row",
      alignItems: "center",
      marginTop: 18,
    },
    resendText: {
      color: "#333",
      fontSize: 14,
    },
    resendLink: {
      color: "#27AE60",
      textDecorationLine: "underline",
      fontWeight: "500",
    },
    errorText: {
      color: "red",
      fontSize: 13,
      marginBottom: 10,
    },
    successText: {
      color: "green",
      fontSize: 13,
      marginBottom: 10,
    },
  });