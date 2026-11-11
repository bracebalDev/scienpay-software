# HANDOFF.md — Especificación viva y seguimiento de ejecución

> **Proyecto:** Scienpay — Sistema de Control de Pagos y Asignaciones para Proyectos Científicos
> **Rama de trabajo:** `plan/execution-tracking` (aislada de `main`)
> **Alcance:** Fases 1–3 completadas (17/17). Fases 4–5 redefinidas el 2026-11-10 y pendientes de ejecución.
> **Fecha de inicio de ejecución:** 2026-11-07
> **Última actualización:** 2026-11-10
> **Modelo de análisis y planificación:** Nemotron 3 Ultra (Free) vía OpenRouter en OpenCode.
> **Modelo de ejecución de Fases 1–3:** DeepSeek V4.1 Flash Free vía OpenCode Zen.

---

## 1. Convenciones de estado

| Estado | Significado |
|---|---|
| 🔴 **Por hacer** | Tarea no iniciada. |
| 🟡 **En progreso** | Trabajo activo sobre la tarea. |
| 🟢 **Completada** | Implementada, verificada y documentada. |
| 🟣 **Corregida** | Defecto existente reparado y verificado. |
| ⚪ **Bloqueada** | Existe un impedimento objetivo documentado. |

Cada cambio de estado se registra en el historial de este documento y se acompaña de un commit atómico con mensaje convencional.

---

## 2. Resumen de fases y estado global

| Fase | Título | Estado global | Progreso |
|---|---|---|---|
| **Fase 1** | Correcciones críticas de backend | 🟢 Completada | 5/5 |
| **Fase 2** | Completar módulos backend faltantes | 🟢 Completada | 5/5 |
| **Fase 3** | Frontend real conectado a la API | 🟢 Completada | 7/7 |
| **Fase 4** | Testing y calidad | 🟡 En progreso | 2/6 |
| **Fase 5** | Pulimiento y entrega | 🔴 Por hacer | 0/6 |

> Las Fases 4 y 5 se redefinieron el 2026-11-10 a partir del estado real del repositorio. La Fase 4 está autorizada el 2026-11-11; la Fase 5 sigue sin autorizar. El detalle está en las secciones 10 y 11.

---

## 3. Hallazgos verificados antes de ejecutar

Estos hallazgos sustituyen a las suposiciones del análisis inicial y son la base de las tareas:

1. `PettyCashService` y `PettyCashController` **ya existen** con apertura de período, vales, aprobación, desembolso, rendición y cierre. Faltan consultas GET, validaciones de pertenencia y numeración transaccional.
2. La generación de PDF de recibo individual **ya existe** en `DisbursementsService.generateReceiptPdfBuffer` y está expuesta en `GET /disbursements/receipts/:id/pdf`.
3. `annulCausationBatchSchema` **ya existe** en `packages/shared`; falta el servicio y el endpoint de anulación.
4. El trigger de `0001` bloquea **todo** `UPDATE`/`DELETE` sobre `causation_items` y `causation_batches`. Esto impide los desembolsos FIFO y la propia anulación de lotes. `payment_requests` no tiene trigger en `0001`, por lo que sus transiciones sí funcionan.
5. `nextval('receipt_number_seq')` no es transaccional: un rollback deja huecos.
6. `registerDisbursement` no usa transacción ni bloqueo pesimista, y busca causaciones solo por `personId` (sin filtrar por proyecto).
7. El login exige `email`, no acepta usuario; no existe `POST /auth/refresh`; no hay detección de replay ni rate limiting.
8. No hay filtro global de errores Zod ni pipe reutilizable; los controladores llaman `.parse()` directamente.
9. El frontend es 100 % mock (`mockData.ts`, `PASSWORDS`), el login valida en cliente y las vistas muestran datos estáticos.
10. `@hookform/resolvers` no está instalado. Se implementará un resolver Zod local compatible con `react-hook-form` para no introducir una dependencia no disponible, salvo que la instalación sea viable y verificable.

---

## 4. FASE 1 — Correcciones críticas de backend

**Objetivo:** desbloquear el camino crítico de pagos y causación, cerrar brechas de autenticación y validación, y habilitar la anulación justificada.

### 1.1 Trigger de inmutabilidad a nivel de columna + secuencia transaccional

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | El trigger actual impide actualizar `paid_amount`, `remaining_debt` y `status` en `causation_items`, y también impide anular `causation_batches`. La secuencia de recibos basada en `nextval` no es transaccional. |
| **Solución** | Migración `0002` con: (a) trigger específico para `causation_items` que solo permite cambiar `paid_amount`, `remaining_debt` y `status`; (b) trigger específico para `causation_batches` que solo permite registrar la anulación; (c) tabla `receipt_sequences` y función `next_receipt_number(year)` transaccional; (d) siembra del contador desde recibos existentes. Actualizar `FinancialImmutabilityEngine`, `migrate.ts`, script de build y tests. |
| **Aceptación** | Desembolso FIFO actualiza causaciones; columnas calculadas siguen bloqueadas; `DELETE` sigue bloqueado; un rollback no consume número de recibo; los tests de inmutabilidad y secuencia pasan. |
| **Archivos** | `apps/api/src/infrastructure/database/migrations/0002_*.sql`, `financial-immutability.engine.ts`, `migrate.ts`, `apps/api/package.json`, `apps/api/test/foundation/database-immutability.test.ts` |

### 1.2 Unificar política de redondeo

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | ADR-002 declara *Round Half to Even*, pero todo el código usa `Decimal.ROUND_HALF_UP`. |
| **Decisión** | Se adopta **HALF_UP** porque es el comportamiento ya implementado y probado, es el estándar operativo bancario habitual en el contexto del proyecto y evita cambiar resultados financieros existentes. Se actualiza ADR-002 y se documenta la decisión. |
| **Aceptación** | ADR-002 y código coinciden; los tests de prorrateo validan `10.125 → 10.13`; no quedan referencias contradictorias en documentación activa. |
| **Archivos** | `docs/decisiones/ADR-002-*.md`, tests de dominio, revisión de motores. |

### 1.3 Autenticación completa

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | Login solo por email; no hay refresh con rotación, detección de replay, revocación de familia ni rate limiting. |
| **Solución** | `loginSchema` con `identifier` (usuario o email); búsqueda por `username` o `email`; `POST /auth/refresh` con rotación, detección de reutilización y revocación de toda la familia; rate limit en memoria de 5 solicitudes/minuto por IP; cookie `HttpOnly` con `SameSite=Strict`; tests unitarios de las reglas. |
| **Aceptación** | Login con usuario o email; refresh rota el token; segundo uso de un refresh revocado revoca la familia; logout revoca; 6.º intento de login en un minuto responde 429. |
| **Archivos** | `packages/shared/src/schemas/auth.schema.ts`, `auth.controller.ts`, `auth.service.ts`, tests de auth. |

### 1.4 Filtro global Zod + pipe reutilizable

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | Los errores Zod no se traducen a respuestas HTTP consistentes; la validación está dispersa en controladores. |
| **Solución** | `ZodExceptionFilter` global que convierte `ZodError` en HTTP 400 con detalle; `ZodValidationPipe` reutilizable; migración de los controladores que usan `.parse()` al pipe, manteniendo los schemas compartidos como fuente única. |
| **Aceptación** | Campo extra o tipo inválido responde 400 con detalle; no quedan `.parse()` directos en controladores (salvo login, que conserva semántica 401). |
| **Archivos** | `apps/api/src/main.ts`, `apps/api/src/infrastructure/validation/*`, controladores de módulos. |

