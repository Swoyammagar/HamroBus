import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import React, { useState } from "react";
import { Feather } from '@expo/vector-icons';

export type MenuKey = 'home' | 'schedules' | 'map' | 'history' | 'profile';

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

  const items: MenuKey[] = ['home', 'schedules', 'map', 'history', 'profile'];

  const handleSelect = (key: MenuKey) => {
    setSelectedKey(key);
    onSelect(key);
  };

  return (
    <View style={styles.container}>
      <View style={styles.menu}>
        {items.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.menuItem, selectedKey === key && styles.menuItemActive]}
            onPress={() => handleSelect(key)}
            activeOpacity={0.7}
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
  );
};

const styles = StyleSheet.create({
  container: {
    height: 60,
    width: "100%",
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderColor: "#ddd",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
  },

  menu: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: "100%",
    paddingHorizontal: 20,
  },

  menuItem: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
  },

  menuItemActive: {
    transform: [{ translateY: -2 }],
  },
});

export default Footer;
