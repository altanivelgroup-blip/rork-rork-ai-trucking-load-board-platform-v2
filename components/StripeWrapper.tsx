import React from 'react';

interface StripeWrapperProps {
  children: React.ReactNode;
}

// Simple wrapper that just passes through children
// This avoids any Stripe imports that could cause web bundling issues
export default function StripeWrapper({ children }: StripeWrapperProps) {
  // For now, just return children without Stripe wrapper
  // Stripe integration will be handled directly in the payment hooks
  return <>{children}</>;
}