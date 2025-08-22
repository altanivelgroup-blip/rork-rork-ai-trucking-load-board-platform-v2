import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/hooks/useAuth";
import { PaymentsProvider } from "@/hooks/usePayments";
import { MaintenanceProvider } from "@/hooks/useMaintenance";
import { SettingsProvider } from "@/hooks/useSettings";
import { PostLoadProvider } from "@/hooks/usePostLoad";
import HeaderBack from "@/components/HeaderBack";
import ErrorBoundary from "@/components/ErrorBoundary";
import { ToastProvider } from "@/components/Toast";
import ToastHost from "@/components/ToastHost";
import { theme } from "@/constants/theme";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});



function RootLayoutNav() {
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        headerLeft: ({ tintColor }) => (
          <HeaderBack tintColor={tintColor ?? theme.colors.dark} size={28} />
        ),
      }}
    >
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen 
        name="load-details" 
        options={{ 
          title: "Load Details",
          presentation: "modal",
          headerLeft: ({ tintColor }) => (
            <HeaderBack tintColor={tintColor ?? theme.colors.dark} size={28} fallbackPath="/(tabs)/(loads)" />
          ),
        }} 
      />
      <Stack.Screen 
        name="pre-trip" 
        options={{ 
          title: "Pre-Trip Inspection",
          presentation: "modal",
          headerLeft: ({ tintColor }) => (
            <HeaderBack tintColor={tintColor ?? theme.colors.dark} size={28} fallbackPath="/dashboard" />
          ),
        }} 
      />
      <Stack.Screen 
        name="equipment" 
        options={{ 
          title: "Equipment & Maintenance",
        }} 
      />
      <Stack.Screen 
        name="settings" 
        options={{ 
          title: "Settings",
        }} 
      />
      <Stack.Screen 
        name="wallet" 
        options={{ 
          title: "Wallet & Payouts",
        }} 
      />
      <Stack.Screen 
        name="maintenance" 
        options={{ 
          title: "Maintenance Program",
          presentation: "modal",
          headerLeft: ({ tintColor }) => (
            <HeaderBack tintColor={tintColor ?? theme.colors.dark} size={28} fallbackPath="/dashboard" />
          ),
        }} 
      />
      <Stack.Screen 
        name="payment-methods" 
        options={{ 
          title: "Payment Methods",
        }} 
      />
      <Stack.Screen 
        name="notifications" 
        options={{ 
          title: "Notifications",
        }} 
      />
      <Stack.Screen 
        name="privacy-security" 
        options={{ 
          title: "Privacy & Security",
        }} 
      />
      <Stack.Screen 
        name="help-support" 
        options={{ 
          title: "Help & Support",
        }} 
      />
      <Stack.Screen 
        name="privacy" 
        options={{ 
          title: "Privacy Policy",
        }} 
      />
      <Stack.Screen 
        name="terms" 
        options={{ 
          title: "Terms of Service",
        }} 
      />
      <Stack.Screen 
        name="account-deletion" 
        options={{ 
          title: "Delete Account",
        }} 
      />
      <Stack.Screen 
        name="documents" 
        options={{ 
          title: "Documents & Verification",
        }} 
      />
      <Stack.Screen 
        name="damage-protection" 
        options={{ 
          title: "Pickup & Delivery Photos",
          presentation: "modal",
          headerLeft: ({ tintColor }) => (
            <HeaderBack tintColor={tintColor ?? theme.colors.dark} size={28} fallbackPath="/(tabs)/(loads)" />
          ),
        }} 
      />
      <Stack.Screen 
        name="membership" 
        options={{ 
          title: "Driver Membership",
        }} 
      />
      <Stack.Screen 
        name="ai-loads" 
        options={{ 
          title: "AI for Loads",
          presentation: "modal",
          headerLeft: ({ tintColor }) => (
            <HeaderBack tintColor={tintColor ?? theme.colors.dark} size={28} fallbackPath="/dashboard" />
          ),
        }} 
      />
      <Stack.Screen 
        name="increase-revenue" 
        options={{ 
          title: "Increase Revenue",
        }} 
      />
      <Stack.Screen 
        name="edit-profile" 
        options={{ 
          title: "Edit Profile",
        }} 
      />
      <Stack.Screen 
        name="about" 
        options={{ 
          title: "About",
        }} 
      />
      <Stack.Screen 
        name="post-load-step2" 
        options={{ 
          title: "Post Load - Step 2",
        }} 
      />
      <Stack.Screen 
        name="post-load-step3" 
        options={{ 
          title: "Post Load - Step 3",
        }} 
      />
      <Stack.Screen 
        name="post-load-step4" 
        options={{ 
          title: "Post Load - Step 4",
        }} 
      />
      <Stack.Screen 
        name="post-load-step5" 
        options={{ 
          title: "Post Load - Step 5",
        }} 
      />
      <Stack.Screen 
        name="shipper-membership" 
        options={{ 
          title: "Shipper Membership",
        }} 
      />
      <Stack.Screen 
        name="ai-tools" 
        options={{ 
          title: "AI Tools",
        }} 
      />
      <Stack.Screen 
        name="advance-security" 
        options={{ 
          title: "Advanced Security",
        }} 
      />
      <Stack.Screen 
        name="priority-support" 
        options={{ 
          title: "Priority Support",
        }} 
      />
      <Stack.Screen 
        name="trailer-maintenance" 
        options={{ 
          title: "Trailer Maintenance",
        }} 
      />
      <Stack.Screen 
        name="trailer-maintenance/[category]" 
        options={{ 
          title: "Maintenance Category",
        }} 
      />
      <Stack.Screen 
        name="data-usage" 
        options={{ 
          title: "Data Usage",
        }} 
      />
      <Stack.Screen 
        name="onboarding" 
        options={{ 
          title: "Welcome",
          headerShown: false,
        }} 
      />
      <Stack.Screen 
        name="logs" 
        options={{ 
          title: "App Logs",
        }} 
      />
      <Stack.Screen 
        name="pricing" 
        options={{ 
          title: "Pricing",
        }} 
      />
      <Stack.Screen 
        name="contact" 
        options={{ 
          title: "Contact Us",
        }} 
      />
      <Stack.Screen 
        name="blog" 
        options={{ 
          title: "Blog",
        }} 
      />
      <Stack.Screen 
        name="blog/[slug]" 
        options={{ 
          title: "Blog Post",
        }} 
      />
      <Stack.Screen 
        name="shipper-dashboard" 
        options={{ 
          title: "Shipper Dashboard",
        }} 
      />
      <Stack.Screen 
        name="post-load" 
        options={{ 
          title: "Post Load",
        }} 
      />
      <Stack.Screen 
        name="debug-nav" 
        options={{ 
          title: "Debug Navigation",
        }} 
      />
    </Stack>
  );
}



export default function RootLayout() {
  console.log('[RootLayout] rendering');
  return (
    <ErrorBoundary safeRoute="/(auth)/login">
      <GestureHandlerRootView style={{ flex: 1 }}>
        <QueryClientProvider client={queryClient}>
          <View style={{ flex: 1, backgroundColor: '#f5f5f5' }}>
            <AuthProvider>
              <PaymentsProvider>
                <MaintenanceProvider>
                  <SettingsProvider>
                    <PostLoadProvider>
                      <ToastProvider>
                        <RootLayoutNav />
                        <ToastHost />
                      </ToastProvider>
                    </PostLoadProvider>
                  </SettingsProvider>
                </MaintenanceProvider>
              </PaymentsProvider>
            </AuthProvider>
          </View>
        </QueryClientProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}