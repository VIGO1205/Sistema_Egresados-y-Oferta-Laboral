import { Controller, Post, Get, Body, UseGuards, Request, InternalServerErrorException, Res } from '@nestjs/common';
import { Response } from 'express';
import { ReportesService } from './reportes.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Post('solicitar')
  @Roles('admin')
  async solicitar(@Request() req, @Body() body: { tipoReporte: string; filtros: any }) {
    try {
      console.log('--- INICIO SOLICITUD REPORTE ---');
      console.log('Tipo:', body.tipoReporte);
      console.log('Usuario ID:', req.user.userId);
      const resultado = await this.reportesService.solicitarReporte(req.user.userId, body.tipoReporte, body.filtros);
      console.log('--- FIN SOLICITUD REPORTE (EXITO) ---');
      return resultado;
    } catch (error) {
      console.error('--- ERROR EN SOLICITUD REPORTE ---');
      console.error('Mensaje:', error.message);
      throw new InternalServerErrorException(`No se pudo procesar el reporte: ${error.message}`);
    }
  }

  @Get('mis-reportes')
  @Roles('admin')
  async listar(@Request() req) {
    return this.reportesService.listarReportesUsuario(req.user.userId);
  }

  @Post('solicitar-completo')
  @Roles('admin')
  async solicitarInformeCompleto(@Request() req) {
    try {
      const reporte = this.reportesService.reportesRepository.create({ 
        userId: Number(req.user.userId), 
        tipoReporte: 'informe_completo', 
        parametrosFiltro: {}, 
        estado: 'generando', 
        codigo: `INFORME-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      }); 
      
      const savedReporte = await this.reportesService.reportesRepository.save(reporte);
      
      // Generar en segundo plano sin bloquear
      this.reportesService.generarInformeCompletoBG(savedReporte.id).catch(err => {
        console.error(`Error generando informe completo: ${err.message}`);
      });
      
      return { 
        reporteId: savedReporte.id, 
        mensaje: 'Informe completo solicitado. Se está generando ahora mismo.'
      }; 
    } catch (error) {
      console.error('Error solicitando informe completo:', error.message);
      throw new InternalServerErrorException(`No se pudo solicitar el informe: ${error.message}`);
    }
  }

  @Get('descargar-completo/:id')
  @Roles('admin')
  async descargarCompleto(@Request() req, @Res() res: Response) {
    try {
      const reporteId = parseInt(req.params.id);
      const reporte = await this.reportesService.reportesRepository.findOne({ where: { id: reporteId } });
      
      if (!reporte) {
        throw new InternalServerErrorException('Reporte no encontrado');
      }
      
      if (reporte.estado === 'generando') {
        return res.status(202).json({ 
          mensaje: 'El informe aún se está generando, por favor intente en unos momentos' 
        });
      }
      
      if (reporte.estado === 'error') {
        throw new InternalServerErrorException('Hubo un error al generar el informe');
      }
      
      if (!reporte.urlPdf) {
        throw new InternalServerErrorException('URL del informe no disponible');
      }
      
      // Construir la ruta del archivo
      const filePath = reporte.urlPdf.replace('/uploads/reports/', '');
      const fullPath = require('path').join(process.cwd(), 'uploads', 'reports', filePath);
      
      res.download(fullPath, `informe-completo-${reporteId}.pdf`);
    } catch (error) {
      console.error('Error descargando informe completo:', error.message);
      throw new InternalServerErrorException(`No se pudo descargar el informe: ${error.message}`);
    }
  }
}
