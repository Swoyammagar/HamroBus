import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';
import apiClient from './apiClient';

export type PushUserType = 'driver' | 'passenger';

const PUSH_TOKEN_STORAGE_KEY = 'expoPushToken';
const PUSH_TOKEN_USER_TYPE_KEY = 'expoPushTokenUserType';
const api = apiClient.getAxiosInstance();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

const getProjectId = () =>
  Constants.expoConfig?.extra?.eas?.projectId || Constants.easConfig?.projectId;

export const setupAndroidNotificationChannel = async () => {
  if (Platform.OS !== 'android') return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#0f766e',
  });
};

export const getExpoPushToken = async () => {
  await setupAndroidNotificationChannel();

  const existingPermission = await Notifications.getPermissionsAsync();
  let finalStatus = existingPermission.status;

  if (finalStatus !== 'granted') {
    const requestedPermission = await Notifications.requestPermissionsAsync();
    finalStatus = requestedPermission.status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = getProjectId();
  if (!projectId) {
    console.warn('EAS projectId is missing. Cannot create Expo push token.');
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
};

export const registerDeviceForPushNotifications = async (userType: PushUserType) => {
  try {
    const pushToken = await getExpoPushToken();
    if (!pushToken) return null;

    await api.post('/notifications/push-token', {
      userType,
      pushToken,
    });

    await AsyncStorage.multiSet([
      [PUSH_TOKEN_STORAGE_KEY, pushToken],
      [PUSH_TOKEN_USER_TYPE_KEY, userType],
    ]);

    return pushToken;
  } catch (error) {
    console.warn('Push token registration failed:', error);
    return null;
  }
};

export const unregisterDeviceForPushNotifications = async (userType?: PushUserType) => {
  try {
    const [storedToken, storedUserType] = await Promise.all([
      AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY),
      AsyncStorage.getItem(PUSH_TOKEN_USER_TYPE_KEY),
    ]);

    const resolvedUserType = userType || (storedUserType as PushUserType | null);
    if (!resolvedUserType) return;

    await api.delete('/notifications/push-token', {
      data: {
        userType: resolvedUserType,
        pushToken: storedToken,
      },
    });
  } catch (error) {
    console.warn('Push token unregister failed:', error);
  } finally {
    await AsyncStorage.multiRemove([PUSH_TOKEN_STORAGE_KEY, PUSH_TOKEN_USER_TYPE_KEY]);
  }
};

export const observePushNotificationTaps = () => {
  const redirect = (notification: Notifications.Notification) => {
    const url = notification.request.content.data?.url;
    if (typeof url === 'string' && url.length > 0) {
      router.push(url as any);
    }
  };

  const lastResponse = Notifications.getLastNotificationResponse();
  if (lastResponse?.notification) {
    redirect(lastResponse.notification);
  }

  return Notifications.addNotificationResponseReceivedListener((response) => {
    redirect(response.notification);
  });
};
