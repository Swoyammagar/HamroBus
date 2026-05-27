import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DriverSignupData {
  firstName?: string;
  lastName?: string;
  email?: string;
  gender?: string;
  dob?: Date;
  address?: string;
  profileImage?: string;
  phoneNumber?: string;
  emailVerified?: boolean;
  licenseNo?: string;
  licenseImage?: string;

  password?: string;
}

interface DriverSignupContextType {
  signupData: DriverSignupData;
  updateSignupData: (data: Partial<DriverSignupData>) => void;
  resetSignupData: () => void;
}

const DriverSignupContext = createContext<DriverSignupContextType | undefined>(undefined);

export const DriverSignupProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [signupData, setSignupData] = useState<DriverSignupData>({});

  const updateSignupData = (data: Partial<DriverSignupData>) => {
    setSignupData((prev) => ({ ...prev, ...data }));
  };

  const resetSignupData = () => {
    setSignupData({});
  };

  return (
    <DriverSignupContext.Provider value={{ signupData, updateSignupData, resetSignupData }}>
      {children}
    </DriverSignupContext.Provider>
  );
};

export const useDriverSignup = () => {
  const context = useContext(DriverSignupContext);
  if (!context) {
    throw new Error('useDriverSignup must be used within DriverSignupProvider');
  }
  return context;
};
