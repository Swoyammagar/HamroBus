import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { router } from 'expo-router';
import { LoadingSpinner } from '../ui';

interface RequireAuthProps {
  children: React.ReactNode;
}

export const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { loading, token, validateToken } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!token) {
        const ok = await validateToken();
        if (!ok && mounted) {
          router.replace('/pages/login');
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <LoadingSpinner />
      </View>
    );
  }

  if (!token) return null;

  return <>{children}</>;
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
