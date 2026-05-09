import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from '../../auth/entities/user.entity';

@Entity('empresas')
export class Empresa {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'codigo', unique: true, nullable: true })
  codigo: string;

  @Column({ name: 'user_id' })
  user_id: number;

  @ManyToOne(() => User) 
  @JoinColumn({ name: 'user_id' })
  user: User; 

  @Column({ name: 'nombre_empresa' }) 
  nombreEmpresa: string;

  @Column({ name: 'sector', nullable: true })
  sector: string;

  @Column({ name: 'ubicacion', nullable: true })
  ubicacion: string;

  @Column({ name: 'sitio_web', nullable: true })
  sitioWeb: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
