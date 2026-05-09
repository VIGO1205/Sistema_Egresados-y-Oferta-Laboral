import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinTable, ManyToMany, JoinColumn } from 'typeorm'; 
import { User } from '../../auth/entities/user.entity'; 
import { Habilidad } from '../../habilidades/entities/habilidad.entity'; 

@Entity('egresados') 
export class Egresado { 
  @PrimaryGeneratedColumn() 
  id: number; 

  @Column({ unique: true, nullable: true })
  codigo: string;

  @Column({ name: 'user_id' }) 
  userId: number; 

  @ManyToOne(() => User) 
  @JoinColumn({ name: 'user_id' })
  user: User; 

  @Column() 
  nombre: string; 

  @Column() 
  apellido: string; 

  @Column() 
  carrera: string; 

  @Column({ name: 'anio_egreso' }) 
  anioEgreso: number; 

  @Column({ name: 'cv_url', nullable: true }) 
  cvUrl: string; 

  @Column({ name: 'datos_contacto', type: 'jsonb', nullable: true }) 
  datosContacto: any; 

  @Column({ name: 'empleado_actualmente', default: false }) 
  empleadoActualmente: boolean; 

  @Column({ name: 'empresa_actual', nullable: true }) 
  empresaActual: string; 

  @Column({ name: 'horario_inicio', type: 'time', nullable: true })
  horarioInicio: string;

  @Column({ name: 'horario_fin', type: 'time', nullable: true })
  horarioFin: string;

  @Column({ name: 'email_recuperacion', nullable: true })
  emailRecuperacion: string;

  @ManyToMany(() => Habilidad) 
  @JoinTable({ 
    name: 'egresados_habilidades', 
    joinColumn: { name: 'egresado_id', referencedColumnName: 'id' }, 
    inverseJoinColumn: { name: 'habilidad_id', referencedColumnName: 'id' } 
  }) 
  habilidades: Habilidad[]; 

  @CreateDateColumn({ name: 'created_at' }) 
  createdAt: Date; 

  @UpdateDateColumn({ name: 'updated_at' }) 
  updatedAt: Date; 
} 
