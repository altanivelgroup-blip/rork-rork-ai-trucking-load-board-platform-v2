import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet, Text } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";

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
});

export default function Index() {
  console.log('[Index] 🔄 PERMANENT SIGN IN FIX - App entry point rendering');
  
  const authState = useAuth();
  
  // Safe destructuring to prevent crashes
  const user = authState?.user || null;
  const isLoading = authState?.isLoading ?? true;
  
  console.log('[Index] 🔍 PERMANENT SIGN IN FIX - Auth state:', {
    hasUser: !!user,
    userRole: user?.role,
    userEmail: user?.email,
    isLoading,
    authStateExists: !!authState
  });

  if (isLoading) {
    console.log('[Index] ⏳ PERMANENT SIGN IN FIX - Still loading, showing spinner');
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading LoadRun...</Text>
      </SafeAreaView>
    );
  }
  
  if (!user) {
    console.log('[Index] 🔄 PERMANENT SIGN IN FIX - No user found, redirecting to login');
    return <Redirect href="/(auth)/login" />;
  }
  
  console.log('[Index] ✅ PERMANENT SIGN IN FIX - User found, routing to dashboard for role:', user.role);
  // Route based on user role
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
}

