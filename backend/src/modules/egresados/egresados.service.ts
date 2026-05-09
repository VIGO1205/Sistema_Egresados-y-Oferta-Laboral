import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { unlink } from 'fs/promises';
import { join, basename } from 'path';
import { Egresado } from './entities/egresado.entity';
import { CreateEgresadoDto } from './dto/create-egresado.dto';
import { User } from '../auth/entities/user.entity';
import { Habilidad } from '../habilidades/entities/habilidad.entity';
import { Postulacion } from '../ofertas/entities/postulacion.entity';

@Injectable()
export class EgresadosService {
  constructor(
    @InjectRepository(Egresado)
    private egresadosRepository: Repository<Egresado>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Habilidad)
    private habilidadesRepository: Repository<Habilidad>,
    @InjectRepository(Postulacion)
    private postulacionesRepository: Repository<Postulacion>,
  ) {}

  async create(createEgresadoDto: CreateEgresadoDto): Promise<Egresado> {
    const { email, password, habilidades, ...egresadoData } = createEgresadoDto;

    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.usersRepository.create({
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      rol: 'egresado',
    });
    await this.usersRepository.save(user);

    const egresado = this.egresadosRepository.create({
      ...egresadoData,
      userId: user.id,
    });

    return await this.egresadosRepository.save(egresado);
  }

  async findAll(filters: any): Promise<{ data: Egresado[]; total: number }> {
    console.log('>>> findAll FILTROS RECIBIDOS:', filters);
    const { carrera, anioEgreso, habilidad, search, limit = 10, page = 1 } = filters;

    const queryBuilder = this.egresadosRepository
      .createQueryBuilder('e')
      .leftJoinAndSelect('e.habilidades', 'h')
      .leftJoinAndSelect('e.user', 'u');

    if (search && search.trim() !== '') {
      queryBuilder.andWhere(
        '(e.nombre ILIKE :search OR e.apellido ILIKE :search OR h.nombre ILIKE :search OR u.email ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (carrera && carrera !== '') {
      queryBuilder.andWhere('e.carrera ILIKE :carrera', { carrera: `%${carrera}%` });
    }

    if (anioEgreso && anioEgreso !== '' && anioEgreso !== 'undefined') {
      queryBuilder.andWhere('e.anioEgreso = :anioEgreso', { anioEgreso: parseInt(anioEgreso) });
    }

    if (habilidad && habilidad !== '') {
      queryBuilder.andWhere('h.nombre ILIKE :habilidad', { habilidad: `%${habilidad}%` });
    }

    const [data, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    const dataConEmpresa = await Promise.all(
      data.map(async (egresado) => ({
        ...egresado,
        empresaContratada: await this.getEmpresaContratadaByEgresadoId(egresado.id),
      })),
    );

    console.log(`>>> findAll RESULTADO: ${total} registros encontrados`);
    return { data: dataConEmpresa as Egresado[], total };
  }

  async findOne(id: number): Promise<Egresado> {
    const egresado = await this.egresadosRepository.findOne({
      where: { id },
      relations: ['habilidades', 'user'],
    });

    if (!egresado) {
      throw new NotFoundException(`Egresado con ID ${id} no encontrado`);
    }

    return {
      ...egresado,
      empresaContratada: await this.getEmpresaContratadaByEgresadoId(egresado.id),
    } as Egresado;
  }

  async findByUserId(userId: number): Promise<Egresado & { empresaContratada?: string | null }> {
    const egresado = await this.egresadosRepository.findOne({
      where: { userId },
      relations: ['habilidades', 'user'],
    });

    if (!egresado) {
      throw new NotFoundException('Perfil de egresado no encontrado');
    }

    return {
      ...egresado,
      empresaContratada: await this.getEmpresaContratadaByEgresadoId(egresado.id),
    };
  }

  private async getEmpresaContratadaByEgresadoId(egresadoId: number): Promise<string | null> {
    const postulacionContratada = await this.postulacionesRepository
      .createQueryBuilder('postulacion')
      .leftJoinAndSelect('postulacion.oferta', 'oferta')
      .leftJoinAndSelect('oferta.empresa', 'empresa')
      .where('postulacion.egresado_id = :egresadoId', { egresadoId })
      .andWhere('postulacion.estado = :estado', { estado: 'contratado' })
      .orderBy('postulacion.ultimaActualizacion', 'DESC')
      .addOrderBy('postulacion.fechaPostulacion', 'DESC')
      .getOne();

    return postulacionContratada?.oferta?.empresa?.nombreEmpresa ?? null;
  }

  async update(id: number, updateData: any): Promise<Egresado> {
    console.log('>>> [VERSION 2] ACTUALIZACIÓN DE EGRESADO ID:', id);
    console.log('>>> PAYLOAD RECIBIDO:', JSON.stringify(updateData, null, 2));

    const egresado = await this.findOne(id);
    const updateFields: any = {};

    if (updateData.nombre !== undefined) updateFields.nombre = updateData.nombre;
    if (updateData.apellido !== undefined) updateFields.apellido = updateData.apellido;
    if (updateData.carrera !== undefined) updateFields.carrera = updateData.carrera;

    if (updateData.anioEgreso !== undefined && updateData.anioEgreso !== null && updateData.anioEgreso !== '') {
      const year = Number(updateData.anioEgreso);
      if (!isNaN(year)) {
        updateFields.anioEgreso = year;
      }
    }

    if (updateData.empleadoActualmente !== undefined) updateFields.empleadoActualmente = updateData.empleadoActualmente;
    if (updateData.empresaActual !== undefined) updateFields.empresaActual = updateData.empresaActual;
    if (updateData.datosContacto !== undefined) updateFields.datosContacto = updateData.datosContacto;

    console.log('>>> CAMPOS A ACTUALIZAR:', JSON.stringify(updateFields, null, 2));

    if (Object.keys(updateFields).length > 0) {
      await this.egresadosRepository
        .createQueryBuilder()
        .update(Egresado)
        .set(updateFields)
        .where('id = :id', { id })
        .execute();
      console.log('>>> TABLA EGRESADOS ACTUALIZADA EXITOSAMENTE');
    }

    if (egresado.user?.id) {
      console.log('>>> VERIFICANDO CAMPOS DE EMAIL - emailSistema:', updateData.emailSistema, 'emailRecuperacion:', updateData.emailRecuperacion);
      if (updateData.emailSistema !== undefined && updateData.emailSistema !== null && updateData.emailSistema !== '') {
        console.log('>>> ACTUALIZANDO EMAIL SISTEMA A:', updateData.emailSistema);
        await this.usersRepository
          .createQueryBuilder()
          .update(User)
          .set({ email: updateData.emailSistema })
          .where('id = :userId', { userId: egresado.user.id })
          .execute();
        console.log('>>> SINCRONIZADO EMAIL DEL SISTEMA EN TABLA USERS');
      } else {
        console.log('>>> EMAIL SISTEMA NO FUE ACTUALIZADO - Condición no cumplida');
      }

      if (updateData.emailRecuperacion !== undefined) {
        await this.usersRepository
          .createQueryBuilder()
          .update(User)
          .set({ emailRecuperacion: updateData.emailRecuperacion })
          .where('id = :userId', { userId: egresado.user.id })
          .execute();
        console.log('>>> SINCRONIZADO EMAIL DE RECUPERACIÓN EN TABLA USERS');
      }
    }

    return this.findOne(id);
  }

  async getEstadisticasEgresado(egresadoId: number): Promise<any> {
    const postulaciones = await this.egresadosRepository.query(
      `SELECT 
        COUNT(*) as total_postulaciones, 
        COUNT(CASE WHEN estado = 'contratado' THEN 1 END) as contrataciones, 
        COUNT(CASE WHEN estado = 'entrevista' THEN 1 END) as entrevistas 
       FROM postulaciones 
       WHERE egresado_id = $1`,
      [egresadoId],
    );

    return {
      ...postulaciones[0],
      tasaRespuesta: (postulaciones[0].entrevistas / postulaciones[0].total_postulaciones * 100) || 0,
    };
  }

  async updateCV(userId: number, cvUrl: string): Promise<Egresado> {
    const egresado = await this.egresadosRepository.findOne({ where: { userId } });
    if (!egresado) {
      throw new NotFoundException('Perfil de egresado no encontrado');
    }

    egresado.cvUrl = cvUrl;
    return this.egresadosRepository.save(egresado);
  }

  async deleteCV(userId: number): Promise<Egresado> {
    const egresado = await this.egresadosRepository.findOne({ where: { userId } });
    if (!egresado) {
      throw new NotFoundException('Perfil de egresado no encontrado');
    }

    if (egresado.cvUrl) {
      const cvFileName = basename(egresado.cvUrl);
      const cvFilePath = join(process.cwd(), 'uploads', 'cvs', cvFileName);

      try {
        await unlink(cvFilePath);
      } catch {
        // Si el archivo ya no existe, igual limpiamos la referencia en la base de datos.
      }
    }

    egresado.cvUrl = null;
    return this.egresadosRepository.save(egresado);
  }

  async getAllHabilidades(): Promise<Habilidad[]> {
    return this.habilidadesRepository.find({ order: { nombre: 'ASC' } });
  }

  async updateHabilidades(egresadoId: number, habilidadIds: number[]): Promise<Egresado> {
    const egresado = await this.egresadosRepository.findOne({
      where: { id: egresadoId },
      relations: ['habilidades'],
    });

    if (!egresado) {
      throw new NotFoundException('Egresado no encontrado');
    }

    const habilidades = await this.habilidadesRepository.find({
      where: { id: In(habilidadIds) },
    });

    egresado.habilidades = habilidades;
    return this.egresadosRepository.save(egresado);
  }
}
