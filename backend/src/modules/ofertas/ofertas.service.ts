import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OfertaLaboral } from './entities/oferta.entity';
import { Postulacion } from './entities/postulacion.entity';
import { Empresa } from './entities/empresa.entity';
import { HistorialPostulacion } from './entities/historial_postulacion.entity';
import { CreateOfertaDto, UpdatePostulacionStatusDto, OfertaResponseDto } from './dto/oferta.dto';
import { Egresado } from '../egresados/entities/egresado.entity';
import { NotificacionesService } from '../notificaciones/notificaciones.service';
import { validarDisponibilidadEgresado } from '../../common/utils/horarios.util';

@Injectable()
export class OfertasService {
  constructor(
    @InjectRepository(OfertaLaboral)
    private ofertasRepository: Repository<OfertaLaboral>,
    @InjectRepository(Postulacion)
    private postulacionesRepository: Repository<Postulacion>,
    @InjectRepository(Empresa)
    private empresasRepository: Repository<Empresa>,
    @InjectRepository(Egresado)
    private egresadosRepository: Repository<Egresado>,
    @InjectRepository(HistorialPostulacion)
    private historialRepository: Repository<HistorialPostulacion>,
    private notificacionesService: NotificacionesService,
  ) {}

  // --- Ofertas ---

  async createOferta(userId: number, createOfertaDto: CreateOfertaDto) {
    const empresa = await this.empresasRepository.findOne({ where: { user_id: userId } });
    if (!empresa) throw new NotFoundException('Perfil de empresa no encontrado');

    const oferta = this.ofertasRepository.create({
      ...createOfertaDto,
      empresa_id: empresa.id,
    });
    return this.ofertasRepository.save(oferta);
  }

  async updateOferta(userId: number, id: number, updateOfertaDto: Partial<CreateOfertaDto>) {
    const empresa = await this.empresasRepository.findOne({ where: { user_id: userId } });
    const oferta = await this.findOneOferta(id);
    
    if (oferta.empresa_id !== empresa.id) throw new ForbiddenException('No tienes permiso para editar esta oferta');

    await this.ofertasRepository.update(id, updateOfertaDto);
    return this.findOneOferta(id);
  }

  async deleteOferta(userId: number, id: number) {
    const empresa = await this.empresasRepository.findOne({ where: { user_id: userId } });
    const oferta = await this.findOneOferta(id);

    if (oferta.empresa_id !== empresa.id) throw new ForbiddenException('No tienes permiso para eliminar esta oferta');

    await this.notificarPostulantesDeOferta(oferta.id, 'oferta_desactivada', 'Oferta desactivada', `La oferta "${oferta.titulo}" fue desactivada por la empresa.`);
    await this.ofertasRepository.update(id, { activa: false });
    return { message: 'Oferta desactivada correctamente' };
  }

  async reactivateOferta(userId: number, id: number) {
    const empresa = await this.empresasRepository.findOne({ where: { user_id: userId } });
    const oferta = await this.findOneOferta(id);

    if (oferta.empresa_id !== empresa.id) throw new ForbiddenException('No tienes permiso para reactivar esta oferta');

    await this.notificarPostulantesDeOferta(oferta.id, 'oferta_reactivada', 'Oferta reactivada', `La oferta "${oferta.titulo}" fue reactivada por la empresa.`);
    await this.ofertasRepository.update(id, { activa: true });
    return { message: 'Oferta reactivada correctamente' };
  }

  private async notificarPostulantesDeOferta(ofertaId: number, tipo: string, titulo: string, contenido: string) {
    const postulaciones = await this.postulacionesRepository.find({
      where: { oferta_id: ofertaId },
      relations: ['egresado', 'egresado.user'],
    });

    await Promise.all(
      postulaciones.map((postulacion) =>
        this.notificacionesService.crearNotificacion({
          userId: postulacion.egresado.user.id,
          tipo,
          titulo,
          contenido,
        }).catch((error) => {
          console.error('[OfertasService] Error al notificar postulante:', error?.message ?? error);
        }),
      ),
    );
  }

