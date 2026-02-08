import React, { useState } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSearchParams } from "expo-router/build/hooks";
import { useAuth } from "../context/AuthContext";
import { AuthLayout, AuthHeader } from "../components/auth";
import { Input, Button } from "../components/ui";
import mainLogo from "../utils/MainLogo.png";
import ResetPassword_icon from "../utils/Resetpassword.png";

const VerifyOTP: React.FC = () => {
  const router = useRouter();
  const { verifyOTP, passwordResetEmail } = useAuth();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [otp, setOtp] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [success, setSuccess] = useState<string>("");

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
    setError("");
    setSuccess("");
    if (!email) {
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
      <AuthLayout illustration={ResetPassword_icon}>
        <AuthHeader
          logo={mainLogo}
          title="Verify Your OTP"
          highlightedWord="OTP"
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}

        <Input
          label="Enter OTP"
          type="number"
          placeholder="Enter 6-digit OTP"
          value={otp}
          onChangeText={setOtp}
          editable={!isLoading}
          error={error && !otp ? "OTP is required" : undefined}
        />

        <Button
          onPress={handleVerifyOTP}
          disabled={isLoading}
          loading={isLoading}
          fullWidth
          size="lg"
          style={styles.button}
        >
          Verify OTP
        </Button>

        <Text style={styles.footer}>
          Didn't receive OTP?{" "}
          <TouchableOpacity onPress={handleResendOTP} disabled={isResending}>
            <Text style={[styles.link, isResending && styles.linkDisabled]}>
              {isResending ? "Resending..." : "Resend"}
            </Text>
          </TouchableOpacity>
        </Text>
      </AuthLayout>
    </>
  );
};

const styles = StyleSheet.create({
  error: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
  },
  success: {
    color: '#10b981',
    fontSize: 14,
    marginBottom: 16,
  },
  button: {
    marginBottom: 16,
  },
  footer: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
  },
  link: {
    color: '#27AE60',
    textDecorationLine: 'underline',
  },
  linkDisabled: {
    opacity: 0.5,
  },
});

export default VerifyOTP;
