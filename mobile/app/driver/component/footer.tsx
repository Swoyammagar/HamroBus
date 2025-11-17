import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react"; 
import { Feather } from '@expo/vector-icons';

export type MenuKey = 'home' | 'schedules' | 'map' | 'history' | 'profile' 
// Use keyof typeof Feather.glyphMap as the Feather icon name type
type FeatherIconName = keyof typeof Feather.glyphMap;

const ICON_MAP: Record<MenuKey, FeatherIconName> = {
  home: 'home',
  schedules: 'calendar',
  map: 'map',
  history: 'clock',
  profile: 'user',
};

const Footer: React.FC<{ onSelect: (key: MenuKey) => void }> = ({ onSelect }) => {
  const [selectedKey, setSelectedKey] = useState<MenuKey>('home');
  const items: { key: MenuKey }[] = [
    { key: 'home' },
    { key: 'schedules' },
    { key: 'map' },
    { key: 'history' },
    { key: 'profile' },
  ];
  const handleSelect = (key: MenuKey) => {
    setSelectedKey(key);
    onSelect(key);
  }

  return (
    <View style={styles.container}>
      <View style={styles.menu}>
        {items.map(({ key }) => (
          <TouchableOpacity
            key={key}
            style={[
              styles.menuItem
            ]}
            onPress={() => handleSelect(key)}
          >
            <Feather
              name={ICON_MAP[key]}
              size={24}
              color={selectedKey === key ? "#007AFF" : "#8E8E93"}
            />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )
}
const styles = StyleSheet.create({
  container: {
    height: 60,
    borderTopWidth: 1,
    borderColor: "#D1D1D6",
  },
  menu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    flex: 1,
  },
  menuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

});
export default Footer;