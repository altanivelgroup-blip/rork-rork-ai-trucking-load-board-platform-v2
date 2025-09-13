import { getAuth } from "firebase/auth";

export async function isAdminClient(): Promise<boolean> {
  const u = getAuth().currentUser;
  if (!u) return false;
  const res = await u.getIdTokenResult(true).catch(() => null);
  return !!(res?.claims?.admin || res?.claims?.role === "admin");
}