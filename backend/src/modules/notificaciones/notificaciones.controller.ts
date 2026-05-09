import { Controller, Get, Patch, Delete, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { NotificacionesService } from './notificaciones.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notificaciones')
@UseGuards(JwtAuthGuard)
export class NotificacionesController {
  constructor(private readonly notificacionesService: NotificacionesService) {}

  @Get('mis-notificaciones')
  async getMisNotificaciones(@Request() req) {
    return this.notificacionesService.findMisNotificaciones(req.user.userId);
  }

  @Patch(':id/leer')
  async marcarComoLeida(@Param('id', ParseIntPipe) id: number) {
    return this.notificacionesService.marcarComoLeida(id);
  }

  @Delete(':id')
  async eliminar(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.notificacionesService.eliminarNotificacion(req.user.userId, id);
  }
}
