import React, { useEffect } from 'react';
import { useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export function RoleBasedRouter({ children }: { children: React.ReactNode }) {
  console.log('[RoleBasedRouter] CRASH FIX - Component initialized with enhanced error handling');
  
  const { user, isLoading, isAuthenticated } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navState = useRootNavigationState();

  const segPath = segments.join('/');
  
  console.log('[RoleBasedRouter] CRASH FIX - Current state:', {
    isLoading,
    isAuthenticated,
    userRole: user?.role,
    segPath,
    navReady: Boolean(navState?.key),
    navStateExists: !!navState,
    routerExists: !!router,
  });

  useEffect(() => {
    console.log('[RoleBasedRouter] CRASH FIX - Navigation effect triggered');
    
    try {
      // CRITICAL: Check if navigation state exists and has getState method
      if (!navState) {
        console.log('[RoleBasedRouter] CRASH FIX - Navigation state is null, waiting...');
        return;
      }
      
      if (!navState.key) {
        console.log('[RoleBasedRouter] CRASH FIX - Navigation not ready yet (no key), waiting...');
        return;
      }

      // CRITICAL: Ensure router exists and has methods
      if (!router || typeof router.replace !== 'function') {
        console.log('[RoleBasedRouter] CRASH FIX - Router not available, waiting...');
        return;
      }

      const inAuthGroup = segments[0] === '(auth)';
      const currentPath = segPath;
      const isOnLoginPage = currentPath === '(auth)/login' || currentPath === 'login';

      console.log('[RoleBasedRouter] CRASH FIX - Navigation check:', {
        isLoading,
        isAuthenticated,
        userRole: user?.role,
        currentPath,
        inAuthGroup,
        isOnLoginPage,
      });

      if (isLoading) {
        console.log('[RoleBasedRouter] CRASH FIX - Auth still loading, waiting...');
        return;
      }

      if (isAuthenticated && inAuthGroup) {
        const targetRoute = user?.role === 'shipper' ? '/(tabs)/shipper' : '/(tabs)/dashboard';
        console.log('[RoleBasedRouter] CRASH FIX - Redirecting authenticated user to:', targetRoute);
        router.replace(targetRoute);
        return;
      }

      if (!isAuthenticated && !inAuthGroup) {
        console.log('[RoleBasedRouter] CRASH FIX - Redirecting unauthenticated user to login');
        router.replace('/(auth)/login');
        return;
      }

      if (currentPath === '' || currentPath === 'index') {
        console.log('[RoleBasedRouter] CRASH FIX - Redirecting from index to login');
        router.replace('/(auth)/login');
        return;
      }
      
      console.log('[RoleBasedRouter] CRASH FIX - No redirect needed, staying on current route');
    } catch (error) {
      console.error('[RoleBasedRouter] CRASH FIX - Navigation error caught:', error);
      // Don't attempt navigation if there's an error
    }
  }, [isAuthenticated, segments, router, isLoading, user?.role, navState?.key, segPath, navState]);

  console.log('[RoleBasedRouter] CRASH FIX - Rendering children');
  return <>{children}</>;
}