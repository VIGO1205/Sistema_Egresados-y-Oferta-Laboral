import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('habilidades')
export class Habilidad {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'codigo', unique: true, nullable: true })
  codigo: string;

  @Column({ unique: true })
  nombre: string;

  @Column()
  tipo: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
