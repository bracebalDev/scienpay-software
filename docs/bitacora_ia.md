# Bitácora de Uso de Inteligencia Artificial (docs/bitacora_ia.md)
## Sistema de Control de Pagos y Asignaciones - Scienpay (Universidad de Carabobo)

### Registro de Sesiones de Ingeniería y Auditoría

#### Sesión 5: Módulo 1 - Fundaciones (Base de Datos, Inmutabilidad, Auth Argon2id y RBAC en Backend)
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Ejecutar el plan de acción priorizado para el Módulo 1 (Fundaciones). Estabilizar dependencias en monorepo (`package-lock.json`), implementar tests de reglas de negocio para seguridad (Argon2id, anti-fuerza bruta escalonada 3/4 intentos), RBAC backend estricto con regla de cuatro ojos, definición de esquema Drizzle ORM con triggers de inmutabilidad financiera en PostgreSQL (`BEFORE UPDATE OR DELETE`), y servicios/controladores en NestJS.
- **Resultado Obtenido:**
  - 25 pruebas unitarias y de dominio ejecutadas y pasando al 100% con `tsx --test`.
  - Esquema completo de base de datos con 18 tablas relacionales en `schema.ts`.
  - Migración SQL `0001_initial_schema_and_triggers.sql` con definición de triggers PL/pgSQL y secuencia `receipt_number_seq`.
  - Servicio de autenticación con hash Argon2id (64MB, 3 iteraciones, 4 hilos), emisión de JWT de 15 min y refresh tokens rotativos de 7 días con family tracking.
  - Guards `JwtAuthGuard` y `RolesGuard` con decorador `@Roles()` para segregación en endpoints.
  - Módulo de gestión administrativa de usuarios (`UsersController`, `UsersService`) con desbloqueo y reseteo de intentos.
- **Cambios Manuales Realizados y Motivo:**
  - Se configuró `"type": "module"` en `packages/shared/package.json` y `apps/api/package.json` para permitir interoperabilidad nativa ESM en Node.js 26.
  - Se ajustó el mapeo de `paths` en `tsconfig.base.json` hacia `packages/shared/dist/index.d.ts` para evitar errores `TS6059 (rootDir)` en la verificación de tipos de TypeScript.
