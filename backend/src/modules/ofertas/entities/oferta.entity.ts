import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Empresa } from './empresa.entity';
import { Postulacion } from './postulacion.entity';

@Entity('ofertas_laborales')
export class OfertaLaboral {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'codigo', unique: true, nullable: true })
  codigo: string;

  @Column({ name: 'empresa_id' })
  empresa_id: number;

  @ManyToOne(() => Empresa)
  @JoinColumn({ name: 'empresa_id' })
  empresa: Empresa;

  @Column({ name: 'titulo' })
  titulo: string;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion: string;

  @Column({ name: 'ubicacion', nullable: true })
  ubicacion: string;

  @Column({ name: 'modalidad', type: 'varchar', length: 20 })
  modalidad: 'remoto' | 'hibrido' | 'presencial';

  @Column({ name: 'tipo_contrato', nullable: true })
  tipoContrato: string;

  @Column({ name: 'salario_min', type: 'decimal', precision: 10, scale: 2, nullable: true })
  salarioMin: number;

  @Column({ name: 'salario_max', type: 'decimal', precision: 10, scale: 2, nullable: true })
  salarioMax: number;

  @Column({ name: 'activa', default: true })
  activa: boolean;

  @CreateDateColumn({ name: 'fecha_publicacion' })
  fechaPublicacion: Date;

  @Column({ name: 'fecha_limite', type: 'timestamp', nullable: true })
  fechaLimite: Date;

  @Column({ name: 'horario_inicio', type: 'time', nullable: true })
  horarioInicio: string;

  @Column({ name: 'horario_fin', type: 'time', nullable: true })
  horarioFin: string;

  @OneToMany(() => Postulacion, (postulacion) => postulacion.oferta)
  postulaciones: Postulacion[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
