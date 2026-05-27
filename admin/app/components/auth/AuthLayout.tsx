import React from 'react';
import { View, Image, ScrollView, StyleSheet } from 'react-native';

interface AuthLayoutProps {
  children: React.ReactNode;
  illustration?: any;
  illustrationSize?: { width: number; height: number };
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  illustration,
  illustrationSize = { width: 460, height: 500 },
}) => {
  return (
    <ScrollView contentContainerStyle={styles.scrollView}>
      <View style={styles.container}>
        <View style={styles.contentWrapper}>
          <View style={styles.formSection}>{children}</View>

          {illustration && (
            <View style={styles.illustrationSection}>
              <Image
                source={illustration}
                style={[styles.illustration, illustrationSize]}
                resizeMode="contain"
              />
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: '#f9f9f9',
  },

  container: {
    flex: 1,
    justifyContent: 'center', // vertical centering
    alignItems: 'center',
    paddingHorizontal: 24,
  },

  contentWrapper: {
    width: '100%',
    maxWidth: 1200,
    flexDirection: 'row',
    alignItems: 'center', // align form + illustration vertically
    justifyContent: 'space-between',
  },

  formSection: {
    width: '100%',
    maxWidth: 520,
  },

  illustrationSection: {
    flex: 1,
    alignItems: 'flex-end',
  },

  illustration: {
    width: 460,
    height: 500,
  },
});

