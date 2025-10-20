import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
  Dimensions,
} from "react-native";
import { Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";

const screenWidth = Dimensions.get("window").width;

const PersonalInfo = () => {
  const [photo, setPhoto] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [city, setCity] = useState("");
  const [error, setError] = useState("");

  const [showGenderDropdown, setShowGenderDropdown] = useState(false);
  const [showCityDropdown, setShowCityDropdown] = useState(false);

  const genderOptions = ["Male", "Female", "Other"];
  const cityOptions = ["Kathmandu", "Lalitpur", "Bhaktapur", "Pokhara", "Gorkha"];

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!result.canceled) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleSubmit = () => {
    if (!photo || !name || !email || !gender || !dob || !city) {
      setError("Please fill in all fields.");
      return;
    }
    setError("");
    Alert.alert("Success", "Your personal info has been submitted!");
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

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.header}>Personal Info</Text>

        {/* Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={handlePickImage}>
          {photo ? (
            <Image source={{ uri: photo }} style={styles.photo} />
          ) : (
            <Text style={styles.addPhotoText}>Add Photo</Text>
          )}
        </TouchableOpacity>

        <Text className="text-gray-700 mb-1 ml-1">Your Name: </Text>

        {/* Name */}
        <TextInput
          style={styles.input}
          placeholder="Enter your name"
          value={name}
          onChangeText={setName}
        />
        <Text className="text-gray-700 mb-1 ml-1">Email Address: </Text>
        {/* Email */}
        <TextInput
          style={styles.input}
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
        />
        <Text className="text-gray-700 mb-1 ml-1">Gender: </Text>
        {/* Gender Dropdown */}
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowGenderDropdown(!showGenderDropdown);
              setShowCityDropdown(false);
            }}
          >
            <Text style={gender ? styles.dropdownText : styles.placeholderText}>
              {gender || "Select Gender"}
            </Text>
          </TouchableOpacity>
          {showGenderDropdown &&
            renderDropdown(genderOptions, (value) => {
              setGender(value);
              setShowGenderDropdown(false);
            })}
        </View>
        <Text className="text-gray-700 mb-1 ml-1">Date of Birth: </Text>
        {/* DOB */}
        <TextInput
          style={styles.input}
          placeholder="Date of Birth (YYYY-MM-DD)"
          value={dob}
          onChangeText={setDob}
        />
        <Text className="text-gray-700 mb-1 ml-1">City: </Text>
        {/* City Dropdown */}
        <View style={{ marginBottom: 20 }}>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => {
              setShowCityDropdown(!showCityDropdown);
              setShowGenderDropdown(false);
            }}
          >
            <Text style={city ? styles.dropdownText : styles.placeholderText}>
              {city || "Select Your City"}
            </Text>
          </TouchableOpacity>
          {showCityDropdown &&
            renderDropdown(cityOptions, (value) => {
              setCity(value);
              setShowCityDropdown(false);
            })}
        </View>

        {/* Error */}
        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* Submit */}
        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
          <Text style={styles.submitText}>SUBMIT</Text>
        </TouchableOpacity>
      </ScrollView>
    </>
  );
};

export default PersonalInfo;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#f9f9f9",
  },
  header: {
    fontSize: 24,
    fontWeight: "700",
    color: "#27AE60",
    marginBottom: 30,
    textAlign: "center",
  },
  photoContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "#e8f5e9",
    alignSelf: "center",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#27AE60",
    marginBottom: 30,
    overflow: "hidden",
  },
  addPhotoText: {
    color: "#2e7d32",
    fontSize: 16,
    fontWeight: "500",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 14,
  },
  dropdown: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#000",
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: {
    color: "#333",
    fontSize: 16,
  },
  placeholderText: {
    color: "#777",
    fontSize: 16,
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
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  submitButton: {
    backgroundColor: "#27AE60",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 10,
    elevation: 2,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
});
