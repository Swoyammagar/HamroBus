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
import { router, Stack } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useForm, Controller } from "react-hook-form";
import { useDriverSignup } from "../../context/DriverSignupContext";
import DateTimePicker from '@react-native-community/datetimepicker';
import { useAuth } from "@/app/context/AuthContext";
import { useSearchParams } from "expo-router/build/hooks";

interface SignupInfoForm {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  gender: string;
  dob: string;
  address: string;
  profileImage: string | null;
}


const PersonalInfo = () => {
  const { signupData, updateSignupData } = useDriverSignup();
  const { checkPhoneExists } = useAuth();
  const [showDobPicker, setShowDobPicker] = useState(false);
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  
  const { control, handleSubmit, setValue, watch, formState: { errors } } = useForm<SignupInfoForm>({
    defaultValues: {
      firstName: signupData.firstName || "",
      lastName: signupData.lastName || "",
      phoneNumber: signupData.phoneNumber || "",
      gender: signupData.gender || "",
      dob: typeof signupData.dob === "string" ? signupData.dob : signupData.dob instanceof Date ? signupData.dob.toISOString().split('T')[0] : "",
      address: signupData.address || "",
      profileImage: signupData.profileImage || null,
    },
  });
  
  const profileImage = watch("profileImage");

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
      setValue("profileImage", result.assets[0].uri);
    }
  };

  const onSubmit = async(data: SignupInfoForm) => {
    const phoneCheck = await checkPhoneExists(data.phoneNumber, email);
        if (phoneCheck.exists) {
          Alert.alert("Phone number already exists", phoneCheck.message || "Please use a different phone number.");
          return;
        }
    updateSignupData({
      firstName: data.firstName,
      lastName: data.lastName,
      phoneNumber: data.phoneNumber,
      gender: data.gender,
      dob: new Date(data.dob),
      address: data.address,
      profileImage: data.profileImage || undefined,
    });
    router.push('/driver/signupScreens/license');
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
        <View className="flex-row mb-6 mt-6 justify-center">
          <Text className="text-2xl font-medium text-black">Personal</Text>
          <Text className="text-2xl font-medium text-[#27AE60] ml-2">Information</Text>
        </View>

        {/* Photo */}
        <TouchableOpacity style={styles.photoContainer} onPress={handlePickImage}>
          {profileImage ? (
            <Image source={{ uri: profileImage }} style={styles.photo} />
          ) : (
            <Text style={styles.addPhotoText}>Add Photo</Text>
          )}
        </TouchableOpacity>

        <Text className="font-medium text-[#333] mb-1">First Name: </Text>

        <Controller
          control={control}
          name="firstName"
          rules={{ required: "First name is required" }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="Enter your first name"
              value={value}
              onChangeText={onChange}
            />
          )}
        />
                {errors.firstName && <Text style={styles.errorText}>{errors.firstName.message}</Text>}
        
                <Text className="font-medium text-[#333] mb-1">Last Name: </Text>
                <Controller
                  control={control}
                  name="lastName"
                  rules={{ required: "Last name is required" }}
                  render={({ field: { onChange, value } }) => (
                    <TextInput
                      style={styles.input}
                      placeholder="Enter your last name"
                      value={value}
                      onChangeText={onChange}
                    />
                  )}
                />
                {errors.lastName && <Text style={styles.errorText}>{errors.lastName.message}</Text>}
        
        <Text className="font-medium text-[#333]  mb-1">Phone Number: </Text>
        <Controller
          control={control}
          name="phoneNumber"
          rules={{ 
            required: "Phone number is required",
            pattern: {
              value: /^[0-9]{10}$/,
              message: "Invalid phone number"
            }
          }}
          render={({ field: { onChange, value } }) => (
            <TextInput
              style={styles.input}
              placeholder="+977 XXXXXXXXXX"
              value={value}
              onChangeText={onChange}
              keyboardType="phone-pad"
            />
          )}
          {...errors.phoneNumber && <Text style={styles.errorText}>{errors.phoneNumber.message}</Text>}
        
        />
        <Text className="font-medium text-[#333]  mb-1">Gender: </Text>
        <Controller
          control={control}
          name="gender"
          rules={{ required: "Gender is required" }}
          render={({ field: { onChange, value } }) => (
            <View style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowGenderDropdown(!showGenderDropdown);
                  setShowCityDropdown(false);
                }}
              >
                <Text style={value ? styles.dropdownText : styles.placeholderText}>
                  {value || "Select Gender"}
                </Text>
              </TouchableOpacity>
              {showGenderDropdown &&
                renderDropdown(genderOptions, (selectedValue) => {
                  onChange(selectedValue);
                  setShowGenderDropdown(false);
                })}
            </View>
          )}
        />
        {errors.gender && <Text style={styles.errorText}>{errors.gender.message}</Text>}
        
        <Text className="font-medium text-[#333] mb-1">Date of Birth: </Text>
        <Controller
          control={control}
          name="dob"
          rules={{ required: "Date of birth is required" }}
          render={({ field: { onChange, value } }) => (
            <>
              <TouchableOpacity
                style={styles.input}
                onPress={() => setShowDobPicker(true)}
              >
                <Text style={{ color: value ? '#000' : '#777', fontSize: 16 }}>
                  {value || 'Select Date of Birth'}
                </Text>
              </TouchableOpacity>

              {showDobPicker && (
                <DateTimePicker
                  value={value ? new Date(value) : new Date()}
                  mode="date"
                  display="default"
                  maximumDate={new Date()} // prevents future dates
                  onChange={(event, selectedDate) => {
                    setShowDobPicker(false);
                    if (selectedDate) {
                      const formattedDate = selectedDate
                        .toISOString()
                        .split('T')[0]; // YYYY-MM-DD
                      onChange(formattedDate);
                    }
                  }}
                />
              )}
            </>
          )}
        />

        {errors.dob && <Text style={styles.errorText}>{errors.dob.message}</Text>}

        
        <Text className="font-medium text-[#333]  mb-1">Address: </Text>
        <Controller
          control={control}
          name="address"
          rules={{ required: "Address is required" }}
          render={({ field: { onChange, value } }) => (
            <View style={{ marginBottom: 8 }}>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => {
                  setShowCityDropdown(!showCityDropdown);
                  setShowGenderDropdown(false);
                }}
              >
                <Text style={value ? styles.dropdownText : styles.placeholderText}>
                  {value || "Select Your City"}
                </Text>
              </TouchableOpacity>
              {showCityDropdown &&
                renderDropdown(cityOptions, (selectedValue) => {
                  onChange(selectedValue);
                  setShowCityDropdown(false);
                })}
            </View>
          )}
        />
        {errors.address && <Text style={styles.errorText}>{errors.address.message}</Text>}

        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit(onSubmit)}>
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
