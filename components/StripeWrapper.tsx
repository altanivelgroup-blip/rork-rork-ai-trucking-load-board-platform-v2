import React from 'react';
import { StripeProvider } from '@stripe/stripe-react-native';
import { Platform } from 'react-native';

interface StripeWrapperProps {
  children: React.ReactNode;
}

// Use test publishable key for safety - replace with your actual test key
const STRIPE_PUBLISHABLE_KEY = process.env.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_...';

export default function StripeWrapper({ children }: StripeWrapperProps) {
  // Only wrap with StripeProvider on mobile platforms
  if (Platform.OS === 'web') {
    // For web, we'll handle Stripe differently or simulate payments
    return <>{children}</>;
  }

  return (
    <StripeProvider
      publishableKey={STRIPE_PUBLISHABLE_KEY}
      merchantIdentifier="merchant.com.loadrush"
    >
      {children}
    </StripeProvider>
  );
}