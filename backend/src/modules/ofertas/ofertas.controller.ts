import { Controller, Post, Get, Put, Patch, Delete, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { OfertasService } from './ofertas.service';
import { CreateOfertaDto, UpdatePostulacionStatusDto } from './dto/oferta.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('ofertas')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OfertasController {
  constructor(private readonly ofertasService: OfertasService) {}

  // --- Rutas para Empresas ---

  @Post()
  @Roles('empresa')
  async create(@Request() req, @Body() createOfertaDto: CreateOfertaDto) {
    return this.ofertasService.createOferta(req.user.userId, createOfertaDto);
  }

  @Get('mis-postulaciones')
  @Roles('egresado')
  async getMisPostulaciones(@Request() req) {
    return this.ofertasService.findPostulacionesEgresado(req.user.userId);
  }

  @Get('postulaciones/:id/historial')
  async getHistorial(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findHistorialPostulacion(id);
  }

  @Patch(':id')
  @Roles('empresa')
  async update(@Request() req, @Param('id', ParseIntPipe) id: number, @Body() updateDto: Partial<CreateOfertaDto>) {
    return this.ofertasService.updateOferta(req.user.userId, id, updateDto);
  }

  @Delete(':id')
  @Roles('empresa')
  async remove(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.deleteOferta(req.user.userId, id);
  }

  @Patch(':id/reactivate')
  @Roles('empresa')
  async reactivate(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.reactivateOferta(req.user.userId, id);
  }

  @Get(':id/postulaciones')
  @Roles('empresa')
  async getPostulaciones(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findPostulacionesPorOferta(req.user.userId, id);
  }

  @Put('postulaciones/:id/status')
  @Roles('empresa')
  async updateStatus(
    @Request() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdatePostulacionStatusDto
  ) {
    return this.ofertasService.updatePostulacionStatus(req.user.userId, id, updateDto);
  }

  // --- Rutas para Egresados ---

  @Post(':id/postular')
  @Roles('egresado')
  async postular(@Request() req, @Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.postularse(req.user.userId, id);
  }

  // --- Rutas Públicas (Autenticadas) ---

  @Get()
  async findAll(@Request() req): Promise<any> {
    const query = req.query ?? {};
    const userId = req.user?.userId ?? req.user?.sub;
    return this.ofertasService.findAllOfertas(query, userId, req.user?.rol);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ofertasService.findOneOferta(id);
  }
}
