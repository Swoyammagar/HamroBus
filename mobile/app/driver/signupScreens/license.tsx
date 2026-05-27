import { router, Stack } from "expo-router";
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";
import { useDriverSignup } from "../../context/DriverSignupContext";

interface LicenseForm {
  licenseNo: string;
  licenseImage: string | null;
}

const validateNepalLicenseNumber = (value: string) => {
  if (!value || value.replace(/-/g, "").trim().length === 0)
    return "License number is required";
  const pattern = /^[A-Z0-9]{2,3}-\d{2}-\d{5,7}$/;
  if (!pattern.test(value))
    return "Format must be XX-XX-XXXXXX (e.g. BP-07-123456)";
  return true;
};

const formatLicense = (text: string) => {
  const clean = text.replace(/[^A-Z0-9]/g, "");
  if (clean.length <= 3) return clean;
  if (clean.length <= 5) return `${clean.slice(0, 3)}-${clean.slice(3)}`;
  return `${clean.slice(0, 3)}-${clean.slice(3, 5)}-${clean.slice(5, 12)}`;
};

const License = () => {
  const { signupData, updateSignupData } = useDriverSignup();

  const {
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LicenseForm>({
    defaultValues: {
      licenseNo: signupData.licenseNo || "",
      licenseImage: signupData.licenseImage || null,
    },
  });

  const licenseImage = watch("licenseImage");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setValue("licenseImage", result.assets[0].uri);
    }
  };

  const onSubmit = (data: LicenseForm) => {
    if (!data.licenseImage) {
      alert("Please upload a license image.");
      return;
    }
    updateSignupData({
      licenseNo: data.licenseNo,
      licenseImage: data.licenseImage || undefined,
    });
    router.push("/driver/signupScreens/password");
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row mb-6 mt-6 justify-center">
            <Text className="text-2xl font-medium text-black">License</Text>
            <Text className="text-2xl font-medium text-[#27AE60] ml-2">
              Information
            </Text>
          </View>

          <Text className="font-medium text-[#333] mt-3 mb-1">
            License Number:
          </Text>

          <Controller
            control={control}
            name="licenseNo"
            rules={{ validate: validateNepalLicenseNumber }}
            render={({ field: { onChange, value } }) => (
              <TextInput
                style={[
                  styles.input,
                  focusedField === "licenseNumber" && styles.inputFocused,
                ]}
                placeholder="e.g. BP-07-123456"
                placeholderTextColor="#aaa"
                value={value}
                onChangeText={(text) => {
                  const formatted = formatLicense(text.toUpperCase());
                  onChange(formatted);
                }}
                autoCapitalize="characters"
                keyboardType="default"
                maxLength={13}
                onFocus={() => setFocusedField("licenseNumber")}
                onBlur={() => setFocusedField(null)}
              />
            )}
          />
          {errors.licenseNo && (
            <Text style={styles.errorText}>{errors.licenseNo.message}</Text>
          )}

          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            {licenseImage ? (
              <View style={styles.imageWrapper}>
                <Image
                  source={{ uri: licenseImage }}
                  style={{ width: 300, height: 160, resizeMode: "cover" }}
                />
              </View>
            ) : (
              <>
                <Text style={styles.imagePickerText}>Add License Image</Text>
                <Text style={{ color: "#888", fontSize: 13 }}>
                  No image selected
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.nextButton}
            onPress={handleSubmit(onSubmit)}
          >
            <Text style={styles.nextButtonText}>SUBMIT</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
};

export default License;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
    padding: 24,
    backgroundColor: "#f9f9f9",
  },
  title: {
    color: "#27AE60",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 40,
  },
  dropdownText: {
    color: "#333",
    fontSize: 16,
  },
  placeholderText: {
    color: "#777",
    fontSize: 16,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    padding: 12,
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    marginTop: 5,
    overflow: "hidden",
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  dropdownItemText: {
    fontSize: 16,
    color: "#333",
  },
  errorText: {
    color: "red",
    marginBottom: 20,
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: "#111",
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#333",
    marginBottom: 14,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    borderStyle: "solid",
  },
  inputFocused: {
    borderColor: "#3b82f6",
    shadowColor: "#3b82f6",
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  imagePicker: {
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "column",
    minHeight: 80,
    marginBottom: 25,
    elevation: 2,
  },
  imagePickerText: {
    color: "#27AE60",
    fontWeight: "600",
    marginBottom: 6,
  },
  imageWrapper: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
  },
  nextButton: {
    backgroundColor: "#27AE60",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    elevation: 2,
  },
  nextButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});