### 1.5 Anulación de causación

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | No existe endpoint ni servicio de anulación; la especificación exige anulación justificada como única corrección. |
| **Solución** | `POST /causation/batches/:id/annul` (GENERADOR), motivo mínimo de 10 caracteres, transición a `ANULADO`, bloqueo si el lote ya está anulado o si tiene solicitudes de pago asociadas, auditoría `ANULACION_CAUSACION`; `PaymentRequestsService` rechaza lotes anulados y valida que el proyecto coincida. |
| **Aceptación** | Anulación con motivo; lote anulado no genera solicitudes; auditoría registrada; tests. |
| **Archivos** | `causation.service.ts`, `causation.controller.ts`, `payment-requests.service.ts`, `audit` module. |

---

## 5. FASE 2 — Completar módulos backend faltantes

### 2.1 Caja chica: consultas, validaciones y numeración transaccional

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | Faltan GET de períodos/vales; no se valida que la caja o el proyecto existan; la numeración de vales usa conteo no transaccional; el cierre no valida vales pendientes. |
| **Solución** | GET `/petty-cash/:id/periods` y `/petty-cash/periods/:id/vouchers`; validación de caja/proyecto/período; bloqueo `FOR UPDATE` del período y numeración transaccional de vales; cierre solo si no hay vales pendientes; movimientos y saldos dentro de transacción. |
| **Aceptación** | Flujo completo y consultas funcionan; no hay números duplicados bajo concurrencia; cierre bloquea vales pendientes; tests. |
| **Archivos** | `petty-cash.service.ts`, `petty-cash.controller.ts`, tests. |

### 2.2 Auditoría con filtros y paginación

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | `GET /audit` solo acepta `limit`. |
| **Solución** | Filtros `userId`, `entity`, `action`, `dateFrom`, `dateTo`, `page`, `limit`; respuesta `{ data, total, page, limit, totalPages }`; límite máximo 200; solo ADMIN. |
| **Aceptación** | Filtros combinados y paginación correctos; no expone campos sensibles; tests. |
| **Archivos** | `audit.service.ts`, `audit.controller.ts`. |

### 2.3 PDF consolidado de solicitud

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | Solo existe PDF de recibo individual. |
| **Solución** | Extender `PdfReceiptGenerator` con `generatePaymentRequestPdf`; `GET /payment-requests/:id/pdf` con cabecera, beneficiarios, causado/pagado/pendiente, totales y firmas; acceso ADMIN/GENERADOR/RECEPTOR. |
| **Aceptación** | PDF válido descargable; contenido cuadra con BD; tests de generación. |
| **Archivos** | `pdf-receipt.generator.ts`, `payment-requests.service.ts`, `payment-requests.controller.ts`, tests. |

### 2.4 FIFO con transacción y bloqueo pesimista

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | Lectura-calculo-escritura sin transacción; riesgo de sobrepago; filtro por persona sin proyecto. |
| **Solución** | Transacción única; bloqueo `FOR UPDATE` de la solicitud y de los `causation_items` del proyecto, con orden determinista; filtro por proyecto mediante join con `causation_batches`; validación de suma de asignaciones contra `totalDeliveredAmount`. |
| **Aceptación** | Sin sobrepago bajo concurrencia; cuadratura exacta; tests de concurrencia (si el entorno de BD lo permite) y tests unitarios del motor. |
| **Archivos** | `disbursements.service.ts`, tests. |

### 2.5 Secuencia de recibos sin huecos

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Problema** | `nextval` no transaccional. |
| **Solución** | Usar `next_receipt_number(year)` dentro de la transacción del desembolso; el rollback revierte el contador. |
| **Aceptación** | Un fallo posterior no consume número; 100 desembolsos con 10 fallos dejan 90 números y 0 huecos; test. |
| **Archivos** | `disbursements.service.ts`, migración `0002`, tests. |

---

## 6. FASE 3 — Frontend real conectado a la API

### 3.1 Cliente API y eliminación de mocks

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Solución** | `lib/apiClient.ts` con `credentials: 'include'`, token de acceso en memoria, manejo de errores tipado y descarga de blobs; `lib/queryClient.ts`; eliminación de `data/mockData.ts` y de `PASSWORDS`. |
| **Implementado** | `apiClient` expone `get/post/patch/delete/download`, inyecta `Authorization: Bearer` desde una variable de módulo (nunca `localStorage`), reintenta una vez tras refresh en 401 y limpia la sesión si el reintento falla. `queryClient` centraliza `staleTime`, reintentos y `refetchOnWindowFocus`. Se eliminaron `apps/web/src/data/mockData.ts` y `apps/web/src/types/app.types.ts`; no quedan imports a mocks en producción. |
| **Aceptación** | No quedan mocks; el frontend consume `/api/v1`; el proxy de Vite se mantiene. |

### 3.2 AuthContext

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Solución** | `AuthProvider` con `user`, `login`, `logout`, `refreshSession`, `isLoading`; restauración de sesión vía refresh al montar; refresh automático antes de expirar; guardas de ruta/rol. |
| **Implementado** | `AuthContext` restaura la sesión con `POST /auth/refresh` al montar, programa el refresh 60 s antes del vencimiento del access token, deduplica refrescos concurrentes con una promesa module-level (evita el replay provocado por React StrictMode) y expone `login/logout/refreshSession`. `App.tsx` muestra pantalla de carga, exige sesión para renderizar y deriva la pestaña inicial del rol. |
| **Aceptación** | Login real, logout real, sesión restaurada, rutas por rol. |

### 3.3 Hooks TanStack Query por dominio

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Solución** | Hooks de proyectos, personas, asignaciones, causación, solicitudes, desembolsos/recibos, caja chica y administración; invalidación de caché tras mutaciones. Se co-localizan queries y mutations por dominio para reducir dispersión, decisión documentada. |
| **Implementado** | 10 módulos en `apps/web/src/hooks/`: `useProjects`, `usePersons`, `useAssignments`, `usePaymentGroups`, `useCausation`, `usePaymentRequests`, `useDisbursements`, `usePettyCash`, `useUsers` y `useAudit`. Cada mutación invalida las claves afectadas; las descargas PDF usan `apiClient.download`. |
| **Aceptación** | Vistas obtienen datos reales con estados de carga/error/vacío; mutaciones invalidan caché. |

### 3.4 Formularios React Hook Form + Zod

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Solución** | Resolver Zod local compatible con RHF (o `@hookform/resolvers` si se instala y verifica); componentes `FormField`, `SelectField`, `CurrencyField`; formularios de proyecto, persona, asignación, causación, solicitud, desembolso, vale de caja chica y login. |
| **Implementado** | `@hookform/resolvers` no está instalado; se implementó `lib/zodResolver.ts` compatible con `react-hook-form` y se documentó la decisión. Hay 9 archivos en `components/Forms/` con 12 formularios de dominio: proyecto, persona, grupo de pago, asignación, causación, solicitud, desembolso, usuario, creación de caja chica, apertura de período, solicitud de vale y rendición de vale. El login con RHF+Zod vive en `NotionLogin.tsx`. Los formularios reutilizan los schemas de `@scienpay/shared` como fuente única de validación. |
| **Aceptación** | Validación inline, errores claros, submit tipado y deshabilitado hasta validez. |

### 3.5 Vistas por rol con datos reales

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Solución** | AdminView con usuarios/auditoría reales y acciones de desbloqueo/reset; GeneratorView con proyectos, personas, asignaciones, causación y solicitudes; ReceptorView con bandeja, desembolsos FIFO, recibos y caja chica. |
| **Implementado** | `AdminView` lista usuarios y auditoría paginada con filtros, crea usuarios y ejecuta desbloqueo/reset. `GeneratorView` gestiona proyectos, beneficiarios, asignaciones, previsualización/generación/anulación de causación y solicitudes. `ReceptorView` gestiona aprobación/rechazo, desembolsos FIFO con recibos PDF, cierre de solicitudes entregadas y caja chica (períodos, vales, desembolso, rendición y cierre). "Mis Solicitudes" filtra por `createdByUserId` del usuario autenticado. |
| **Aceptación** | Tablas y tarjetas con datos de API; acciones reales; estados de carga/error/vacío. |

