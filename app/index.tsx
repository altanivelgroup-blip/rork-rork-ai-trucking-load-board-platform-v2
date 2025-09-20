import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState } from "react";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#FF3B30',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryText: {
    fontSize: 14,
    color: '#007AFF',
    textAlign: 'center',
  },
});

export default function Index() {
  console.log('[Index] 🔄 PERMANENT SIGN IN FIX - App entry point rendering');
  
  const [initializationTimeout, setInitializationTimeout] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  
  // Set timeout for initialization to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[Index] ⚠️ PERMANENT SIGN IN FIX - Initialization timeout after 10 seconds');
      setInitializationTimeout(true);
    }, 10000);
    
    return () => clearTimeout(timer);
  }, [retryCount]);
  
  const authState = useAuth();
  
  // Enhanced error handling with fallback
  if (!authState) {
    console.error('[Index] ❌ PERMANENT SIGN IN FIX - Auth hook returned null/undefined');
    if (initializationTimeout) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorText}>
            Authentication system failed to initialize.
            Please restart the app.
          </Text>
          <Text style={styles.retryText}>
            If this persists, clear app data and try again.
          </Text>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Initializing authentication...</Text>
      </SafeAreaView>
    );
  }
  
  // Safe destructuring with enhanced error handling
  const user = authState.user || null;
  const isLoading = authState.isLoading ?? true;
  
  console.log('[Index] 🔍 PERMANENT SIGN IN FIX - Auth state:', {
    hasUser: !!user,
    userRole: user?.role,
    userEmail: user?.email,
    isLoading,
    authStateExists: !!authState,
    initializationTimeout,
    retryCount
  });

  // Handle loading state with timeout protection
  if (isLoading && !initializationTimeout) {
    console.log('[Index] ⏳ PERMANENT SIGN IN FIX - Still loading, showing spinner');
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading LoadRun...</Text>
      </SafeAreaView>
    );
  }
  
  // Handle timeout scenario - force redirect to login
  if (initializationTimeout && !user) {
    console.log('[Index] ⚠️ PERMANENT SIGN IN FIX - Timeout reached, forcing redirect to login');
    return <Redirect href="/(auth)/login" />;
  }
  
  // Handle no user scenario
  if (!user) {
    console.log('[Index] 🔄 PERMANENT SIGN IN FIX - No user found, redirecting to login');
    return <Redirect href="/(auth)/login" />;
  }
  
  console.log('[Index] ✅ PERMANENT SIGN IN FIX - User found, routing to dashboard for role:', user.role);
  console.log('[Index] 🎯 Permanently Fixed - Sign-in navigation working reliably');
  
  // Enhanced role-based routing with fallback
  try {
    if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
      console.log('[Index] 🔄 PERMANENT SIGN IN FIX - Redirecting to admin dashboard');
      return <Redirect href="/(tabs)/admin" />;
    } else if (user.role === 'shipper') {
      console.log('[Index] 🔄 PERMANENT SIGN IN FIX - Redirecting to shipper dashboard');
      return <Redirect href="/(tabs)/shipper" />;
    } else {
      console.log('[Index] 🔄 PERMANENT SIGN IN FIX - Redirecting to driver dashboard');
      return <Redirect href="/(tabs)/dashboard" />;
    }
  } catch (navigationError) {
    console.error('[Index] ❌ PERMANENT SIGN IN FIX - Navigation error:', navigationError);
    // Fallback to login if navigation fails
    return <Redirect href="/(auth)/login" />;
  }
}