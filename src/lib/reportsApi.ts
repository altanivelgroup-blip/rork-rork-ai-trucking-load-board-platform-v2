import { getAuth } from "firebase/auth";

const API_BASE = process.env.EXPO_PUBLIC_RORK_API_BASE_URL?.replace(/\/+$/, "");
if (!API_BASE) console.error("[ReportAnalytics] Missing EXPO_PUBLIC_RORK_API_BASE_URL");

async function apiGET(path: string) {
  const url = `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;
  const token = await getAuth().currentUser?.getIdToken(true).catch(() => null);
  console.log("[ReportAnalytics] GET", url);

  const res = await fetch(url, {
    method: "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`[${res.status}] ${res.statusText} ${text}`.trim());
  }
  return res.json();
}

export const getLiveGraph = () => apiGET("/reportAnalyticsGraph");
export const getBottomRow = () => apiGET("/reportAnalyticsBottomRow");
export const getLiveMetrics = () => apiGET("/reportAnalyticsMetrics");