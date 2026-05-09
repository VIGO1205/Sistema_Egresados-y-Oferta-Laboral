import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OfertasService } from './ofertas.service';
import { OfertasController } from './ofertas.controller';
import { OfertaLaboral } from './entities/oferta.entity';
import { Postulacion } from './entities/postulacion.entity';
import { Empresa } from './entities/empresa.entity';
import { HistorialPostulacion } from './entities/historial_postulacion.entity';
import { Egresado } from '../egresados/entities/egresado.entity';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([OfertaLaboral, Postulacion, Empresa, Egresado, HistorialPostulacion]),
    NotificacionesModule
  ],
  controllers: [OfertasController],
  providers: [OfertasService],
  exports: [OfertasService],
})
export class OfertasModule {}