### 3.6 Descarga de PDF

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Solución** | Hook de descarga de blob para recibo y solicitud; nombre de archivo correcto; manejo de errores. |
| **Implementado** | `apiClient.download` obtiene el blob con credenciales, extrae el nombre desde `Content-Disposition` y fuerza la descarga en el navegador. `useDownloadPaymentRequestPdf` y `useDownloadReceiptPdf` cubren `SOL-*.pdf` y `REC-*.pdf`; los errores se muestran con toast. |
| **Aceptación** | Descarga real de `REC-*.pdf` y `SOL-*.pdf`. |

### 3.7 Errores globales y UX

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Solución** | `ToastProvider` propio; intercepción 401/403/400/500; logout automático en 401; estados de carga. |
| **Implementado** | `ToastProvider` global con variantes `success/error/info`; `apiClient` normaliza errores del backend (`message`/`error`) y dispara `unauthorizedHandler` cuando el refresh falla, lo que cierra la sesión y vuelve al login. Las vistas muestran `LoadingState`, `EmptyState` y `ErrorState`; los formularios deshabilitan el submit mientras hay mutación en curso. |
| **Aceptación** | Feedback visible, sin errores silenciosos, redirección a login en 401. |

---

## 7. Métricas de progreso

| Métrica | Estado actual (2026-11-11) | Objetivo de las Fases 4–5 |
|---|---|---|
| Tareas de Fases 1–3 | 17/17 completadas | Cerradas |
| Tareas de Fase 4 | 2/6 (4.1, 4.4) | 6/6 |
| Tareas de Fase 5 | 0/6 | 6/6 |
| Tests unitarios backend | 87/87 pasando | Mantener 100 % |
| Integración con PostgreSQL | **170/170 en 8 suites**, versionada y con job de CI | Bloqueante en CI |
| Tests frontend | Placeholder (`exit 0`) | Unitarios/componentes + E2E |
| Lint | ESLint + Prettier bloqueantes en CI; 0 errores, 25 warnings de `any` | Sin warnings nuevos |
| OpenAPI | No disponible | `/api/docs` generado desde Zod |
| Deuda técnica conocida | `SOL` con `count + 1`, `notes` no persistido, tests placeholder | Cerrada o aceptada explícitamente |

---

## 8. Historial de cambios de estado

| Fecha | Tarea | Estado anterior | Estado nuevo | Commit | Notas |
|---|---|---|---|---|---|
| 2026-11-07 | Inicialización | — | 🔴 Por hacer | — | Documento creado en `docs/HANDOFF.md` con alcance Fases 1–3. |
| 2026-11-07 | 1.1 Trigger por columna + secuencia transaccional | 🔴 Por hacer | 🟢 Completada | — | Migración `0002`, motor de inmutabilidad, `migrate.ts` y tests actualizados. |
| 2026-11-07 | 1.2 Unificar redondeo | 🔴 Por hacer | 🟢 Completada | — | ADR-002 y `uso-de-ia.md` alineados a `ROUND_HALF_UP`; sin cambios de código financiero. |
| 2026-11-07 | 1.3 Autenticación completa | 🔴 Por hacer | 🟢 Completada | — | `identifier`, refresh rotativo con `jti`, replay, revocación de familia y rate limit 5/min. |
| 2026-11-07 | 1.4 Filtro Zod + pipe | 🔴 Por hacer | 🟢 Completada | — | `ZodExceptionFilter` global y `ZodValidationPipe` aplicado a 9 controladores. |
| 2026-11-07 | 1.5 Anulación de causación | 🔴 Por hacer | 🟢 Completada | — | Endpoint, política de dominio, auditoría transaccional y validaciones de solicitud. |
| 2026-11-07 | 2.1 Caja chica | 🔴 Por hacer | 🟢 Completada | — | GET de períodos/vales, validaciones de pertenencia, `FOR UPDATE`, `next_voucher_number(year)` y cierre con vales pendientes. |
| 2026-11-07 | 2.2 Auditoría | 🔴 Por hacer | 🟢 Completada | — | `auditQuerySchema`, filtros combinados, paginación y respuesta `{ data, total, page, limit, totalPages }`. |
| 2026-11-07 | 2.3 PDF de solicitud | 🔴 Por hacer | 🟢 Completada | — | `generatePaymentRequestPdf` y `GET /payment-requests/:id/pdf`. |
| 2026-11-07 | 2.4 FIFO transaccional | 🔴 Por hacer | 🟢 Completada | — | Transacción única, `FOR UPDATE`, filtro por proyecto vía join, desempate determinista y validación de total. |
| 2026-11-07 | 2.5 Recibos sin huecos | 🔴 Por hacer | 🟢 Completada | — | `next_receipt_number(year)` dentro de la transacción del desembolso. |
| 2026-11-08 | 3.1 Cliente API y eliminación de mocks | 🔴 Por hacer | 🟢 Completada | — | `apiClient`, `queryClient`, token en memoria, descargas autenticadas y eliminación de `mockData.ts`/`app.types.ts`. |
| 2026-11-08 | 3.2 AuthContext | 🔴 Por hacer | 🟢 Completada | — | Restauración de sesión, refresh programado, deduplicación de refresh y logout. |
| 2026-11-08 | 3.3 Hooks TanStack Query | 🔴 Por hacer | 🟢 Completada | — | 10 módulos de hooks por dominio con invalidación de caché. |
| 2026-11-08 | 3.4 Formularios RHF + Zod | 🔴 Por hacer | 🟢 Completada | — | 12 formularios de dominio y login, con `zodResolver` local compatible con RHF. |
| 2026-11-08 | 3.5 Vistas por rol | 🔴 Por hacer | 🟢 Completada | — | `AdminView`, `GeneratorView` y `ReceptorView` con datos reales y acciones de API. |
| 2026-11-08 | 3.6 Descarga de PDF | 🔴 Por hacer | 🟢 Completada | — | `apiClient.download` + hooks de recibo y solicitud. |
| 2026-11-08 | 3.7 Errores globales y UX | 🔴 Por hacer | 🟢 Completada | — | `ToastProvider`, intercepción 401 y estados de carga/error/vacío. |
| 2026-11-10 | Redefinición de Fases 4–5 | ⚪ Fuera de alcance | 🔴 Por hacer (0/12) | — | Se reemplaza el alcance recortado por un plan ajustado al estado real; ver secciones 10 y 11. |
| 2026-11-11 | Corrección del punto de partida de Fase 4 | Premisas desactualizadas | Revisado | — | El script de 158 checks no existe en la máquina; 4.1 pasa de "mover" a "reconstruir". Se documentan 57 endpoints, rate limiter hardcodeado, runner de migraciones sin ledger y reparto de 170 verificaciones. |
| 2026-11-11 | Autorización de Fase 4 | 🔴 Por hacer | 🟡 En progreso | — | Se autoriza el alcance completo 4.1 → 4.6; Fase 5 permanece sin autorizar. |
| 2026-11-11 | 4.4 Lint, formato y CI | 🔴 Por hacer | 🟢 Completada | — | ESLint flat + Prettier, guard de workspaces, `format:check` y `lint` bloqueantes, Gitleaks bloqueante y ADR-008. 0 errores de lint, 87/87 tests. |
| 2026-11-11 | 4.1 Suite de integración | 🔴 Por hacer | 🟢 Completada | — | 170/170 checks en 8 suites contra PostgreSQL 16; runner con dos instancias, bootstrap idempotente, `docker-compose.test.yml` y job `integration` en CI. Se corrigió un defecto: transiciones inválidas de solicitudes devolvían 500 en lugar de 409. |

