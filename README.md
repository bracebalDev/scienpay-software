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
├── apps/
│   ├── api/            # Backend: NestJS, TypeScript, Drizzle ORM, Argon2id, Helmet
│   └── web/            # Frontend: React 18, TypeScript, Vite, Tailwind CSS, TanStack Query
├── packages/
│   └── shared/         # Contratos, tipos compartidos y esquemas Zod
├── docker/
│   └── nginx/          # Proxy inverso con cabeceras de seguridad y enrutamiento
├── docs/
│   ├── decisiones/     # Architecture Decision Records (ADRs)
│   ├── seguridad/      # Modelo de amenazas y checklist ASVS
│   └── uso-de-ia.md    # Bitácora estricta de prompts y uso de IA
├── docker-compose.yml  # Orquestación de servicios (db, api, web, proxy)
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

4. Ejecutar el backend en modo desarrollo:
   ```bash
   npm run dev:api
   ```

5. En otra terminal, ejecutar el frontend:
   ```bash
   npm run dev:web
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

---

## 7. Decisiones de Arquitectura (ADRs)

Todas las decisiones clave del proyecto se encuentran documentadas en `docs/decisiones/`:

- [ADR-001: Selección del Stack Tecnológico, Monorepo y Persistencia](docs/decisiones/ADR-001-stack-monorepo.md)
- [ADR-002: Representación Numérica Monetaria y Política de Redondeo Bancario](docs/decisiones/ADR-002-precision-decimal-redondeo-bancario.md)
- [ADR-003: Inmutabilidad Financiera, Triggers de Base de Datos y Secuencias sin Huecos](docs/decisiones/ADR-003-inmutabilidad-financiera-triggers-secuencias.md)
- [ADR-004: Algoritmo de Prorrateo de Causación por Días Calendario Activos](docs/decisiones/ADR-004-algoritmo-prorrateo-causacion.md)
- [ADR-005: Algoritmo de Aplicación de Pagos Parciales por FIFO](docs/decisiones/ADR-005-algoritmo-pagos-parciales-fifo.md)
- [ADR-006: Estrategia de Ciberseguridad, Autenticación y Segregación Cuatro Ojos](docs/decisiones/ADR-006-seguridad-autenticacion-cuatro-ojos.md)

---

## 8. Bitácora de Inteligencia Artificial

El registro detallado de prompts, validaciones humanas y decisiones asistidas por IA se mantiene rigurosamente actualizado en [docs/uso-de-ia.md](docs/uso-de-ia.md).