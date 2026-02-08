import React, { useState } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useSearchParams } from "expo-router/build/hooks";
import { useAuth } from "../context/AuthContext";
import { AuthLayout, AuthHeader } from "../components/auth";
import { Input, Button } from "../components/ui";
import mainLogo from "../utils/MainLogo.png";
import NewPassword_icon from "../utils/Newpassword.png";

const NewPassword: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const { resetPassword } = useAuth();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const validatePassword = (password: string) => {
    const minLength = 5;
    const maxLength = 15;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[\W_]/.test(password);

    if (password.length < minLength) return "Password must be at least 5 characters long";
    if (password.length > maxLength) return "Password must be less than 15 characters";
    if (!hasUpperCase) return "Password must contain at least one uppercase letter";
    if (!hasLowerCase) return "Password must contain at least one lowercase letter";
    if (!hasNumber) return "Password must contain at least one number";
    if (!hasSpecialChar) return "Password must contain at least one special character";
    return "";
  };

  const handleResetPassword = async () => {
    setError("");
    if (!password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    setIsLoading(true);
    try {
      const result = await resetPassword(email, password);
      if (result.success) {
        router.push("/pages/login");
      } else {
        setError(result.message || "Failed to reset password. Please try again.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to reset password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthLayout illustration={NewPassword_icon}>
        <AuthHeader
          logo={mainLogo}
          title="Reset Your Password"
          highlightedWord="Password"
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <Input
          label="New Password"
          type="password"
          placeholder="Enter new password"
          value={password}
          onChangeText={setPassword}
          editable={!isLoading}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Confirm new password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          editable={!isLoading}
        />

        <Button
          onPress={handleResetPassword}
          disabled={isLoading}
          loading={isLoading}
          fullWidth
          size="lg"
          style={styles.button}
        >
          Reset Password
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

export default NewPassword;