---

## 9. Decisiones de ejecución y limitaciones conocidas

1. **Refresh token único por emisión:** se añadió `jwtid` (`jti`) aleatorio al firmar el refresh token. Sin él, dos emisiones dentro del mismo segundo producían tokens idénticos y la rotación no invalidaba realmente el anterior.
2. **Trigger por lista negra:** la función de `causation_items` y `causation_batches` enumera las columnas inmutables y rechaza sus cambios; las columnas mutables quedan fuera de esa comparación. Los tests verifican ambas caras (columnas inmutables presentes y mutables ausentes).
3. **Anulación y regeneración:** la anulación conserva el lote como registro histórico y marca sus ítems como `ANULADO`. La migración `0003` sustituye la restricción `uq_causation_batch_idempotence` por el índice parcial `uq_causation_batch_idempotence_active WHERE status <> 'ANULADO'`, de modo que un lote anulado no bloquea regenerar el período y la idempotencia se mantiene entre lotes activos. `generateBatch` filtra explícitamente por `status <> 'ANULADO'`.
4. **Auditoría transaccional:** `AuditService.recordEvent` acepta una transacción opcional para que la anulación y su traza sean atómicas. Las llamadas existentes siguen usando la conexión normal.
5. **Monto de la solicitud:** `createRequest` usa `input.requestedAmount` como `totalAmountUSD` y rechaza montos superiores al total causado del lote. Antes se ignoraba el monto enviado y se usaba siempre el total del lote; la decisión se tomó para que el contrato Zod y la persistencia coincidan.
6. **Código de solicitud:** `SOL-YYYY-NNN` sigue calculándose con `count + 1`. No se corrigió en Fase 1 porque el plan solo exige numeración transaccional para recibos (2.5); queda registrado como limitación para una tarea posterior.
7. **Rate limiter en memoria:** es suficiente para una instancia única. Si se escala horizontalmente, debe sustituirse por un almacén compartido sin cambiar el contrato del controlador.
8. **Suite de integración versionada:** desde el 2026-11-11 la verificación end-to-end vive en `apps/api/test/integration/` (8 suites, **170 verificaciones**) y corre contra PostgreSQL 16 aislado (`docker-compose.test.yml`, puerto `55432`; en CI, `services: postgres`). `apps/api/scripts/run-integration.mjs` aplica migraciones, siembra si la base está vacía, compila, arranca dos instancias (4100 con límite de login alto y 4101 con límite 2) y ejecuta `tsx --test --test-concurrency=1`. Los datos llevan sufijo `RUN_SUFFIX`, los archivos no dependen entre sí y la suite se verificó sobre base limpia y sobre base ya sembrada.
9. **Login conserva `safeParse`:** a diferencia del resto de controladores, el login mantiene `safeParse` para responder 401 con semántica de credenciales inválidas en lugar de 400 genérico. Es la excepción explícita admitida en 1.4.
10. **Numeración de vales:** se usa `voucher_sequences` + `next_voucher_number(year)` con `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` dentro de la transacción del vale. La siembra toma el máximo histórico con formato `VAL-YYYY-NNNN`; si el formato no coincide, el vale no se cuenta y queda documentado.
11. **Cierre de período con vales pendientes:** se consideran pendientes los estados `SOLICITADO`, `APROBADO` y `DESEMBOLSADO`; solo `RENDIDO` permite cerrar. El mensaje incluye la lista de vales que bloquean el cierre.
12. **Auditoría paginada:** `auditQuerySchema` usa `z.coerce` para aceptar query params como strings; el límite máximo es 200 y el filtro de fechas se aplica en UTC (`00:00:00.000Z` a `23:59:59.999Z`). La respuesta conserva el nombre `data` para no romper consumidores existentes.
13. **PDF de solicitud:** las cifras se recalculan desde la BD al momento de generar el documento (no se congelan en la solicitud); el PDF refleja el estado real de los ítems del lote.
14. **Desembolso transaccional:** se bloquea primero la solicitud (`FOR UPDATE`), luego los ítems de cada persona con `FOR UPDATE OF causation_items` y orden determinista `periodStartDate, id`. El filtro por proyecto se hace con `INNER JOIN causation_batches` y se excluyen ítems `ANULADO` y con deuda cero. Se rechazan beneficiarios duplicados y un total declarado distinto de la suma de asignaciones.
15. **Código de solicitud (pendiente):** `SOL-YYYY-NNN` sigue usando `count + 1`; no se abordó en Fase 2 porque el plan solo exige numeración transaccional para recibos y vales. Queda como limitación conocida para una tarea posterior.
16. **Token de acceso solo en memoria:** el frontend nunca persiste el access token en `localStorage` ni en `sessionStorage`. La sesión se restaura mediante el refresh token `HttpOnly` y `POST /auth/refresh`. Esto reduce la superficie de XSS a cambio de que un recargado de página siempre dispare un refresh.
17. **Deduplicación de refresh concurrente:** React StrictMode monta los efectos dos veces en desarrollo y provocaba dos refresh simultáneos con el mismo token, lo que el backend interpreta como replay y revoca la familia. `AuthContext` comparte una única promesa de refresh a nivel de módulo mientras está en vuelo; las llamadas concurrentes esperan el mismo resultado.
18. **Resolver Zod local:** `@hookform/resolvers` no está instalado en el workspace. Para no introducir una dependencia no verificada se implementó `apps/web/src/lib/zodResolver.ts`, compatible con la interfaz de `react-hook-form`, y se cubrió con typecheck y build. Si en el futuro se instala `@hookform/resolvers`, puede sustituirse sin cambiar los formularios.
19. **Vistas por rol con hooks internos:** cada vista (`AdminView`, `GeneratorView`, `ReceptorView`) obtiene sus propios datos y ejecuta sus mutaciones; `App.tsx` solo pasa `activeTab`. "Mis Solicitudes" se filtra en cliente por `createdByUserId` del usuario autenticado porque la API no expone ese filtro como query param.
20. **Modal propio sin portal:** se mantiene el `Modal` basado en `fixed` + overlay sin `createPortal` para no añadir dependencias ni duplicar el árbol de estilos. El foco y el cierre por overlay se gestionan en el componente.
21. **Montos del desembolso en centavos:** `DisbursementForm` convierte cada importe a centavos antes de sumar y comparar, evitando que errores de coma flotante produzcan un total que el backend rechace al validar con `Decimal`.
22. **Deuda mostrada en desembolso:** el formulario muestra solo la deuda del lote de la solicitud, pero no limita el monto contra esa deuda porque el backend aplica FIFO sobre todas las causaciones pendientes del beneficiario en el proyecto. La interfaz lo advierte explícitamente para no inducir a error.
23. **Estabilidad de la pestaña activa:** `App.tsx` usa `initializedUserId` (ref) para ejecutar la selección de pestaña inicial solo cuando cambia el usuario. Sin esto, cada refresco de `/auth/me` reiniciaba la vista a la pestaña por defecto del rol.
24. **Descargas autenticadas:** `apiClient.download` reintenta una vez tras un refresh en 401 y, si el reintento vuelve a fallar, limpia la sesión. Así se evita descargar HTML de login como si fuera un PDF.
25. **Previsualización de causación:** el botón "Generar y Congelar Lote" se deshabilita si los parámetros actuales del formulario no coinciden con la previsualización vigente. La comparación es por `projectId`, `paymentGroupId`, `periodStartDate` y `periodEndDate`.
26. **Cierre de solicitudes entregadas:** `ReceptorView` expone `PATCH /payment-requests/:id/close` solo para solicitudes en estado `ENTREGADA`; la transición sigue validada por la máquina de estados del backend.
27. **Verificación del frontend:** la Fase 3 se validó con `npm run typecheck --workspace=@scienpay/web` y `npm run build --workspace=@scienpay/web`. No existe suite automatizada de componentes en el workspace web; esa cobertura corresponde a la Fase 4 (tareas 4.2 y 4.6), todavía pendiente.
28. **Notas de solicitud:** `createPaymentRequestSchema` acepta `notes`, pero `PaymentRequestsService.createRequest` no la persiste porque el esquema de BD no tiene columna para ella. El frontend conserva el campo; queda registrado como limitación conocida.
29. **RBAC en la interfaz:** ocultar pestañas y acciones por rol es solo una ayuda de UX. La autorización efectiva se mantiene en los guards y servicios del backend; ninguna vista asume que el ocultamiento reemplaza la validación del servidor.
30. **Corrección de `RAISE` en triggers:** la migración `0002` y el DDL del motor usaban `RAISE EXCEPTION '...', TG_TABLE_NAME` sin placeholder `%`; PostgreSQL 16 fallaba con `too many parameters specified for RAISE`. Se añadió `%` y la migración corre en base limpia.
31. **Seed sincronizado con la secuencia de recibos:** el seed insertaba `REC-2026-000001` de forma fija sin avanzar `receipt_sequences`, y el primer desembolso real chocaba con `receipts_receipt_number_key`. Ahora el seed reserva el número con `next_receipt_number(2026)` y lo formatea con `FinancialImmutabilityEngine.formatReceiptNumber`.
32. **Runner de desarrollo con `tsc`:** `npm run dev:api` usaba `tsx`, que no emite `design:paramtypes`; los controladores recibían dependencias `undefined` y el login devolvía 500. El nuevo runner `apps/api/scripts/dev.mjs` usa `tsc` + `tsc --watch` + `node --watch dist/main.js`, sin dependencias nuevas. El arranque compilado y el runner se verificaron con login 200 y la corrida 158/158.
33. **Validación de UUID en el borde HTTP:** un UUID inválido en path o query llegaba a PostgreSQL y producía `invalid input syntax for type uuid` (HTTP 500). Se añadieron `UuidParam`/`UuidQuery` con `ParseUUIDPipe` en todos los controladores; ahora responde 400 con `UUID_INVALIDO`. La verificación cubre paths y query params de proyectos, causación, solicitudes, desembolsos, asignaciones, auditoría y caja chica.
34. **Anulación de causación responde 201:** `POST /causation/batches/:id/annul` no declara `@HttpCode`, por lo que NestJS usa 201 para POST. El frontend usa `response.ok`, de modo que el contrato funciona; se acepta y documenta en lugar de forzar 200 para no introducir un cambio innecesario. Si un consumidor exige 200, debe añadirse `@HttpCode(HttpStatus.OK)` y actualizar la prueba.
35. **Suite de integración en el repositorio:** la antigua verificación externa (`C:\Users\Usuario\...\scienpay-integration.mjs`) no existe en la máquina de ejecución y no se versionó. La tarea 4.1 la reemplazó por la suite descrita en el punto 8; el runner es reproducible localmente (`npm run db:test:up` + `npm run test:integration`) y en CI.
36. **Transiciones inválidas responden 409:** `PaymentRequestStateMachine` es dominio puro y lanzaba `Error`; NestJS lo traducía a **500**. `PaymentRequestsService` ahora valida con `canTransition` y lanza `ConflictException` con `TRANSICION_ESTADO_INVALIDA`. La suite cubre envío duplicado, aprobación duplicada, rechazo de una solicitud aprobada y cierre fuera de `ENTREGADA`.
37. **Separación de comandos de test:** `npm test` en la API ejecuta solo `test/domain` y `test/foundation`; `test:integration` es explícito. Antes, el glob `test/**/*.test.ts` habría intentado ejecutar las suites de integración sin API ni base levantadas.
38. **Migraciones idempotentes (recordatorio para 4.6):** `migrate.ts` reaplica todos los `.sql` ordenados en cada corrida; la migración `0004` (`notes` y numeración de `SOL`) debe usar `IF NOT EXISTS`/`CREATE OR REPLACE` para poder ejecutarse sobre bases ya migradas.

