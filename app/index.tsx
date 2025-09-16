import React from 'react';
import { Redirect } from 'expo-router';

export default function IndexScreen() {
  console.log('[Index] STARTUP FIX - Redirecting directly to login');
  return <Redirect href="/(auth)/login" />;
}

