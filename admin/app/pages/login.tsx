import React, { useState } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { router, Stack } from "expo-router";
import { useAuth } from "../context/AuthContext";
import type { ApiResponse } from "../src/types/auth";
import { AuthLayout, AuthHeader } from "../components/auth";
import { Input, Button, Card } from "../components/ui";
import LoginImage from "../utils/Login.png";
import MainLogo from "../utils/MainLogo.png";

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const { login, loading } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async () => {
    setError("");
    try {
      setSubmitting(true);
      const res: ApiResponse = await login(email, password);
      if (res.success) {
        router.push("/pages/dashboard");
      } else {
        setError(res.message || 'Login failed');
      }
    } catch (err: any) {
      setError(err?.message || 'Login error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthLayout
        illustration={LoginImage}
        illustrationSize={{ width: 450, height: 400 }}
      >
        <Card style={styles.formCard}>
          <AuthHeader
            logo={MainLogo}
            title="Login to Your Account"
            highlightedWord="Account"
          />

          {error && <Text style={styles.error}>{error}</Text>}

          <Input
            label="Email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            error={error && !email ? "Email is required" : undefined}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChangeText={setPassword}
            error={error && !password ? "Password is required" : undefined}
          />

          <TouchableOpacity
            onPress={() => router.push("/pages/resetPassword")}
            style={styles.forgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            onPress={handleLogin}
            disabled={submitting || loading}
            loading={submitting || loading}
            fullWidth
            size="lg"
          >
            Login
          </Button>
        </Card>
      </AuthLayout>
    </>
  );
};

const styles = StyleSheet.create({
  formCard: {
    padding: 30,
  },
  error: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 20,
    marginTop: -8,
  },
  forgotPasswordText: {
    color: '#6b7280',
    fontSize: 12,
  },
});

export default Login;
