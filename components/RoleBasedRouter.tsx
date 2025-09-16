import React, { useEffect } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRouter({ children }: { children: React.ReactNode }) {
  // EMERGENCY FIX: Simplified router to prevent navigation loops
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  
  console.log('[RoleBasedRouter] EMERGENCY FIX - Simplified routing, user:', user?.role);

  useEffect(() => {
    if (isLoading) {
      console.log('[RoleBasedRouter] Still loading, skipping navigation');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segments.join('/');

    console.log('[RoleBasedRouter] EMERGENCY FIX - Simple navigation check:', {
      isAuthenticated,
      userRole: user?.role,
      segments: currentPath,
      inAuthGroup,
    });

    // Only handle basic auth redirect - no complex role routing
    if (!isAuthenticated && !inAuthGroup) {
      console.log('[RoleBasedRouter] EMERGENCY FIX - Redirecting to login');
      router.replace('/(auth)/login');
      return;
    }

    // If authenticated and on auth page, redirect to dashboard
    if (isAuthenticated && inAuthGroup) {
      console.log('[RoleBasedRouter] EMERGENCY FIX - Redirecting to dashboard');
      router.replace('/(tabs)/dashboard');
      return;
    }
  }, [isAuthenticated, segments, router, isLoading]);

  return <>{children}</>;
}