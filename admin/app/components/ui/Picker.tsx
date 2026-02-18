import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  Modal,
  ViewStyle,
} from 'react-native';
import { ChevronDown, X } from 'lucide-react-native';

export interface PickerOption {
  label: string;
  value: string | number;
}

interface PickerProps {
  label?: string;
  value: string | number | null | undefined;
  onSelect: (value: string | number) => void;
  options: PickerOption[];
  placeholder?: string;
  error?: string;
  containerStyle?: ViewStyle;
  disabled?: boolean;
  allowClear?: boolean; // NEW: Allow clearing the selection
  onClear?: () => void; // NEW: Callback when cleared
}

export const Picker: React.FC<PickerProps> = ({
  label,
  value,
  onSelect,
  options,
  placeholder = 'Select an option',
  error,
  containerStyle,
  disabled = false,
  allowClear = false,
  onClear,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;
  const hasValue = !!selectedOption;

  const handleSelect = (optionValue: string | number) => {
    onSelect(optionValue);
    setIsOpen(false);
  };

  const handleClear = (e: any) => {
    e?.stopPropagation?.();
    if (onClear) {
      onClear();
    } else {
      onSelect('');
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <TouchableOpacity
        onPress={() => !disabled && setIsOpen(true)}
        style={[
          styles.trigger,
          error && styles.triggerError,
          disabled && styles.triggerDisabled,
        ]}
        disabled={disabled}
      >
        <Text
          style={[
            styles.triggerText,
            !selectedOption && styles.placeholderText,
          ]}
        >
          {displayValue}
        </Text>
        <View style={styles.iconContainer}>
          {allowClear && hasValue && !disabled && (
            <TouchableOpacity 
              onPress={handleClear}
              style={styles.clearButton}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="#6b7280" />
            </TouchableOpacity>
          )}
          <ChevronDown size={20} color="#6b7280" />
        </View>
      </TouchableOpacity>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.dropdown}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => handleSelect(item.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      item.value === value && styles.optionTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  trigger: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
  },
  triggerError: {
    borderColor: '#ef4444',
  },
  triggerDisabled: {
    backgroundColor: '#f3f4f6',
    opacity: 0.6,
  },
  triggerText: {
    fontSize: 16,
    color: '#111827',
    flex: 1,
  },
  placeholderText: {
    color: '#9ca3af',
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearButton: {
    padding: 2,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dropdown: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    maxHeight: 300,
    width: '80%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  option: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  optionSelected: {
    backgroundColor: '#ecfdf5',
  },
  clearOption: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 2,
    borderBottomColor: '#dc2626',
  },
  optionText: {
    fontSize: 16,
    color: '#111827',
  },
  optionTextSelected: {
    color: '#059669',
    fontWeight: '500',
  },
  clearOptionText: {
    color: '#dc2626',
    fontWeight: '500',
  },
});