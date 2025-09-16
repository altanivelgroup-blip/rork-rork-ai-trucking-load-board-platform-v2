import React, { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRouter({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [isRouterReady, setIsRouterReady] = useState(false);
  
  console.log('[RoleBasedRouter] EMERGENCY FIX - Router state:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    segments: segments.join('/'),
    isRouterReady
  });

  // Wait for router to be ready
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsRouterReady(true);
      console.log('[RoleBasedRouter] EMERGENCY FIX - Router marked as ready');
    }, 150);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't navigate if still loading or router not ready
    if (isLoading || !isRouterReady) {
      console.log('[RoleBasedRouter] EMERGENCY FIX - Waiting for auth/router ready:', { isLoading, isRouterReady });
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const isIndexRoute = segments.length === 0 || segments[0] === 'index';
    const currentPath = segments.join('/');

    console.log('[RoleBasedRouter] EMERGENCY FIX - Navigation check:', {
      isAuthenticated,
      userRole: user?.role,
      currentPath,
      inAuthGroup,
      isIndexRoute,
    });

    // Skip navigation if on index route (let index handle its own navigation)
    if (isIndexRoute) {
      console.log('[RoleBasedRouter] EMERGENCY FIX - On index route, letting index handle navigation');
      return;
    }

    // Only handle basic auth redirect - no complex role routing
    if (!isAuthenticated && !inAuthGroup) {
      console.log('[RoleBasedRouter] EMERGENCY FIX - Not authenticated, redirecting to login');
      setTimeout(() => {
        try {
          router.replace('/(auth)/login');
        } catch (error) {
          console.error('[RoleBasedRouter] EMERGENCY FIX - Navigation to login failed:', error);
        }
      }, 100);
      return;
    }

    // If authenticated and on auth page, redirect to dashboard
    if (isAuthenticated && inAuthGroup) {
      console.log('[RoleBasedRouter] EMERGENCY FIX - Authenticated on auth page, redirecting to dashboard');
      setTimeout(() => {
        try {
          router.replace('/(tabs)/dashboard');
        } catch (error) {
          console.error('[RoleBasedRouter] EMERGENCY FIX - Navigation to dashboard failed:', error);
        }
      }, 100);
      return;
    }
  }, [isAuthenticated, segments, router, isLoading, isRouterReady, user?.role]);

  return <>{children}</>;
}