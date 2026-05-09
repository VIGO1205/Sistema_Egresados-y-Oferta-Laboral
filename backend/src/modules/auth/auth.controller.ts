import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(
    @Body() body: { email: string; password: string; rol?: string },
  ) {
    return this.authService.register(body.email, body.password, body.rol ?? 'egresado');
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    console.log('>>> POST /auth/login RECIBIDO:', body.email);
    return this.authService.login(body.email, body.password);
  }

  @Post('identify')
  async identify(@Body() body: { email: string }) {
    console.log('>>> POST /auth/identify RECIBIDO:', body.email);
    return this.authService.identify(body.email);
  }

  @Post('verify-code')
  async verifyCode(@Body() body: { email: string; code: string }) {
    console.log('>>> POST /auth/verify-code RECIBIDO:', body.email, body.code);
    return this.authService.verifyCode(body.email, body.code);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: { email: string; code: string; password: string }) {
    console.log('>>> POST /auth/reset-password RECIBIDO:', body.email);
    return this.authService.resetPassword(body.email, body.code, body.password);
  }
}
