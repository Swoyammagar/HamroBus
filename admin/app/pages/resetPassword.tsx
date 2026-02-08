import React, { useState } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Stack, router } from "expo-router";
import { useAuth } from "../context/AuthContext";
import { AuthLayout, AuthHeader } from "../components/auth";
import { Input, Button } from "../components/ui";
import mainLogo from "../utils/MainLogo.png";
import ResetPassword_icon from "../utils/Resetpassword.png";

const ResetPassword: React.FC = () => {
  const { passwordResetEmail } = useAuth();
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
    try {
      const result = await passwordResetEmail(email);
      if (result.success) {
        setSuccess("Password reset email sent. Please check your inbox.");
        router.push(`/pages/otp?email=${encodeURIComponent(email)}`);
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
      <AuthLayout illustration={ResetPassword_icon}>
        <AuthHeader
          logo={mainLogo}
          title="Forgot Your Password?"
          highlightedWord="Password?"
        />

        {error && <Text style={styles.error}>{error}</Text>}
        {success && <Text style={styles.success}>{success}</Text>}

        <Input
          label="Email Address"
          type="email"
          placeholder="Enter your email address"
          value={email}
          onChangeText={setEmail}
          editable={!isLoading}
          error={error && !email ? "Email is required" : undefined}
        />

        <Button
          onPress={handleResetPassword}
          disabled={isLoading}
          loading={isLoading}
          fullWidth
          size="lg"
          style={styles.button}
        >
          Send Reset Link
        </Button>

        <Text style={styles.footer}>
          Remember your password?{" "}
          <TouchableOpacity onPress={() => router.push("/pages/login")}>
            <Text style={styles.link}>Login</Text>
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
});

export default ResetPassword;
