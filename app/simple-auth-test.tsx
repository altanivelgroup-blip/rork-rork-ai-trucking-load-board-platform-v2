import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';

export default function SimpleAuthTest() {
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.text}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>Auth Test Page</Text>
      
      {user ? (
        <View style={styles.userInfo}>
          <Text style={styles.text}>✅ User is logged in!</Text>
          <Text style={styles.text}>Email: {user.email}</Text>
          <Text style={styles.text}>Role: {user.role}</Text>
          <Text style={styles.text}>Name: {user.name}</Text>
          
          <TouchableOpacity style={styles.button} onPress={() => {
            if (user.role === 'admin') {
              router.push('/(tabs)/admin');
            } else if (user.role === 'shipper') {
              router.push('/(tabs)/shipper');
            } else {
              router.push('/(tabs)/dashboard');
            }
          }}>
            <Text style={styles.buttonText}>Go to Dashboard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={logout}>
            <Text style={styles.buttonText}>Logout</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.userInfo}>
          <Text style={styles.text}>❌ No user logged in</Text>
          
          <TouchableOpacity style={styles.button} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.buttonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: theme.colors.white,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  userInfo: {
    alignItems: 'center',
    gap: 10,
  },
  text: {
    fontSize: 16,
    marginBottom: 5,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
    minWidth: 200,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: theme.colors.danger,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});