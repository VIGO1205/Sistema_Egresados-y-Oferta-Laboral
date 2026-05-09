import { Controller, Get, Post, Body, Patch, Put, Param, Delete, Query, UseGuards, ParseIntPipe, UseInterceptors, UploadedFile, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { EgresadosService } from './egresados.service';
import { CreateEgresadoDto } from './dto/create-egresado.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('egresados')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EgresadosController {
  constructor(private readonly egresadosService: EgresadosService) {}

  @Post('cv')
  @Roles('egresado')
  @UseInterceptors(FileInterceptor('cv', {
    storage: diskStorage({
      destination: './uploads/cvs',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `cv-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(pdf)$/)) {
        return cb(new Error('Solo se permiten archivos PDF'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    }
  }))
  async uploadCV(@Request() req, @UploadedFile() file: Express.Multer.File) {
    const url = `/uploads/cvs/${file.filename}`;
    return this.egresadosService.updateCV(req.user.userId, url);
  }

  @Delete('cv')
  @Roles('egresado')
  async deleteCV(@Request() req) {
    return this.egresadosService.deleteCV(req.user.userId);
  }

  @Get('habilidades/disponibles')
  @Roles('egresado', 'admin')
  async getHabilidadesDisponibles() {
    return this.egresadosService.getAllHabilidades();
  }

  @Put(':id/habilidades')
  @Roles('admin')
  async updateHabilidades(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { habilidadIds: number[] }
  ) {
    return this.egresadosService.updateHabilidades(id, body.habilidadIds);
  }

   @Post()
   @Roles('admin')
   create(@Body() createEgresadoDto: CreateEgresadoDto) {
     return this.egresadosService.create(createEgresadoDto);
   }

  @Get('perfil')
  @Roles('egresado')
  getPerfil(@Request() req) {
    return this.egresadosService.findByUserId(req.user.userId);
  }

  @Get()
  @Roles('admin', 'empresa')
  findAll(@Query() filters: any) {
    return this.egresadosService.findAll(filters);
  }

  @Get(':id')
  @Roles('admin', 'egresado', 'empresa')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.egresadosService.findOne(id);
  }

  @Patch(':id')
  @Roles('admin', 'egresado')
  update(@Param('id', ParseIntPipe) id: number, @Body() updateData: any) {
    console.log('PATCH /egresados/' + id + ' payload:', updateData);
    return this.egresadosService.update(id, updateData);
  }

  @Get(':id/estadisticas')
  @Roles('admin', 'egresado')
  getEstadisticas(@Param('id', ParseIntPipe) id: number) {
    return this.egresadosService.getEstadisticasEgresado(id);
  }
}
