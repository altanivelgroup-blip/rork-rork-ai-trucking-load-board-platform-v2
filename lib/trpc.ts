import { createTRPCReact } from "@trpc/react-query";
import { httpLink } from "@trpc/client";
import type { AppRouter } from "@/backend/trpc/app-router";
import superjson from "superjson";
import { requireApiBaseUrl } from "@/utils/env";

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
  links: [
    httpLink({
      url: `${requireApiBaseUrl()}/api/trpc`,
      transformer: superjson,
    }),
  ],
});