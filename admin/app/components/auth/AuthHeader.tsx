import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AuthHeaderProps {
  title: string;
  highlightedWord?: string;
  logo?: any;
}

export const AuthHeader: React.FC<AuthHeaderProps> = ({
  title,
  highlightedWord,
  logo,
}) => {
  const titleParts = highlightedWord ? title.split(highlightedWord) : [title];

  return (
    <View style={styles.container}>
      {logo && (
        <View style={styles.logoContainer}>
          <Image source={logo} style={styles.logo} resizeMode="contain" />
        </View>
      )}
      
      <View style={styles.titleContainer}>
        <Text style={styles.title}>
          {titleParts[0]}
          {highlightedWord && (
            <Text style={styles.highlighted}>{highlightedWord}</Text>
          )}
          {titleParts[1]}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 80,
  },
  titleContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  title: {
    fontSize: 32,
    fontWeight: '500',
    color: '#000000',
  },
  highlighted: {
    color: '#27AE60',
  },
});
