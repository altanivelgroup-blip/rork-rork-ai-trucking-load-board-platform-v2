import React from 'react';
import { Redirect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StyleSheet } from 'react-native';

export default function LoginAlias() {
  console.log('[LoginAlias] Ensuring sign-in route is always available -> redirecting to /(auth)/login');
  return (
    <SafeAreaView style={styles.container} testID="login-alias-safe">
      <Redirect href="/(auth)/login" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});
