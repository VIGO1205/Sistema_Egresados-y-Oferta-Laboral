import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, nullable: true })
  codigo: string;

  @Column()
  user_id: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column()
  tipo: string;

  @Column()
  titulo: string;

  @Column('text')
  contenido: string;

  @Column({ default: false })
  leida: boolean;

  @CreateDateColumn({ name: 'fecha_envio' })
  fechaEnvio: Date;
}
