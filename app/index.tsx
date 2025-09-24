import { Redirect } from "expo-router";

export default function Index() {
  console.log('[Index] Redirecting to login');
  return <Redirect href="/login" />;
}
