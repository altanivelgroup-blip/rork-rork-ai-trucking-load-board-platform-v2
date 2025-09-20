import { useEffect } from "react";
import { View, ActivityIndicator, Text } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "@/hooks/useAuth";
import { theme } from "@/constants/theme";

export default function DevSignOut() {
  const { logout } = useAuth();
  
  useEffect(() => {
    const performSignOut = async () => {
      try {
        console.log('[DevSignOut] 🔄 Signing out user...');
        if (logout) {
          await logout();
          console.log('[DevSignOut] ✅ User signed out successfully');
        }
      } catch (error) {
        console.error('[DevSignOut] ❌ Sign out failed:', error);
      }
    };
    
    performSignOut();
  }, [logout]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: "center", 
      alignItems: "center",
      backgroundColor: theme.colors.lightGray 
    }}>
      <ActivityIndicator size="large" color={theme.colors.primary} />
      <Text style={{ 
        marginTop: 16, 
        fontSize: 16, 
        color: theme.colors.gray,
        textAlign: 'center'
      }}>
        Signing out...
      </Text>
      <Redirect href="/(auth)/login" />
    </View>
  );
}