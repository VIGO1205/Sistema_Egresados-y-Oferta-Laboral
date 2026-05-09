import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { ReportesService } from './reportes.service';
import { NotificacionesService } from '../notificaciones/notificaciones.service';

@Processor('reportes')
export class ReportesProcessor {
  private readonly logger = new Logger(ReportesProcessor.name);

  constructor(
    private readonly reportesService: ReportesService,
    private readonly notificacionesService: NotificacionesService,
  ) {}

  @Process('generar-pdf')
  async handleGenerarPdf(job: Job) {
    const { reporteId, tipoReporte, filtros, userId } = job.data;
    this.logger.log(`Iniciando procesamiento de PDF para reporte: ${reporteId}`);

    try {
      const urlPdf = await this.reportesService.generarPDF(reporteId, tipoReporte, filtros);
      
      // Notificar al usuario que el reporte está listo
      await this.notificacionesService.crearNotificacion({
        userId,
        tipo: 'reporte_listo',
        titulo: 'Reporte generado con éxito',
        contenido: `Tu reporte de ${tipoReporte.replace(/_/g, ' ')} ya está disponible para descargar.`,
      });

      this.logger.log(`Reporte ${reporteId} completado exitosamente: ${urlPdf}`);
    } catch (error) {
      this.logger.error(`Error procesando reporte ${reporteId}: ${error.message}`);
      await this.reportesService.actualizarEstado(reporteId, 'error');
      
      // Notificar error al usuario
      await this.notificacionesService.crearNotificacion({
        userId,
        tipo: 'reporte_error',
        titulo: 'Error al generar reporte',
        contenido: `Hubo un problema al generar tu reporte. Por favor, inténtalo de nuevo más tarde.`,
      });
    }
  }
}
