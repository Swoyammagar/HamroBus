import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { router } from 'expo-router';

const RequireAuth: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { loading, token, validateToken } = useAuth();

  useEffect(() => {
    let mounted = true;
    (async () => {
      // If there's no token, attempt validate (which may refresh)
      if (!token) {
        const ok = await validateToken();
        if (!ok && mounted) {
          // redirect to login
          router.replace('/pages/login');
        }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // If no token after validation, don't render children (redirect in effect)
  if (!token) return null;

  return <>{children}</>;
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});

export default RequireAuth;
