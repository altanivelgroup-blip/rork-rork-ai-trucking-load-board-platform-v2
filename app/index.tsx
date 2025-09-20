import { Redirect, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, Platform } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, useCallback } from "react";

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
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default function Index() {
  console.log('[Index] 🎯 PERMANENT SIGN IN NAV FIX - App entry point rendering on platform:', Platform.OS);
  
  const [initializationTimeout, setInitializationTimeout] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [navigationAttempts, setNavigationAttempts] = useState<number>(0);
  const router = useRouter();
  
  // Set timeout for initialization to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('[Index] ⚠️ PERMANENT SIGN IN NAV FIX - Initialization timeout after 8 seconds');
      setInitializationTimeout(true);
    }, 8000); // Reduced timeout for faster fallback
    
    return () => clearTimeout(timer);
  }, [retryCount]);
  
  const authState = useAuth();
  
  // PERMANENT FIX: Enhanced retry mechanism with manual navigation
  const handleManualRetry = useCallback(() => {
    console.log('[Index] 🔄 PERMANENT SIGN IN NAV FIX - Manual retry triggered');
    setRetryCount(prev => prev + 1);
    setInitializationTimeout(false);
    setNavigationAttempts(0);
    
    // Force navigation to login as fallback
    try {
      router.replace('/(auth)/login');
    } catch (navError) {
      console.error('[Index] ❌ Manual navigation failed:', navError);
    }
  }, [router]);
  
  // PERMANENT FIX: Enhanced error handling with manual navigation option
  if (!authState) {
    console.error('[Index] ❌ PERMANENT SIGN IN NAV FIX - Auth hook returned null/undefined');
    if (initializationTimeout) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorText}>
            🎯 PERMANENT SIGN IN NAV FIX
            {"\n\n"}Authentication system initialization failed.
            {"\n"}Platform: {Platform.OS}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleManualRetry}>
            <Text style={styles.retryButtonText}>Go to Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: '#FF9500', marginTop: 8 }]} 
            onPress={() => {
              try {
                router.replace('/test-login');
              } catch (e) {
                console.error('Failed to navigate to test login:', e);
              }
            }}
          >
            <Text style={styles.retryButtonText}>🚀 Quick Test Login</Text>
          </TouchableOpacity>
          <Text style={styles.retryText}>
            Retry attempt: {retryCount + 1}
          </Text>
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>🎯 Initializing authentication...</Text>
        <Text style={[styles.retryText, { marginTop: 8 }]}>Platform: {Platform.OS}</Text>
      </SafeAreaView>
    );
  }
  
  // Safe destructuring with enhanced error handling
  const user = authState.user || null;
  const isLoading = authState.isLoading ?? true;
  
  console.log('[Index] 🔍 PERMANENT SIGN IN NAV FIX - Auth state:', {
    hasUser: !!user,
    userRole: user?.role,
    userEmail: user?.email,
    isLoading,
    authStateExists: !!authState,
    initializationTimeout,
    retryCount,
    navigationAttempts,
    platform: Platform.OS
  });

  // Handle loading state with timeout protection
  if (isLoading && !initializationTimeout) {
    console.log('[Index] ⏳ PERMANENT SIGN IN NAV FIX - Still loading, showing spinner');
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>🎯 Loading LoadRun...</Text>
        <Text style={[styles.retryText, { marginTop: 8 }]}>Platform: {Platform.OS}</Text>
      </SafeAreaView>
    );
  }
  
  // Handle timeout scenario - provide manual navigation option
  if (initializationTimeout && !user) {
    console.log('[Index] ⚠️ PERMANENT SIGN IN NAV FIX - Timeout reached, providing manual navigation');
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>
          🎯 PERMANENT SIGN IN NAV FIX
          {"\n\n"}Loading timeout reached.
          {"\n"}Platform: {Platform.OS}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleManualRetry}>
          <Text style={styles.retryButtonText}>Continue to Sign In</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.retryButton, { backgroundColor: '#FF9500', marginTop: 8 }]} 
          onPress={() => {
            try {
              router.replace('/test-login');
            } catch (e) {
              console.error('Failed to navigate to test login:', e);
            }
          }}
        >
          <Text style={styles.retryButtonText}>🚀 Quick Test Login</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }
  
  // Handle no user scenario
  if (!user) {
    console.log('[Index] 🔄 PERMANENT SIGN IN NAV FIX - No user found, redirecting to login');
    return <Redirect href="/(auth)/login" />;
  }
  
  console.log('[Index] ✅ PERMANENT SIGN IN NAV FIX - User found, routing to dashboard for role:', user.role);
  console.log('[Index] 🎯 Permanently Fixed: Auth Error & Sign-In Nav - ' + Platform.OS);
  
  // PERMANENT FIX: Enhanced role-based routing with comprehensive error handling
  try {
    if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
      console.log('[Index] 🔄 PERMANENT SIGN IN NAV FIX - Redirecting to admin dashboard');
      return <Redirect href="/(tabs)/admin" />;
    } else if (user.role === 'shipper') {
      console.log('[Index] 🔄 PERMANENT SIGN IN NAV FIX - Redirecting to shipper dashboard');
      return <Redirect href="/(tabs)/shipper" />;
    } else {
      console.log('[Index] 🔄 PERMANENT SIGN IN NAV FIX - Redirecting to driver dashboard');
      return <Redirect href="/(tabs)/dashboard" />;
    }
  } catch (navigationError) {
    console.error('[Index] ❌ PERMANENT SIGN IN NAV FIX - Navigation error:', navigationError);
    setNavigationAttempts(prev => prev + 1);
    
    // If navigation fails multiple times, provide manual option
    if (navigationAttempts >= 2) {
      return (
        <SafeAreaView style={styles.errorContainer}>
          <Text style={styles.errorText}>
            🎯 PERMANENT SIGN IN NAV FIX
            {"\n\n"}Navigation error detected.
            {"\n"}Platform: {Platform.OS}
            {"\n"}User Role: {user.role}
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleManualRetry}>
            <Text style={styles.retryButtonText}>Reset Navigation</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.retryButton, { backgroundColor: '#FF9500', marginTop: 8 }]} 
            onPress={() => {
              try {
                router.replace('/test-login');
              } catch (e) {
                console.error('Failed to navigate to test login:', e);
              }
            }}
          >
            <Text style={styles.retryButtonText}>🚀 Quick Test Login</Text>
          </TouchableOpacity>
        </SafeAreaView>
      );
    }
    
    // Fallback to login if navigation fails
    return <Redirect href="/(auth)/login" />;
  }
}