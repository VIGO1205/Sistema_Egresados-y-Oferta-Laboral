import { Injectable, Logger } from '@nestjs/common'; 
import { InjectQueue } from '@nestjs/bull'; 
import { Queue } from 'bull'; 
import { InjectRepository } from '@nestjs/typeorm'; 
import { Repository } from 'typeorm'; 
import { Reporte } from './entities/reporte.entity'; 
import * as puppeteer from 'puppeteer'; 
import { EgresadosService } from '../egresados/egresados.service';
import { OfertasService } from '../ofertas/ofertas.service';
import { DashboardService } from '../dashboard/dashboard.service';
import { Empresa } from '../ofertas/entities/empresa.entity';
import { OfertaLaboral } from '../ofertas/entities/oferta.entity';
import { Postulacion } from '../ofertas/entities/postulacion.entity';
import { Egresado } from '../egresados/entities/egresado.entity';
import * as fs from 'fs';
import * as path from 'path';

@Injectable() 
export class ReportesService { 
  private readonly logger = new Logger(ReportesService.name); 
  private readonly reportsDir = path.join(process.cwd(), 'uploads', 'reports');
   
  constructor( 
    @InjectQueue('reportes') private reportesQueue: Queue, 
    @InjectRepository(Reporte) public reportesRepository: Repository<Reporte>, 
    @InjectRepository(Empresa) private empresasRepository: Repository<Empresa>,
    @InjectRepository(OfertaLaboral) private ofertasRepository: Repository<OfertaLaboral>,
    @InjectRepository(Postulacion) private postulacionesRepository: Repository<Postulacion>,
    @InjectRepository(Egresado) private egresadosRepository: Repository<Egresado>,
    private egresadosService: EgresadosService,
    private ofertasService: OfertasService,
    private dashboardService: DashboardService,
  ) { 
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  } 
   
  async solicitarReporte(userId: any, tipoReporte: string, filtros: any): Promise<{ reporteId: number; mensaje: string }> { 
    try {
      this.logger.log(`Solicitando reporte tipo ${tipoReporte} para usuario ${userId}`);
      
      const userIdNum = Number(userId);
      if (isNaN(userIdNum)) {
        throw new Error('ID de usuario inválido');
      }

      const reporte = this.reportesRepository.create({ 
        userId: userIdNum, 
        tipoReporte, 
        parametrosFiltro: filtros, 
        estado: 'generando', 
        codigo: `REP-${Date.now()}-${Math.floor(Math.random() * 1000)}`
      }); 
      
      const savedReporte = await this.reportesRepository.save(reporte); 
      this.logger.log(`Reporte guardado en DB con ID: ${savedReporte.id}`);
       
      // EJECUCIÓN DIRECTA PARA EVITAR BLOQUEO DE COLA
      this.logger.log(`Iniciando generación inmediata para reporte ${savedReporte.id}...`);
      
      // Llamamos a la generación sin esperar el await para que el frontend reciba respuesta rápida
      this.generarPDF(savedReporte.id, tipoReporte, filtros).catch(err => {
        this.logger.error(`Error generando PDF: ${err.message}`);
      });
       
      return { 
        reporteId: savedReporte.id, 
        mensaje: 'Reporte solicitado. Se está procesando ahora mismo.', 
      }; 
    } catch (error) {
      this.logger.error(`Error en solicitarReporte: ${error.message}`);
      throw error;
    }
  } 

  async listarReportesUsuario(userId: any): Promise<Reporte[]> {
    return this.reportesRepository.find({
      where: { userId: Number(userId) },
      order: { fechaSolicitud: 'DESC' },
      take: 10
    });
  }
   
  async generarPDF(reporteId: number, tipoReporte: string, filtros: any): Promise<string> { 
    this.logger.log(`Generando PDF para reporte ${reporteId} de tipo ${tipoReporte}`); 
     
    let browser;
    try {
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
      const launchOptions: any = { 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
        this.logger.log(`Usando Chromium configurado en: ${executablePath}`);
      }

      browser = await puppeteer.launch(launchOptions); 
      const page = await browser.newPage(); 
       
      let htmlContent = ''; 
      switch (tipoReporte) { 
        case 'egresados_carrera_contacto': 
          htmlContent = await this.generarHTMLEgresados(filtros); 
          break; 
        case 'ofertas_activas_requisitos': 
          htmlContent = await this.generarHTMLOfertas(filtros); 
          break; 
        case 'postulaciones_por_oferta':
          htmlContent = await this.generarHTMLPostulaciones(filtros);
          break;
        case 'empleabilidad_carrera_anio':
          htmlContent = await this.generarHTMLEmpleabilidad(filtros);
          break;
        case 'demanda_laboral_habilidades':
          htmlContent = await this.generarHTMLDemandaHabilidades(filtros);
          break;
        case 'comparativo_cohorte':
          htmlContent = await this.generarHTMLComparativoCohorte(filtros);
          break;
        case 'satisfaccion_empresas':
          htmlContent = await this.generarHTMLSatisfaccionEmpresas(filtros);
          break;
        default: 
          htmlContent = await this.generarHTMLGenerico(tipoReporte, filtros);
      } 
       
      await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 }); 
       
