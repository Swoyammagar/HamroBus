import { useContext, createContext, useState } from 'react';

type AppContextType = {
  isOnline: boolean;
  setIsOnline: (value: boolean) => void;
  menuOpen: boolean;
  setMenuOpen: (value: boolean) => void;
  showSOS: boolean;
  setShowSOS: (value: boolean) => void;
  announcement: { show: boolean; message: string; type: 'info' | 'warning' | 'emergency' };
  setAnnouncement: (value: any) => void;
};

export const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [announcement, setAnnouncement] = useState({
    show: true,
    message: 'Route 42 - Minor delay expected on Main St due to traffic',
    type: 'warning' as 'info' | 'warning' | 'emergency',
  });

  return (
    <AppContext.Provider value={{ isOnline, setIsOnline, menuOpen, setMenuOpen, showSOS, setShowSOS, announcement, setAnnouncement }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppContext must be used within AppProvider');
  return context;
}
