import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { PropsWithChildren, useEffect } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoadsProvider } from "@/hooks/useLoads";
import { SettingsProvider } from "@/hooks/useSettings";
import { MaintenanceProvider } from "@/hooks/useMaintenance";
import { PaymentsProvider } from "@/hooks/usePayments";
import { PostLoadProvider } from "@/hooks/usePostLoad";
import ErrorBoundary from "@/components/ErrorBoundary";
import { PlatformGuards } from "@/components/PlatformGuards";
import HeaderBack from "@/components/HeaderBack";
import { theme } from "@/constants/theme";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync();
}

const queryClient = new QueryClient();

function AuthGate({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    const first = (segments?.[0] ?? "") as string;
    const inAuthGroup = first === "(auth)";
    const target = !isAuthenticated && !inAuthGroup ? "/login" : (isAuthenticated && inAuthGroup ? "/dashboard" : null);
    if (target && pathname !== target) {
      router.replace(target as any);
    }
  }, [isLoading, isAuthenticated, segments, pathname, router]);

  return <>{children}</>;
}

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
        }} 
      />
      <Stack.Screen 
        name="pre-trip" 
        options={{ 
          title: "Pre-Trip Inspection",
          presentation: "modal",
        }} 
      />
      <Stack.Screen 
        name="equipment" 
        options={{ 
          title: "Equipment & Maintenance",
        }} 
      />
      <Stack.Screen 
        name="maintenance" 
        options={{ 
          title: "Maintenance Program",
          presentation: "modal",
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
    </Stack>
  );
}

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS !== "web") {
      SplashScreen.hideAsync();
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundary>
          <AuthProvider>
            <LoadsProvider>
              <PostLoadProvider>
                <SettingsProvider>
                  <MaintenanceProvider>
                    <PaymentsProvider>
                      <PlatformGuards />
                      <AuthGate>
                        <RootLayoutNav />
                      </AuthGate>
                    </PaymentsProvider>
                  </MaintenanceProvider>
                </SettingsProvider>
              </PostLoadProvider>
            </LoadsProvider>
          </AuthProvider>
        </ErrorBoundary>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}