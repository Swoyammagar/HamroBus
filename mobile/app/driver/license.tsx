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

const licenseOptions = ["LMV", "HMV", "Other"];

const License = () => {
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseType, setLicenseType] = useState("");
  const [showsDropdown, setShowsDropdown] = useState(false);

  const [photo, setPhoto] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setPhoto(result.assets[0].uri);
    }
  };
  const renderDropdown = (
      options: string[],
      onSelect: (value: string) => void
    ) => (
      <View style={styles.dropdownList}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={styles.dropdownItem}
            onPress={() => onSelect(option)}
          >
            <Text style={styles.dropdownItemText}>{option}</Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  const handleSubmit = () => {
    if (
      // !licenseNumber || !licenseType || !photo
      !licenseNumber || !licenseType
    ) {
      setError("Please fill in all fields and add a license image.");
      return;
    }
    setError("");
    router.push("/driver/password");
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
            <Text className="text-2xl font-medium text-[#27AE60] ml-2">Information</Text>
          </View>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <Text className="font-medium text-[#333] mt-3 mb-1">License Number:</Text>

          <TextInput
            style={[
              styles.input,
              focusedField === "licenseNumber" && styles.inputFocused,
            ]}
            placeholder="Enter license number"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            autoCapitalize="characters"
            onFocus={() => setFocusedField("licenseNumber")}
            onBlur={() => setFocusedField(null)}
          />
          <Text className="font-medium text-[#333] mb-1">License Type:</Text>
          <View style={{ marginBottom: 20 }}>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => {
                        setShowsDropdown(!showsDropdown);
                      }}
                    >
                      <Text style={licenseType ? styles.dropdownText : styles.placeholderText}>
                        {licenseType || "Select License Type"}
                      </Text>
                    </TouchableOpacity>
                    {showsDropdown &&
                      renderDropdown(licenseOptions, (value) => {
                        setLicenseType(value);
                        setShowsDropdown(false);
                      })}
                  </View>


          {/* License Image Upload */}
          <TouchableOpacity style={styles.imagePicker} onPress={handlePickImage}>
            
            {photo ? (
                <View style={styles.imageWrapper}>
                  <Image
                    source={{ uri: photo }}
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

          <TouchableOpacity style={styles.nextButton} onPress={handleSubmit}>
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
    borderStyle: "solid",// removes blue border on web
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
  