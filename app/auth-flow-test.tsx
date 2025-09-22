import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

export default function AuthTestScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout, isAuthenticated } = useAuth();
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const handleTestSignUp = () => {
    addTestResult('Navigating to sign-up screen...');
    router.push('/(auth)/signup');
  };

  const handleTestSignIn = () => {
    addTestResult('Navigating to sign-in screen...');
    router.push('/(auth)/login');
  };

  const handleLogout = async () => {
    try {
      addTestResult('Logging out...');
      await logout();
      addTestResult('Logout successful');
    } catch (error) {
      addTestResult(`Logout failed: ${error}`);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Auth Flow Test' }} />
      <ScrollView 
        style={[styles.container, { paddingTop: insets.top }]} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom }]}
      >
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Sign-In/Sign-Up Flow Test</Text>
          <Text style={styles.subtitle}>Test the simplified authentication flows</Text>
        </View>

        {/* Current Auth Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current Authentication Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Authenticated:</Text>
            <Text style={[styles.statusValue, { color: isAuthenticated ? theme.colors.success : theme.colors.danger }]}>
              {isAuthenticated ? '✅ Yes' : '❌ No'}
            </Text>
          </View>
          {user && (
            <>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>User ID:</Text>
                <Text style={styles.statusValue}>{user.id}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Email:</Text>
                <Text style={styles.statusValue}>{user.email}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Role:</Text>
                <Text style={styles.statusValue}>{user.role}</Text>
              </View>
              <View style={styles.statusRow}>
                <Text style={styles.statusLabel}>Name:</Text>
                <Text style={styles.statusValue}>{user.name}</Text>
              </View>
            </>
          )}
        </View>

        {/* Test Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Actions</Text>
          
          <TouchableOpacity style={styles.testButton} onPress={handleTestSignUp}>
            <Text style={styles.testButtonText}>Test Sign-Up Flow</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.testButton} onPress={handleTestSignIn}>
            <Text style={styles.testButtonText}>Test Sign-In Flow</Text>
          </TouchableOpacity>
          
          {isAuthenticated && (
            <TouchableOpacity style={[styles.testButton, styles.logoutButton]} onPress={handleLogout}>
              <Text style={styles.testButtonText}>Test Logout</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity style={[styles.testButton, styles.clearButton]} onPress={clearResults}>
            <Text style={styles.testButtonText}>Clear Test Results</Text>
          </TouchableOpacity>
        </View>

        {/* Test Instructions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Instructions</Text>
          <Text style={styles.instructionText}>
            1. Test Sign-Up: Create a new account with email/password{'\n'}
            2. Verify profile is created in Firestore &apos;users&apos; collection{'\n'}
            3. Check role-based redirect works correctly{'\n'}
            4. Test Sign-In: Sign in with existing credentials{'\n'}
            5. Verify profile loads and redirect works{'\n'}
            6. Test error handling with invalid credentials
          </Text>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          {testResults.length === 0 ? (
            <Text style={styles.noResults}>No test results yet</Text>
          ) : (
            <View style={styles.resultsContainer}>
              {testResults.map((result, index) => (
                <Text key={`result-${index}-${result.slice(0, 10)}`} style={styles.resultText}>
                  {result}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Expected Behavior */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Expected Behavior</Text>
          <Text style={styles.expectedText}>
            ✅ Sign-Up: Validate input → Create Firebase user → Save profile to Firestore → Redirect by role{'\n'}
            ✅ Sign-In: Validate input → Authenticate → Load/create profile → Redirect by role{'\n'}
            ✅ Error handling: Show user-friendly messages for auth errors{'\n'}
            ✅ Cross-platform: Works on iOS, Android, and web{'\n'}
            ✅ Logging: Console shows &apos;Sign-Up/In Rewritten: Success for [UID]&apos;
          </Text>
        </View>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.lightGray,
  },
  content: {
    padding: theme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: theme.fontSize.md,
    color: theme.colors.gray,
    textAlign: 'center',
  },
  section: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.md,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  statusLabel: {
    fontSize: theme.fontSize.md,
    color: theme.colors.dark,
    flex: 1,
  },
  statusValue: {
    fontSize: theme.fontSize.md,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  testButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  logoutButton: {
    backgroundColor: theme.colors.warning,
  },
  clearButton: {
    backgroundColor: theme.colors.gray,
  },
  testButtonText: {
    color: theme.colors.white,
    fontSize: theme.fontSize.md,
    fontWeight: '600',
  },
  instructionText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    lineHeight: 20,
  },
  noResults: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: theme.spacing.md,
  },
  resultsContainer: {
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.sm,
    maxHeight: 200,
  },
  resultText: {
    fontSize: theme.fontSize.xs,
    color: theme.colors.dark,
    marginBottom: theme.spacing.xs,
    fontFamily: 'monospace',
  },
  expectedText: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.dark,
    lineHeight: 20,
  },
});