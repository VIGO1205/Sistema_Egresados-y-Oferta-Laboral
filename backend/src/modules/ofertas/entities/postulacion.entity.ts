import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Unique } from 'typeorm';
import { OfertaLaboral } from './oferta.entity';
import { Egresado } from '../../egresados/entities/egresado.entity';

@Entity('postulaciones')
@Unique(['oferta_id', 'egresado_id'])
export class Postulacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'codigo', unique: true, nullable: true })
  codigo: string;

  @Column({ name: 'oferta_id' })
  oferta_id: number;

  @ManyToOne(() => OfertaLaboral, (oferta) => oferta.postulaciones)
  @JoinColumn({ name: 'oferta_id' })
  oferta: OfertaLaboral;

  @Column({ name: 'egresado_id' })
  egresado_id: number;

  @ManyToOne(() => Egresado)
  @JoinColumn({ name: 'egresado_id' })
  egresado: Egresado;

  @Column({ 
    name: 'estado',
    type: 'varchar', 
    length: 20, 
    default: 'postulado' 
  })
  estado: 'postulado' | 'revision' | 'entrevista' | 'contratado' | 'rechazado';

  @CreateDateColumn({ name: 'fecha_postulacion' })
  fechaPostulacion: Date;

  @UpdateDateColumn({ name: 'ultima_actualizacion' })
  ultimaActualizacion: Date;
}