  async findAllOfertas(filters: any, userId?: number, rol?: string) {
    const query = this.ofertasRepository.createQueryBuilder('o')
      .leftJoinAndSelect('o.empresa', 'e');

    const resolvedUserId = typeof userId === 'string' ? Number(userId) : userId;

    // Para empresas viendo sus propias ofertas, mostrar todas (activas e inactivas)
    // Para otros, solo activas
    const isMineQuery = filters.mine === true || filters.mine === 'true';
    if (rol === 'empresa' && resolvedUserId !== undefined && resolvedUserId !== null && !Number.isNaN(resolvedUserId)) {
      const empresa = await this.empresasRepository.findOne({ where: { user_id: resolvedUserId } });
      if (empresa) {
        query.andWhere('o.empresa_id = :empresaId', { empresaId: empresa.id });
        // Si es query de "mis ofertas", mostrar todas; si es búsqueda pública, solo activas
        if (!isMineQuery) {
          query.andWhere('o.activa = :activa', { activa: true });
        }
      }
    } else {
      // Para egresados y empresa mirando ofertas públicas, solo activas
      query.andWhere('o.activa = :activa', { activa: true });
    }

    if (filters.modalidad) query.andWhere('o.modalidad = :modalidad', { modalidad: filters.modalidad });
    if (filters.ubicacion) query.andWhere('o.ubicacion ILIKE :ubicacion', { ubicacion: `%${filters.ubicacion}%` });
    if (filters.tipoContrato) query.andWhere('o.tipoContrato ILIKE :tipoContrato', { tipoContrato: `%${filters.tipoContrato}%` });
    if (filters.salarioMin) query.andWhere('o.salarioMin >= :salarioMin', { salarioMin: filters.salarioMin });
    if (filters.salarioMax) query.andWhere('o.salarioMax <= :salarioMax', { salarioMax: filters.salarioMax });
    if (filters.search) {
      query.andWhere('(o.titulo ILIKE :search OR o.descripcion ILIKE :search OR e.nombre ILIKE :search)', { search: `%${filters.search}%` });
    }
    
    // Para egresados autenticados, retornar POJOs con información de conflicto
    if (resolvedUserId !== undefined && resolvedUserId !== null && !Number.isNaN(resolvedUserId)) {
      const egresado = await this.egresadosRepository.findOne({ where: { userId: resolvedUserId } });
      console.log('[OFERTAS] egresado encontrado:', !!egresado);
      if (egresado) {
        const ofertas = await query.getMany();
        console.log('[OFERTAS] ofertas recuperadas:', ofertas.length);
        return ofertas.map(oferta => {
          const conflicto = validarDisponibilidadEgresado(
            egresado.empleadoActualmente,
            egresado.empresaActual,
            null,
            null,
            oferta.titulo,
            oferta.horarioInicio,
            oferta.horarioFin,
          );

          return {
            id: oferta.id,
            codigo: oferta.codigo,
            titulo: oferta.titulo,
            descripcion: oferta.descripcion,
            ubicacion: oferta.ubicacion,
            modalidad: oferta.modalidad,
            tipoContrato: oferta.tipoContrato,
            salarioMin: oferta.salarioMin,
            salarioMax: oferta.salarioMax,
            horarioInicio: oferta.horarioInicio,
            horarioFin: oferta.horarioFin,
            activa: oferta.activa,
            fechaPublicacion: oferta.fechaPublicacion,
            empresa: {
              id: oferta.empresa.id,
              nombreEmpresa: oferta.empresa.nombreEmpresa,
            },
            conflictoHorario: {
              hayConflicto: conflicto.hayConflicto,
              mensaje: conflicto.mensaje,
            },
          };
        });
      }
    }

    // Para otros roles, retornar entidades normalmente
    return query.getMany();
  }

  async findOneOferta(id: number) {
    const oferta = await this.ofertasRepository.findOne({ 
      where: { id },
      relations: ['empresa', 'empresa.user']
    });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    return oferta;
  }

  // --- Postulaciones ---

