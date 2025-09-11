import React from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function WalletTab() {
  const router = useRouter();
  const { user } = useAuth();

  React.useEffect(() => {
    // Redirect to the main wallet page
    if (user?.role === 'driver') {
      router.replace('/wallet');
    } else {
      // Non-drivers shouldn't access this tab
      router.replace('/(tabs)/dashboard');
    }
  }, [user?.role, router]);

  return null;
}