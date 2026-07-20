import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { qrPaymentService } from '../services/qrPaymentService';

export default function QrScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission?.granted, requestPermission]);

  const handleScanned = async ({ data }: { data: string }) => {
    if (scanning) return;
    setScanning(true);

    try {
      const trip = await qrPaymentService.resolveTrip(data);
      router.replace({
        pathname: './qr-payment',
        params: {
          tripData: encodeURIComponent(JSON.stringify(trip)),
        },
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Unable to read this bus QR.';
      Alert.alert('QR Scan Failed', message, [
        {
          text: 'Try Again',
          onPress: () => setScanning(false),
        },
        {
          text: 'Close',
          onPress: () => router.replace('/passenger/(tabs)/home'),
          style: 'cancel',
        },
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.iconButton} onPress={() => router.replace('/passenger/(tabs)/home')}>
          <Ionicons name="close" size={22} color="#ffffff" />
        </Pressable>
        <Text style={styles.title}>Scan Bus QR</Text>
        <View style={styles.iconButtonPlaceholder} />
      </View>

      {!permission?.granted ? (
        <View style={styles.stateWrap}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.stateText}>Requesting camera permission...</Text>
        </View>
      ) : (
        <View style={styles.cameraWrap}>
          <CameraView
            style={StyleSheet.absoluteFillObject}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={scanning ? undefined : handleScanned}
          />
          <View style={styles.overlay}>
            <View style={styles.frame} />
            <Text style={styles.helpText}>Align the bus payment QR inside the frame</Text>
            {scanning ? <ActivityIndicator color="#ffffff" style={{ marginTop: 14 }} /> : null}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 52,
  },
  header: {
    paddingHorizontal: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconButtonPlaceholder: {
    width: 38,
    height: 38,
  },
  cameraWrap: {
    flex: 1,
    marginHorizontal: 16,
    marginBottom: 24,
    borderRadius: 18,
    overflow: 'hidden',
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
    borderColor: '#ffffff',
    borderRadius: 18,
  },
  helpText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 24,
  },
  stateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateText: {
    color: '#ffffff',
    marginTop: 12,
  },
});
