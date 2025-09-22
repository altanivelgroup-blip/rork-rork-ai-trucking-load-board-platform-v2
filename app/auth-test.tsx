import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function AuthTestScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();

  const testSignUp = async () => {
    setIsLoading(true);
    try {
      // Navigate to sign-up with test data
      router.push('/(auth)/signup');
    } catch (error: any) {
      Alert.alert('Sign-Up Test Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const testSignIn = async () => {
    setIsLoading(true);
    try {
      // Navigate to sign-in
      router.push('/(auth)/login');
    } catch (error: any) {
      Alert.alert('Sign-In Test Failed', error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const goToDashboard = () => {
    router.push('/(tabs)/dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Auth Flow Test</Text>
        
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Current Auth Status</Text>
          <Text style={styles.statusText}>Loading: {authLoading ? 'Yes' : 'No'}</Text>
          <Text style={styles.statusText}>Authenticated: {isAuthenticated ? 'Yes' : 'No'}</Text>
          <Text style={styles.statusText}>User: {user ? `${user.name} (${user.role})` : 'None'}</Text>
          <Text style={styles.statusText}>Email: {user?.email || 'None'}</Text>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.button}
            onPress={testSignUp}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Sign-Up Flow</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={testSignIn}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>Test Sign-In Flow</Text>
          </TouchableOpacity>

          {isAuthenticated && (
            <TouchableOpacity
              style={[styles.button, styles.dashboardButton]}
              onPress={goToDashboard}
            >
              <Text style={styles.buttonText}>Go to Dashboard</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.instructions}>
          <Text style={styles.instructionsTitle}>Test Instructions:</Text>
          <Text style={styles.instructionsText}>
            1. Tap "Test Sign-Up Flow" to create a new account{'\n'}
            2. Fill in email, password, and name{'\n'}
            3. Select role (Driver/Shipper){'\n'}
            4. Tap "Create Account"{'\n'}
            5. Should redirect to dashboard with correct name{'\n'}
            6. Sign out and test sign-in with same credentials
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xxl,
    fontWeight: '700',
    color: theme.colors.dark,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  statusCard: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.xl,
  },
  statusTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  statusText: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    marginBottom: theme.spacing.xs,
  },
  buttonContainer: {
    gap: theme.spacing.md,
    marginBottom: theme.spacing.xl,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  dashboardButton: {
    backgroundColor: theme.colors.success,
  },
  buttonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  instructions: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
  },
  instructionsTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  instructionsText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    lineHeight: 20,
  },
});