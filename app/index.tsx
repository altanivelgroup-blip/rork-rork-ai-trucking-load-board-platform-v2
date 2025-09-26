import React from 'react';
import { Redirect } from "expo-router";

export default function Index() {
  console.log('[Index] Redirecting to app loading debug');
  return <Redirect href="/app-loading-debug" />;
}
