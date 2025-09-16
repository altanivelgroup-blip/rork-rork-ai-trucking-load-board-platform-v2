import React, { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRouter({ children }: { children: React.ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  const segPath = segments.join('/');
  console.log('[RoleBasedRouter] state', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    segPath,
    navReady: Boolean(navState?.key),
  });

  useEffect(() => {
    if (!navState?.key) {
      console.log('[RoleBasedRouter] Navigation not ready yet; skipping redirect');
      return;
    }

    const inAuthGroup = segments[0] === '(auth)';
    const currentPath = segPath;
    const isOnLoginPage = currentPath === '(auth)/login' || currentPath === 'login';

    console.log('[RoleBasedRouter] check', {
      isLoading,
      isAuthenticated,
      userRole: user?.role,
      currentPath,
      inAuthGroup,
      isOnLoginPage,
    });

    if (isLoading) {
      return;
    }

    if (isAuthenticated && inAuthGroup) {
      const targetRoute = user?.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
      console.log('[RoleBasedRouter] redirect ->', targetRoute);
      router.replace(targetRoute);
      return;
    }

    if (!isAuthenticated && !inAuthGroup) {
      console.log('[RoleBasedRouter] redirect -> /(auth)/login');
      router.replace('/(auth)/login');
      return;
    }

    if (currentPath === '' || currentPath === 'index') {
      console.log('[RoleBasedRouter] redirect index -> /(auth)/login');
      router.replace('/(auth)/login');
      return;
    }
  }, [isAuthenticated, segments, router, isLoading, user?.role, navState?.key, segPath]);

  return <>{children}</>;
}