  async postularse(userId: number, ofertaId: number) {
    const egresado = await this.egresadosRepository.findOne({ where: { userId } });
    if (!egresado) throw new NotFoundException('Perfil de egresado no encontrado');

    const oferta = await this.findOneOferta(ofertaId);
    
    const postulacionExistente = await this.postulacionesRepository.findOne({
      where: { oferta_id: ofertaId, egresado_id: egresado.id }
    });
    if (postulacionExistente) throw new ForbiddenException('Ya te has postulado a esta oferta');

    const postulacion = this.postulacionesRepository.create({
      oferta_id: ofertaId,
      egresado_id: egresado.id,
      estado: 'postulado'
    });
    const savedPostulacion = await this.postulacionesRepository.save(postulacion);

    // Registrar en historial (no bloquear la postulación si falla)
    try {
      await this.historialRepository.save({
        postulacion_id: savedPostulacion.id,
        estadoAnterior: null,
        estadoNuevo: 'postulado',
        cambiadoPor: userId
      });
    } catch (err) {
      console.error('[OfertasService] Error al guardar historial_postulaciones:', err?.message ?? err);
    }

    // Notificar a la empresa (no bloquear la postulación si falla)
    try {
      if (oferta.empresa && oferta.empresa.user) {
        await this.notificacionesService.crearNotificacion({
          userId: oferta.empresa.user.id,
          tipo: 'nueva_postulacion',
          titulo: 'Nueva postulación recibida',
          contenido: `El egresado ${egresado.nombre} ${egresado.apellido} se ha postulado a tu oferta: ${oferta.titulo}`
        });
      } else {
        console.warn('[OfertasService] No se pudo notificar a la empresa: datos incompletos');
      }
    } catch (err) {
      console.error('[OfertasService] Error al crear notificación de postulación:', err?.message ?? err);
    }

    return savedPostulacion;
  }

  async updatePostulacionStatus(userId: number, postulacionId: number, updateDto: UpdatePostulacionStatusDto) {
    const empresa = await this.empresasRepository.findOne({ where: { user_id: userId } });
    if (!empresa) throw new NotFoundException('Empresa no encontrada');

    const postulacion = await this.postulacionesRepository.findOne({
      where: { id: postulacionId },
      relations: ['oferta', 'egresado', 'egresado.user']
    });

    if (!postulacion) throw new NotFoundException('Postulación no encontrada');
    if (postulacion.oferta.empresa_id !== empresa.id) throw new ForbiddenException('No tienes permiso para actualizar esta postulación');

    const estadoAnterior = postulacion.estado;
    postulacion.estado = updateDto.estado;
    
    const updatedPostulacion = await this.postulacionesRepository.save(postulacion);

    // Registrar en historial
    await this.historialRepository.save({
      postulacion_id: postulacion.id,
      estadoAnterior,
      estadoNuevo: updateDto.estado,
      cambiadoPor: userId,
      comentario: updateDto.comentariosEmpresa
    });

    // Notificar al egresado
    await this.notificacionesService.crearNotificacion({
      userId: postulacion.egresado.user.id, // Usar el ID de la tabla users
      tipo: 'cambio_estado_postulacion',
      titulo: 'Actualización en tu postulación',
      contenido: `Tu postulación para "${postulacion.oferta.titulo}" ha cambiado al estado: ${updateDto.estado}`
    });

    return updatedPostulacion;
  }

  async findHistorialPostulacion(postulacionId: number) {
    return this.historialRepository.find({
      where: { postulacion_id: postulacionId },
      order: { fechaCambio: 'DESC' }
    });
  }

  async findPostulacionesEgresado(userId: number) {
    const egresado = await this.egresadosRepository.findOne({ where: { userId } });
    if (!egresado) throw new NotFoundException('Egresado no encontrado');

    return this.postulacionesRepository.find({
      where: { egresado_id: egresado.id },
      relations: ['oferta', 'oferta.empresa']
    });
  }

  async findPostulacionesPorOferta(userId: number, ofertaId: number) {
    const empresa = await this.empresasRepository.findOne({ where: { user_id: userId } });
    const oferta = await this.findOneOferta(ofertaId);

    if (oferta.empresa_id !== empresa.id) throw new ForbiddenException('No tienes permiso para ver estas postulaciones');

    return this.postulacionesRepository.find({
      where: { oferta_id: ofertaId },
      relations: ['egresado', 'egresado.user']
    });
  }
}
