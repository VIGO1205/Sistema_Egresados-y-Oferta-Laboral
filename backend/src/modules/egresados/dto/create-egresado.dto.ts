import { IsString, IsEmail, IsInt, IsOptional, IsArray, IsBoolean, Min, Max, ValidateNested } from 'class-validator'; 
import { Type } from 'class-transformer'; 

export class DatosContactoDto { 
  @IsOptional() 
  @IsString() 
  telefono?: string; 

  @IsOptional() 
  @IsString() 
  direccion?: string; 

  @IsOptional() 
  @IsString() 
  linkedin?: string; 
} 

export class CreateEgresadoDto { 
  @IsEmail() 
  email: string; 

  @IsString() 
  password: string; 

  @IsString() 
  nombre: string; 

  @IsString() 
  apellido: string; 

  @IsString() 
  carrera: string; 

  @IsInt() 
  @Min(1950) 
  @Max(new Date().getFullYear()) 
  anioEgreso: number; 

  @IsOptional() 
  @IsString() 
  cvUrl?: string; 

  @IsOptional() 
  @ValidateNested() 
  @Type(() => DatosContactoDto) 
  datosContacto?: DatosContactoDto; 

  @IsOptional() 
  @IsBoolean() 
  empleadoActualmente?: boolean; 
 
  @IsOptional() 
  @IsString() 
  empresaActual?: string; 
 
  @IsOptional() 
  @IsString() 
  horarioInicio?: string;

  @IsOptional() 
  @IsString() 
  horarioFin?: string;

  @IsOptional() 
  @IsEmail() 
  emailRecuperacion?: string; 
 
  @IsOptional() 
  @IsArray() 
  @IsString({ each: true }) 
  habilidades?: string[]; 
} 