---

## 10. FASE 4 — Testing y calidad (redefinida el 2026-11-10, corregida el 2026-11-11)

**Objetivo:** convertir la verificación manual de las Fases 1–3 en un sistema de calidad repetible y bloqueante en CI, cubrir el frontend, cerrar la deuda técnica documentada y publicar el contrato OpenAPI.

**Punto de partida verificado (2026-11-11, sobre `aea1b91`):**
- La suite de **158 verificaciones** **no está disponible**: el script `C:\Users\Usuario\AppData\Local\Temp\opencode\scienpay-integration.mjs` no existe en la máquina de ejecución (no hay usuario `Usuario`). La tarea 4.1 consiste en **reconstruir** la suite contra los 57 endpoints reales, no en moverla.
- Inventario real de la API: **57 endpoints en 11 módulos** (`auth`, `users`, `projects`, `persons`, `payment-groups`, `assignments`, `causation`, `payment-requests`, `disbursements`, `petty-cash`, `audit`) más `health`.
- `apps/api/test/` solo contiene tests de dominio y fundación (16 archivos, **87 tests**); no existe `test/integration/`.
- `apps/web` declara `test: "echo \"Frontend tests placeholder\" && exit 0"`: simula cobertura sin ejecutar tests.
- `packages/shared` también tiene un placeholder de test; se acepta provisionalmente porque los contratos se validan por typecheck y por los tests de API, pero debe quedar documentado o sustituirse.
- El CI ejecuta `typecheck`, `test` y `build`, pero **no ejecuta `npm run lint`**; el script raíz existe y no hace nada porque ningún workspace define `lint`.
- `tsconfig.base.json` ya tiene `strict: true`.
- No hay Swagger/OpenAPI ni dependencias asociadas.
- El rate limiter de login está **hardcodeado a 5 intentos/minuto por IP** (`auth.controller.ts:30,68`) aunque `.env` ya declara `AUTH_RATE_LIMIT_MAX`; sin hacerlo configurable ninguna suite de integración puede autenticarse 158 veces. Se añade como sub-paso obligatorio de 4.1.
- `migrate.ts` **reaplica todos los `.sql` ordenados en cada corrida** y no lleva tabla ledger: cualquier migración nueva (p. ej. `0004`) debe ser **idempotente**.
- Deuda técnica documentada: `SOL-YYYY-NNN` usa `count + 1` (`payment-requests.service.ts:185-189`); `payment_requests` **no tiene columna `notes`** y `createRequest` ignora el campo; el rate limiter es en memoria (aceptado para una instancia).

**Orden de ejecución:** 4.1 → 4.6. Las tareas 4.2, 4.3 y 4.5 dependen de la infraestructura de 4.1.

> **Autorización:** la Fase 4 está autorizada el 2026-11-11 (alcance completo 4.1 → 4.6). La Fase 5 sigue definida pero **no autorizada**.

