import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { requireApiBaseUrl } from "@/utils/env";

export const trpc = createTRPCReact<AppRouter>();

function resolveTrpcUrl(): string {
  try {
    const base = requireApiBaseUrl();
    return `${base}/api/trpc`;
  } catch (err) {
    // Fallbacks for local/dev preview so the app does not hang on startup
    if (typeof window !== 'undefined' && window.location?.origin) {
      console.warn('[trpc] Falling back to window.origin for API base URL');
      return `${window.location.origin}/api/trpc`;
    }
    console.warn('[trpc] Falling back to relative /api/trpc URL');
    return "/api/trpc";
  }
}

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: resolveTrpcUrl(),
      transformer: superjson,
    }),
  ],
});