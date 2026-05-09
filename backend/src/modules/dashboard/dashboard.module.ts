import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { Egresado } from '../egresados/entities/egresado.entity';
import { OfertaLaboral } from '../ofertas/entities/oferta.entity';
import { Postulacion } from '../ofertas/entities/postulacion.entity';
import { Empresa } from '../ofertas/entities/empresa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Egresado, OfertaLaboral, Postulacion, Empresa])
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
