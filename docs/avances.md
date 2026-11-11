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
- **Estado:** 12 tareas definidas, 0 ejecutadas. No se modificó `main`.

### 11 de Noviembre de 2026

#### Fase 4 autorizada y corrección del punto de partida

- **Autorización:** se autoriza la Fase 4 completa (4.1 → 4.6); la Fase 5 permanece sin autorizar.
- **Correcciones al HANDOFF:** el script de 158 verificaciones **no existe** en la máquina de ejecución, por lo que la tarea 4.1 pasa de “mover” a **reconstruir** la suite. Se documentaron además: 57 endpoints reales, rate limiter de login hardcodeado, runner de migraciones sin ledger (migraciones nuevas deben ser idempotentes), ausencia de la columna `notes` y reparto objetivo de 170 verificaciones en 8 suites.
- **Stack local verificado:** `docker compose up --build -d` levanta `db`, `api`, `web` y `proxy`; `/api/v1/health` y login responden 200 contra PostgreSQL 16.

#### 4.4 Lint, formato y CI bloqueante — completada

- **ESLint 10 con flat config** (`eslint.config.mjs`): `@eslint/js` + `typescript-eslint` (`recommended`), reglas clásicas de React Hooks y guarnición de Prettier al final.
- **Prettier** adoptado como fuente única de estilo; el primer `--write` reformateó 70 archivos sin cambios semánticos.
- **Guard de workspaces:** `scripts/check-lint-workspaces.mjs` falla si un workspace no declara `lint`; los tres workspaces ya lo declaran.
- **CI:** `npm run format:check` y `npm run lint` pasan a ser pasos bloqueantes; Gitleaks también. Semgrep y `npm audit` quedan con baseline documentado en `ADR-008`.
- **Defectos reales corregidos por el lint:** asignación inútil en `ThemeContext`, variables sin uso en el motor FIFO, imports muertos en `causation.service` y `seed.ts`, y parámetro sin uso en `sendRequest`.
- **Verificación:** `npm run lint` exit 0 (0 errores, 25 warnings de `any`), `typecheck` sin errores, **87/87 tests** pasando.

#### 4.1 Suite de integración versionada en el repositorio — completada

- **Infraestructura:** `docker-compose.test.yml` con PostgreSQL 16 Alpine en `55432` y `apps/api/test/helpers/` (`integration-env.ts`, `db.ts`, `bootstrap.ts`). El bootstrap resetea el esquema con `INTEGRATION_FRESH=1`, reaplica migraciones y siembra solo si no hay usuarios.
- **Runner:** `apps/api/scripts/run-integration.mjs` valida la base, migra, siembra, compila y arranca dos instancias: `4100` con límite de login alto y `4101` con límite `2` para probar el 429. Después ejecuta `tsx --test --test-concurrency=1` y propaga el código de salida.
- **Rate limiter configurable:** `AUTH_RATE_LIMIT_WINDOW_MS` y `AUTH_RATE_LIMIT_MAX` sustituyen el valor hardcodeado de 5/min.
- **8 suites, 170 verificaciones:** `auth` (23), `security` (23), `catalogs` (20), `causation` (22), `payment-requests` (21), `disbursements` (18), `petty-cash` (24) y `audit` (19). Todas usan datos con sufijo `RUN_SUFFIX` y son independientes entre sí.
- **Cobertura destacada:** refresh rotativo y detección de replay, RBAC por rol, UUID inválidos, prorrateo por días activos, inmutabilidad SQL de causaciones, FIFO entre períodos con pagos parciales, correlatividad de recibos y vales, rendición con vuelto, arrastre de caja chica, PDFs de solicitud y recibo, y filtros/paginación de auditoría.
- **CI:** job `integration` con `services: postgres:16` que compila shared y API y ejecuta la suite.
- **Defecto real corregido:** una transición de estado inválida de solicitudes lanzaba un `Error` genérico y el borde HTTP devolvía **500**; ahora se traduce a **409** con `TRANSICION_ESTADO_INVALIDA` (cubierto por tests).
- **Verificación:** `npm run test:integration` → **170/170, 0 fallos**, ejecutado con base limpia (`INTEGRATION_FRESH=1`) y nuevamente sobre la base ya sembrada. `lint`, `format:check`, `typecheck`, 87/87 unitarios y `build` en verde.

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
| `plan/execution-tracking` | Ejecución de Fases 1–3 y definición de Fases 4–5 | Completada (Fases 1–3); Fases 4–5 definidas |

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

## Estado final

- Fases 1–3 completadas (17/17 tareas).
- Fases 4–5 redefinidas en `docs/HANDOFF.md` (secciones 10 y 11): 12 tareas definidas (6 + 6), 0 ejecutadas.
- Integración validada contra PostgreSQL 16 aislado (`scienpay_verify_db`, puerto 55432): **158/158 PASS** (corrida del 2026-11-08 y reejecución del 2026-11-09).
- Backend: 87/87 tests; typecheck y build de API, shared y web sin errores (reverificados el 2026-11-09).
- Documentación actualizada en `docs/HANDOFF.md`, `docs/avances.md`, `docs/bitacora_ia.md` y `docs/uso-de-ia.md`.
- Sin tareas pendientes ni bloqueos dentro del alcance de Fases 1–3. Las Fases 4–5 quedan pendientes de autorización explícita.

> Reejecución del 2026-11-09: Docker Desktop disponible; migraciones aplicadas de forma idempotente, seed omitido por datos existentes y **158/158 PASS, 0 FAIL** contra el mismo contenedor aislado.