      const pdfBuffer = await page.pdf({ 
        format: 'A4', 
        printBackground: true, 
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; border-bottom: 1px solid #eee; padding-bottom: 5px; margin: 0 20px;">
            SISTEMA DE EGRESADOS Y EMPLEABILIDAD - REPORTE INSTITUCIONAL
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; border-top: 1px solid #eee; padding-top: 5px; margin: 0 20px;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
        margin: { top: '60px', right: '40px', bottom: '60px', left: '40px' } 
      }); 
       
      const fileName = `reporte_${reporteId}_${Date.now()}.pdf`; 
      const filePath = path.join(this.reportsDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);
       
      const publicUrl = `/uploads/reports/${fileName}`;
      
      await this.reportesRepository.update(reporteId, { 
        urlPdf: publicUrl, 
        estado: 'completado', 
        fechaCompletado: new Date(), 
      }); 
       
      this.logger.log(`PDF generado con éxito: ${publicUrl}`);
      return publicUrl; 

    } catch (error) {
      this.logger.error(`Error crítico generando PDF para reporte ${reporteId}: ${error.message}`);
      await this.reportesRepository.update(reporteId, { estado: 'error' });
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  } 

  async actualizarEstado(reporteId: number, estado: string) {
    await this.reportesRepository.update(reporteId, { estado });
  }

  private renderFiltrosLabel(filtros: any): string {
    if (!filtros || typeof filtros !== 'object') return 'Sin filtros aplicados';
    const copy: any = {};
    Object.keys(filtros).forEach(k => { if (k !== 'page' && k !== 'limit') copy[k] = filtros[k]; });
    const keys = Object.keys(copy);
    if (keys.length === 0) return 'Sin filtros aplicados';
    const hasValid = keys.some(k => {
      const v = copy[k];
      if (v === '' || v === null || v === undefined) return false;
      if (Array.isArray(v) && v.length === 0) return false;
      if (v === false) return false;
      return true;
    });
    if (!hasValid) return 'Sin filtros aplicados';
    return 'Filtros aplicados: ' + JSON.stringify(copy, null, 2);
  }
   
  private async generarHTMLPostulaciones(filtros: any): Promise<string> {
    return this.generarHTMLGenerico('Reporte de Postulaciones por Oferta', filtros);
  }

  private async generarHTMLEmpleabilidad(filtros: any): Promise<string> {
    const filtrosReporte = { ...filtros, page: 1, limit: filtros?.limit ?? 100 };
    const { data } = await this.egresadosService.findAll(filtrosReporte);

    // Agrupar por carrera
    const agrupado: Record<string, { total: number; empleados: number }> = {};
    data.forEach((e: any) => {
      const carrera = e.carrera || 'Sin carrera';
      agrupado[carrera] = agrupado[carrera] || { total: 0, empleados: 0 };
      agrupado[carrera].total += 1;
      if (e.empleadoActualmente) agrupado[carrera].empleados += 1;
    });

    const rows = Object.keys(agrupado).sort().map(c => ({ carrera: c, ...agrupado[c] }));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 10px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
          th { background-color: #f8fafc; color: #1a365d; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SISTEMA DE EGRESADOS</div>
          <h1>Reporte de Empleabilidad por Carrera</h1>
          <p>${this.renderFiltrosLabel(filtros)}</p>
          <p>Fecha de emisión: ${new Date().toLocaleString()}</p>
        </div>

        <table>
          <thead>
            <tr><th>Carrera</th><th>Total Egresados</th><th>Empleados</th><th>Tasa Empleabilidad (%)</th></tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr><td>${r.carrera}</td><td>${r.total}</td><td>${r.empleados}</td><td>${((r.empleados / (r.total || 1)) * 100).toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  private async generarHTMLGenerico(titulo: string, filtros: any): Promise<string> {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Helvetica', sans-serif; margin: 40px; color: #1a202c; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2d3748; padding-bottom: 20px; margin-bottom: 30px; }
          .logo-box { font-size: 24px; font-weight: bold; color: #2b6cb0; }
          .info { text-align: right; font-size: 12px; color: #4a5568; }
          h1 { color: #2d3748; font-size: 22px; text-align: center; margin-bottom: 40px; text-transform: uppercase; }
          .content-placeholder { border: 2px dashed #e2e8f0; padding: 40px; text-align: center; color: #a0aec0; border-radius: 12px; }
          .footer { position: fixed; bottom: 0; width: 100%; text-align: center; font-size: 10px; color: #718096; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo-box">SISTEMA EGRESADOS</div>
          <div class="info">
            <div>Fecha: ${new Date().toLocaleDateString()}</div>
            <div>Hora: ${new Date().toLocaleTimeString()}</div>
          </div>
        </div>
        <h1>${titulo}</h1>
        <div class="content-placeholder">
          <p>Los datos detallados y gráficos para este reporte están siendo procesados con los filtros seleccionados:</p>
          <pre style="text-align: left; font-size: 10px; background: #f7fafc; padding: 10px; border-radius: 8px;">
            ${this.renderFiltrosLabel(filtros)}
          </pre>
        </div>
        <div class="footer">Este es un documento oficial generado por la plataforma institucional.</div>
      </body>
      </html>
    `;
  }

  private async generarHTMLEgresados(filtros: any): Promise<string> { 
    const filtrosReporte = {
      ...filtros,
      page: 1,
      limit: filtros?.limit ?? 100,
    };

    const { data } = await this.egresadosService.findAll(filtrosReporte);
    
    const filtrosMostrar = Object.keys(filtros)
      .filter(key => key !== 'page' && key !== 'limit')
      .reduce((obj, key) => {
        obj[key] = filtros[key];
        return obj;
      }, {});
    
    const tieneFilterosValidos = Object.values(filtrosMostrar).some(v => v !== '' && v !== false && v !== null && v !== undefined);
     
    return ` 
      <!DOCTYPE html> 
      <html> 
      <head> 
        <meta charset="UTF-8"> 
        <style> 
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; } 
          .header { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 10px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #1a365d; }
          h1 { color: #2c3e50; font-size: 20px; } 
          table { width: 100%; border-collapse: collapse; margin-top: 20px; } 
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; } 
          th { background-color: #f8fafc; color: #1a365d; font-weight: bold; } 
          .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px; } 
        </style> 
      </head> 
      <body> 
        <div class="header"> 
          <div class="logo">SISTEMA DE EGRESADOS</div>
          <h1>Listado de Egresados por Carrera</h1> 
          <p>${tieneFilterosValidos ? 'Filtros aplicados: ' + JSON.stringify(filtrosMostrar) : 'Sin filtros aplicados'}</p>
          <p>Fecha de emisión: ${new Date().toLocaleString()}</p> 
        </div> 
         
        <table> 
          <thead> 
            <tr>
              <th>Código</th>
              <th>Nombre Completo</th>
              <th>Carrera</th>
              <th>Año Egreso</th>
              <th>Email</th>
            </tr> 
          </thead> 
          <tbody> 
            ${data.map(e => ` 
              <tr> 
                <td>${e.codigo || 'N/A'}</td> 
                <td>${e.nombre} ${e.apellido}</td> 
                <td>${e.carrera}</td> 
                <td>${e.anioEgreso}</td> 
                <td>${e.user?.email || 'N/A'}</td> 
              </tr> 
            `).join('')} 
          </tbody> 
        </table> 
         
        <div class="footer"> 
          <p>Este documento es un reporte oficial generado automáticamente por la plataforma institucional.</p> 
        </div> 
      </body> 
      </html> 
    `; 
  }

  private async generarHTMLDemandaHabilidades(filtros: any): Promise<string> {
    const filtrosReporte = { ...filtros, page: 1, limit: filtros?.limit ?? 100 };
    const { data } = await this.egresadosService.findAll(filtrosReporte);

    const contador: Record<string, number> = {};
    data.forEach((e: any) => {
      if (Array.isArray(e.habilidades)) {
        e.habilidades.forEach((h: any) => {
          const nombre = h.nombre || 'Sin nombre';
          contador[nombre] = (contador[nombre] || 0) + 1;
        });
      }
    });

    const items = Object.keys(contador).map(k => ({ nombre: k, cantidad: contador[k] }));
    items.sort((a, b) => b.cantidad - a.cantidad);

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 10px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
          th { background-color: #f8fafc; color: #1a365d; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SISTEMA EGRESADOS</div>
          <h1>Demanda Laboral - Habilidades (Top)</h1>
          <p>${this.renderFiltrosLabel(filtros)}</p>
          <p>Fecha de emisión: ${new Date().toLocaleString()}</p>
        </div>

        <table>
          <thead>
            <tr><th>Habilidad</th><th>Cantidad de Egresados</th></tr>
          </thead>
          <tbody>
            ${items.map(it => `<tr><td>${it.nombre}</td><td>${it.cantidad}</td></tr>`).join('')}
          </tbody>
        </table>
        <div style="margin-top:30px;font-size:11px;color:#64748b">Nota: Conteo basado en las habilidades registradas en perfiles de egresados.</div>
      </body>
      </html>
    `;
  }

  private async generarHTMLComparativoCohorte(filtros: any): Promise<string> {
    const filtrosReporte = { ...filtros, page: 1, limit: filtros?.limit ?? 100 };
    const { data } = await this.egresadosService.findAll(filtrosReporte);

    const cohorts: Record<string, { total: number; empleados: number }> = {};
    data.forEach((e: any) => {
      const anio = String(e.anioEgreso || 'Sin año');
      cohorts[anio] = cohorts[anio] || { total: 0, empleados: 0 };
      cohorts[anio].total += 1;
      if (e.empleadoActualmente) cohorts[anio].empleados += 1;
    });

    const rows = Object.keys(cohorts).sort().map(year => ({ year, ...cohorts[year] }));

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 10px; margin-bottom: 30px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; font-size: 12px; }
          th { background-color: #f8fafc; color: #1a365d; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SISTEMA EGRESADOS</div>
          <h1>Comparativo por Cohorte</h1>
          <p>${this.renderFiltrosLabel(filtros)}</p>
          <p>Fecha de emisión: ${new Date().toLocaleString()}</p>
        </div>

        <table>
          <thead>
            <tr><th>Año Egreso</th><th>Total Egresados</th><th>Empleados</th><th>Tasa Empleabilidad (%)</th></tr>
          </thead>
          <tbody>
            ${rows.map(r => `<tr><td>${r.year}</td><td>${r.total}</td><td>${r.empleados}</td><td>${((r.empleados / (r.total || 1)) * 100).toFixed(2)}</td></tr>`).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  private async generarHTMLSatisfaccionEmpresas(filtros: any): Promise<string> {
    const empresas = await this.empresasRepository.query(`
      SELECT
        e.id,
        e.nombre_empresa AS "nombreEmpresa",
        COALESCE(e.sector, 'Sin sector') AS sector,
        COUNT(DISTINCT o.id)::int AS ofertas,
        COUNT(DISTINCT CASE WHEN o.activa THEN o.id END)::int AS "ofertasActivas",
        COUNT(p.id)::int AS postulaciones,
        COUNT(CASE WHEN p.estado = 'contratado' THEN 1 END)::int AS contratados
      FROM empresas e
      LEFT JOIN ofertas_laborales o ON o.empresa_id = e.id
      LEFT JOIN postulaciones p ON p.oferta_id = o.id
      GROUP BY e.id, e.nombre_empresa, e.sector
      ORDER BY COUNT(p.id) DESC, COUNT(DISTINCT o.id) DESC, e.nombre_empresa ASC
    `);

    const empresasConActividad = empresas.filter((empresa: any) => Number(empresa.ofertas || 0) > 0 || Number(empresa.postulaciones || 0) > 0);

    if (empresasConActividad.length === 0) {
      return `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #1a202c; }
            .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #2d3748; padding-bottom: 20px; margin-bottom: 30px; }
            .content-placeholder { border: 2px dashed #e2e8f0; padding: 40px; text-align: center; color: #a0aec0; border-radius: 12px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="logo-box">SISTEMA EGRESADOS</div>
            <div class="info">
              <div>Fecha: ${new Date().toLocaleDateString()}</div>
              <div>Hora: ${new Date().toLocaleTimeString()}</div>
            </div>
          </div>
          <h1>Satisfacción de Empresas</h1>
          <div class="content-placeholder">
            <p>No se encontraron empresas con ofertas o postulaciones registradas.</p>
            <p>Este reporte se alimenta de la actividad empresarial existente en el sistema.</p>
            <pre style="text-align:left; font-size:10px; background:#f7fafc; padding:10px; border-radius:8px;">${this.renderFiltrosLabel(filtros)}</pre>
          </div>
        </body>
        </html>
      `;
    }

    const resumen = empresasConActividad.reduce(
      (acc: any, empresa: any) => {
        acc.totalEmpresas += 1;
        acc.totalOfertas += Number(empresa.ofertas || 0);
        acc.ofertasActivas += Number(empresa.ofertasActivas || 0);
        acc.totalPostulaciones += Number(empresa.postulaciones || 0);
        acc.totalContratados += Number(empresa.contratados || 0);
        return acc;
      },
      { totalEmpresas: 0, totalOfertas: 0, ofertasActivas: 0, totalPostulaciones: 0, totalContratados: 0 },
    );

    const topEmpresas = [...empresasConActividad]
      .sort((a: any, b: any) => Number(b.postulaciones || 0) - Number(a.postulaciones || 0))
      .slice(0, 8)
      .map((empresa: any) => {
        const postulaciones = Number(empresa.postulaciones || 0);
        const contratados = Number(empresa.contratados || 0);
        return {
          nombreEmpresa: empresa.nombreEmpresa || 'Empresa sin nombre',
          sector: empresa.sector || 'Sin sector',
          ofertas: Number(empresa.ofertas || 0),
          ofertasActivas: Number(empresa.ofertasActivas || 0),
          postulaciones,
          contratados,
          tasaConversion: postulaciones > 0 ? ((contratados / postulaciones) * 100).toFixed(2) : '0.00',
        };
      });

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; }
          .header { text-align: center; border-bottom: 3px solid #1a365d; padding-bottom: 10px; margin-bottom: 24px; }
          .logo { font-size: 24px; font-weight: bold; color: #1a365d; }
          h1 { color: #2d3748; font-size: 20px; margin: 10px 0 0; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 24px 0; }
          .summary-card { border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; background: #f8fafc; }
          .summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.06em; }
          .summary-value { font-size: 24px; font-weight: 700; color: #1e293b; margin-top: 6px; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; text-align: left; font-size: 12px; }
          th { background-color: #f8fafc; color: #1a365d; font-weight: 700; }
          .note { margin-top: 20px; font-size: 11px; color: #64748b; }
          .filters { margin-top: 12px; white-space: pre-wrap; text-align: left; font-size: 10px; background: #f8fafc; padding: 10px; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">SISTEMA DE EMPLEABILIDAD</div>
          <h1>Satisfacción de Empresas</h1>
          <p>${this.renderFiltrosLabel(filtros)}</p>
          <p>Fecha de emisión: ${new Date().toLocaleString()}</p>
        </div>

        <div class="summary">
          <div class="summary-card"><div class="summary-label">Empresas activas</div><div class="summary-value">${resumen.totalEmpresas}</div></div>
          <div class="summary-card"><div class="summary-label">Ofertas publicadas</div><div class="summary-value">${resumen.totalOfertas}</div></div>
          <div class="summary-card"><div class="summary-label">Postulaciones</div><div class="summary-value">${resumen.totalPostulaciones}</div></div>
          <div class="summary-card"><div class="summary-label">Contrataciones</div><div class="summary-value">${resumen.totalContratados}</div></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Sector</th>
              <th>Ofertas</th>
              <th>Activas</th>
              <th>Postulaciones</th>
              <th>Contratados</th>
              <th>Tasa conversión</th>
            </tr>
          </thead>
          <tbody>
            ${topEmpresas.map((empresa: any) => `
              <tr>
                <td>${empresa.nombreEmpresa}</td>
                <td>${empresa.sector}</td>
                <td>${empresa.ofertas}</td>
                <td>${empresa.ofertasActivas}</td>
                <td>${empresa.postulaciones}</td>
                <td>${empresa.contratados}</td>
                <td>${empresa.tasaConversion}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="note">
          Este reporte usa actividad real del sistema como proxy de satisfacción empresarial: ofertas publicadas, postulaciones recibidas y contrataciones registradas.
        </div>
      </body>
      </html>
    `;
  }

  private async generarHTMLOfertas(filtros: any): Promise<string> {
    const todasLasOfertas = await this.ofertasService.findAllOfertas(filtros);
    const ofertas = todasLasOfertas.slice(0, 100);
    return `
      <!DOCTYPE html> 
      <html> 
      <head> 
        <meta charset="UTF-8"> 
        <style> 
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 40px; color: #333; } 
          .header { text-align: center; border-bottom: 3px solid #2b6cb0; padding-bottom: 10px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #2b6cb0; }
          h1 { color: #2d3748; font-size: 20px; } 
          .oferta-card { border: 1px solid #e2e8f0; padding: 15px; margin-bottom: 15px; border-left: 5px solid #4299e1; }
          .oferta-titulo { font-weight: bold; font-size: 16px; color: #2b6cb0; }
          .empresa { font-style: italic; color: #4a5568; margin-bottom: 10px; }
          .detalle { font-size: 12px; margin-top: 5px; }
          .label { font-weight: bold; color: #4a5568; }
          .footer { text-align: center; margin-top: 50px; font-size: 10px; color: #a0aec0; } 
        </style> 
      </head> 
      <body> 
        <div class="header"> 
          <div class="logo">SISTEMA DE EMPLEABILIDAD</div>
          <h1>Reporte de Ofertas Laborales Activas</h1> 
          <p>Fecha de emisión: ${new Date().toLocaleString()}</p> 
        </div> 
         
        ${ofertas.map(o => ` 
          <div class="oferta-card">
            <div class="oferta-titulo">${o.titulo}</div>
            <div class="empresa">${o.empresa?.nombreEmpresa || 'Empresa Privada'}</div>
            <div class="detalle"><span class="label">Modalidad:</span> ${o.modalidad}</div>
            <div class="detalle"><span class="label">Ubicación:</span> ${o.ubicacion || 'No especificada'}</div>
            <div class="detalle"><span class="label">Salario:</span> S/ ${o.salarioMin} - S/ ${o.salarioMax}</div>
            <div class="detalle" style="margin-top: 10px;">${o.descripcion.substring(0, 200)}...</div>
          </div> 
        `).join('')} 
         
        <div class="footer"> 
          <p>Reporte generado para uso administrativo interno.</p> 
        </div> 
      </body> 
      </html> 
    `;
  }

  async generarInformeCompletoBG(reporteId: number): Promise<string> {
    this.logger.log(`Generando informe completo para reporte ${reporteId}`);
    let browser;
    try {
      const kpis = await this.dashboardService.getKPIs();
      const evolucionData = await this.dashboardService.getEvolucionMensual();
      const habilidades = await this.dashboardService.getTopHabilidades(undefined, undefined, 10);
      const postulacionesEstado = await this.postulacionesRepository
        .createQueryBuilder('p')
        .select('p.estado', 'estado')
        .addSelect('COUNT(*)', 'cantidad')
        .groupBy('p.estado')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany();

      const htmlContent = await this.generarHTMLInformeCompleto(kpis, evolucionData, habilidades, postulacionesEstado);
      
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
      const launchOptions: any = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
        this.logger.log(`Usando Chromium configurado en: ${executablePath}`);
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      
      await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 30000 });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 0 20px;">
            INFORME COMPLETO - SISTEMA DE EGRESADOS Y EMPLEABILIDAD
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; border-top: 1px solid #ddd; padding-top: 5px; margin: 0 20px;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
        margin: { top: '60px', right: '40px', bottom: '60px', left: '40px' }
      });

      const fileName = `informe_completo_${reporteId}_${Date.now()}.pdf`;
      const filePath = path.join(this.reportsDir, fileName);
      fs.writeFileSync(filePath, pdfBuffer);

      const publicUrl = `/uploads/reports/${fileName}`;
      
      await this.reportesRepository.update(reporteId, {
        urlPdf: publicUrl,
        estado: 'completado',
        fechaCompletado: new Date(),
      });

      this.logger.log(`Informe completo generado exitosamente: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error(`Error generando informe completo ${reporteId}: ${error.message}`);
      await this.reportesRepository.update(reporteId, { estado: 'error' });
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  async generarInformeCompleto(): Promise<Buffer> {
    this.logger.log('Iniciando generación de informe completo');
    let browser;
    try {
      const kpis = await this.dashboardService.getKPIs();
      const evolucionData = await this.dashboardService.getEvolucionMensual();
      const habilidades = await this.dashboardService.getTopHabilidades(undefined, undefined, 10);
      const postulacionesEstado = await this.postulacionesRepository
        .createQueryBuilder('p')
        .select('p.estado', 'estado')
        .addSelect('COUNT(*)', 'cantidad')
        .groupBy('p.estado')
        .orderBy('COUNT(*)', 'DESC')
        .getRawMany();

      const htmlContent = await this.generarHTMLInformeCompleto(kpis, evolucionData, habilidades, postulacionesEstado);
      
      const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH?.trim();
      const launchOptions: any = {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      };

      if (executablePath) {
        launchOptions.executablePath = executablePath;
        this.logger.log(`Usando Chromium configurado en: ${executablePath}`);
      }

      browser = await puppeteer.launch(launchOptions);
      const page = await browser.newPage();
      
      // Usar waitUntil: 'load' es más confiable que 'networkidle0'
      try {
        await page.setContent(htmlContent, { waitUntil: 'load', timeout: 30000 });
      } catch (error) {
        this.logger.warn(`Advertencia al cargar HTML: ${error.message}`);
        // Continuar de todas formas
      }

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        displayHeaderFooter: true,
        headerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin: 0 20px;">
            INFORME COMPLETO - SISTEMA DE EGRESADOS Y EMPLEABILIDAD
          </div>
        `,
        footerTemplate: `
          <div style="font-size: 10px; width: 100%; text-align: center; border-top: 1px solid #ddd; padding-top: 5px; margin: 0 20px;">
            Página <span class="pageNumber"></span> de <span class="totalPages"></span>
          </div>
        `,
        margin: { top: '60px', right: '40px', bottom: '60px', left: '40px' }
      });

      this.logger.log(`Informe completo generado exitosamente (${pdfBuffer.length} bytes)`);
      return pdfBuffer;
    } catch (error) {
      this.logger.error(`Error generando informe completo: ${error.message}`);
      throw error;
    } finally {
      if (browser) await browser.close();
    }
  }

  private async generarHTMLInformeCompleto(kpis: any, evolucionData: any[], habilidades: any[], postulacionesEstado: any[]): Promise<string> {
    const fechaGeneracion = new Date().toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const totalCarreras = Array.isArray(kpis?.distribucionCarreras)
      ? kpis.distribucionCarreras.reduce((acc: number, carrera: any) => acc + (Number(carrera.cantidad) || 0), 0)
      : 0;

    const htmlPostulacionesEstado = postulacionesEstado.map(p => 
      `<tr><td>${p.estado}</td><td>${p.cantidad}</td></tr>`
    ).join('');

    const htmlHabilidades = habilidades.map(h => 
      `<tr><td>${h.name || h.nombre}</td><td>${h.cantidad}</td></tr>`
    ).join('');

    const htmlCarreras = kpis.distribucionCarreras.map((c: any) => 
      `<tr><td>${c.carrera}</td><td>${c.cantidad}</td><td>${totalCarreras > 0 ? ((Number(c.cantidad) / totalCarreras) * 100).toFixed(1) : '0.0'}%</td></tr>`
    ).join('');

    const htmlEvolucion = evolucionData.map((m: any) => 
      `<tr><td>${m.mes}</td><td>${m.ofertas ?? 0}</td><td>${m.postulaciones ?? 0}</td></tr>`
    ).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 900px; margin: 0 auto; }
          
          .cover-page {
            page-break-after: always;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            text-align: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
          }

          .cover-page h1 {
            font-size: 48px;
            margin-bottom: 20px;
            font-weight: bold;
          }

          .cover-page .subtitle {
            font-size: 24px;
            margin-bottom: 40px;
            opacity: 0.9;
          }

          .cover-page .date {
            font-size: 14px;
            opacity: 0.8;
            margin-top: 60px;
          }

          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            margin-bottom: 30px;
            border-radius: 8px;
            page-break-inside: avoid;
          }

          .header h2 {
            font-size: 28px;
            margin-bottom: 10px;
          }

          .section {
            page-break-inside: avoid;
            margin-bottom: 40px;
          }

          .section-title {
            font-size: 20px;
            color: #667eea;
            border-bottom: 3px solid #667eea;
            padding-bottom: 10px;
            margin-bottom: 20px;
            font-weight: bold;
          }

          .subsection-title {
            font-size: 14px;
            font-weight: 700;
            color: #334155;
            margin: 16px 0 10px;
          }

          .kpi-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-bottom: 30px;
          }

          .kpi-card {
            background: #f8f9fa;
            border-left: 4px solid #667eea;
            padding: 20px;
            border-radius: 4px;
            page-break-inside: avoid;
          }

          .kpi-card.kpi-1 {
            border-left-color: #3b82f6;
          }

          .kpi-card.kpi-2 {
            border-left-color: #10b981;
          }

          .kpi-card.kpi-3 {
            border-left-color: #f59e0b;
          }

          .kpi-card.kpi-4 {
            border-left-color: #6366f1;
          }

          .kpi-card .label {
            color: #666;
            font-size: 12px;
            text-transform: uppercase;
            font-weight: bold;
          }

          .kpi-card .value {
            font-size: 32px;
            color: #667eea;
            font-weight: bold;
            margin-top: 10px;
          }

          .kpi-card.kpi-1 .value {
            color: #3b82f6;
          }

          .kpi-card.kpi-2 .value {
            color: #10b981;
          }

          .kpi-card.kpi-3 .value {
            color: #f59e0b;
          }

          .kpi-card.kpi-4 .value {
            color: #6366f1;
          }

          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            page-break-inside: avoid;
          }

          table th {
            background: #667eea;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: bold;
            font-size: 13px;
          }

          table td {
            padding: 10px 12px;
            border-bottom: 1px solid #e0e0e0;
            font-size: 12px;
          }

          table tr:nth-child(even) {
            background: #f8f9fa;
          }

          .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            font-size: 11px;
            color: #888;
          }

          .anomalia {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
            page-break-inside: avoid;
          }

          .anomalia-title {
            font-weight: bold;
            color: #856404;
          }

          @media print {
            body { margin: 0; padding: 0; }
            .cover-page { page-break-after: always; }
          }
        </style>
      </head>
      <body>
        <!-- Portada -->
        <div class="cover-page">
          <h1>INFORME COMPLETO</h1>
          <div class="subtitle">Sistema de Egresados y Empleabilidad</div>
          <div class="date">Generado: ${fechaGeneracion}</div>
        </div>

        <!-- Contenido principal -->
        <div class="container">
          <!-- Resumen Ejecutivo -->
          <div class="header">
            <h2>Resumen Ejecutivo</h2>
            <p>Análisis integral de la base de datos institucional</p>
          </div>

          <!-- KPIs -->
          <div class="section">
            <div class="section-title">Indicadores Clave de Desempeño (KPIs)</div>
            <div class="kpi-container">
              <div class="kpi-card kpi-1">
                <div class="label">Total de Egresados</div>
                <div class="value">${kpis.totalEgresados}</div>
              </div>
              <div class="kpi-card kpi-2">
                <div class="label">Tasa de Empleabilidad</div>
                <div class="value">${kpis.tasaEmpleabilidad}%</div>
              </div>
              <div class="kpi-card kpi-3">
                <div class="label">Ofertas Activas</div>
                <div class="value">${kpis.ofertasActivas}</div>
              </div>
              <div class="kpi-card kpi-4">
                <div class="label">Crecimiento Proyectado</div>
                <div class="value">+${kpis.crecimiento}%</div>
              </div>
            </div>
          </div>

          <!-- Distribución por Carrera -->
          <div class="section">
            <div class="section-title">Distribución de Egresados por Carrera</div>
            <table>
              <thead>
                <tr>
                  <th>Carrera</th>
                  <th>Cantidad</th>
                  <th>Porcentaje</th>
                </tr>
              </thead>
              <tbody>
                ${htmlCarreras}
              </tbody>
            </table>
          </div>

          <!-- Evolución Mensual -->
          <div class="section">
            <div class="section-title">Evolución Mensual General</div>
            <table>
              <thead>
                <tr>
                  <th>Mes</th>
                  <th>Ofertas</th>
                  <th>Postulaciones</th>
                </tr>
              </thead>
              <tbody>
                ${htmlEvolucion}
              </tbody>
            </table>
          </div>

          <!-- Estado de Postulaciones -->
          <div class="section">
            <div class="section-title">Estado de Postulaciones</div>
            <table>
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Cantidad</th>
                </tr>
              </thead>
              <tbody>
                ${htmlPostulacionesEstado}
              </tbody>
            </table>
          </div>

          <!-- Habilidades Demandadas -->
          <div class="section">
            <div class="section-title">Top 10 Habilidades Más Solicitadas</div>
            <table>
              <thead>
                <tr>
                  <th>Habilidad</th>
                  <th>Demanda</th>
                </tr>
              </thead>
              <tbody>
                ${htmlHabilidades}
              </tbody>
            </table>
          </div>

          <!-- Recomendaciones -->
          <div class="section">
            <div class="section-title">Análisis y Recomendaciones</div>
            
            ${kpis.tasaEmpleabilidad >= 70 ? `
              <div class="anomalia" style="background: #d4edda; border-left-color: #28a745;">
                <div class="anomalia-title" style="color: #155724;">✓ Fortaleza: Alta Tasa de Empleabilidad</div>
                <p>La tasa de empleabilidad del ${kpis.tasaEmpleabilidad}% indica una excelente validación de la currícula y fuerte demanda de egresados.</p>
              </div>
            ` : `
              <div class="anomalia">
                <div class="anomalia-title">⚠ Alerta: Tasa de Empleabilidad Baja</div>
                <p>La tasa actual de ${kpis.tasaEmpleabilidad}% requiere implementación de programas de capacitación y vinculación con empresas.</p>
              </div>
            `}

            ${kpis.ofertasActivas > 50 ? `
              <div class="anomalia" style="background: #d4edda; border-left-color: #28a745;">
                <div class="anomalia-title" style="color: #155724;">✓ Oportunidad: Alto Volumen de Ofertas</div>
                <p>Contamos con ${kpis.ofertasActivas} ofertas activas, indicando una buena relación con empresas partners.</p>
              </div>
            ` : `
              <div class="anomalia">
                <div class="anomalia-title">⚠ Alerta: Bajo Volumen de Ofertas</div>
                <p>Se recomienda intensificar gestión de empresas para aumentar el número de ofertas laborales disponibles.</p>
              </div>
            `}

            ${evolucionData.length > 0 && Number(evolucionData[evolucionData.length - 1]?.postulaciones || 0) > 0 ? `
              <div class="anomalia" style="background: #fff7ed; border-left-color: #f59e0b;">
                <div class="anomalia-title" style="color: #9a3412;">ℹ Tendencia Detectada</div>
                <p>El último periodo registrado muestra ${evolucionData[evolucionData.length - 1].postulaciones} postulaciones, útil para revisar el comportamiento del embudo.</p>
              </div>
            ` : ''}

            ${kpis.crecimiento >= 10 ? `
              <div class="anomalia" style="background: #d4edda; border-left-color: #28a745;">
                <div class="anomalia-title" style="color: #155724;">✓ Tendencia: Crecimiento Positivo</div>
                <p>Proyección de crecimiento del +${kpis.crecimiento}% para el próximo trimestre basado en tendencias actuales.</p>
              </div>
            ` : ``}
          </div>

          <!-- Pie de página -->
          <div class="footer">
            <p>Este es un documento confidencial generado automáticamente por el Sistema de Egresados y Empleabilidad.</p>
            <p>Fecha de emisión: ${fechaGeneracion}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
} 
