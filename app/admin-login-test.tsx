import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';
import { theme } from '@/constants/theme';

export default function AdminLoginTest() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { login, user, isAuthenticated } = useAuth();

  const testAdminLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[AdminLoginTest] Testing admin login...');
      await login('admin@loadrush.com', 'admin123', 'admin');
      console.log('[AdminLoginTest] Admin login successful');
      Alert.alert('Success', 'Admin login successful! Navigating to admin tab...');
      router.replace('/(tabs)/admin');
    } catch (error: any) {
      console.error('[AdminLoginTest] Admin login failed:', error);
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testDriverLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[AdminLoginTest] Testing driver login...');
      await login('driver@test.com', 'driver123', 'driver');
      console.log('[AdminLoginTest] Driver login successful');
      Alert.alert('Success', 'Driver login successful! Navigating to dashboard...');
      router.replace('/(tabs)/dashboard');
    } catch (error: any) {
      console.error('[AdminLoginTest] Driver login failed:', error);
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testShipperLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[AdminLoginTest] Testing shipper login...');
      await login('shipper@test.com', 'shipper123', 'shipper');
      console.log('[AdminLoginTest] Shipper login successful');
      Alert.alert('Success', 'Shipper login successful! Navigating to shipper dashboard...');
      router.replace('/(tabs)/shipper');
    } catch (error: any) {
      console.error('[AdminLoginTest] Shipper login failed:', error);
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Admin Login Test</Text>
      
      {user && (
        <View style={styles.userInfo}>
          <Text style={styles.userText}>Current User: {user.email}</Text>
          <Text style={styles.userText}>Role: {user.role}</Text>
          <Text style={styles.userText}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
        </View>
      )}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.adminButton]} 
          onPress={testAdminLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Admin Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.driverButton]} 
          onPress={testDriverLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Driver Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.shipperButton]} 
          onPress={testShipperLogin}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Shipper Login</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.backButton]} 
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Back</Text>
        </TouchableOpacity>
      </View>
      
      {isLoading && (
        <Text style={styles.loadingText}>Testing login...</Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.lightGray,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  userInfo: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.lg,
  },
  userText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
  },
  buttonContainer: {
    gap: theme.spacing.md,
  },
  button: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: theme.colors.danger,
  },
  driverButton: {
    backgroundColor: theme.colors.primary,
  },
  shipperButton: {
    backgroundColor: theme.colors.secondary,
  },
  backButton: {
    backgroundColor: theme.colors.gray,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  loadingText: {
    textAlign: 'center',
    marginTop: theme.spacing.lg,
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
  },
});