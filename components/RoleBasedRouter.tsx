import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRouter({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  console.log('[RoleBasedRouter] STARTUP FIX - Router state:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    segments: segments.join('/'),
  });

  useEffect(() => {
    // Don't navigate if still loading
    if (isLoading) {
      console.log('[RoleBasedRouter] STARTUP FIX - Still loading, waiting...');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segments.join('/');

    console.log('[RoleBasedRouter] STARTUP FIX - Navigation check:', {
      isAuthenticated,
      userRole: user?.role,
      currentPath,
      inAuthGroup,
    });

    // If authenticated and on auth page, redirect to appropriate dashboard
    if (isAuthenticated && inAuthGroup) {
      console.log('[RoleBasedRouter] STARTUP FIX - Authenticated on auth page, redirecting to dashboard');
      const targetRoute = user?.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
      router.replace(targetRoute);
      return;
    }

    // If not authenticated and not on auth page, redirect to login
    if (!isAuthenticated && !inAuthGroup && currentPath !== '') {
      console.log('[RoleBasedRouter] STARTUP FIX - Not authenticated, redirecting to login');
      router.replace('/(auth)/login');
      return;
    }
  }, [isAuthenticated, segments, router, isLoading, user?.role]);

  return <>{children}</>;
}