### 4.1 Suite de integración versionada en el repositorio

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Punto de partida** | El script de 158 checks **no existe en la máquina de ejecución**; sin `test/integration/`; CI solo ejecuta tests unitarios. Se reconstruye la suite contra los 57 endpoints reales. |
| **Objetivo** | Reconstruir la verificación end-to-end dentro del repositorio y ejecutarla en CI contra PostgreSQL 16 real. |
| **Solución** | 1. Dividir en suites por dominio bajo `apps/api/test/integration/`: `auth`, `catalogs`, `causation`, `payment-requests`, `disbursements`, `petty-cash`, `audit` y `security` (RBAC, rate limit, UUID inválidos).<br>2. Crear helpers reutilizables: `integration-env.ts` (BASE_URL, sufijo de corrida, login por rol, wrapper `api()`), `db.ts` (aserciones SQL con `postgres.js`) y `bootstrap.ts` (migraciones + seed).<br>3. Añadir `docker-compose.test.yml` con PostgreSQL 16 Alpine en `55432`; en CI usar un `services: postgres` equivalente.<br>4. Crear `apps/api/scripts/run-integration.mjs`: valida la BD, aplica migraciones, siembra si no hay datos, compila, arranca la API, espera `/health`, ejecuta `tsx --test test/integration/**/*.test.ts`, detiene la API y propaga el código de salida.<br>5. Hacer configurable el rate limiter de login (`AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX`) y arrancar la API de integración con un límite alto; la suite `security` verifica el 429 en un proceso con límite bajo.<br>6. Scripts `test:integration` en API y raíz; `test` sigue siendo solo unitario.<br>7. Job `integration` en CI con PostgreSQL 16, build de shared/API y ejecución del comando. |
| **Aceptación** | Desde una base limpia, un solo comando aplica migraciones, siembra y ejecuta **158+ verificaciones** con exit code 0; el job de CI queda verde; un fallo produce exit code distinto de 0; no se depende de archivos temporales ni del orden entre suites; los datos usan sufijo de corrida. |
| **Verificación** | `npm run build --workspace=@scienpay/api` + `npm run test:integration --workspace=@scienpay/api`: **170/170 checks, 8 suites, 0 fallos**, ejecutado el 2026-11-11 dos veces (base reseteada con `INTEGRATION_FRESH=1` y reejecución sobre la base ya sembrada). El runner arranca dos instancias (4100 con límite alto y 4101 con límite 2 para el 429). |
| **Archivos** | `apps/api/test/integration/**`, `apps/api/test/helpers/**`, `apps/api/scripts/run-integration.mjs`, `docker-compose.test.yml`, `apps/api/package.json`, `package.json`, `.github/workflows/ci.yml` |
| **Depende de** | — |
| **Alternativa descartada** | Testcontainers: añade `@testcontainers/postgresql`, exige Docker-in-Docker en CI y arranca más lento. El contenedor de servicio reutiliza el entorno ya verificado. Se reconsidera si se necesita una base aislada por suite. |

**Reparto real de verificaciones (ejecutado el 2026-11-11):**

| Suite | Cobertura | Verificaciones |
|---|---|---|
| `auth` | health, login usuario/email, `me`, refresh rotativo, replay, logout, cookie `HttpOnly` | 23 |
| `security` | RBAC por rol, prohibiciones, cuatro ojos, 429 de rate limit, UUID inválidos en path/query | 23 |
| `catalogs` | proyectos, personas, grupos de pago, asignaciones y solapamientos | 20 |
| `causation` | preview, generate, idempotencia, prorrateo, anulación con motivo, inmutabilidad SQL | 22 |
| `payment-requests` | estados, envío, aprobación, rechazo, cierre, PDF | 21 |
| `disbursements` | FIFO, pagos parciales, recibos, correlatividad sin huecos, PDF de recibo | 18 |
| `petty-cash` | caja, períodos, vales, aprobación, desembolso, rendición, cierre y arrastre | 24 |
| `audit` | filtros combinados, paginación, límite máximo, acceso solo ADMIN | 19 |
| **Total** | | **170** |

### 4.2 Tests E2E del frontend

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | No hay E2E; `apps/web` solo tiene el placeholder `exit 0`. |
| **Objetivo** | Cubrir los tres flujos críticos de usuario contra la aplicación real. |
| **Solución** | 1. Adoptar **Playwright** (no hay configuración previa de Cypress que preservar; ofrece `webServer`, trazas, capturas y ejecución paralela sin servicio externo).<br>2. Configurar `apps/web/playwright.config.ts` con `webServer` para API y web, `baseURL` `http://localhost:5173` y base de datos dedicada `scienpay_e2e`.<br>3. Implementar tres specs: **ADMIN** (login → usuarios → desbloquear/reset → auditoría → logout), **GENERADOR** (login → proyecto → persona → asignación → causación → solicitud → enviar) y **RECEPTOR** (login → bandeja → aprobar con cuatro ojos → desembolso parcial FIFO → PDF → caja chica → rendir → cerrar).<br>4. Ejecutar migraciones + seed antes de la corrida; usar sufijo temporal para no chocar con datos existentes.<br>5. Job `e2e` en CI con PostgreSQL 16; trazas y capturas como artefactos en fallo. |
| **Aceptación** | `npm run test:e2e` desde una base limpia ejecuta los tres flujos y pasa; los fallos dejan traza/captura; la corrida completa tarda menos de 10 minutos; el job de CI queda verde en PR hacia `main`/`develop`. |
| **Archivos** | `apps/web/playwright.config.ts`, `apps/web/e2e/**`, `apps/web/package.json`, `package.json`, `.github/workflows/ci.yml` |
| **Depende de** | 4.1 (infraestructura de BD y arranque) |
| **Alternativa** | Cypress (elección original): válida si el equipo prefiere su DX; los flujos y criterios de aceptación no cambian. |

### 4.3 Test de concurrencia FIFO

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | `registerDisbursement` ya usa transacción y `FOR UPDATE`; hay tests unitarios de orden determinista, pero no una prueba de estrés real. |
| **Objetivo** | Demostrar que N desembolsos concurrentes no producen sobrepago, saldo negativo ni deadlocks. |
| **Solución** | Test de integración que lanza **20 desembolsos concurrentes** (`Promise.all`) para el mismo `personId` + `projectId`, con montos aleatorios que en conjunto no superen la deuda. Verificar por SQL: suma de `receipt_allocations` = suma desembolsada; `causation_items.paid_amount <= calculated_amount`; `remaining_debt = calculated_amount - paid_amount`; ningún `remaining_debt` negativo; cero errores `40P01` (deadlock). Repetir 10 veces. |
| **Aceptación** | 10/10 corridas pasan; no hay sobrepago ni saldos negativos; no hay deadlocks; el test termina en menos de 60 s. |
| **Archivos** | `apps/api/test/integration/fifo-concurrency.test.ts` |
| **Depende de** | 4.1 |

### 4.4 Lint, formato y typecheck estricto en CI

| Campo | Contenido |
|---|---|
| **Estado** | 🟢 Completada |
| **Punto de partida** | `strict: true` ya está activo; el CI corre typecheck/test/build; no hay ESLint y `npm run lint` no hace nada. |
| **Objetivo** | Hacer que lint y formato sean bloqueantes y consistentes en todo el monorepo. |
| **Solución** | 1. Añadir ESLint flat config en la raíz con `typescript-eslint`, reglas de React Hooks para `apps/web` y Prettier.<br>2. Definir `lint` en cada workspace y hacer que el script raíz falle si algún workspace no lo define.<br>3. Corregir las violaciones existentes o justificar excepciones puntuales.<br>4. Añadir `npm run lint` y `prettier --check` al CI como pasos bloqueantes.<br>5. Revisar la política de los escaneos de seguridad: Gitleaks bloqueante; Semgrep y `npm audit` con baseline documentado o bloqueantes tras triage.<br>6. Registrar la política en `docs/decisiones/ADR-008-calidad-y-ci.md`. |
| **Aceptación** | `npm run lint` y `prettier --check` pasan localmente y en CI; el pipeline falla ante un error de lint, typecheck o test; la política de escaneos queda documentada. |
| **Archivos** | `eslint.config.js`, `package.json`, `apps/*/package.json`, `packages/shared/package.json`, `.github/workflows/ci.yml`, `docs/decisiones/ADR-008-calidad-y-ci.md` |
| **Depende de** | — (puede ejecutarse en paralelo con 4.1) |

