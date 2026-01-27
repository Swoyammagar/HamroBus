import React, { useState } from "react";
import {
  Text,
  View,
  Image,
  TouchableOpacity,
} from "react-native";
import mainLogo from "../utils/MainLogo.png"
import { router, Stack, useRouter } from "expo-router";

const Preference: React.FC = () => {
    return (
        <>
      <Stack.Screen options={{ headerShown: false }} />
        <View className="flex-1 min-h-screen bg-[#f9f9f9] items-center py-10">
          <View className="w-full mt-6 flex-col lg:flex-row items-center justify-between max-w-[1200px]">

            {/* Left Side */}
            
                <View style={{ marginBottom: 40, justifyContent: "center", alignItems: "center" }}>
                    <Image
                        source={mainLogo}
                        style={{ width: 150, height: 70, resizeMode: "contain" }}
                    />
                </View>

              {/* Heading */}
                <View className="flex-row mb-4 justify-center">
                    <Text className="text-3xl font-medium text-black">Choose Your</Text>
                    <Text className="text-3xl font-medium text-[#27AE60] ml-2">Preference</Text>
                </View>
                <View className="mt-4">
                    <TouchableOpacity className="bg-[#27AE60] rounded-lg p-9 py-3 mb-4">
                        <Text className="text-white text-center text-base font-medium" onPress={()=>router.push("/passenger/signupScreens/email")}>Sign Up as Passenger</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="bg-[#27AE60] rounded-lg py-3">
                        <Text className="text-white text-center text-base font-medium" onPress={()=>router.push("/driver/signupScreens/emailPage")}>Sign Up as Driver</Text>
                    </TouchableOpacity>
                </View>   
            </View>
          </View>
       
      </>
    );
}
export default Preference