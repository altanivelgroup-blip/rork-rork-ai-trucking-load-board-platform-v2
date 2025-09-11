import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRouter({ children }: { children: React.ReactNode }) {
  // Always call hooks in the same order
  const authState = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  // Destructure after hooks are called to avoid conditional hook calls
  const { user, isLoading, isAuthenticated } = authState || {
    user: null,
    isLoading: true,
    isAuthenticated: false
  };

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
      if (!inAuthGroup) {
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

    // User is authenticated with role - redirect from auth pages to appropriate main page
    if (inAuthGroup) {
      if (user.role === 'shipper') {
        console.log('[RoleBasedRouter] Redirecting authenticated shipper to shipper page');
        router.replace('/(tabs)/shipper');
      } else {
        console.log('[RoleBasedRouter] Redirecting authenticated driver to dashboard');
        router.replace('/(tabs)/dashboard');
      }
      return;
    }

    // Ensure users are in the correct dashboard for their role
    // Allow shippers to access shipper-specific tabs, but redirect from driver-only tabs
    if (user.role === 'shipper' && inTabsGroup) {
      const segmentsArray = Array.from(segments);
      const currentTab = segmentsArray.length > 1 ? segmentsArray[1] : null; // Get the specific tab name
      const shipperAllowedTabs = ['dashboard', 'shipper', 'shipper-post', 'shipper-analytics', 'profile'];
      
      if (currentTab && !shipperAllowedTabs.includes(currentTab)) {
        console.log('[RoleBasedRouter] Shipper accessing driver-only tab, redirecting to shipper page');
        router.replace('/(tabs)/shipper');
        return;
      }
    }

    if (user.role === 'driver' && onShipperDashboard) {
      console.log('[RoleBasedRouter] Driver in shipper area, redirecting to driver dashboard');
      router.replace('/(tabs)/dashboard');
      return;
    }
  }, [isAuthenticated, user?.role, segments, router, isLoading]);

  return <>{children}</>;
}