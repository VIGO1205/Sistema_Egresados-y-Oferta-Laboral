import 'reflect-metadata';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config({ path: join(process.cwd(), '.env') });

import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SerializeResponseInterceptor } from './common/interceptors/serialize-response.interceptor';

function maskPresence(value: string | undefined): string {
  return value ? 'yes' : 'no';
}

function getDatabaseHost(value: string | undefined): string {
  if (!value) {
    return 'missing';
  }

  try {
    return new URL(value).hostname;
  } catch {
    return 'invalid-url';
  }
}

async function bootstrap() {
  console.log('[env] DATABASE_URL:', maskPresence(process.env.DATABASE_URL), getDatabaseHost(process.env.DATABASE_URL));
  console.log('[env] REDIS_HOST:', maskPresence(process.env.REDIS_HOST));
  console.log('[env] REDIS_PORT:', maskPresence(process.env.REDIS_PORT));
  console.log('[env] JWT_SECRET:', maskPresence(process.env.JWT_SECRET));

  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalInterceptors(new SerializeResponseInterceptor());

  // Servir archivos estáticos (Reportes y CVs)
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    'https://sistema-egresados-y-oferta-laboral-rho.vercel.app',
    'https://sistema-egresados-y-oferta-laboral-git-main-vigo1205s-projects.vercel.app',
  ].filter((origin): origin is string => Boolean(origin));

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`✅ Backend running on port ${port}`);
}
bootstrap().catch(err => {
  console.error('Failed to start backend:', err);
  process.exit(1);
});
