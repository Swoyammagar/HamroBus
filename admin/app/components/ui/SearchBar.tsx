import React from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Search, X } from 'lucide-react-native';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onClear?: () => void;
  showRefresh?: boolean;
  onRefresh?: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
  value,
  onChangeText,
  placeholder = 'Search...',
  onClear,
  showRefresh = false,
  onRefresh,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.inputWrapper}>
        <Search size={18} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          style={styles.input}
          clearButtonMode="while-editing"
        />
      </View>
      
      {value.length > 0 && onClear && (
        <TouchableOpacity onPress={onClear} style={styles.button}>
          <X size={18} color="#6b7280" />
        </TouchableOpacity>
      )}
      
      {showRefresh && onRefresh && (
        <TouchableOpacity onPress={onRefresh} style={styles.button}>
          <Text style={styles.buttonText}>Refresh</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#374151',
    fontWeight: '500',
  },
});
