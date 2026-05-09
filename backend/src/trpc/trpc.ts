import { initTRPC, TRPCError } from '@trpc/server';
import { Request } from 'express';

export const t = initTRPC.context<{ 
  req: Request, 
  moduleRef: any,
  dataSource: any
}>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const middleware = t.middleware;

// Basic protected procedure stub
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  // Authentication logic would go here
  return next();
});
