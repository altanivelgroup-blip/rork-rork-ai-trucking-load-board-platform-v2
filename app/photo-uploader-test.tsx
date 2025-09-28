import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import PhotoUploaderTest from '@/screens/PhotoUploaderTest';
import { theme } from '@/constants/theme';

export default function PhotoUploaderTestScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <PhotoUploaderTest />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
});