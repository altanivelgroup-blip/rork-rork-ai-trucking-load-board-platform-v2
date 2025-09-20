import { Redirect } from "expo-router";
import { ActivityIndicator, StyleSheet } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { SafeAreaView } from "react-native-safe-area-context";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: '#f5f5f5',
  },
});

export default function Index() {
  const authState = useAuth();
  
  // Safe destructuring to prevent crashes
  const user = authState?.user || null;
  const isLoading = authState?.isLoading ?? true;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }
  
  if (user) {
    // Route based on user role
    if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
      return <Redirect href="/(tabs)/admin" />;
    } else if (user.role === 'shipper') {
      return <Redirect href="/(tabs)/shipper" />;
    } else {
      return <Redirect href="/(tabs)/dashboard" />;
    }
  }
  
  return <Redirect href="/(auth)/login" />;
}

