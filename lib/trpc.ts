import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { requireApiBaseUrl } from "@/utils/env";
import { Platform } from "react-native";
import Constants from "expo-constants";

export const trpc = createTRPCReact<AppRouter>();

function buildUrlFromHostUri(path: string): string | null {
  const hostUri = (Constants as any)?.expoConfig?.hostUri as string | undefined;
  if (!hostUri || typeof hostUri !== 'string') return null;

  // hostUri may be like: 192.168.1.10:8081 or tunnel.ngrok.app
  const hasPort = hostUri.includes(":");
  const [hostPart, portPart] = hasPort ? hostUri.split(":") : [hostUri, undefined];
  const isTunnel = /ngrok|trycloudflare|tunnel|vercel|\.app$/i.test(hostPart);
  const isLocalIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostPart) || hostPart === 'localhost';
  const protocol = isTunnel ? 'https' : 'http';
  const base = `${protocol}://${hostPart}${portPart ? `:${portPart}` : ''}`;
  return `${base}${path}`;
}

export function resolveTrpcUrl(): string {
  try {
    const base = requireApiBaseUrl();
    return `${base}/api/trpc`;
  } catch (err) {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
      console.warn('[trpc] Using window.location.origin for API base URL');
      return `${window.location.origin}/api/trpc`;
    }

    const fromHost = buildUrlFromHostUri('/api/trpc');
    if (fromHost) {
      console.warn('[trpc] Using Constants.expoConfig.hostUri for API base URL:', fromHost);
      return fromHost;
    }

    console.warn('[trpc] Falling back to relative /api/trpc URL (may fail on device)');
    return '/api/trpc';
  }
}

const TRPC_URL = resolveTrpcUrl();
console.log('[trpc] Initialized client with URL:', TRPC_URL);

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: TRPC_URL,
      transformer: superjson,
    }),
  ],
});