import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  @Roles('admin')
  async getKPIs(@Query('fechaInicio') inicio?: string, @Query('fechaFin') fin?: string) {
    return this.dashboardService.getKPIs(inicio, fin);
  }

  @Get('evolucion-mensual')
  @Roles('admin')
  async getEvolucion(@Query('fechaInicio') inicio?: string, @Query('fechaFin') fin?: string) {
    return this.dashboardService.getEvolucionMensual(inicio, fin);
  }

  @Get('top-habilidades')
  @Roles('admin')
  async getHabilidades(@Query('fechaInicio') inicio?: string, @Query('fechaFin') fin?: string, @Query('limit') limit: number = 5) {
    return this.dashboardService.getTopHabilidades(inicio, fin, limit);
  }

  @Get('stats-egresado')
  @Roles('egresado')
  async getStatsEgresado(@Request() req) {
    return this.dashboardService.getStatsEgresado(req.user.userId);
  }

  @Get('stats-empresa')
  @Roles('empresa')
  async getStatsEmpresa(@Request() req) {
    return this.dashboardService.getStatsEmpresa(req.user.userId);
  }

  @Get('rendimiento-ofertas')
  @Roles('empresa')
  async getRendimientoOfertas(@Request() req) {
    return this.dashboardService.getRendimientoOfertasEmpresa(req.user.userId);
  }

  @Get('recomendaciones-ofertas')
  @Roles('egresado')
  async getRecomendacionesOfertas(@Request() req, @Query('limit') limit: number = 6) {
    return this.dashboardService.getRecomendacionesOfertasEgresado(req.user.userId, Number(limit) || 6);
  }
}
