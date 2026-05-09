import { initTRPC } from '@trpc/server';

const t = initTRPC.create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  dashboardKPIs: publicProcedure
    .input((value: { fechaInicio: Date; fechaFin: Date }) => value)
    .query(() => ({
      totalEgresados: 0,
      tasaEmpleabilidad: 0,
      ofertasActivas: 0,
      distribucionCarreras: [],
    })),
  dashboardEvolucionMensual: publicProcedure
    .input((value: { fechaInicio: Date; fechaFin: Date }) => value)
    .query(() => []),
  dashboardHabilidadesTop: publicProcedure
    .input((value: { limit: number }) => value)
    .query(() => []),
});

export type AppRouter = typeof appRouter;
