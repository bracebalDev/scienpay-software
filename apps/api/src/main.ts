import 'reflect-metadata';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { NestFactory } from '@nestjs/core';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { ZodExceptionFilter } from './infrastructure/validation/zod-exception.filter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

  // Validación global: los ZodError se traducen a HTTP 400 con detalle por campo
  app.useGlobalFilters(new ZodExceptionFilter());

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Servir frontend SPA si existe en disco (despliegues de producción y nube)
  const candidatePaths = [
    path.join(__dirname, '../../web/dist'),
    path.join(__dirname, '../web/dist'),
    path.join(process.cwd(), 'apps/web/dist'),
    path.join(process.cwd(), 'web/dist'),
  ];
  const staticPath = candidatePaths.find((p) => fs.existsSync(p));

  if (staticPath) {
    app.use(express.static(staticPath));
    const server = app.getHttpAdapter().getInstance();
    server.get('*', (req: any, res: any, next: any) => {
      if (req.url.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.join(staticPath, 'index.html'));
    });
    console.log(`[Scienpay API] Frontend SPA servido desde ${staticPath}`);
  }

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`[Scienpay API] Servidor ejecutándose en http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('[Scienpay API] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
