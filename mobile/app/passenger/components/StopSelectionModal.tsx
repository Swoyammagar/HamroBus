import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { type Stop } from '../context/PassengerContext';
import { formatTime } from '../utils/helpers';

type StopSelectionModalProps = {
  visible: boolean;
  title: string;
  stops: Stop[];
  selectedStopId?: string;
  onClose: () => void;
  onSelect: (stop: Stop) => void;
  isStopDisabled?: (stop: Stop) => boolean;
};

const resolveStopId = (stop?: Stop | null): string => String(stop?._id || stop?.id || '');

const StopSelectionModal = ({
  visible,
  title,
  stops,
  selectedStopId,
  onClose,
  onSelect,
  isStopDisabled,
}: StopSelectionModalProps) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>

          <Text style={styles.modalTitle}>{title}</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {stops.map((stop, index) => {
              const stopId = resolveStopId(stop) || String(index);
              const selected = selectedStopId && selectedStopId === stopId;
              const disabled = Boolean(isStopDisabled?.(stop));

              return (
                <TouchableOpacity
                  key={stopId}
                  style={[
                    styles.stopOption,
                    selected && styles.stopOptionSelected,
                    disabled && styles.stopOptionDisabled,
                  ]}
                  onPress={() => onSelect(stop)}
                  disabled={disabled}
                >
                  <View style={[styles.stopOptionDot, selected && styles.stopOptionDotSelected]} />
                  <View style={styles.stopOptionContent}>
                    <Text style={styles.stopOptionName}>{stop.name}</Text>
                    <Text style={styles.stopOptionTime}>
                      {formatTime(stop.estimatedArrival || new Date().toISOString())}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    maxHeight: '90%',
  },
  closeButton: {
    alignSelf: 'flex-start',
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2937',
    marginVertical: 8,
    marginBottom: 12,
  },
  stopOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  stopOptionSelected: {
    backgroundColor: '#eff6ff',
  },
  stopOptionDisabled: {
    opacity: 0.5,
  },
  stopOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#d1d5db',
    marginRight: 12,
  },
  stopOptionDotSelected: {
    backgroundColor: '#3b82f6',
  },
  stopOptionContent: {
    flex: 1,
  },
  stopOptionName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1f2937',
  },
  stopOptionTime: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 2,
  },
});

export default StopSelectionModal;
