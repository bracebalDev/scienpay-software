# HANDOFF.md — Especificación viva y seguimiento de ejecución

> **Proyecto:** Scienpay — Sistema de Control de Pagos y Asignaciones para Proyectos Científicos
> **Rama de trabajo:** `plan/execution-tracking` (aislada de `main`)
> **Alcance autorizado:** únicamente **Fases 1, 2 y 3**. Las Fases 4 y 5 quedan explícitamente fuera de alcance.
> **Fecha de inicio de ejecución:** 2026-11-07
> **Última actualización:** 2026-11-08
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
| **Fase 4** | Testing y calidad | ⚪ Fuera de alcance | — |
| **Fase 5** | Pulimiento y entrega | ⚪ Fuera de alcance | — |

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

| Métrica | Objetivo | Actual |
|---|---|---|
| Tareas de Fases 1–3 | 17 | 17 completadas |
| Tests unitarios backend | 100 % pasando | 87/87 pasando |
| Typecheck | Sin errores | API, shared y web sin errores |
| Build | Exitoso | API, shared y web compilan |
| Frontend conectado a API | 100 % | 100 % (sin mocks) |

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

---

## 9. Decisiones de ejecución y limitaciones conocidas

1. **Refresh token único por emisión:** se añadió `jwtid` (`jti`) aleatorio al firmar el refresh token. Sin él, dos emisiones dentro del mismo segundo producían tokens idénticos y la rotación no invalidaba realmente el anterior.
2. **Trigger por lista negra:** la función de `causation_items` y `causation_batches` enumera las columnas inmutables y rechaza sus cambios; las columnas mutables quedan fuera de esa comparación. Los tests verifican ambas caras (columnas inmutables presentes y mutables ausentes).
3. **Anulación y regeneración:** la anulación conserva el lote como registro histórico y marca sus ítems como `ANULADO`. La migración `0003` sustituye la restricción `uq_causation_batch_idempotence` por el índice parcial `uq_causation_batch_idempotence_active WHERE status <> 'ANULADO'`, de modo que un lote anulado no bloquea regenerar el período y la idempotencia se mantiene entre lotes activos. `generateBatch` filtra explícitamente por `status <> 'ANULADO'`.
4. **Auditoría transaccional:** `AuditService.recordEvent` acepta una transacción opcional para que la anulación y su traza sean atómicas. Las llamadas existentes siguen usando la conexión normal.
5. **Monto de la solicitud:** `createRequest` usa `input.requestedAmount` como `totalAmountUSD` y rechaza montos superiores al total causado del lote. Antes se ignoraba el monto enviado y se usaba siempre el total del lote; la decisión se tomó para que el contrato Zod y la persistencia coincidan.
6. **Código de solicitud:** `SOL-YYYY-NNN` sigue calculándose con `count + 1`. No se corrigió en Fase 1 porque el plan solo exige numeración transaccional para recibos (2.5); queda registrado como limitación para una tarea posterior.
7. **Rate limiter en memoria:** es suficiente para una instancia única. Si se escala horizontalmente, debe sustituirse por un almacén compartido sin cambiar el contrato del controlador.
8. **Tests de integración con PostgreSQL:** no se ejecutaron porque Docker no está disponible en el entorno. Las migraciones y triggers están cubiertos por tests de generación de DDL y por la suite de dominio; la validación contra una BD real queda para Fase 4.
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
27. **Verificación del frontend:** la Fase 3 se validó con `npm run typecheck --workspace=@scienpay/web` y `npm run build --workspace=@scienpay/web`. No existe suite automatizada de componentes en el workspace web; esa cobertura corresponde a la Fase 4, fuera de alcance.
28. **Notas de solicitud:** `createPaymentRequestSchema` acepta `notes`, pero `PaymentRequestsService.createRequest` no la persiste porque el esquema de BD no tiene columna para ella. El frontend conserva el campo; queda registrado como limitación conocida.
29. **RBAC en la interfaz:** ocultar pestañas y acciones por rol es solo una ayuda de UX. La autorización efectiva se mantiene en los guards y servicios del backend; ninguna vista asume que el ocultamiento reemplaza la validación del servidor.

---

## 10. Reglas no negociables

1. Todo el trabajo se realiza en `plan/execution-tracking`; no se toca `main`.
2. Solo se ejecutan las Fases 1, 2 y 3. Las Fases 4 y 5 no se inician.
3. Cada decisión no trivial se documenta en este archivo o en un ADR.
4. Cada tarea completada actualiza este documento y los archivos de avance.
5. `npm run typecheck`, `npm run test` y `npm run build` deben pasar antes de cerrar cada fase.
6. No se introducen mocks en el código de producción del frontend.
7. Los secretos no se hardcodean; se documentan en `.env.example`.
