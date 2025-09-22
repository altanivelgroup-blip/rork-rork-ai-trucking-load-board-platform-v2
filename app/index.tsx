import { Redirect, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  debugButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: '#007AFF',
    padding: 10,
    borderRadius: 5,
  },
  debugButtonText: {
    color: 'white',
    fontSize: 12,
  },
  emergencyButton: {
    backgroundColor: '#FF3B30',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  emergencyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  timeoutText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});

export default function Index() {
  const authState = useAuth();
  const router = useRouter();
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  console.log('[Index] Auth state:', {
    hasAuthState: !!authState,
    isLoading: authState?.isLoading,
    hasUser: !!authState?.user,
    userRole: authState?.user?.role,
    userEmail: authState?.user?.email,
  });

  // Set a timeout to show emergency bypass if loading takes too long
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!authState || authState.isLoading) {
        console.log('[Index] Loading timeout - showing emergency bypass');
        setLoadingTimeout(true);
      }
    }, 5000); // 5 second timeout

    return () => clearTimeout(timer);
  }, [authState]);

  const handleEmergencyBypass = () => {
    console.log('[Index] Emergency bypass - going to login');
    router.replace('/(auth)/login');
  };

  // Show loading while auth is initializing
  if (!authState || authState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity 
          style={styles.debugButton} 
          onPress={() => router.push('/simple-auth-test')}
        >
          <Text style={styles.debugButtonText}>Debug</Text>
        </TouchableOpacity>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
        
        {loadingTimeout && (
          <View>
            <Text style={styles.timeoutText}>
              App is taking longer than expected to load.
            </Text>
            <TouchableOpacity 
              style={styles.emergencyButton}
              onPress={handleEmergencyBypass}
            >
              <Text style={styles.emergencyButtonText}>Continue to Login</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.emergencyButton, { backgroundColor: '#34C759' }]}
              onPress={() => router.replace('/emergency-login')}
            >
              <Text style={styles.emergencyButtonText}>Emergency Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  const user = authState.user;

  // If no user, redirect to sign in
  if (!user) {
    console.log('[Index] No user found, redirecting to login');
    return <Redirect href="/(auth)/login" />;
  }

  // If user is authenticated, redirect to appropriate dashboard
  console.log('[Index] User authenticated, redirecting based on role:', user.role);
  
  if (user.role === 'admin') {
    return <Redirect href="/(tabs)/admin" />;
  }
  if (user.role === 'shipper') {
    return <Redirect href="/(tabs)/shipper" />;
  }
  return <Redirect href="/(tabs)/dashboard" />;
}
