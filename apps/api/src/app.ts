import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import swaggerUi from 'swagger-ui-express';
import { AppModule } from './app.module.js';
import { ZodExceptionFilter } from './infrastructure/validation/zod-exception.filter.js';
import { buildOpenApiDocument } from './infrastructure/openapi/openapi.js';

function normalizeConfiguredOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

function normalizeVercelOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;
}

export function resolveAllowedOrigins(
  rawCorsOrigin: string | undefined = process.env.CORS_ORIGIN,
  environment: NodeJS.ProcessEnv = process.env,
): string[] {
  const configured = (rawCorsOrigin ?? '')
    .split(',')
    .map(normalizeConfiguredOrigin)
    .filter((origin) => origin.length > 0 && origin !== '*');

  const vercelOrigins = [
    environment.VERCEL_URL,
    environment.VERCEL_BRANCH_URL,
    environment.VERCEL_PROJECT_PRODUCTION_URL,
    'https://scienpay-software-beryl.vercel.app',
  ]
    .filter((value): value is string => Boolean(value))
    .map(normalizeVercelOrigin);

  const localOrigins =
    environment.NODE_ENV === 'production'
      ? []
      : [
          'http://localhost:5173',
          'http://localhost:3000',
          'http://localhost:4000',
          'http://localhost:8080',
          'http://127.0.0.1:5173',
        ];

  return [...new Set([...configured, ...vercelOrigins, ...localOrigins])];
}

export function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);

  const expressInstance = app.getHttpAdapter().getInstance();
  if (process.env.VERCEL || process.env.TRUST_PROXY === 'true') {
    expressInstance.set('trust proxy', 1);
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'blob:'],
        },
      },
      crossOriginEmbedderPolicy: false,
    }),
  );

  const cookieSecret = process.env.COOKIE_SECRET || 'dev_cookie_secret_scienpay_super_secure';
  app.use(cookieParser(cookieSecret));

  const allowedOrigins = resolveAllowedOrigins();
  app.enableCors({
    origin: (origin, callback) => callback(null, isOriginAllowed(origin, allowedOrigins)),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  });

  app.useGlobalFilters(new ZodExceptionFilter());
  app.setGlobalPrefix('api/v1');

  const openApiDocument = buildOpenApiDocument();
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      customSiteTitle: 'Scienpay API',
      swaggerOptions: { persistAuthorization: true },
    }),
  );
  app.use('/api/docs.json', (_req: any, res: any) => res.json(openApiDocument));

  return app;
}
