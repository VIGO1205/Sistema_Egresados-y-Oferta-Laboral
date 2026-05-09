import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notificacion } from './entities/notificacion.entity';

@Injectable()
export class NotificacionesService {
  constructor(
    @InjectRepository(Notificacion)
    private notificacionesRepository: Repository<Notificacion>,
  ) {}

  async crearNotificacion(data: { userId: number, tipo: string, titulo: string, contenido: string }) {
    const notificacion = this.notificacionesRepository.create({
      user_id: data.userId,
      tipo: data.tipo,
      titulo: data.titulo,
      contenido: data.contenido,
    });
    
    // Aquí se podría integrar el envío de email en el futuro (Nodemailer)
    console.log(`[Notificación] Para Usuario ${data.userId}: ${data.titulo}`);
    
    return this.notificacionesRepository.save(notificacion);
  }

  async findMisNotificaciones(userId: number) {
    return this.notificacionesRepository.find({
      where: { user_id: userId },
      order: { fechaEnvio: 'DESC' }
    });
  }

  async marcarComoLeida(id: number) {
    return this.notificacionesRepository.update(id, { leida: true });
  }

  async eliminarNotificacion(userId: number, id: number) {
    const notificacion = await this.notificacionesRepository.findOne({ where: { id } });
    if (!notificacion) throw new NotFoundException('Notificación no encontrada');
    if (notificacion.user_id !== userId) throw new ForbiddenException('No tienes permiso para eliminar esta notificación');
    await this.notificacionesRepository.delete(id);
    return { success: true };
  }
}