### 4.5 OpenAPI/Swagger generado desde Zod

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | No hay Swagger/OpenAPI; los schemas Zod de `@scienpay/shared` son la fuente única de validación. |
| **Objetivo** | Publicar `/api/docs` con todos los endpoints, schemas de request/response y autenticación, sin duplicar DTOs. |
| **Solución** | 1. Añadir `@nestjs/swagger`, `swagger-ui-express` y un conversor Zod → JSON Schema (`zod-to-json-schema` o `@asteasolutions/zod-to-openapi`).<br>2. Anotar controladores con `@ApiTags`, `@ApiOperation`, `@ApiResponse` y `@ApiBearerAuth`; registrar el esquema de cookie de refresh.<br>3. Generar los componentes desde los schemas compartidos y montar `SwaggerModule` en `main.ts` (`/api/docs` y `/api/docs-json`).<br>4. Controlar la exposición con `ENABLE_SWAGGER` (activo en desarrollo/demo; desactivable en producción).<br>5. Añadir un test que compare las rutas registradas por Nest con los paths del documento. |
| **Aceptación** | `/api/docs` lista todos los endpoints; "Try it out" funciona para health, login y un endpoint protegido con bearer/cookie; el test de cobertura de rutas pasa; no hay schemas duplicados. |
| **Archivos** | `apps/api/src/main.ts`, `apps/api/src/infrastructure/openapi/**`, controladores, `apps/api/package.json`, tests |
| **Depende de** | 4.1 (para el test de cobertura de rutas) |

### 4.6 Cierre de deuda técnica documentada

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | Tres deudas registradas en la sección 9: numeración de solicitudes no transaccional, `notes` no persistido y tests frontend placeholder. |
| **Objetivo** | Cerrar las deudas que afectan correctitud o calidad; dejar las aceptadas explícitamente documentadas. |
| **Solución** | **4.6.1 — `SOL-YYYY-NNN` transaccional:** migración `0004` con `request_sequences(year, last_number)` y `next_request_number(year)`, siembra desde solicitudes existentes, uso dentro de la transacción de `createRequest` y test de concurrencia (10 solicitudes paralelas → códigos únicos, sin huecos en rollback).<br>**4.6.2 — Persistir `notes`:** añadir columna `notes` a `payment_requests` (nullable), actualizar el schema Drizzle, persistir en `createRequest`, exponer en la respuesta y mostrar en el detalle; test de ida y vuelta.<br>**4.6.3 — Tests frontend reales:** añadir Vitest + React Testing Library + jsdom; cubrir `apiClient` (refresh en 401, normalización de errores), `AuthContext` (login/logout/deduplicación de refresh), `zodResolver` y al menos un formulario/vista crítico (`DisbursementForm` en centavos, guardas por rol); eliminar el placeholder `exit 0` de `apps/web` y justificar o sustituir el de `packages/shared`.<br>**4.6.4 — Limitaciones aceptadas:** mantener el rate limiter en memoria para una instancia y documentar la migración a un almacén compartido si se escala. |
| **Aceptación** | La numeración de solicitudes es transaccional y pasa la prueba de concurrencia; `notes` se persiste y se recupera; `npm run test --workspace=@scienpay/web` ejecuta tests reales y falla ante regresiones; no quedan placeholders sin justificar; la sección 9 se actualiza. |
| **Archivos** | `apps/api/src/infrastructure/database/migrations/0004_*.sql`, `payment-requests.service.ts`, schema Drizzle, `seed.ts`, tests de integración, `apps/web/src/**/*.test.tsx`, `apps/web/package.json`, `packages/shared/package.json` |
| **Depende de** | 4.1 (integración), 4.2 y 4.4 (infraestructura de tests y lint) |

---

## 11. FASE 5 — Pulimiento y entrega (redefinida el 2026-11-10)

**Objetivo:** dejar el proyecto listo para demo, defensa y entrega, usando la infraestructura real ya existente (Docker Compose + Fly.io) y la documentación acumulada.

**Punto de partida verificado:**
- El seed declara cubrir los escenarios de la especificación, pero no hay verificación automatizada; la caja chica sembrada tiene apertura y período, pero no un vale con ciclo completo.
- El README ya documenta Docker Compose, backups/restore y proxy Nginx; `fly.toml` y `Dockerfile` existen; falta una guía de despliegue de producción consolidada.
- No existen manuales por rol, guía de demo ni preparación de defensa.
- `docs/bitacora_ia.md` tiene sesiones hasta la 15 y luego dos entradas duplicadas como “Sesión 6” y “Sesión 7”; `docs/uso-de-ia.md` solo llega a la sesión 5.
- El PR #1 está abierto, con CI verde y 6 commits de `AngBan2x`; se usa como evidencia.

**Orden de ejecución:** 5.1 → 5.6. 5.2 puede ejecutarse en paralelo con 5.3 y 5.4; 5.5 depende de 5.1 y 5.2; 5.6 depende de 5.5.

> **Esta sección define el plan, no autoriza su ejecución.**

### 5.1 Seed alineado a los 6 escenarios + verificación automatizada

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | El seed cubre asignación completa, parcial, cambio de monto, lote con pago parcial/FIFO y solicitud rechazada; la numeración de escenarios no coincide con la especificación. **Verificado el 2026-11-11:** `pettyCashVouchers` se importa en `seed.ts:20` pero **nunca se inserta**; solo existe el movimiento `APERTURA_ARRASTRE` (`seed.ts:452-460`) y un único período. |
| **Objetivo** | Que el seed reproduzca los 6 escenarios exigidos y que una prueba automática lo verifique. |
| **Solución** | 1. Renumerar y completar los escenarios según la especificación: (1) asignación completa, (2) asignación parcial, (3) cambio de monto a mitad de período, (4) lote causado + pago parcial + prevención de exceso FIFO, (5) solicitud rechazada formalmente con justificación, (6) caja chica con apertura, vale solicitado → aprobado → desembolsado → rendido, cierre y arrastre.<br>2. Añadir el vale y los movimientos faltantes; crear un segundo período para demostrar el arrastre.<br>3. Añadir datos demo realistas (más proyectos, personas y períodos) sin romper la idempotencia.<br>4. Crear `test/seed/seed-scenarios.test.ts` o `scripts/verify-seed.mjs` con aserciones SQL por escenario. |
| **Aceptación** | `npm run db:seed` sobre base limpia + `npm run test:seed` pasan; los 6 escenarios son verificables por consulta; la segunda siembra se omite sin duplicar; los conteos esperados quedan documentados. |
| **Archivos** | `apps/api/src/infrastructure/database/seed.ts`, `apps/api/test/seed/**` o `apps/api/scripts/verify-seed.mjs`, `apps/api/package.json`, `docs/HANDOFF.md` |
| **Depende de** | 4.1 (infraestructura de BD) |

