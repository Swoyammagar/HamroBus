import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { palette, spacing, radius, shadow } from '../theme';

type Props = {
  visible: boolean;
  onClose: () => void;
  onScanned: (qrData: string) => Promise<void> | void;
};

export default function BookingQrScannerModal({ visible, onClose, onScanned }: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (!permission?.granted) {
      requestPermission();
    }
  }, [visible, permission?.granted, requestPermission]);

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanning) return;
    setScanning(true);

    try {
      await onScanned(data);
      onClose();
    } catch (error: any) {
      Alert.alert('Scan Failed', error?.response?.data?.message || error?.message || 'Unable to verify this QR.');
    } finally {
      setScanning(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Scan Passenger QR</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <Feather name="x" size={18} color="#FFFFFF" />
          </Pressable>
        </View>

        {!permission?.granted ? (
          <View style={styles.stateWrap}>
            <ActivityIndicator size="large" color="#FFFFFF" />
            <Text style={styles.stateText}>Requesting camera permission...</Text>
          </View>
        ) : (
          <>
            <View style={styles.cameraWrap}>
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                barcodeScannerSettings={{
                  barcodeTypes: ['qr'],
                }}
                onBarcodeScanned={scanning ? undefined : handleBarcodeScanned}
              />

              <View style={styles.overlay}>
                <View style={styles.frame} />
                <Text style={styles.helpText}>Align the QR code inside the frame</Text>
              </View>
            </View>

            <Pressable style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </Pressable>
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 52,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...shadow.card,
  },
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  frame: {
    width: 240,
    height: 240,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    borderRadius: 18,
    backgroundColor: 'transparent',
  },
  helpText: {
    color: '#FFFFFF',
    marginTop: 16,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    marginTop: spacing.md,
    color: '#FFFFFF',
  },
  cancelBtn: {
    margin: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    paddingVertical: 14,
  },
  cancelBtnText: {
    fontWeight: '700',
    color: palette.text,
  },
});
