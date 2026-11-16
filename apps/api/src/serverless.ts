import type { IncomingMessage, ServerResponse } from 'node:http';
import type { INestApplication } from '@nestjs/common';
import { createApp } from './app.js';

type NodeHandler = (req: IncomingMessage, res: ServerResponse) => void;

let appPromise: Promise<INestApplication> | null = null;
let handlerPromise: Promise<NodeHandler> | null = null;
let migrationPromise: Promise<void> | null = null;

export function normalizeApiUrl(url: string | undefined): string {
  const value = url && url.length > 0 ? url : '/';
  if (value === '/api' || value.startsWith('/api/') || value.startsWith('/api?')) {
    return value;
  }
  return `/api${value.startsWith('/') ? value : `/${value}`}`;
}

async function ensureDatabaseReady(): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.AUTO_MIGRATE === 'false') {
    return;
  }
  if (!migrationPromise) {
    migrationPromise = (async () => {
      try {
        const { runMigrations } = await import('./infrastructure/database/migrate.js');
        await runMigrations(1, 0);
        console.log('[Scienpay Serverless] Migraciones de base de datos verificadas exitosamente.');
      } catch (err) {
        console.warn('[Scienpay Serverless] Advertencia aplicando migraciones iniciales:', err);
      }
    })();
  }
  await migrationPromise;
}

async function initializeApp(): Promise<INestApplication> {
  await ensureDatabaseReady();
  const app = await createApp();
  await app.init();
  return app;
}

export function getServerlessApp(): Promise<INestApplication> {
  if (!appPromise) {
    appPromise = initializeApp().catch((error) => {
      appPromise = null;
      throw error;
    });
  }
  return appPromise;
}

export async function getServerlessHandler(): Promise<NodeHandler> {
  if (!handlerPromise) {
    handlerPromise = getServerlessApp()
      .then((app) => {
        const instance = app.getHttpAdapter().getInstance();
        return (req: IncomingMessage, res: ServerResponse) => instance(req, res);
      })
      .catch((error) => {
        handlerPromise = null;
        throw error;
      });
  }
  return handlerPromise;
}

export async function closeServerlessApp(): Promise<void> {
  const pendingApp = appPromise;
  appPromise = null;
  handlerPromise = null;
  migrationPromise = null;
  if (!pendingApp) return;

  try {
    const app = await pendingApp;
    await app.close();
  } catch {
    // La app pudo fallar durante el arranque; no hay nada que cerrar.
  }
}

export async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  try {
    req.url = normalizeApiUrl(req.url);
    const app = await getServerlessApp();
    const instance = app.getHttpAdapter().getInstance();

    await new Promise<void>((resolve, reject) => {
      res.once('finish', resolve);
      res.once('close', resolve);

      try {
        instance(req, res, (error?: unknown) => {
          if (error) reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  } catch (error: any) {
    console.error('[Scienpay Serverless] Error en ejecución de endpoint:', error);
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          statusCode: 500,
          error: 'Internal Server Error',
          message: error?.message || 'Error interno al procesar la solicitud en el servidor.',
        }),
      );
    }
  }
}

export default handler;
