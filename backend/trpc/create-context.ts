import { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

// Context creation function
export const createContext = async (opts: FetchCreateContextFnOptions) => {
  return {
    req: opts.req,
    // You can add more context items here like database connections, auth, etc.
  };
};

export type Context = Awaited<ReturnType<typeof createContext>>;

// Initialize tRPC
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

// Middleware to check if user is admin (for now, allow all requests)
const isAdminMiddleware = t.middleware(async ({ next }) => {
  // For now, we'll allow all requests to pass through
  // In production, you would verify the Firebase auth token here
  console.log('[tRPC] Admin middleware - allowing request');
  return next();
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAdminMiddleware);