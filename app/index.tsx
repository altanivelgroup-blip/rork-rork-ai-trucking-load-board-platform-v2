import { Redirect, useRouter } from "expo-router";
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";

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
});

export default function Index() {
  const authState = useAuth();
  const router = useRouter();

  console.log('[Index] Auth state:', {
    hasAuthState: !!authState,
    isLoading: authState?.isLoading,
    hasUser: !!authState?.user,
    userRole: authState?.user?.role,
    userEmail: authState?.user?.email,
  });

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
