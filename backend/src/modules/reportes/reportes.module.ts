import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { Empresa } from '../ofertas/entities/empresa.entity';
import { OfertaLaboral } from '../ofertas/entities/oferta.entity';
import { Postulacion } from '../ofertas/entities/postulacion.entity';
import { ReportesService } from './reportes.service';
import { ReportesProcessor } from './reportes.processor';
import { Reporte } from './entities/reporte.entity';
import { ReportesController } from './reportes.controller';
import { EgresadosModule } from '../egresados/egresados.module';
import { OfertasModule } from '../ofertas/ofertas.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { Egresado } from '../egresados/entities/egresado.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reporte, Empresa, OfertaLaboral, Postulacion, Egresado]),
    BullModule.registerQueue({
      name: 'reportes',
    }),
    EgresadosModule,
    DashboardModule,
    OfertasModule,
    NotificacionesModule,
  ],
  controllers: [ReportesController],
  providers: [ReportesService, ReportesProcessor],
  exports: [ReportesService],
})
export class ReportesModule {}
