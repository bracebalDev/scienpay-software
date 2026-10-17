import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Seguridad OWASP: Helmet y cabeceras estrictas
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Parseo de cookies para refresh token seguro HttpOnly
  const cookieSecret = process.env.COOKIE_SECRET || 'dev_cookie_secret_scienpay_super_secure';
  app.use(cookieParser(cookieSecret));

  // CORS restringido
  const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
  app.enableCors({
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[Scienpay API] Servidor ejecutándose en http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('[Scienpay API] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
