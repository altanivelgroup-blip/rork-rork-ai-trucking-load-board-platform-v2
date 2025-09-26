import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { theme } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/utils/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AppLoadingDebugScreen() {
  const router = useRouter();
  const authState = useAuth();
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev.slice(-20), `${timestamp}: ${message}`]);
  };

  useEffect(() => {
    const collectDebugInfo = async () => {
      addLog('Starting debug info collection...');
      
      try {
        // Firebase auth state
        const firebaseUser = auth.currentUser;
        addLog(`Firebase user: ${firebaseUser ? firebaseUser.uid : 'null'}`);
        
        // AsyncStorage data
        const emergencyUser = await AsyncStorage.getItem('auth:emergency:user');
        addLog(`Emergency user data: ${emergencyUser ? 'exists' : 'null'}`);
        
        // Auth hook state
        addLog(`Auth hook - isLoading: ${authState?.isLoading}`);
        addLog(`Auth hook - user: ${authState?.user ? authState.user.role : 'null'}`);
        addLog(`Auth hook - isAuthenticated: ${authState?.isAuthenticated}`);
        
        setDebugInfo({
          firebaseUser: firebaseUser ? {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            emailVerified: firebaseUser.emailVerified
          } : null,
          emergencyUserExists: !!emergencyUser,
          emergencyUserData: emergencyUser ? JSON.parse(emergencyUser) : null,
          authHookState: {
            isLoading: authState?.isLoading,
            user: authState?.user ? {
              id: authState.user.id,
              role: authState.user.role,
              email: authState.user.email,
              name: authState.user.name
            } : null,
            isAuthenticated: authState?.isAuthenticated,
            isFirebaseAuthenticated: authState?.isFirebaseAuthenticated,
            hasSignedInThisSession: authState?.hasSignedInThisSession
          }
        });
        
        addLog('Debug info collection completed');
      } catch (error) {
        addLog(`Error collecting debug info: ${error}`);
      }
    };

    collectDebugInfo();
    
    // Refresh every 2 seconds
    const interval = setInterval(collectDebugInfo, 2000);
    return () => clearInterval(interval);
  }, [authState]);

  const handleForceLogin = async () => {
    try {
      addLog('Attempting force login...');
      router.push('/login');
    } catch (error) {
      addLog(`Force login failed: ${error}`);
    }
  };

  const handleClearStorage = async () => {
    try {
      addLog('Clearing AsyncStorage...');
      await AsyncStorage.clear();
      addLog('AsyncStorage cleared');
    } catch (error) {
      addLog(`Clear storage failed: ${error}`);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>App Loading Debug</Text>
        <Text style={styles.subtitle}>Diagnosing loading issues</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Current State</Text>
          <Text style={styles.debugText}>
            {JSON.stringify(debugInfo, null, 2)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Logs</Text>
          {logs.map((log, index) => (
            <Text key={index} style={styles.logText}>
              {log}
            </Text>
          ))}
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.button} onPress={handleForceLogin}>
            <Text style={styles.buttonText}>Force Login</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.button, styles.dangerButton]} onPress={handleClearStorage}>
            <Text style={styles.buttonText}>Clear Storage</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.button} onPress={() => router.push('/(tabs)/dashboard')}>
            <Text style={styles.buttonText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  header: {
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  title: {
    fontSize: theme.fontSize.xl,
    fontWeight: '700',
    color: theme.colors.dark,
  },
  subtitle: {
    fontSize: theme.fontSize.sm,
    color: theme.colors.gray,
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: theme.spacing.lg,
  },
  section: {
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.fontSize.lg,
    fontWeight: '600',
    color: theme.colors.dark,
    marginBottom: theme.spacing.sm,
  },
  debugText: {
    fontSize: theme.fontSize.xs,
    fontFamily: 'monospace',
    color: theme.colors.gray,
    backgroundColor: theme.colors.lightGray,
    padding: theme.spacing.sm,
    borderRadius: theme.borderRadius.sm,
  },
  logText: {
    fontSize: theme.fontSize.xs,
    fontFamily: 'monospace',
    color: theme.colors.dark,
    marginBottom: 2,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    alignItems: 'center',
  },
  dangerButton: {
    backgroundColor: theme.colors.error,
  },
  buttonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSize.md,
  },
});