import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('reportes')
export class Reporte {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true, length: 255 })
  codigo: string;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'tipo_reporte', length: 255 })
  tipoReporte: string;

  @Column({ type: 'jsonb', name: 'parametros_filtro', nullable: true })
  parametrosFiltro: any;

  @Column({ name: 'url_pdf', nullable: true })
  urlPdf: string;

  @Column({ default: 'generando' })
  estado: string;

  @CreateDateColumn({ name: 'fecha_solicitud' })
  fechaSolicitud: Date;

  @Column({ name: 'fecha_completado', nullable: true })
  fechaCompletado: Date;
}
