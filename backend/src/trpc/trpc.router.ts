import { router, publicProcedure, protectedProcedure } from './trpc'; 
import { z } from 'zod'; 
import { EgresadosService } from '../modules/egresados/egresados.service'; 

export const appRouter = router({ 
  // Query: Obtener todos los egresados (con filtros) 
  egresados: protectedProcedure 
    .input(z.object({ 
      carrera: z.string().optional(), 
      anioEgreso: z.number().optional(), 
      habilidad: z.string().optional(), 
      page: z.number().default(1), 
      limit: z.number().default(10), 
    })) 
    .query(async ({ input, ctx }) => { 
      const egresadosService = ctx.moduleRef.get(EgresadosService, { strict: false }); 
      return await egresadosService.findAll(input); 
    }), 
  
  // Mutation: Crear nuevo egresado 
  crearEgresado: protectedProcedure 
    .input(z.object({ 
      email: z.string().email(), 
      password: z.string().min(6), 
      nombre: z.string(), 
      apellido: z.string(), 
      carrera: z.string(), 
      anioEgreso: z.number(), 
      habilidades: z.array(z.string()).optional(), 
    })) 
    .mutation(async ({ input, ctx }) => { 
      const egresadosService = ctx.moduleRef.get(EgresadosService); 
      return await egresadosService.create(input); 
    }), 
  
  // Query: Estadísticas para dashboard 
  dashboardKPIs: protectedProcedure 
    .input(z.object({ 
      fechaInicio: z.date().optional(), 
      fechaFin: z.date().optional(), 
    })) 
    .query(async ({ ctx }) => { 
      const queryRunner = ctx.dataSource.createQueryRunner(); 
      await queryRunner.connect(); 
      
      const totalEgresados = await queryRunner.query(`SELECT COUNT(*) FROM egresados`); 
      const tasaEmpleabilidad = await queryRunner.query( 
        `SELECT (COUNT(DISTINCT CASE WHEN p.estado = 'contratado' THEN p.egresado_id END)::FLOAT / 
         NULLIF(COUNT(DISTINCT e.id), 0)::FLOAT * 100) as tasa FROM egresados e LEFT JOIN postulaciones p ON e.id = p.egresado_id` 
      ); 
      const ofertasActivas = await queryRunner.query(`SELECT COUNT(*) FROM ofertas_laborales WHERE activa = true`);
      const distribucionCarreras = await queryRunner.query(`SELECT carrera, COUNT(*) as cantidad FROM egresados GROUP BY carrera`);

      await queryRunner.release(); 
      
      return { 
        totalEgresados: parseInt(totalEgresados[0].count), 
        tasaEmpleabilidad: parseFloat(tasaEmpleabilidad[0].tasa || 0).toFixed(2), 
        ofertasActivas: parseInt(ofertasActivas[0].count || 0),
        distribucionCarreras
      }; 
    }),

  dashboardEvolucionMensual: protectedProcedure
    .input(z.object({ fechaInicio: z.date().optional(), fechaFin: z.date().optional() }))
    .query(async ({ ctx }) => {
      // Mock data for evolution chart
      return [
        { mes: 'Ene', ofertas: 10, postulaciones: 25 },
        { mes: 'Feb', ofertas: 15, postulaciones: 30 },
        { mes: 'Mar', ofertas: 8, postulaciones: 45 },
      ];
    }),

  dashboardHabilidadesTop: protectedProcedure
    .input(z.object({ limit: z.number().default(5) }))
    .query(async ({ ctx }) => {
      // Mock data for skills pie chart
      return [
        { name: 'React', cantidad: 45 },
        { name: 'NestJS', cantidad: 30 },
        { name: 'PostgreSQL', cantidad: 25 },
      ];
    }),

  dashboardOfertasPorModalidad: protectedProcedure
    .query(async ({ ctx }) => {
      return [
        { modalidad: 'Remoto', cantidad: 20 },
        { modalidad: 'Presencial', cantidad: 15 },
        { modalidad: 'Híbrido', cantidad: 10 },
      ];
    }),
}); 

export type AppRouter = typeof appRouter;
