import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRouter({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';
    const onShipperDashboard = segments[0] === 'shipper-dashboard';
    const currentPath = segments.join('/');

    console.log('[RoleBasedRouter] Navigation check:', {
      isAuthenticated,
      userRole: user?.role,
      segments: currentPath,
      inAuthGroup,
      inTabsGroup,
      onShipperDashboard,
    });

    // Always redirect unauthenticated users to login
    if (!isAuthenticated) {
      if (!inAuthGroup && currentPath !== '' && currentPath !== 'index') {
        console.log('[RoleBasedRouter] Redirecting to login - not authenticated');
        router.replace('/(auth)/login');
      }
      return;
    }

    // User is authenticated - ensure they have a role set
    if (!user?.role) {
      console.log('[RoleBasedRouter] User authenticated but no role set, redirecting to login');
      router.replace('/(auth)/login');
      return;
    }

    // User is authenticated with role - redirect from auth pages to appropriate dashboard
    if (inAuthGroup) {
      if (user.role === 'shipper') {
        console.log('[RoleBasedRouter] Redirecting authenticated shipper to dashboard');
        router.replace('/shipper-dashboard');
      } else {
        console.log('[RoleBasedRouter] Redirecting authenticated driver to dashboard');
        router.replace('/(tabs)/dashboard');
      }
      return;
    }

    // Ensure users are in the correct dashboard for their role
    if (user.role === 'shipper' && inTabsGroup) {
      console.log('[RoleBasedRouter] Shipper in driver area, redirecting to shipper dashboard');
      router.replace('/shipper-dashboard');
      return;
    }

    if (user.role === 'driver' && onShipperDashboard) {
      console.log('[RoleBasedRouter] Driver in shipper area, redirecting to driver dashboard');
      router.replace('/(tabs)/dashboard');
      return;
    }
  }, [isAuthenticated, user?.role, segments, router, isLoading]);

  return <>{children}</>;
}