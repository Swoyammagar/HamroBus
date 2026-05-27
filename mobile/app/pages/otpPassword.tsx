import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Dimensions,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSearchParams } from "expo-router/build/hooks";
import mainLogo from "../utils/MainLogo.png";
import { useAuth } from "../context/AuthContext";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

const VerifyOTP: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const role = (searchParams.get("role") || 'passenger') as 'driver' | 'passenger';

  const { verifyOTP, passwordResetEmail } = useAuth();
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isOtpFocused, setIsOtpFocused] = useState(false);

  const accentColor = role === 'driver' ? '#2563EB' : '#27AE60';

  const handleVerifyOTP = async () => {
    setError("");
    setSuccess("");

    if (!otp) {
      setError("Please enter the OTP");
      return;
    }

    setIsLoading(true);
    try {
      const result = await verifyOTP(email, otp, role);
      if (result.success) {
        router.push(`/pages/newPassword?email=${encodeURIComponent(email)}&role=${role}`);
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
      const res = await passwordResetEmail(email, role);
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
          <Image source={mainLogo} style={styles.logo} />

          <Text style={styles.heading}>
            Verify Your <Text style={[styles.highlight, { color: accentColor }]}>OTP</Text>
          </Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}
          {success ? <Text style={styles.successText}>{success}</Text> : null}

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

          <TouchableOpacity
            onPress={handleVerifyOTP}
            disabled={isLoading}
            style={[styles.button, { backgroundColor: accentColor }, isLoading && styles.disabledButton]}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Verify OTP</Text>
            )}
          </TouchableOpacity>

          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Didn’t receive OTP?</Text>
            <TouchableOpacity onPress={handleResendOTP} disabled={isResending}>
              {isResending ? (
                <ActivityIndicator color={accentColor} />
              ) : (
                <Text style={[styles.resendLink, { color: accentColor }]}> Resend OTP</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
};

export default VerifyOTP;

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