### 5.2 Guía de despliegue a producción (Docker Compose + Fly.io)

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | README con Docker Compose, backups/restore y Nginx; `fly.toml` y `Dockerfile` presentes; sin guía de producción consolidada. |
| **Objetivo** | Permitir que un tercero despliegue, opere y recupere el sistema sin adivinanzas. |
| **Solución** | Crear `docs/deployment.md` con dos rutas: **Docker Compose en VPS** (variables y secretos, `docker compose up -d --build`, Nginx/TLS con Let's Encrypt, health checks, límites de recursos, logs, backups/restore con los scripts existentes, rollback con imagen anterior + backup de BD) y **Fly.io** (`fly launch/deploy`, `fly secrets set`, Postgres de Fly o externo, release command para migraciones/seed, health checks, escalado, `fly releases`/rollback, logs). Añadir checklist de seguridad: rotar secretos por defecto, JWT de 64+ caracteres, cookies `Secure` en producción, CORS restringido, TLS, rate limit y `.env` fuera del repositorio. Crear `docker-compose.prod.yml` si hace falta para límites/logging. |
| **Aceptación** | Un tercero puede desplegar desde cero siguiendo la guía; la ruta Docker Compose se prueba localmente; `.env.example` está completo; no se commitean secretos; el rollback y el restore están documentados y probados al menos una vez. |
| **Archivos** | `docs/deployment.md`, `README.md`, `.env.example`, `docker-compose.prod.yml` (opcional), `fly.toml` (revisión) |
| **Depende de** | 4.1 (suite estable para validar el despliegue) |

### 5.3 Manuales de usuario por rol

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | No existen manuales por rol. |
| **Objetivo** | Documentar los flujos completos de ADMIN, GENERADOR y RECEPTOR con el vocabulario real de la interfaz. |
| **Solución** | Crear `docs/manual-admin.md` (usuarios, desbloqueo/reset, parámetros, auditoría con filtros), `docs/manual-generador.md` (proyectos, beneficiarios, asignaciones, causación, solicitudes) y `docs/manual-receptor.md` (bandeja, cuatro ojos, desembolsos FIFO, recibos/PDF, caja chica). Incluir pasos, capturas o placeholders, errores frecuentes y límites de cada rol. |
| **Aceptación** | Los tres manuales cubren el flujo completo; los nombres de botones y pestañas coinciden con la app; cada paso se verificó en la aplicación en ejecución. |
| **Archivos** | `docs/manual-admin.md`, `docs/manual-generador.md`, `docs/manual-receptor.md` |
| **Depende de** | 5.1 (datos demo) |

### 5.4 Auditoría y cierre de la bitácora IA

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | **Verificado el 2026-11-11:** `bitacora_ia.md` ya contiene las sesiones 1–18 sin duplicados (16 verificación final, 17 reejecución, 18 redefinición de Fases 4–5); `uso-de-ia.md` llega a la sesión 6. La tarea es normalizar, completar desde la 19 en adelante y añadir la tabla de evidencia. |
| **Objetivo** | Cumplir el requisito académico de registrar las indicaciones a la IA, las decisiones y las validaciones humanas. |
| **Solución** | 1. Normalizar la numeración: sesiones 1–15 originales, 16 verificación final, 17 reejecución de integración, 18 redefinición de Fases 4–5 y siguientes.<br>2. Completar `uso-de-ia.md` con las sesiones faltantes, prompts representativos, decisiones aceptadas/rechazadas, limitaciones y lecciones aprendidas.<br>3. Añadir una tabla de evidencia que relacione sesión → commit/PR/run de CI.<br>4. Revisar que ambos documentos sean consistentes entre sí. |
| **Aceptación** | No hay numeración duplicada; ambos documentos cubren todas las fases; cada decisión relevante tiene evidencia; el paquete está listo para la defensa. |
| **Archivos** | `docs/bitacora_ia.md`, `docs/uso-de-ia.md` |
| **Depende de** | 5.3 (flujos documentados) |

### 5.5 Demo end-to-end grabada

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | No hay guía de demo ni video. |
| **Objetivo** | Tener una demostración reproducible de 5–10 minutos que muestre el sistema completo. |
| **Solución** | Crear `docs/demo-guide.md` con guion y tiempos: `docker compose up` → health → login ADMIN → usuarios/auditoría → login GENERADOR → proyecto/persona/asignación → causación → solicitud → login RECEPTOR → aprobación cuatro ojos → desembolso parcial FIFO → recibo PDF → caja chica (apertura, vale, rendición, cierre) → auditoría → logout. Grabar el video y publicarlo como enlace no listado; incluir plan B con capturas y la salida 158/158 si la demo en vivo falla. |
| **Aceptación** | El video sigue el guion, usa datos reales y no tiene cortes confusos; el enlace es accesible para el evaluador; el plan B está documentado. |
| **Archivos** | `docs/demo-guide.md`, enlace al video, `README.md` |
| **Depende de** | 5.1 y 5.2 |

### 5.6 Preparación de la defensa

| Campo | Contenido |
|---|---|
| **Estado** | 🔴 Por hacer |
| **Punto de partida** | No hay documento de preparación. |
| **Objetivo** | Tener un guion de defensa con arquitectura, ADRs, reglas críticas, decisiones de IA y evidencia verificable. |
| **Solución** | Crear `docs/defense-prep.md` con: resumen de 1 minuto; arquitectura (Clean Architecture/DDD, monorepo); síntesis de ADRs 001–008; reglas críticas (inmutabilidad, FIFO, prorrateo, cuatro ojos, secuencias sin huecos); decisiones asistidas por IA (qué se aceptó, qué se rechazó, qué se validó a mano); checklist de demo; preguntas anticipadas y respuestas; anexo de evidencia (PR #1, runs de CI, commits de `AngBan2x`, salida 158/158, 87/87 tests). |
| **Aceptación** | Cada afirmación está respaldada por un commit, PR, run de CI o salida de tests; el documento se ensayó al menos una vez; el anexo distingue claramente el aporte propio del trabajo del equipo. |
| **Archivos** | `docs/defense-prep.md` |
| **Depende de** | 5.5 |

---

## 12. Reglas no negociables

1. Todo el trabajo se realiza en `plan/execution-tracking`; no se toca `main`.
2. Las Fases 1–3 están cerradas. La **Fase 4 está autorizada** (2026-11-11) y se ejecuta en el orden de la sección 10; la **Fase 5 sigue sin autorizar**.
3. Cada decisión no trivial se documenta en este archivo o en un ADR.
4. Cada tarea completada actualiza este documento, `avances.md` y `bitacora_ia.md`.
5. `npm run typecheck`, `npm run test` y `npm run build` deben pasar antes de cerrar cada tarea. Desde 4.1, `npm run test:integration` también debe pasar.
6. No se introducen mocks en el código de producción del frontend.
7. Los secretos no se hardcodean; se documentan en `.env.example`.
8. Los tests placeholder (`echo ... && exit 0`) no cuentan como cobertura; deben sustituirse o justificarse explícitamente.
9. Las suites de integración y E2E deben ser repetibles sobre una base limpia y no depender de estado manual.
10. Cada cierre de fase incluye commit, run de CI y salida de tests como evidencia.

---

## 13. Estado actual y próximo paso

- **Fases 1–3:** completadas (17/17 tareas).
- **Backend:** 87/87 tests unitarios pasando (verificado el 2026-11-11).
- **Typecheck:** API, shared y web sin errores.
- **Build:** API, shared y web compilan correctamente.
- **Stack local:** `docker compose up --build -d` levanta `db`, `api`, `web` y `proxy`; `/api/v1/health` y login responden 200 (verificado el 2026-11-11).
- **Integración:** **170/170 checks en 8 suites**, versionada en `apps/api/test/integration/`, con runner de dos instancias y job `integration` en CI (verificado el 2026-11-11 con base limpia y con reejecución).
- **Frontend:** conectado a la API real, sin mocks de producción.
- **Fase 4:** **2/6** tareas completadas (4.1 y 4.4).
- **Fase 5:** 6 tareas definidas, **no autorizada**.
- **Deuda técnica a cerrar en 4.6:** numeración transaccional de `SOL`, persistencia de `notes` y tests frontend reales.
- **Evidencia disponible:** PR #1 (https://github.com/bracebalDev/scienpay-software/pull/1), CI verde y 6 commits de `AngBan2x`.
- **Próximo paso:** **4.3** (prueba de estrés de concurrencia FIFO), **4.5** (OpenAPI), **4.2** (Playwright) y **4.6** (migración `0004`, `notes`, Vitest/RTL).
- **Bloqueos:** ninguno. Docker Desktop es necesario para integración/E2E locales; en CI se usa un servicio PostgreSQL 16.
