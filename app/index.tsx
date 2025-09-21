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
  const authState = useAuth();

  if (!authState || authState.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Checking session…</Text>
      </SafeAreaView>
    );
  }

  const user = authState.user;

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
    return <Redirect href="/(tabs)/admin" />;
  }
  if (user.role === 'shipper') {
    return <Redirect href="/(tabs)/shipper" />;
  }
  return <Redirect href="/(tabs)/dashboard" />;
}
