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

  // CORS flexible para entornos locales y despliegue en Fly.io
  const rawCorsOrigin = process.env.CORS_ORIGIN;
  const allowedOrigins = rawCorsOrigin
    ? rawCorsOrigin.split(',').map((o) => o.trim())
    : [
        'http://localhost:5173',
        'http://localhost:3000',
        'http://localhost:4000',
        'http://localhost:8080',
        'https://scienpay-app.fly.dev',
      ];

  app.enableCors({
    origin: (origin, callback) => {
      // Permitir peticiones sin origin (móviles, curl, o mismo origen SPA)
      if (!origin) return callback(null, true);

      if (!rawCorsOrigin) {
        if (
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.fly.dev')
        ) {
          return callback(null, true);
        }
      }

      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  // Validación global: los ZodError se traducen a HTTP 400 con detalle por campo
  app.useGlobalFilters(new ZodExceptionFilter());

  // Prefijo global de API
  app.setGlobalPrefix('api/v1');

  // Permitir cierre ordenado ante señales de Fly (SIGTERM, SIGINT)
  app.enableShutdownHooks();

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
  await app.listen(port, '0.0.0.0');
  console.log(`[Scienpay API] Servidor ejecutándose en http://0.0.0.0:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('[Scienpay API] Error fatal al iniciar el servidor:', err);
  process.exit(1);
});
