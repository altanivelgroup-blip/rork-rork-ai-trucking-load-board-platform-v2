import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
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
});

export default function Index() {
  const [isHydrated, setIsHydrated] = useState(false);
  const authState = useAuth();

  // Prevent hydration timeout by ensuring client-side rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  console.log('[Index] Auth state:', {
    hasAuthState: !!authState,
    isLoading: authState?.isLoading,
    hasUser: !!authState?.user,
    userRole: authState?.user?.role,
    userEmail: authState?.user?.email,
    isHydrated
  });

  // Show loading while hydrating or auth is initializing
  if (!isHydrated || !authState || authState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>
          {!isHydrated ? 'Starting...' : 'Loading...'}
        </Text>
      </SafeAreaView>
    );
  }

  const user = authState.user;

  // If no user, redirect to sign in
  if (!user) {
    console.log('[Index] No authenticated user found, redirecting to sign in');
    return <Redirect href="/signin" />;
  }

  console.log('[Index] Authenticated user found, redirecting based on role:', user.role);
  
  // Redirect based on user role
  if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
    return <Redirect href="/(tabs)/admin" />;
  }
  if (user.role === 'shipper') {
    return <Redirect href="/(tabs)/shipper" />;
  }
  return <Redirect href="/(tabs)/dashboard" />;
}
