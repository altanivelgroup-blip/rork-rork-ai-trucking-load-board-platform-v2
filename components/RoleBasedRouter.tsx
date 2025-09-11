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

    console.log('[RoleBasedRouter] Navigation check:', {
      isAuthenticated,
      userRole: user?.role,
      segments: segments.join('/'),
      inAuthGroup,
      inTabsGroup,
      onShipperDashboard,
    });

    if (!isAuthenticated) {
      // User is not authenticated, redirect to auth
      if (!inAuthGroup) {
        console.log('[RoleBasedRouter] Redirecting to login - not authenticated');
        router.replace('/(auth)/login');
      }
      return;
    }

    // User is authenticated
    if (inAuthGroup) {
      // User is authenticated but in auth group, redirect based on role
      if (user?.role === 'shipper') {
        console.log('[RoleBasedRouter] Redirecting shipper to dashboard');
        router.replace('/shipper-dashboard');
      } else {
        console.log('[RoleBasedRouter] Redirecting driver to tabs');
        router.replace('/(tabs)/dashboard');
      }
      return;
    }

    // Check if user is in the wrong dashboard for their role
    if (user?.role === 'shipper' && inTabsGroup) {
      console.log('[RoleBasedRouter] Shipper in driver area, redirecting');
      router.replace('/shipper-dashboard');
      return;
    }

    if (user?.role === 'driver' && onShipperDashboard) {
      console.log('[RoleBasedRouter] Driver in shipper area, redirecting');
      router.replace('/(tabs)/dashboard');
      return;
    }
  }, [isAuthenticated, user?.role, segments, router, isLoading]);

  return <>{children}</>;
}