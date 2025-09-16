import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function SimpleLoginTest() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();

  const testLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[SimpleLoginTest] Testing login...');
      await login('test@example.com', 'password123', 'driver');
      console.log('[SimpleLoginTest] Login successful!');
      Alert.alert('Success', 'Login worked! Redirecting to dashboard...');
      setTimeout(() => {
        router.replace('/(tabs)/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('[SimpleLoginTest] Login failed:', error);
      Alert.alert('Error', error.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  const testGuestLogin = async () => {
    setIsLoading(true);
    try {
      console.log('[SimpleLoginTest] Testing guest login...');
      await login('guest@example.com', 'guest', 'driver');
      console.log('[SimpleLoginTest] Guest login successful!');
      Alert.alert('Success', 'Guest login worked! Redirecting to dashboard...');
      setTimeout(() => {
        router.replace('/(tabs)/dashboard');
      }, 1000);
    } catch (error: any) {
      console.error('[SimpleLoginTest] Guest login failed:', error);
      Alert.alert('Error', error.message || 'Guest login failed');
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
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Regular Login'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.guestButton, isLoading && styles.buttonDisabled]} 
        onPress={testGuestLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Guest Login'}
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
  guestButton: {
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