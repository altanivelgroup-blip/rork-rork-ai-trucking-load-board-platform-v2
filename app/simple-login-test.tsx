import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function SimpleLoginTest() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();

  const testAdminLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[SimpleLoginTest] Testing admin login...');
      await login('admin@loadrush.com', 'admin123', 'admin');
      console.log('[SimpleLoginTest] Admin login successful!');
      Alert.alert('Success', 'Admin login worked! Redirecting to admin panel...');
      setTimeout(() => {
        router.replace('/(tabs)/admin' as any);
      }, 1000);
    } catch (error: any) {
      console.error('[SimpleLoginTest] Admin login failed:', error);
      Alert.alert('Error', error.message || 'Admin login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testDriverLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[SimpleLoginTest] Testing driver login...');
      await login('driver@test.com', 'driver123', 'driver');
      console.log('[SimpleLoginTest] Driver login successful!');
      Alert.alert('Success', 'Driver login worked! Redirecting to dashboard...');
      setTimeout(() => {
        router.replace('/(tabs)/dashboard' as any);
      }, 1000);
    } catch (error: any) {
      console.error('[SimpleLoginTest] Driver login failed:', error);
      Alert.alert('Error', error.message || 'Driver login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testShipperLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[SimpleLoginTest] Testing shipper login...');
      await login('shipper@test.com', 'shipper123', 'shipper');
      console.log('[SimpleLoginTest] Shipper login successful!');
      Alert.alert('Success', 'Shipper login worked! Redirecting to shipper panel...');
      setTimeout(() => {
        router.replace('/(tabs)/shipper' as any);
      }, 1000);
    } catch (error: any) {
      console.error('[SimpleLoginTest] Shipper login failed:', error);
      Alert.alert('Error', error.message || 'Shipper login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Simple Login Test</Text>
      
      <View style={styles.status}>
        <Text style={styles.statusText}>Auth Status:</Text>
        <Text style={styles.statusValue}>
          {isAuthenticated ? `Logged in as ${user?.name} (${user?.role})` : 'Not logged in'}
        </Text>
      </View>

      <TouchableOpacity 
        style={[styles.button, styles.adminButton, isLoading && styles.buttonDisabled]} 
        onPress={testAdminLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Admin Login'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testDriverLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Driver Login'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.shipperButton, isLoading && styles.buttonDisabled]} 
        onPress={testShipperLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Shipper Login'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={styles.backButton} 
        onPress={() => router.back()}
      >
        <Text style={styles.backButtonText}>Back</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  status: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 5,
  },
  statusValue: {
    fontSize: 14,
    color: '#666',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    alignItems: 'center',
  },
  adminButton: {
    backgroundColor: '#FF3B30',
  },
  shipperButton: {
    backgroundColor: '#34C759',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    marginTop: 20,
    padding: 10,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#007AFF',
    fontSize: 16,
  },
});