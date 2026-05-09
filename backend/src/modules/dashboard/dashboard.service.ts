import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Egresado } from '../egresados/entities/egresado.entity';
import { OfertaLaboral } from '../ofertas/entities/oferta.entity';
import { Postulacion } from '../ofertas/entities/postulacion.entity';
import { Empresa } from '../ofertas/entities/empresa.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Egresado)
    private egresadosRepository: Repository<Egresado>,
    @InjectRepository(OfertaLaboral)
    private ofertasRepository: Repository<OfertaLaboral>,
    @InjectRepository(Postulacion)
    private postulacionesRepository: Repository<Postulacion>,
    @InjectRepository(Empresa)
    private empresasRepository: Repository<Empresa>,
  ) {}

  async getKPIs(fechaInicio?: string, fechaFin?: string) {
    try {
      let egresadosQuery = this.egresadosRepository.createQueryBuilder('e');
      if (fechaInicio) {
        egresadosQuery = egresadosQuery.where('e.created_at >= :inicio', { inicio: new Date(fechaInicio) });
      }
      if (fechaFin) {
        egresadosQuery = egresadosQuery.andWhere('e.created_at <= :fin', { fin: new Date(fechaFin) });
      }
      const totalEgresados = await egresadosQuery.getCount();

      const totalEmpresas = await this.empresasRepository.count();

      let ofertasQuery = this.ofertasRepository.createQueryBuilder('o').where('o.activa = :activa', { activa: true });
      if (fechaInicio) {
        ofertasQuery = ofertasQuery.andWhere('o.fecha_publicacion >= :inicio', { inicio: new Date(fechaInicio) });
      }
      if (fechaFin) {
        ofertasQuery = ofertasQuery.andWhere('o.fecha_publicacion <= :fin', { fin: new Date(fechaFin) });
      }
      const ofertasActivas = await ofertasQuery.getCount();
      
      let empleadosQuery = this.egresadosRepository.createQueryBuilder('e').where('e.empleado_actualmente = :empl', { empl: true });
      if (fechaInicio) {
        empleadosQuery = empleadosQuery.andWhere('e.created_at >= :inicio', { inicio: new Date(fechaInicio) });
      }
      if (fechaFin) {
        empleadosQuery = empleadosQuery.andWhere('e.created_at <= :fin', { fin: new Date(fechaFin) });
      }
      const egresadosEmpleados = await empleadosQuery.getCount();

      const tasaEmpleabilidad = totalEgresados > 0 
        ? ((egresadosEmpleados / totalEgresados) * 100).toFixed(1) 
        : '0';

      let byCarreraQuery = this.egresadosRepository
        .createQueryBuilder('e')
        .select('e.carrera', 'name')
        .addSelect('COUNT(*)', 'value')
        .groupBy('e.carrera');
      if (fechaInicio) {
        byCarreraQuery = byCarreraQuery.where('e.created_at >= :inicio', { inicio: new Date(fechaInicio) });
      }
      if (fechaFin) {
        byCarreraQuery = byCarreraQuery.andWhere('e.created_at <= :fin', { fin: new Date(fechaFin) });
      }
      const byCarrera = await byCarreraQuery.getRawMany();

      return {
        totalEgresados: totalEgresados || 0,
        totalEmpresas: totalEmpresas || 0,
        ofertasActivas: ofertasActivas || 0,
        tasaEmpleabilidad: tasaEmpleabilidad || '0',
        crecimiento: 12,
        distribucionCarreras: byCarrera.map(item => ({
          carrera: item.name || 'Sin Carrera',
          cantidad: parseInt(item.value) || 0,
        })),
      };
    } catch (error) {
      console.error('Error in getKPIs:', error);
      return {
        totalEgresados: 0,
        totalEmpresas: 0,
        ofertasActivas: 0,
        tasaEmpleabilidad: '0',
        crecimiento: 0,
        distribucionCarreras: [],
      };
    }
  }

  async getEvolucionMensual(fechaInicio?: string, fechaFin?: string) {
    // Consulta real de evolución mensual de ofertas vs postulaciones
    try {
      let ofertasQuery = this.ofertasRepository
        .createQueryBuilder('o')
        .select("TO_CHAR(o.fecha_publicacion, 'Mon')", 'mes')
        .addSelect('COUNT(*)', 'ofertas')
        .groupBy("TO_CHAR(o.fecha_publicacion, 'Mon')")
        .orderBy("MIN(o.fecha_publicacion)");
      
      if (fechaInicio) {
        ofertasQuery = ofertasQuery.where('o.fecha_publicacion >= :inicio', { inicio: new Date(fechaInicio) });
      }
      if (fechaFin) {
        ofertasQuery = ofertasQuery.andWhere('o.fecha_publicacion <= :fin', { fin: new Date(fechaFin) });
      }
      const ofertasMes = await ofertasQuery.getRawMany();

      let postulacionesQuery = this.postulacionesRepository
        .createQueryBuilder('p')
        .select("TO_CHAR(p.fecha_postulacion, 'Mon')", 'mes')
        .addSelect('COUNT(*)', 'postulaciones')
        .groupBy("TO_CHAR(p.fecha_postulacion, 'Mon')")
        .orderBy("MIN(p.fecha_postulacion)");
      
      if (fechaInicio) {
        postulacionesQuery = postulacionesQuery.where('p.fecha_postulacion >= :inicio', { inicio: new Date(fechaInicio) });
      }
      if (fechaFin) {
        postulacionesQuery = postulacionesQuery.andWhere('p.fecha_postulacion <= :fin', { fin: new Date(fechaFin) });
      }
      const postulacionesMes = await postulacionesQuery.getRawMany();

      const meses = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const combined = meses.map(m => {
        const o = ofertasMes.find(x => x.mes === m);
        const p = postulacionesMes.find(x => x.mes === m);
        return {
          mes: m,
          ofertas: o ? parseInt(o.ofertas) : 0,
          postulaciones: p ? parseInt(p.postulaciones) : 0
        };
      }).filter(x => x.ofertas > 0 || x.postulaciones > 0);

      if (combined.length === 0) {
        return [
          { mes: 'May', ofertas: 0, postulaciones: 0 }
        ];
      }
      return combined;
    } catch (error) {
      console.error('Error in getEvolucionMensual:', error);
      return [{ mes: 'N/A', ofertas: 0, postulaciones: 0 }];
    }
  }

  async getTopHabilidades(fechaInicio?: string, fechaFin?: string, limit: number = 5) {
    // Habilidades más solicitadas en ofertas_habilidades con filtro de fecha
    try {
      let query = `
        SELECT h.nombre as name, COUNT(*) as cantidad
        FROM habilidades h
        JOIN ofertas_habilidades oh ON h.id = oh.habilidad_id
        JOIN ofertas_laborales o ON oh.oferta_id = o.id
        WHERE 1=1
      `;
      const params: any[] = [];

      if (fechaInicio) {
        query += ` AND o.fecha_publicacion >= $${params.length + 1}`;
        params.push(new Date(fechaInicio));
      }
      if (fechaFin) {
        query += ` AND o.fecha_publicacion <= $${params.length + 1}`;
        params.push(new Date(fechaFin));
      }

      query += ` GROUP BY h.nombre
        ORDER BY cantidad DESC
        LIMIT $${params.length + 1}`;
      params.push(limit);

      const results = await this.ofertasRepository.query(query, params);
      return results.map(r => ({ name: r.name, cantidad: parseInt(r.cantidad) }));
    } catch (error) {
      console.error('Error in getTopHabilidades:', error);
      return [];
    }
  }

  async getStatsEgresado(userId: number) {
    const egresado = await this.egresadosRepository.findOne({ where: { userId } });
    if (!egresado) return null;

    const totalPostulaciones = await this.postulacionesRepository.count({ where: { egresado_id: egresado.id } });
    const totalRespondidas = await this.postulacionesRepository
      .createQueryBuilder('p')
      .where('p.egresado_id = :egresadoId', { egresadoId: egresado.id })
      .andWhere('p.estado <> :estadoInicial', { estadoInicial: 'postulado' })
      .getCount();
    
    return {
      totalPostulaciones,
      ofertasVistas: null,
      totalRespondidas,
      tasaRespuesta: totalPostulaciones > 0 ? ((totalRespondidas / totalPostulaciones) * 100).toFixed(1) : '0'
    };
  }

  async getStatsEmpresa(userId: number) {
    const empresa = await this.empresasRepository.findOne({ where: { user_id: userId } });
    if (!empresa) return null;

    const ofertas = await this.ofertasRepository.find({ where: { empresa_id: empresa.id } });
    const ofertasIds = ofertas.map(o => o.id);

    const totalPostulaciones = ofertasIds.length > 0 
      ? await this.postulacionesRepository.createQueryBuilder('p')
          .where('p.oferta_id IN (:...ids)', { ids: ofertasIds })
          .getCount()
      : 0;

    const contratados = ofertasIds.length > 0 
      ? await this.postulacionesRepository.createQueryBuilder('p')
          .where('p.oferta_id IN (:...ids)', { ids: ofertasIds })
          .andWhere('p.estado = :estado', { estado: 'contratado' })
          .getCount()
      : 0;

    return {
      ofertasPublicadas: ofertas.length,
      postulacionesRecibidas: totalPostulaciones,
      contratados
    };
  }

  async getRendimientoOfertasEmpresa(userId: number) {
    const empresa = await this.empresasRepository.findOne({ where: { user_id: userId } });
    if (!empresa) return null;

    const query = `
      SELECT 
        o.id,
        o.titulo,
        COUNT(p.id) AS postulaciones,
        COUNT(CASE WHEN p.estado = 'contratado' THEN 1 END) AS contratados
      FROM ofertas_laborales o
      LEFT JOIN postulaciones p ON p.oferta_id = o.id
      WHERE o.empresa_id = $1
      GROUP BY o.id, o.titulo
      ORDER BY postulaciones DESC, o.id DESC
    `;

    const rows = await this.ofertasRepository.query(query, [empresa.id]);
    return rows.map((r: any) => {
      const postulaciones = Number(r.postulaciones) || 0;
      const contratados = Number(r.contratados) || 0;
      const tasaConversion = postulaciones > 0 ? Number(((contratados / postulaciones) * 100).toFixed(1)) : 0;
      return {
        id: Number(r.id),
        titulo: r.titulo,
        postulaciones,
        contratados,
        tasaConversion,
      };
    });
  }

  async getRecomendacionesOfertasEgresado(userId: number, limit: number = 6) {
    const egresado = await this.egresadosRepository.findOne({ where: { userId } });
    if (!egresado) return [];

    const query = `
      SELECT
        o.id,
        o.titulo,
        o.ubicacion,
        o.modalidad,
        o.tipo_contrato,
        o.salario_min,
        o.salario_max,
        e.nombre_empresa,
        COUNT(DISTINCT eh.habilidad_id) AS coincidencias
      FROM ofertas_laborales o
      JOIN empresas e ON e.id = o.empresa_id
      JOIN ofertas_habilidades oh ON oh.oferta_id = o.id
      JOIN egresados_habilidades eh ON eh.habilidad_id = oh.habilidad_id AND eh.egresado_id = $1
      WHERE o.activa = TRUE
      GROUP BY o.id, o.titulo, o.ubicacion, o.modalidad, o.tipo_contrato, o.salario_min, o.salario_max, e.nombre_empresa
      ORDER BY coincidencias DESC, o.fecha_publicacion DESC
      LIMIT $2
    `;

    const rows = await this.ofertasRepository.query(query, [egresado.id, limit]);
    return rows.map((r: any) => ({
      id: Number(r.id),
      titulo: r.titulo,
      ubicacion: r.ubicacion,
      modalidad: r.modalidad,
      tipoContrato: r.tipo_contrato,
      salarioMin: Number(r.salario_min) || 0,
      salarioMax: Number(r.salario_max) || 0,
      empresa: { nombre: r.nombre_empresa },
      coincidencias: Number(r.coincidencias) || 0,
    }));
  }
}
