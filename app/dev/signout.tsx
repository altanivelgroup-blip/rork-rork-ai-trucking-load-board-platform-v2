import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useAuth } from "@/hooks/useAuth";
import { Redirect } from "expo-router";

export default function DevSignOut() {
  const { logout } = useAuth();
  
  useEffect(() => {
    if (logout) {
      logout();
    }
  }, [logout]);
  
  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator />
      <Redirect href="/(auth)/login" />
    </View>
  );
}