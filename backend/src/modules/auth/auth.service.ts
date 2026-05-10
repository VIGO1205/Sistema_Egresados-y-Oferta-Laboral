import { Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as nodemailer from 'nodemailer';
import { User } from './entities/user.entity';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async register(email: string, password: string, rol: string = 'egresado') {
    const salt = await bcrypt.genSalt();
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = this.usersRepository.create({
      email: email.toLowerCase().trim(),
      passwordHash: hashedPassword,
      rol,
    });
    
    const savedUser = await this.usersRepository.save(user);
    return this.generateToken(savedUser);
  }

  async login(email: string, password: string) {
    const user = await this.usersRepository.findOne({ where: { email: email.toLowerCase().trim() } });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }

    return this.generateToken(user);
  }

  private generateToken(user: User) {
    const payload = { email: user.email, sub: user.id, rol: user.rol };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        rol: user.rol
      }
    };
  }

  async findByEmail(email: string) {
    console.log('>>> BUSCANDO USUARIO POR EMAIL:', email);
    const user = await this.usersRepository.findOne({ where: { email: email.toLowerCase().trim() } });
    console.log('>>> RESULTADO BÚSQUEDA:', user ? `Usuario encontrado (ID: ${user.id})` : 'Usuario NO encontrado');
    return user;
  }

  async identify(email: string) {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('No se encontró una cuenta con ese correo');
    }

    // Buscamos el correo de recuperación en la tabla egresados si no está en users
    let recoveryEmail = user.emailRecuperacion;
    
    if (!recoveryEmail) {
      // Intentar buscar en la tabla de egresados
      const egresado = await this.usersRepository.query(
        'SELECT email_recuperacion FROM egresados WHERE user_id = $1',
        [user.id]
      );
      if (egresado && egresado[0]?.email_recuperacion) {
        recoveryEmail = egresado[0].email_recuperacion;
      }
    }

    // Fallback: usar el email del sistema si no hay email_recuperacion
    if (!recoveryEmail) {
      recoveryEmail = user.email;
    }

    if (!this.isValidEmail(recoveryEmail)) {
      throw new UnauthorizedException('El correo de recuperación registrado no es válido. Debes actualizarlo antes de continuar.');
    }

    const code = this.generateRecoveryCode();
    user.recoveryCode = code;
    await this.usersRepository.save(user);
    console.log(`[AUTH] Recovery code generated and saved for user ${user.id}`);

    try {
      await this.sendRecoveryCodeEmail(recoveryEmail, user.email, code);
      console.log(`[AUTH] Email sent successfully`);
    } catch (error) {
      console.error(`[AUTH] Email send failed, clearing recovery code. Error:`, error instanceof Error ? error.message : String(error));
      user.recoveryCode = null;
      await this.usersRepository.save(user);
      throw new InternalServerErrorException(`No se pudo enviar el correo de recuperación: ${error instanceof Error ? error.message : 'Error desconocido'}. Verifica la configuración de Gmail del servidor.`);
    }

    return { recoveryEmail };
  }

  async verifyCode(email: string, code: string) {
    const user = await this.findByEmail(email);
    if (!user || user.recoveryCode !== code) {
      throw new UnauthorizedException('Código de verificación incorrecto');
    }
    return { success: true };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.findByEmail(email);
    if (!user || user.recoveryCode !== code) {
      throw new UnauthorizedException('Código inválido o expirado');
    }

    const salt = await bcrypt.genSalt();
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    user.recoveryCode = null;
    await this.usersRepository.save(user);

    return { success: true };
  }

  private generateRecoveryCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  private isValidEmail(email: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async sendRecoveryCodeEmail(recoveryEmail: string, accountEmail: string, code: string) {
    console.log('[MAILER] Iniciando envío de código de recuperación...');
    
    const smtpHost = process.env.SMTP_HOST ?? 'smtp.gmail.com';
    // Usar puerto 465 por defecto (TLS implícito) para mejor compatibilidad con Render
    const smtpPort = Number(process.env.SMTP_PORT ?? '465');
    const smtpUser = process.env.SMTP_USER ?? process.env.GMAIL_USER;
    const smtpPass = process.env.SMTP_PASS ?? process.env.GMAIL_APP_PASSWORD;

    console.log(`[MAILER] Config: host=${smtpHost}, port=${smtpPort}, user=${smtpUser ? smtpUser.substring(0, 5) + '...' : 'MISSING'}`);

    if (!smtpUser || !smtpPass) {
      console.error('[MAILER] ERROR: Missing SMTP_USER or SMTP_PASS');
      throw new InternalServerErrorException('Faltan las variables SMTP_USER y SMTP_PASS, o sus aliases GMAIL_USER y GMAIL_APP_PASSWORD.');
    }

    const transport = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: true, // TLS implícito para puerto 465
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      connectionTimeout: 10000,
      socketTimeout: 10000,
    });

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Recuperación de contraseña — Sistema Egresados</title>
          <style>
            @media (max-width: 480px) {
              .code-container { font-size: 36px !important; padding: 18px 14px !important; letter-spacing: 6px !important; }
              .content-td { padding: 24px 16px !important; }
            }
          </style>
        </head>
        <body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI', 'Helvetica Neue', Arial, sans-serif;color:#1f2937;">
          <span style="display:none;">Código de recuperación: ${code}</span>
          <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0;padding:20px;">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;">
                  <!-- Header -->
                  <tr>
                    <td align="left" style="padding:0 0 32px 0;">
                      <h2 style="margin:0;font-size:24px;font-weight:700;color:#1e3a8a;letter-spacing:-0.5px;">SISTEMA DE EGRESADOS</h2>
                    </td>
                  </tr>

                  <!-- Main card -->
                  <tr>
                    <td style="background:white;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.08);padding:0;overflow:hidden;">
                      <!-- Top border -->
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td style="height:3px;background:#1e3a8a;"></td>
                        </tr>
                      </table>

                      <!-- Content -->
                      <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                        <tr>
                          <td class="content-td" style="padding:32px 28px;">
                            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1f2937;">Recuperación de contraseña</h1>
                            <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.6;">Se ha solicitado restablecer la contraseña de tu cuenta. Usa el código de 6 dígitos a continuación para completar el proceso.</p>

                            <!-- Code display -->
                            <div style="text-align:center;margin:0 0 28px;">
                              <p style="margin:0 0 14px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:0.5px;font-weight:600;">Código de verificación</p>
                              <div class="code-container" style="font-size:40px;font-weight:900;letter-spacing:10px;padding:20px 16px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;color:#1e3a8a;font-family:'Courier New', 'Courier', monospace;word-spacing:4px;">${code}</div>
                              <p style="margin:12px 0 0;font-size:12px;color:#9ca3af;">Válido por 15 minutos</p>
                            </div>

                            <!-- Instructions -->
                            <div style="background:#f9fafb;border-radius:8px;padding:18px 16px;margin:0 0 24px;">
                              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#1f2937;">Sigue estos pasos:</p>
                              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                  <td style="width:24px;vertical-align:top;padding:0 12px 8px 0;font-size:13px;color:#6b7280;font-weight:600;">•</td>
                                  <td style="font-size:13px;color:#6b7280;padding:0 0 8px 0;">Copia el código anterior</td>
                                </tr>
                                <tr>
                                  <td style="width:24px;vertical-align:top;padding:0 12px 8px 0;font-size:13px;color:#6b7280;font-weight:600;">•</td>
                                  <td style="font-size:13px;color:#6b7280;padding:0 0 8px 0;">Ve a la aplicación y selecciona "Verificar código"</td>
                                </tr>
                                <tr>
                                  <td style="width:24px;vertical-align:top;padding:0 12px 0 0;font-size:13px;color:#6b7280;font-weight:600;">•</td>
                                  <td style="font-size:13px;color:#6b7280;">Pega el código y establece tu nueva contraseña</td>
                                </tr>
                              </table>
                            </div>

                            <!-- Security -->
                            <div style="border-left:3px solid #1e3a8a;padding:12px 0 12px 12px;margin:0 0 24px;font-size:13px;color:#374151;">
                              <strong style="display:block;color:#1f2937;margin:0 0 4px;">Seguridad:</strong>
                              Si no solicitaste este cambio, ignora este correo. Nunca compartiremos tu código con terceros.
                            </div>

                            <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;"/>

                            <!-- Footer text -->
                            <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                              Este es un correo automático. Por favor, no responda. Si tiene preguntas, contacte con el equipo de soporte.
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding:24px 0;color:#9ca3af;font-size:11px;">
                      <p style="margin:0;">
                        © ${new Date().getFullYear()} Sistema Egresados
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    console.log(`[MAILER] Enviando a: ${recoveryEmail} (account: ${accountEmail})`);
    console.log(`[MAILER] Intentando conectar a SMTP...`);

    try {
      const info = (await Promise.race([
        transport.sendMail({
          from: process.env.SMTP_FROM ?? process.env.GMAIL_FROM ?? `Sistema Egresados <${smtpUser}>`,
          to: recoveryEmail,
          subject: 'Código de recuperación de contraseña — Sistema Egresados',
          html,
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('SMTP timeout: No response after 10 seconds')), 10000)
        ),
      ])) as any;
      
      console.log(`[MAILER] ✓ Email enviado exitosamente. messageId=${info.messageId}`);
      console.log(`[MAILER] Accepted: ${JSON.stringify(info.accepted)}`);
    } catch (error) {
      console.error(`[MAILER] ✗ Error al enviar email:`, error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      try {
        transport.close();
      } catch (e) {
        console.log('[MAILER] Transport close error (non-critical):', e instanceof Error ? e.message : String(e));
      }
    }
  }
}
