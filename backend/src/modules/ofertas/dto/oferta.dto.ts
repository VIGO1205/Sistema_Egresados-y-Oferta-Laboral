import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, Min } from 'class-validator';

export class CreateOfertaDto {
  @IsString()
  @IsNotEmpty()
  titulo: string;

  @IsString()
  @IsNotEmpty()
  descripcion: string;

  @IsString()
  @IsOptional()
  ubicacion?: string;

  @IsEnum(['remoto', 'hibrido', 'presencial'])
  modalidad: 'remoto' | 'hibrido' | 'presencial';

  @IsString()
  @IsOptional()
  tipoContrato?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salarioMin?: number;

  @IsNumber()
  @IsOptional()
  @Min(0)
  salarioMax?: number;

  @IsString()
  @IsOptional()
  horarioInicio?: string;

  @IsString()
  @IsOptional()
  horarioFin?: string;

  @IsBoolean()
  @IsOptional()
  activa?: boolean;
}

export class OfertaResponseDto {
  id: number;
  titulo: string;
  descripcion: string;
  ubicacion: string;
  modalidad: string;
  tipoContrato: string;
  salarioMin: number;
  salarioMax: number;
  horarioInicio?: string;
  horarioFin?: string;
  activa: boolean;
  empresa: {
    id: number;
    nombre_empresa: string;
  };
  conflictoHorario?: {
    hayConflicto: boolean;
    mensaje?: string;
  };
}

export class UpdatePostulacionStatusDto {
  @IsEnum(['postulado', 'revision', 'entrevista', 'contratado', 'rechazado'])
  estado: 'postulado' | 'revision' | 'entrevista' | 'contratado' | 'rechazado';

  @IsString()
  @IsOptional()
  comentariosEmpresa?: string;
}
