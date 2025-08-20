import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Platform, View, Text, ActivityIndicator } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { LoadsProvider } from "@/hooks/useLoads";
import { SettingsProvider } from "@/hooks/useSettings";
import { MaintenanceProvider } from "@/hooks/useMaintenance";
import { PaymentsProvider } from "@/hooks/usePayments";
import { PostLoadProvider } from "@/hooks/usePostLoad";
import ErrorBoundary from "@/components/ErrorBoundary";
import Logger from "@/utils/logger";
import { PlatformGuards } from "@/components/PlatformGuards";
import HeaderBack from "@/components/HeaderBack";
import { theme } from "@/constants/theme";
import { ToastProvider } from "@/components/Toast";
import ToastHost from "@/components/ToastHost";
import OfflineBanner from "@/components/OfflineBanner";
import ScreenTracker from "@/components/ScreenTracker";

if (Platform.OS !== "web") {
  SplashScreen.preventAutoHideAsync().catch((error) => {
    console.warn('[SplashScreen] preventAutoHideAsync failed:', error);
  });
}

const queryClient = new QueryClient();

function AuthGate({ children }: PropsWithChildren) {
  const { isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      console.log('[AuthGate] still loading, waiting...');
      return;
    }
    
    console.log('[AuthGate] auth state:', { isAuthenticated, segments, pathname });
    const first = (segments?.[0] ?? "") as string;
    const inAuthGroup = first === "(auth)";
    const target = !isAuthenticated && !inAuthGroup ? "/login" : (isAuthenticated && inAuthGroup ? "/dashboard" : null);
    
    if (target && pathname !== target) {
      console.log('[AuthGate] redirecting to:', target);
      router.replace(target as any);
    }
  }, [isLoading, isAuthenticated, segments, pathname, router]);

  if (isLoading) {
    return <LoadingScreen />;
  }

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
    </Stack>
  );
}

function LoadingScreen() {
  return (
    <View style={{ 
      flex: 1, 
      backgroundColor: '#0b1220', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }} testID="loading-screen">
      <ActivityIndicator size="large" color={theme.colors.primary} testID="loading-indicator" />
      <Text style={{ 
        color: '#ffffff', 
        marginTop: 16, 
        fontSize: 16 
      }} testID="loading-text">Loading...</Text>
    </View>
  );
}

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('[RootLayout] initializing app');
        await Logger.logEvent('app_start');
        await new Promise(resolve => setTimeout(resolve, 100));
        setIsReady(true);
        console.log('[RootLayout] app ready');
        await Logger.logEvent('app_ready');
        
        if (Platform.OS !== "web") {
          await SplashScreen.hideAsync();
        }
      } catch (error) {
        console.error('[RootLayout] initialization error', error);
        await Logger.logError('app_init_error', error);
        setIsReady(true);
      }
    };

    initializeApp();
  }, []);

  if (!isReady) {
    return <LoadingScreen />;
  }

  const ErrorBoundaryWithRouter: React.FC<React.PropsWithChildren> = ({ children }) => {
    const router = useRouter();
    const onNavigate = useMemo(() => (to: string) => {
      try {
        router.replace(to as any);
      } catch (e) {
        console.log('[RootLayout] safe navigation failed', e);
      }
    }, [router]);
    return (
      <ErrorBoundary safeRoute="/dashboard" onNavigate={onNavigate}>
        {children}
      </ErrorBoundary>
    );
  };

  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ErrorBoundaryWithRouter>
          <ToastProvider>
            <AuthProvider>
              <LoadsProvider>
                <PostLoadProvider>
                  <SettingsProvider>
                    <MaintenanceProvider>
                      <PaymentsProvider>
                        <PlatformGuards />
                        <OfflineBanner />
                        <AuthGate>
                          <ScreenTracker>
                            <RootLayoutNav />
                          </ScreenTracker>
                        </AuthGate>
                        <ToastHost />
                      </PaymentsProvider>
                    </MaintenanceProvider>
                  </SettingsProvider>
                </PostLoadProvider>
              </LoadsProvider>
            </AuthProvider>
          </ToastProvider>
        </ErrorBoundaryWithRouter>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}