import { Module } from '@nestjs/common'; 
import { TypeOrmModule } from '@nestjs/typeorm'; 
import { EgresadosService } from './egresados.service'; 
import { EgresadosController } from './egresados.controller'; 
import { Egresado } from './entities/egresado.entity'; 
import { Habilidad } from '../habilidades/entities/habilidad.entity'; 
import { User } from '../auth/entities/user.entity';
import { Postulacion } from '../ofertas/entities/postulacion.entity';

@Module({ 
  imports: [TypeOrmModule.forFeature([Egresado, Habilidad, User, Postulacion])], 
  controllers: [EgresadosController], 
  providers: [EgresadosService], 
  exports: [EgresadosService], 
}) 
export class EgresadosModule {} 
