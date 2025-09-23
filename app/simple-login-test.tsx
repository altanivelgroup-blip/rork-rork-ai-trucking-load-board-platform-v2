import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function SimpleLoginTest() {
  const [isLoading, setIsLoading] = useState(false);
  const { login, isAuthenticated, user } = useAuth();
  const router = useRouter();

  const directLogin = async (email: string, password: string, role: string) => {
    setIsLoading(true);
    try {
      console.log(`[SimpleLoginTest] Testing ${role} login with ${email}...`);
      
      // Direct emergency access like in login screen
      const testUsers = {
        'driver@test1.com': { password: 'RealUnlock123', role: 'driver', uid: 'test-driver-uid-001' },
        'shipper@test1.com': { password: 'RealShipper123', role: 'shipper', uid: 'test-shipper-uid-001' },
        'admin@test1.com': { password: 'RealBoss123', role: 'admin', uid: 'test-admin-uid-001' }
      } as const;
      
      const emailTrimmed = email.trim().toLowerCase();
      const passwordTrimmed = password.trim();
      
      const testUser = testUsers[emailTrimmed as keyof typeof testUsers];
      
      if (testUser && passwordTrimmed === testUser.password) {
        console.log(`✅ Credentials match for ${emailTrimmed}!`);
        
        // Store emergency access data
        const AsyncStorage = await import('@react-native-async-storage/async-storage');
        await AsyncStorage.default.setItem('auth:emergency:user', JSON.stringify({
          id: testUser.uid,
          email: emailTrimmed,
          role: testUser.role,
          name: emailTrimmed.split('@')[0].toUpperCase()
        }));
        
        Alert.alert('Success', `Login successful for ${emailTrimmed}`, [
          {
            text: 'Go to Dashboard',
            onPress: () => {
              if (testUser.role === 'admin') {
                router.replace('/(tabs)/admin');
              } else if (testUser.role === 'shipper') {
                router.replace('/(tabs)/shipper');
              } else {
                router.replace('/(tabs)/dashboard');
              }
            }
          }
        ]);
      } else {
        console.log(`❌ Credentials do not match for ${emailTrimmed}`);
        Alert.alert('Error', 'Invalid credentials');
      }
    } catch (error: any) {
      console.error(`[SimpleLoginTest] ${role} login failed:`, error);
      Alert.alert('Error', error.message || `${role} login failed`);
    } finally {
      setIsLoading(false);
    }
  };

  const testDriverLogin = () => directLogin('driver@test1.com', 'RealUnlock123', 'driver');
  const testShipperLogin = () => directLogin('shipper@test1.com', 'RealShipper123', 'shipper');
  const testAdminLogin = () => directLogin('admin@test1.com', 'RealBoss123', 'admin');

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
          {isLoading ? 'Testing...' : 'Test Admin Login (admin@test1.com)'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, isLoading && styles.buttonDisabled]} 
        onPress={testDriverLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Driver Login (driver@test1.com)'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity 
        style={[styles.button, styles.shipperButton, isLoading && styles.buttonDisabled]} 
        onPress={testShipperLogin}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test Shipper Login (shipper@test1.com)'}
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