# Bitácora de Avances del Proyecto - Scienpay
## Sistema de Control de Pagos y Asignaciones para Proyectos Científicos
> **Asignatura:** Sistemas de Información  
> **Institución:** Universidad de Carabobo - Escuela de Computación  
> **Repositorio Remoto:** [https://github.com/bracebalDev/scienpay-software.git](https://github.com/bracebalDev/scienpay-software.git)

---

## 1. Registro Cronológico de Avances por Fecha

### 📅 17 de Octubre de 2026

#### 📌 Fase 0: Planificación, Arquitectura y Reglas del Proyecto
- **Aprobación del Plan Maestro:** Elaboración y aprobación formal del documento rector de arquitectura ([`fase-0-planificacion-scienpay.md`](file:///C:/Users/braya/.gemini/antigravity-cli/brain/9d635305-125f-42d7-847c-52481fe2fba4/fase-0-planificacion-scienpay.md)).
- **Definición de Arquitectura Limpia:** Estructuración de monorepo con `npm workspaces`:
  - `apps/api`: Backend NestJS + TypeScript + Drizzle ORM.
  - `apps/web`: Frontend React 18 + Vite + Tailwind CSS + TanStack Query.
  - `packages/shared`: Contratos de dominio, tipos TypeScript y validación con esquemas Zod.
- **Redacción de Decisiones de Arquitectura (ADRs):**
  - [ADR-001: Selección del Stack Tecnológico, Monorepo y Persistencia](decisiones/ADR-001-stack-monorepo.md)
  - [ADR-002: Representación Numérica Monetaria y Política de Redondeo Bancario](decisiones/ADR-002-precision-decimal-redondeo-bancario.md)
  - [ADR-003: Inmutabilidad Financiera, Triggers y Secuencias sin Huecos](decisiones/ADR-003-inmutabilidad-financiera-triggers-secuencias.md)
  - [ADR-004: Algoritmo de Prorrateo de Causación por Días Calendario Activos](decisiones/ADR-004-algoritmo-prorrateo-causacion.md)
  - [ADR-005: Algoritmo de Aplicación de Pagos Parciales por FIFO](decisiones/ADR-005-algoritmo-pagos-parciales-fifo.md)
  - [ADR-006: Estrategia de Ciberseguridad, Autenticación y Segregación Cuatro Ojos](decisiones/ADR-006-seguridad-autenticacion-cuatro-ojos.md)

---

#### 📌 Fase 1: Setup, DevOps, CI y Seguridad
- **Inicialización de Ramas GitFlow:**
  - `main`: Código productivo base.
  - `develop`: Rama de integración principal.
  - `chore/setup-monorepo`: Configuración de dependencias, scripts de build, linter, Project References TypeScript y `.github/pull_request_template.md`.
  - `chore/devops-docker-ci`: Dockerfiles multi-stage, `docker-compose.yml`, proxy Nginx con cabeceras de seguridad y pipeline de CI en `.github/workflows/ci.yml`.
- **Política de Secretos y `.gitignore`:** Exclusión estricta de `.env`, claves, certificados y documentos privados de credenciales.
- **Despliegue Local con Docker:**
  - Contenedor `scienpay_api` en ejecución (puerto 4000) con endpoint `/api/v1/health` respondiendo `200 OK` y cabeceras de protección Helmet.
  - Contenedor `scienpay_web` en ejecución (puerto 5173) sirviendo la interfaz SPA.

---

#### 📌 Interfaz de Usuario: Notion Workspace y Módulo de Autenticación
- **Rama:** `feature/frontend-responsive` (creada y subida a GitHub).
- **Diseño estilo Notion:**
  - Estética minimalista, tonos limpios (`#FBFBFA`), barra lateral colapsable (*NotionSidebar*), migas de pan (*breadcrumbs*) superiores.
  - Incorporación del logo oficial del proyecto (`logo web.jpg`) como favicon del navegador, ícono de la tarjeta de login y cabecera del espacio de trabajo.
- **Mecanismo Anti-Fuerza Bruta en Login Centrado:**
  - Campo "Usuario" y "Contraseña" con alternador de visibilidad.
  - **Temporizador de 5 minutos al 3er intento fallido:** Cronómetro digital reactivo (`04:59`, `04:58`...) con bloqueo de formulario.
  - **Bloqueo definitivo al 4to error:** Bloqueo de la cuenta con mensaje institucional de seguridad indicando que solo el Administrador puede restaurarla.
  - **Botón de Desbloqueo en ADMIN:** El Administrador del Sistema cuenta con la potestad de desbloquear usuarios suspendidos y reiniciar sus intentos a 0.
- **Vistas Específicas por Rol (Segregación de Funciones):**
  - **Administrador (`ADMIN`):** Gestión de usuarios, parámetros y visor de auditoría append-only (`audit_log`). Prohibido operar con dinero.
  - **Generador (`GENERADOR`):** Catálogo de proyectos (**Física, Química, Biología**), personal beneficiario (**con aviso explícito de que no tienen usuario en el sistema**), asignaciones, simulador del motor de causación y solicitudes en borrador/enviadas.
  - **Receptor (`RECEPTOR`):** Bandeja de aprobación de solicitudes (**con validación de Regla de Cuatro Ojos en servidor**), pagos parciales con amortización FIFO, recibos correlativos sin huecos y control mensual de Cajas Chicas.

---

### 📅 7 de Noviembre de 2026

#### 📌 Fase 1: Correcciones Críticas de Backend (rama `plan/execution-tracking`)
- **Inmutabilidad financiera a nivel de columna:** migración `0002_fix_causation_immutability_and_receipt_sequences.sql`. `causation_items` solo admite cambios en `paid_amount`, `remaining_debt` y `status`; `causation_batches` solo admite los campos de anulación. `DELETE` sigue bloqueado en ambas tablas.
- **Secuencia de recibos sin huecos:** tabla `receipt_sequences` y función transaccional `next_receipt_number(year)`, sembrada desde los recibos existentes. Un `ROLLBACK` ya no consume números.
- **Redondeo unificado:** ADR-002 y `docs/uso-de-ia.md` alineados con el código real (`ROUND_HALF_UP`). No se alteró ningún resultado financiero.
- **Autenticación completa:** login con `identifier` (usuario o correo), refresh token rotativo con `jti`, detección de replay, revocación de toda la familia y rate limiting de 5 intentos por minuto por IP. Nuevo endpoint `POST /api/v1/auth/refresh`, `POST /api/v1/auth/logout` y `GET /api/v1/auth/me`.
- **Validación global:** `ZodExceptionFilter` traduce cualquier `ZodError` a HTTP 400 con detalle por campo; `ZodValidationPipe` reutilizable sustituye las llamadas `.parse()` dispersas en 9 controladores.
- **Anulación de causación:** `POST /api/v1/causation/batches/:id/annul` con motivo mínimo de 10 caracteres, bloqueo de lotes con solicitudes o pagos, anulación transaccional de ítems y auditoría `ANULACION_CAUSACION`. La creación de solicitudes rechaza lotes anulados, proyectos incompatibles y montos superiores al total causado.
- **Verificación:** `npm run typecheck` sin errores y **72/72 tests** pasando en `@scienpay/api`.

#### 📌 Fase 2: Completar Módulos Backend Faltantes
- **Caja chica completa:** nuevos `GET /api/v1/petty-cash/:id/periods` y `GET /api/v1/petty-cash/periods/:periodId/vouchers`. `createPettyCash` valida que todos los proyectos existan; `openPeriod` bloquea la caja con `FOR UPDATE`, exige que el período previo esté cerrado y arrastra el saldo de cierre; `requestVoucher` valida período abierto, pertenencia del proyecto y usa `next_voucher_number(year)`; desembolso y rendición bloquean período y vale en orden consistente; `closePeriod` rechaza vales en estado `SOLICITADO`, `APROBADO` o `DESEMBOLSADO`.
- **Migración `0003`:** tabla `voucher_sequences` + función `next_voucher_number(year)` con siembra desde vales existentes; sustitución de `uq_causation_batch_idempotence` por el índice parcial `uq_causation_batch_idempotence_active` que excluye lotes `ANULADO`.
- **Auditoría consultable:** `auditQuerySchema` compartido con filtros `userId`, `entity`, `action`, `dateFrom`, `dateTo`, `page` y `limit` (máximo 200); respuesta paginada `{ data, total, page, limit, totalPages }`; solo ADMIN.
- **PDF consolidado de solicitud:** `PdfReceiptGenerator.generatePaymentRequestPdf` y `GET /api/v1/payment-requests/:id/pdf`, con cabecera institucional, desglose por beneficiario (causado/pagado/pendiente), totales y firmas.
- **FIFO transaccional y determinista:** `registerDisbursement` se ejecuta en una única transacción, bloquea la solicitud y los ítems con `FOR UPDATE`, filtra causaciones por proyecto mediante join con `causation_batches`, excluye ítems anulados o sin deuda, valida beneficiarios duplicados y la cuadratura entre `totalDeliveredAmount` y la suma de asignaciones. El motor FIFO desempata por ID cuando dos cuotas comparten fecha.
- **Recibos sin huecos:** `next_receipt_number(year)` se invoca dentro de la transacción del desembolso; un rollback revierte el contador.
- **Verificación:** `npm run typecheck` sin errores y **87/87 tests** pasando en `@scienpay/api`; build de API y typecheck de web correctos.

#### 📌 Fase 3: Frontend Real Conectado a la API
- **Eliminación total de mocks:** se retiraron `apps/web/src/data/mockData.ts` y `apps/web/src/types/app.types.ts`; las vistas, formularios y el login consumen exclusivamente `/api/v1`.
- **Cliente HTTP y caché:** `lib/apiClient.ts` envía `credentials: 'include'`, mantiene el access token en memoria (nunca en `localStorage`), normaliza errores, reintenta una vez tras refresh en 401 y descarga blobs autenticados con `Content-Disposition`. `lib/queryClient.ts` configura TanStack Query.
- **Sesión real:** `AuthContext` restaura la sesión con `POST /auth/refresh`, programa el refresh 60 s antes del vencimiento, deduplica refrescos concurrentes para evitar falsos replays por React StrictMode y ejecuta logout real. `App.tsx` incorpora pantalla de carga y navegación por rol.
- **Hooks por dominio:** 10 módulos (`useProjects`, `usePersons`, `useAssignments`, `usePaymentGroups`, `useCausation`, `usePaymentRequests`, `useDisbursements`, `usePettyCash`, `useUsers` y `useAudit`) con invalidación de caché tras cada mutación.
- **Formularios RHF + Zod:** 12 formularios de dominio en `components/Forms/` (proyecto, persona, grupo de pago, asignación, causación, solicitud, desembolso, usuario, caja chica, apertura de período, vale y rendición) más el login, todos validados con los schemas compartidos mediante `lib/zodResolver.ts`, un resolver local compatible con `react-hook-form` porque `@hookform/resolvers` no está instalado.
- **Vistas por rol:** `AdminView` (usuarios, desbloqueo/reset y auditoría paginada con filtros), `GeneratorView` (proyectos, beneficiarios, asignaciones, causación y solicitudes) y `ReceptorView` (aprobación/rechazo, desembolsos FIFO con recibos PDF, cierre de solicitudes y caja chica completa).
- **UX:** `ToastProvider` global, estados de carga/error/vacío, confirmación de logout y descarga real de `SOL-*.pdf` y `REC-*.pdf`.
- **Decisiones de integración:** montos del desembolso calculados en centavos; la deuda mostrada corresponde solo al lote de la solicitud y se advierte que el FIFO del backend abarca todo el proyecto; la previsualización de causación debe coincidir con los parámetros actuales para habilitar la generación; `App.tsx` no reinicia la pestaña cuando `/auth/me` refresca el perfil.
- **Verificación:** `npm run typecheck --workspace=@scienpay/web` sin errores, `npm run build --workspace=@scienpay/web` exitoso (1677 módulos, bundle 436.42 kB) y **87/87 tests** de API pasando.

### 📅 8 de Noviembre de 2026

#### 📌 Verificación de Integración de las Fases 1–3
- **Entorno aislado:** PostgreSQL 16 Alpine en el contenedor `scienpay_verify_db` (puerto `55432`), separado del volumen de desarrollo. Migraciones aplicadas dos veces y seed ejecutado dos veces con idempotencia confirmada.
- **Corrida end-to-end:** **158/158 verificaciones PASS, 0 FAIL** con un script temporal fuera del repositorio. Cubre health, login por usuario/email, refresh rotativo, detección de replay, revocación de familia, RBAC, catálogos, preview/generación/anulación/regeneración de causación, solicitudes y cuatro ojos, FIFO, recibos y PDFs, auditoría, caja chica, usuarios, rate limit, logout y UUID inválidos.
- **Verificación SQL directa:** `next_receipt_number` no deja huecos tras `ROLLBACK`; los triggers bloquean `UPDATE` de columnas inmutables y `DELETE`, y permiten solo columnas de pago/anulación; `receipt_sequences` queda sincronizada (`2026 = 1`, recibo `REC-2026-000001`); `voucher_sequences` permanece vacía antes de emitir vales.
- **Bug 1 — `RAISE` sin placeholder:** la migración `0002` y el DDL del motor usaban `RAISE EXCEPTION '...', TG_TABLE_NAME`; PostgreSQL 16 fallaba con `too many parameters specified for RAISE`. Se añadió `%` y la migración corre en base limpia.
- **Bug 2 — seed y secuencia de recibos:** el seed insertaba `REC-2026-000001` sin avanzar `receipt_sequences`, y el primer desembolso fallaba con `duplicate key value violates unique constraint "receipts_receipt_number_key"`. Ahora usa `next_receipt_number(2026)` y `FinancialImmutabilityEngine.formatReceiptNumber`.
- **Bug 3 — `tsx` y metadatos de NestJS:** `npm run dev:api` arrancaba con `tsx`, que no emite `design:paramtypes`; los controladores recibían dependencias `undefined` y el login devolvía 500. Nuevo runner `apps/api/scripts/dev.mjs` con `tsc` + `tsc --watch` + `node --watch dist/main.js`, sin dependencias nuevas.
- **Bug 4 — UUID inválido devolvía 500:** se añadieron `UuidParam`/`UuidQuery` con `ParseUUIDPipe` en todos los controladores; paths y query params inválidos responden 400 con `UUID_INVALIDO`.
- **Contrato de anulación:** `POST /causation/batches/:id/annul` responde 201 por el comportamiento por defecto de NestJS para POST. El frontend usa `response.ok`; se acepta y documenta el contrato.
- **Verificación final:** `npm run typecheck` completo sin errores, `npm run test --workspace=@scienpay/api` con **87/87 tests** y `npm run build --workspace=@scienpay/web` exitoso.

### 10 de Noviembre de 2026

#### Redefinición de las Fases 4 y 5

- **Motivo:** el `HANDOFF.md` versionado solo declaraba las Fases 4 y 5 como “fuera de alcance”, sin tareas ni criterios. El plan original completo existía fuera del repositorio y no se había versionado.
- **Fase 4 — Testing y calidad (6 tareas):** suite de integración versionada y en CI, E2E con Playwright, stress test FIFO, lint/formato/typecheck bloqueantes, OpenAPI desde Zod y cierre de deuda técnica (`SOL` transaccional, `notes`, tests frontend reales).
- **Fase 5 — Pulimiento y entrega (6 tareas):** seed alineado a los 6 escenarios con verificación automática, guía de despliegue Docker Compose + Fly.io, manuales por rol, auditoría de la bitácora IA, demo grabada y preparación de defensa.
- **Ajustes respecto del plan original:** se parte de la suite externa 158/158 en lugar de Testcontainers; se elige Playwright en lugar de Cypress; se incorpora la deuda técnica documentada en las Fases 1–3; la guía de despliegue cubre la infraestructura real (Docker Compose + Fly.io).
- **Estado:** Fases 1–3 cerradas (17/17); Fase 4 cerrada (6/6); Fase 5 pendiente (0/6). No se modificó `main`.

---

## 2. Mapa y Convención de Ramas en GitHub

El equipo trabaja bajo el modelo **GitFlow Adaptado**, respetando las siguientes directrices:
1. **Ramas Protegidas:** `main` y `develop` (no admiten push directo; todo cambio ingresa vía Pull Request).
2. **Formato de Commits:** *Conventional Commits* en español: `feat(...)`, `chore(...)`, `docs(...)`, `fix(...)`.

| Rama Remota en GitHub | Propósito | Estado |
|---|---|---|
| [`main`](https://github.com/bracebalDev/scienpay-software/tree/main) | Producción estable con tags de versión | Base inicial sincronizada |
| [`develop`](https://github.com/bracebalDev/scienpay-software/tree/develop) | Integración de features | Creada y sincronizada |
| [`chore/setup-monorepo`](https://github.com/bracebalDev/scienpay-software/tree/chore/setup-monorepo) | Workspaces, Zod, TypeScript, ADRs | Completada y subida |
| [`chore/devops-docker-ci`](https://github.com/bracebalDev/scienpay-software/tree/chore/devops-docker-ci) | Docker multi-stage, Nginx, CI Actions | Completada y subida |
| [`feature/frontend-responsive`](https://github.com/bracebalDev/scienpay-software/tree/feature/frontend-responsive) | Notion Workspace, Login, Timer 5 min, Vistas RBAC | Completada y subida |
| `plan/execution-tracking` | Ejecución de Fases 1–4 | Completada (Fases 1–4); Fase 5 pendiente |

---

## 3. Instrucciones para los Compañeros de Equipo

Para clonar y levantar el proyecto en sus máquinas locales:

1. **Clonar el repositorio:**
   ```bash
   git clone https://github.com/bracebalDev/scienpay-software.git
   cd scienpay-software
   ```

2. **Pasar a la rama de interfaz o develop:**
   ```bash
   git checkout feature/frontend-responsive
   ```

3. **Verificar que Docker Desktop esté abierto y levantar contenedores:**
   ```bash
   docker compose up -d
   ```
   *(O acceder directamente a la versión web compilada en `http://localhost:5173`)*

4. **Credenciales de Prueba:**
   - Consultar el archivo local `docs/privado-credenciales-pruebas.md` (no commiteado por seguridad) o desplegar el acordeón inferior en la pantalla de login.

### 15 de Noviembre de 2026

#### Fase 4: Calidad, OpenAPI, deuda técnica e infraestructura de integración

- **Lint y formato:** se añadió ESLint flat config en la raíz, Prettier y scripts `lint`, `format` y `format:check` en raíz y workspaces. `npm run lint` queda en 0 errores (12 advertencias heredadas) y `npm run format:check` pasa. El CI ejecuta ambos como pasos bloqueantes. La decisión se documentó en `docs/decisiones/ADR-008-calidad-y-ci.md`.
- **OpenAPI:** documento generado desde los schemas Zod con `@asteasolutions/zod-to-openapi`, disponible en `/api/docs` y `/api/docs.json`, con 43 paths, 21 schemas y seguridad bearer. Test de contrato en `apps/api/test/foundation/openapi.test.ts`.
- **Deuda técnica:** migración `0005_request_sequences_and_notes.sql` con contador transaccional `request_sequences` y función `next_request_number(year)`, más columna `payment_requests.notes`. `createRequest` genera el código dentro de la transacción y persiste las notas; el tipo del frontend las expone.
- **Tests frontend:** Vitest + React Testing Library + jsdom con 10 pruebas reales sobre `apiClient`, `AuthContext`, `zodResolver` y `DisbursementForm`; se eliminó el placeholder.
- **Integración versionada:** `docker-compose.test.yml`, runner `apps/api/scripts/run-integration.mjs`, helpers y suites por dominio (`auth`, `catalogs`, `security`, `financial-flow`, `petty-cash`, `fifo-concurrency`). Scripts `test:integration`, `db:test:up` y `db:test:down`, y job `integration` en CI con PostgreSQL 16.
- **Concurrencia FIFO:** test que lanza 20 desembolsos concurrentes sobre la misma deuda durante 10 repeticiones y verifica sobrepago, saldos negativos y cuadratura por SQL.
- **Verificación local:** `npm run typecheck` sin errores, 98/98 tests de API, 10/10 tests web, lint y formato correctos.
- **Integración ejecutada:** con Docker 28.4.0 y PostgreSQL 16 en `55432`, `npm run test:integration` pasó **13/13 tests, 0 fallos, 20.4 s**. La prueba FIFO de 20 desembolsos concurrentes × 10 repeticiones pasó en 19.8 s. Se corrigieron la invocación de `tsx` en Windows, el rate limit compartido de login (bypass solo fuera de producción) y las expectativas de estado HTTP.
- **E2E con Playwright:** configuración en `apps/web/playwright.config.ts` y seis pruebas en `apps/web/e2e` (credenciales inválidas, restauración de sesión, cierre con confirmación y navegación por cada rol). Ejecución local **6/6 PASS** en 25.1 s; job `e2e` agregado al CI con PostgreSQL 16 y Chromium.

### 21 de Noviembre de 2026

#### Fase 5: Ajustes de Evaluación, Facturación con Duplicado, Modo Claro y Manual de Usuario

- **Facturación con Copia en un Solo Documento:** Se actualizó el motor de reportes en PDF (`PdfReceiptGenerator.generateReceiptPdf`) para que emita en un único archivo tanto el ejemplar **Original para el Beneficiario** (Página 1) como la **Copia de Registro para la Empresa** (Página 2), con membrete institucional, tablas de amortización FIFO y líneas de firma legal.
- **Estandarización a Modo Claro Exclusivo:** Por directriz técnica del evaluador para sistemas administrativos de auditoría, se fijó el Modo Claro como estándar obligatorio, eliminando la alternancia a modo oscuro o modo sistema en el contexto y la interfaz.
- **Manual de Usuario:** Se redactó y publicó `docs/manual_de_usuario.md`, estructurado con guías prácticas paso a paso para el registro de presupuestos, causación y cálculo de nómina, aprobación bajo cuatro ojos, desembolsos con amortización FIFO y control de cajas chicas.
- **Ampliación de Datos Iniciales (Seed Realista):** Se añadieron proyectos adicionales (`FIS-02`, `QUI-03`, `BIO-04`), tabulador semanal, padrón extendido de beneficiarios (Dra. Valentina Rivas, Prof. Marcos Domínguez, Lcda. Gabriela Navarro, Dr. David Hernández), asignaciones, lotes de causación y solicitudes en diversos estados contables (`CERRADA`, `APROBADA`, `ENVIADA`, `BORRADOR`), así como un segundo fondo fijo de caja chica.
- **Usabilidad Administrativa:** Se refinaron los rótulos y botones de acción en la interfaz para apegarse a la jerga contable y administrativa venezolana sin alterar los contratos ni nombres del informe técnico rector.

## Estado final

- Fases 1–3 completadas (17/17 tareas).
- Fase 4 completada (6/6 tareas): integración versionada, E2E, concurrencia FIFO, lint/CI, OpenAPI y deuda técnica.
- Integración versionada validada contra PostgreSQL 16 aislado (`scienpay_test`, puerto 55432): **13/13 PASS** (2026-11-15). La suite externa histórica se mantiene en **158/158 PASS** (2026-11-08/09).
- E2E validado con Chromium: **6/6 PASS** (2026-11-15).
- Backend: 98/98 tests; frontend: 10/10 tests; typecheck y build de API, shared y web sin errores.
- Documentación actualizada en `docs/HANDOFF.md`, `docs/avances.md`, `docs/bitacora_ia.md` y `docs/uso-de-ia.md`.

> Reejecución del 2026-11-09: Docker Desktop disponible; migraciones aplicadas de forma idempotente, seed omitido por datos existentes y **158/158 PASS, 0 FAIL** contra el mismo contenedor aislado.
