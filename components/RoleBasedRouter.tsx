import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRouter({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  console.log('[RoleBasedRouter] EMERGENCY LOGIN FIX - Router state:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    segments: segments.join('/'),
  });

  useEffect(() => {
    // EMERGENCY FIX: Always ensure we can get to login page
    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segments.join('/');
    const isOnLoginPage = currentPath === '(auth)/login' || currentPath === 'login';

    console.log('[RoleBasedRouter] EMERGENCY LOGIN FIX - Navigation check:', {
      isLoading,
      isAuthenticated,
      userRole: user?.role,
      currentPath,
      inAuthGroup,
      isOnLoginPage,
    });

    // EMERGENCY FIX: Don't navigate if still loading, UNLESS we're not on login page
    if (isLoading && !isOnLoginPage) {
      console.log('[RoleBasedRouter] EMERGENCY LOGIN FIX - Still loading but not on login, forcing login redirect');
      router.replace('/(auth)/login');
      return;
    }

    // If authenticated and on auth page, redirect to appropriate dashboard
    if (isAuthenticated && inAuthGroup) {
      console.log('[RoleBasedRouter] EMERGENCY LOGIN FIX - Authenticated on auth page, redirecting to dashboard');
      const targetRoute = user?.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
      router.replace(targetRoute);
      return;
    }

    // EMERGENCY FIX: If not authenticated and not on auth page, ALWAYS redirect to login
    if (!isAuthenticated && !inAuthGroup) {
      console.log('[RoleBasedRouter] EMERGENCY LOGIN FIX - Not authenticated, forcing login redirect');
      router.replace('/(auth)/login');
      return;
    }

    // EMERGENCY FIX: If we're on index page, redirect to login
    if (currentPath === '' || currentPath === 'index') {
      console.log('[RoleBasedRouter] EMERGENCY LOGIN FIX - On index page, redirecting to login');
      router.replace('/(auth)/login');
      return;
    }
  }, [isAuthenticated, segments, router, isLoading, user?.role]);

  return <>{children}</>;
}