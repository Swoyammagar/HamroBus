import React, { createContext, useContext, useState, ReactNode } from 'react';

interface PassengerSignupData {
  firstName?: string;
  lastName?: string;
  email?: string;
  gender?: string;
  dob?: Date;
  address?: string;
  profileImage?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  password?: string;
}

interface PassengerSignupContextType {
  signupData: PassengerSignupData;
  updateSignupData: (data: Partial<PassengerSignupData>) => void;
  resetSignupData: () => void;
}

const PassengerSignupContext = createContext<PassengerSignupContextType | undefined>(undefined);

export const PassengerSignupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [signupData, setSignupData] = useState<PassengerSignupData>({});

  const updateSignupData = (data: Partial<PassengerSignupData>) => {
    setSignupData((prev) => ({ ...prev, ...data }));
  };

  const resetSignupData = () => {
    setSignupData({});
  };

  return (
    <PassengerSignupContext.Provider value={{ signupData, updateSignupData, resetSignupData }}>
      {children}
    </PassengerSignupContext.Provider>
  );
};

export const usePassengerSignup = () => {
  const context = useContext(PassengerSignupContext);
  if (!context) {
    throw new Error('usePassengerSignup must be used within PassengerSignupProvider');
  }
  return context;
};
