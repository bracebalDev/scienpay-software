# Scienpay: Sistema de Control de Pagos y Asignaciones

[![CI Pipeline](https://github.com/bracebalDev/scienpay-software/actions/workflows/ci.yml/badge.svg)](https://github.com/bracebalDev/scienpay-software/actions/workflows/ci.yml)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/postgresql-16%2B-blue.svg)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/license-UNLICENSED-red.svg)]()

> **Sistema web empresarial de control de pagos y asignaciones en USD para equipos multidisciplinarios en proyectos científicos de Física, Química y Biología.**

---

## 1. Descripción General

**Scienpay** resuelve la gestión financiera de estipendios científicos reemplazando controles dispersos en hojas de cálculo por una arquitectura limpia, auditable y segura.

- **Moneda:** Dólares Americanos (**USD**), con precisión fija exacta (`NUMERIC(14,2)`).
- **Asignaciones sin deducciones:** Control de estipendios netos sin deducciones impositivas ni cargas patronales.
- **Beneficiarios como datos:** Los beneficiarios son registrados como datos por la coordinación; **no disponen de usuario en el sistema**.
- **Inmutabilidad Financiera:** Pagos, causaciones y recibos son inalterables en base de datos mediante triggers `BEFORE UPDATE OR DELETE`. Cualquier ajuste se realiza mediante **anulaciones justificadas**.

---

## 2. Segregación de Funciones (RBAC)

| Rol | Función Principal | Capacidades Exclusivas | Prohibiciones Estrictas |
|---|---|---|---|
| **`ADMIN`** | Administrador del Sistema | Gestión de usuarios, roles, parámetros y visor de auditoría | Prohibido crear causaciones, solicitudes, aprobar o pagar dinero |
| **`GENERADOR`** | Coordinador General | Proyectos, personas, asignaciones, lotes de causación y solicitudes | Prohibido aprobar solicitudes y registrar entrega de fondos |
| **`RECEPTOR`** | Gerente de Administración | Aprobación/rechazo de solicitudes, entrega de fondos, recibos y cajas chicas | Prohibido crear proyectos, personas, causaciones o solicitudes |

> **Regla de Cuatro Ojos:** Ningún usuario puede aprobar una solicitud que él mismo haya creado (`created_by_user_id !== reviewer_user_id`), validado en backend y base de datos.

---

## 3. Arquitectura y Estructura del Monorepo

Arquitectura cliente-servidor con separación estricta de capas (**Presentación → Aplicación → Dominio → Infraestructura**):

```
scienpay-software/
├── api/                # Entrypoints Vercel Serverless (index.mjs, [...path].mjs)
├── apps/
│   ├── api/            # Backend: NestJS, TypeScript, Drizzle ORM, Argon2id, Helmet, OpenAPI
│   └── web/            # Frontend: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query
├── packages/
│   └── shared/         # Contratos, tipos compartidos y esquemas Zod
├── docker/
│   └── nginx/          # Proxy inverso con cabeceras de seguridad y enrutamiento
├── docs/
│   ├── decisiones/     # Architecture Decision Records (ADRs 001-008)
│   ├── bitacora_ia.md  # Bitácora técnica de sesiones con IA
│   └── uso-de-ia.md    # Registro de decisiones asistidas por IA
├── scripts/            # Respaldos/restore multiplataforma y runner de despliegue Vercel
├── docker-compose.yml  # Orquestación de servicios (db, api, web, proxy)
├── vercel.json         # Configuración de despliegue serverless, rewrites y cabeceras
├── .env.example        # Variables de entorno documentadas
└── package.json        # Configuración de workspaces npm
```

---

## 4. Requisitos Previos

- **Node.js**: versión `20.x` LTS o superior (`node -v`)
- **npm**: versión `10.x` o `11.x` (`npm -v`)
- **Docker** y **Docker Compose**: versión `20.x` o superior (`docker compose version`)
- **Git**: versión `2.40` o superior

---

## 5. Instalación y Ejecución en Local

### Opción A: Despliegue Completo con Docker Compose (Recomendado)

1. Clonar el repositorio y acceder al directorio:
   ```bash
   git clone https://github.com/bracebalDev/scienpay-software.git
   cd scienpay-software
   ```

2. Configurar variables de entorno:
   ```bash
   cp .env.example .env
   ```

3. Levantar los servicios orquestados:
   ```bash
   docker compose up --build
   ```

4. Acceso a las aplicaciones:
   - **Frontend (Web):** [http://localhost:8080](http://localhost:8080) (o directo en [http://localhost:5173](http://localhost:5173))
   - **Backend (API):** [http://localhost:8080/api/v1](http://localhost:8080/api/v1)
   - **Documentación OpenAPI / Swagger UI:** [http://localhost:8080/api/docs](http://localhost:8080/api/docs) (o [http://localhost:4000/api/docs](http://localhost:4000/api/docs) en desarrollo local)
   - **Healthcheck:** [http://localhost:8080/api/v1/health](http://localhost:8080/api/v1/health)
   - **Base de Datos:** PostgreSQL en `localhost:5432`

---

### Opción B: Ejecución en Entorno de Desarrollo Local

1. Instalar dependencias en la raíz del monorepo:
   ```bash
   npm install
   ```

2. Compilar el paquete compartido:
   ```bash
   npm run build --workspace=@scienpay/shared
   ```

3. Levantar la base de datos PostgreSQL:
   ```bash
   docker compose up db -d
   ```

4. Aplicar migraciones y triggers de inmutabilidad:
   ```bash
   npm run db:migrate --workspace=@scienpay/api
   ```

5. Cargar datos ficticios de prueba (seeds con los 6 escenarios requeridos):
   ```bash
   npm run db:seed --workspace=@scienpay/api
   ```

6. Ejecutar el backend en modo desarrollo:
   ```bash
   npm run dev:api
   ```

7. En otra terminal, ejecutar el frontend:
   ```bash
   npm run dev:web
   ```

### Credenciales de Prueba (Seed Inicial)

| Rol | Usuario | Correo | Contraseña |
|---|---|---|---|
| **Administrador (`ADMIN`)** | `admin` | `admin@scienpay.uc.edu.ve` | `Admin#Scienpay2026!` |
| **Generador (`GENERADOR`)** | `generador` | `generador@scienpay.uc.edu.ve` | `Coord#Scienpay2026!` |
| **Receptor (`RECEPTOR`)** | `receptor` | `receptor@scienpay.uc.edu.ve` | `Finan#Scienpay2026!` |

### Opción C: Despliegue en Producción (Vercel Serverless + Postgres)

El repositorio incluye [vercel.json](vercel.json), los entrypoints serverless (`api/index.mjs`, `api/[...path].mjs`) y `scripts/vercel-runner.mjs`:

1. Importar el repositorio en **Vercel** manteniendo la raíz (`./`) y conectar una base de datos **PostgreSQL** (Neon o Vercel Postgres, que inyecta `POSTGRES_URL` / `DATABASE_URL`).
2. Configurar las variables de entorno `NODE_ENV=production`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` y `COOKIE_SECRET`.
3. En el primer arranque en frío, el handler serverless ejecuta automáticamente las migraciones idempotentes (`0001`–`0005`) y siembra los datos iniciales si la base de datos está vacía.
4. La documentación interactiva queda disponible en `/api/docs` y el contrato JSON en `/api/docs.json`.

---

## 5.1. Respaldo y Restauración de la Base de Datos

Se disponen de scripts automatizados para contingencias y auditoría contable:

- **Crear Respaldo:**
  ```bash
  # En Linux/macOS
  ./scripts/backup.sh

  # En Windows (PowerShell)
  .\scripts\backup.ps1
  ```
- **Restaurar Respaldo:**
  ```bash
  # En Linux/macOS
  ./scripts/restore.sh ./backups/scienpay_backup_YYYYMMDD_HHMMSS.sql

  # En Windows (PowerShell)
  .\scripts\restore.ps1 -BackupFile ./backups/scienpay_backup_YYYYMMDD_HHMMSS.sql
  ```

---

## 6. Ejecución de Pruebas y Calidad de Código

```bash
# Verificación de tipos TypeScript en todo el monorepo
npm run typecheck

# Ejecución de pruebas unitarias
npm run test

# Compilación de todos los workspaces
npm run build
```

### Pruebas de integración y E2E

```bash
# 1. Levantar PostgreSQL 16 aislado en el puerto 55432
npm run db:test:up

# 2. Integración: migraciones + seed + API compilada + suites (13 tests)
npm run test:integration

# 3. Instalar Chromium una sola vez
npm run e2e:install

# 4. E2E con Playwright (6 tests; levanta API y Vite automáticamente)
npm run e2e

# Apagar y eliminar el volumen de pruebas
npm run db:test:down
```

Las pruebas E2E usan la misma base de pruebas (`scienpay_test`), la API en el puerto `4300` y Vite en `5173`. En CI se ejecutan con PostgreSQL 16 como servicio.

---

## 7. Decisiones de Arquitectura (ADRs)

Todas las decisiones clave del proyecto se encuentran documentadas en `docs/decisiones/`:

- [ADR-001: Selección del Stack Tecnológico, Monorepo y Persistencia](docs/decisiones/ADR-001-stack-monorepo.md)
- [ADR-002: Representación Numérica Monetaria y Política de Redondeo Bancario](docs/decisiones/ADR-002-precision-decimal-redondeo-bancario.md)
- [ADR-003: Inmutabilidad Financiera, Triggers de Base de Datos y Secuencias sin Huecos](docs/decisiones/ADR-003-inmutabilidad-financiera-triggers-secuencias.md)
- [ADR-004: Algoritmo de Prorrateo de Causación por Días Calendario Activos](docs/decisiones/ADR-004-algoritmo-prorrateo-causacion.md)
- [ADR-005: Algoritmo de Aplicación de Pagos Parciales por FIFO](docs/decisiones/ADR-005-algoritmo-pagos-parciales-fifo.md)
- [ADR-006: Estrategia de Ciberseguridad, Autenticación y Segregación Cuatro Ojos](docs/decisiones/ADR-006-seguridad-autenticacion-cuatro-ojos.md)
- [ADR-007: Frontend Conectado a la API Real](docs/decisiones/ADR-007-frontend-conectado-api.md)
- [ADR-008: Calidad, Lint, Formato y Puertas de CI](docs/decisiones/ADR-008-calidad-y-ci.md)

---

## 8. Bitácora de Inteligencia Artificial

El registro detallado de prompts, validaciones humanas y decisiones asistidas por IA se mantiene rigurosamente actualizado en [docs/bitacora_ia.md](docs/bitacora_ia.md) (y [docs/uso-de-ia.md](docs/uso-de-ia.md)).