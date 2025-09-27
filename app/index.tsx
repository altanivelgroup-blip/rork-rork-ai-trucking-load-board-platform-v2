import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function Index() {
  const { user, isAuthenticated } = useAuth();

  if (isAuthenticated && user) {
    if (user.role === 'shipper') {
      return <Redirect href="/(tabs)/shipper" />;
    } else if (user.role === 'admin') {
      return <Redirect href="/(tabs)/admin" />;
    }
    return <Redirect href="/(tabs)/dashboard" />;
  }

  return <Redirect href="/login" />;
}
