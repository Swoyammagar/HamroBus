import { Stack, router } from 'expo-router';
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useForm, Controller } from 'react-hook-form';
import axios from 'axios';
import { useDriverSignup } from '../../context/DriverSignupContext';

const DriverPhone = () => {
  const [isFocused, setIsFocused] = useState(false);
  const { updateSignupData } = useDriverSignup();

  const { control, handleSubmit, setError, formState: { errors } } = useForm({
    defaultValues: { phoneNumber: '' },
  });

  const onSubmit = async (data: { phoneNumber: string }) => {
    // Store phone number in context
    updateSignupData({ phoneNumber: data.phoneNumber });
    router.push('/driver/signupScreens/signupInfo');
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <View className="flex-row mb-6 mt-6 justify-center">
          <Text className="text-2xl font-medium text-black">Create New</Text>
          <Text className="text-2xl font-medium text-[#27AE60] ml-2">Account</Text>
        </View>

        <Text style={{ fontWeight: '500', color: '#333', marginBottom: 8 }}>Your phone number:</Text>

        {/* Mobile Number Input */}
        <Controller
          control={control}
          name="phoneNumber"
          rules={{
            required: 'Phone number is required',
            pattern: {
              value: /^[0-9]{10}$/, // basic 10-digit number validation
              message: 'Enter a valid 10-digit number',
            },
          }}
          render={({ field: { onChange, value } }) => (
            <View style={styles.inputContainer}>
              <View style={styles.flagContainer}>
                <Text style={styles.flag}>🇳🇵</Text>
              </View>
              <TextInput
                style={[styles.input, isFocused && styles.inputFocused]}
                value={value}
                onChangeText={onChange}
                placeholder="+977 XXXXXXXXXX"
                placeholderTextColor="#666"
                keyboardType="phone-pad"
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
              />
            </View>
          )}
        />
        {errors.phoneNumber && (
          <Text style={{ color: 'red', marginBottom: 20 }}>{errors.phoneNumber.message}</Text>
        )}

        {/* Next Button */}
        <TouchableOpacity style={styles.nextButton} onPress={handleSubmit(onSubmit)}>
          <Text style={styles.nextButtonText}>NEXT</Text>
        </TouchableOpacity>

        {/* Info Sections */}
        <View style={styles.infoContainer}>
          <View style={styles.infoBox}>
            <Text style={styles.icon}>🛡️</Text>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Safety Coverage</Text>
              <Text style={styles.infoDescription}>
                We offer full insurance coverage for all vehicle with accidental coverage ensuring every driver's safety.
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.icon}>📞</Text>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>24/7 Support</Text>
              <Text style={styles.infoDescription}>
                Our support team is available 24/7 to help drivers.
              </Text>
            </View>
          </View>

          <View style={styles.infoBox}>
            <Text style={styles.icon}>📍</Text>
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>Preferred Destination</Text>
              <Text style={styles.infoDescription}>
                Now you can choose your destinations and take trips to three places in one day.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </>
  );
};

export default DriverPhone;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#f9f9f9' },
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
  flagContainer: { marginRight: 10 },
  flag: { fontSize: 24 },
  input: { flex: 1, color: '#333', fontSize: 16 },
  inputFocused: { borderColor: "#3b82f6", shadowColor: "#27AE60", shadowOpacity: 0.3, shadowRadius: 5 },
  nextButton: { backgroundColor: '#27AE60', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginBottom: 40, elevation: 2 },
  nextButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
  infoContainer: { gap: 24 },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start' },
  icon: { fontSize: 26, color: '#2e7d32', marginRight: 12 },
  infoText: { flex: 1 },
  infoTitle: { color: '#2e7d32', fontSize: 16, fontWeight: '600', marginBottom: 4 },
  infoDescription: { color: '#444', fontSize: 14, lineHeight: 20 },
});
