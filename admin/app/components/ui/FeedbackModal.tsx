import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Button } from './Button';
import { Modal } from './Modal';

type FeedbackType = 'success' | 'error' | 'info' | 'warning';

interface FeedbackModalProps {
  visible: boolean;
  type?: FeedbackType;
  title?: string;
  message: string;
  onClose: () => void;
}

const feedbackConfig = {
  success: { icon: 'check-circle' as const, color: '#16a34a', bg: '#dcfce7', border: '#bbf7d0', title: 'Success' },
  error: { icon: 'alert-circle' as const, color: '#dc2626', bg: '#fee2e2', border: '#fecaca', title: 'Something went wrong' },
  info: { icon: 'info' as const, color: '#2563eb', bg: '#dbeafe', border: '#bfdbfe', title: 'Notice' },
  warning: { icon: 'alert-triangle' as const, color: '#d97706', bg: '#fef3c7', border: '#fde68a', title: 'Check this first' },
};

export const FeedbackModal: React.FC<FeedbackModalProps> = ({
  visible,
  type = 'success',
  title,
  message,
  onClose,
}) => {
  const config = feedbackConfig[type];

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      size="sm"
      showCloseButton={false}
      containerStyle={styles.modal}
      footer={
        <View style={{ alignItems: 'center' }}>
          <Button
            variant={type === 'error' ? 'danger' : 'primary'}
            onPress={onClose}
          >
            OK
          </Button>
        </View>
      }
    >
      <View style={styles.content}>
        <View style={[styles.iconWrap, { backgroundColor: config.bg, borderColor: config.border }]}>
          <Feather name={config.icon} size={28} color={config.color} />
        </View>
        <Text style={styles.title}>{title || config.title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    maxWidth: 420,
  },
  content: {
    alignItems: 'center',
    gap: 10,
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    textAlign: 'center',
  },
});
