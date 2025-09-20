import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/hooks/useAuth";

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }
  
  if (user) {
    // Route based on user role
    if (user.role === 'admin' || user.email === 'admin@loadrush.com') {
      return <Redirect href="/(tabs)/admin" />;
    } else if (user.role === 'shipper') {
      return <Redirect href="/(tabs)/shipper" />;
    } else {
      return <Redirect href="/(tabs)" />;
    }
  }
  
  return <Redirect href="/(auth)/sign-in" />;
}

