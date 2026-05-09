import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Postulacion } from './postulacion.entity';

@Entity('historial_estados')
export class HistorialPostulacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'postulacion_id' })
  postulacion_id: number;

  @ManyToOne(() => Postulacion)
  @JoinColumn({ name: 'postulacion_id' })
  postulacion: Postulacion;

  @Column({ name: 'estado_anterior', type: 'varchar', length: 20, nullable: true })
  estadoAnterior: 'postulado' | 'revision' | 'entrevista' | 'contratado' | 'rechazado';

  @Column({ name: 'estado_nuevo', type: 'varchar', length: 20 })
  estadoNuevo: 'postulado' | 'revision' | 'entrevista' | 'contratado' | 'rechazado';

  @Column({ name: 'cambiado_por', type: 'int', nullable: true })
  cambiadoPor: number;

  @Column({ name: 'comentario', type: 'text', nullable: true })
  comentario?: string;

  @CreateDateColumn({ name: 'fecha_cambio' })
  fechaCambio: Date;
}
