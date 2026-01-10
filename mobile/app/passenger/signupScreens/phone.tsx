import { router, Stack } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import { usePassengerSignup } from '../../context/PassengerSignupContext';

const DriverPhone = () => {
  const [isFocused, setIsFocused] = useState(false);
  const { updateSignupData } = usePassengerSignup();
  
  const { control, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { email: '' },
  });

  const onSubmit = (data: { email: string }) => {
    updateSignupData({ email: data.email });
    router.push('/passenger/signupScreens/signup');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        {/* Header */}
        <View className="flex-row mb-6 mt-6 justify-center">
          <Text className="text-2xl font-medium text-black">Create New</Text>
          <Text className="text-2xl font-medium text-[#27AE60] ml-2">Account</Text>
        </View>
        <Text className="font-medium text-[#333]  mb-2">Your email address: </Text>
        <Controller
          control={control}
          name="email"
          rules={{
            required: 'Email is required',
            pattern: {
              value: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
              message: 'Enter a valid email address',
            },
          }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, isFocused && styles.inputFocused]}
                value={value}
                onChangeText={onChange}
                placeholder="Enter your email address"
                placeholderTextColor="#666"
                keyboardType="email-address"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>
          )}
        />
        {errors.email && (
          <Text style={{ color: 'red', marginBottom: 20 }}>{errors.email.message}</Text>
        )}
        
        <TouchableOpacity style={styles.nextButton} onPress={handleSubmit(onSubmit)}>
          <Text style={styles.nextButtonText}>NEXT</Text>
        </TouchableOpacity>
        <View className="flex-row flex-wrap justify-center ">
            <Text className="text-sm text-[#333] font-light">
                By clicking Next, you agree to the{" "}
            </Text>
            <Text className="text-sm text-[#27AE60] font-medium underline">
                Terms of Service
            </Text>
            <Text className="text-sm text-[#333] font-light">
                {" "}and{" "}
            </Text>
            <Text className="text-sm text-[#27AE60] font-medium underline">
                Privacy Policy
            </Text>
        </View>
      </View>
    </>
  );
};

export default DriverPhone;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: '#f9f9f9', // light neutral background
  },
  title: {
    color: '#27AE60',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 40,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: '#27AE60',
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },

  input: {
    flex: 1,
    color: '#333',
    fontSize: 16,
  },
  inputFocused:{
    borderColor: "#3b82f6", shadowColor: "#27AE60", shadowOpacity: 0.3, shadowRadius: 5
  },
  nextButton: {
    backgroundColor: '#27AE60',
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  infoContainer: {
    gap: 24,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  icon: {
    fontSize: 26,
    color: '#2e7d32',
    marginRight: 12,
  },
});
