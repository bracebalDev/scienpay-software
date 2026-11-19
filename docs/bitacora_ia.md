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

#### Sesión 6: Módulo 2 - Personas, Proyectos, Asignaciones y Prevención de Solapamiento
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Implementar catálogo de Proyectos (Física, Química, Biología; interno/externo), Personas (beneficiarios sin cuenta de usuario), Grupos de Pago (semanal, quincenal, mensual) y Asignaciones. Implementar y probar la regla obligatoria de negocio: "Solapamiento de asignaciones de una misma persona en el mismo proyecto es rechazado".
- **Resultado Obtenido:**
  - 6 pruebas unitarias de dominio para la política `AssignmentOverlapPolicy` verificando detección de solapamiento en rangos cerrados, abiertos, tramos consecutivos y mismo día exacto (inclusivo).
  - Total de pruebas en la suite incrementado a 31 tests pasando al 100%.
  - Módulos NestJS completos: `ProjectsModule`, `PersonsModule`, `PaymentGroupsModule`, `AssignmentsModule`.
  - Integración de `Decimal.js` para almacenamiento estricto de `amountPerPeriod` en formato de 2 decimales sin tipos flotantes binarios.
- **Cambios Manuales Realizados y Motivo:**
  - Se utilizó la importación nombrada `import { Decimal } from 'decimal.js'` para satisfacer los requerimientos de tipado estricto en TypeScript sin necesidad de `esModuleInterop` ambiguo.

#### Sesión 7: Módulo 3 - Motor de Causación y Prorrateo Puro
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Implementar la función pura de dominio `CausationCalculator` sin acceso a BD ni efectos secundarios. Probar período completo, período parcial, semanas/quincenas con diferentes duraciones de días (15 y 16 días), días inclusivos, suma de tramos no solapados por cambio a mitad de período y redondeo HALF_UP estricto a 2 decimales con `Decimal.js`. Implementar la generación de lotes con verificación de idempotencia.
- **Resultado Obtenido:**
  - 7 pruebas unitarias de prorrateo cubriendo todos los casos de borde (.XX5 redondeado hacia arriba, períodos vacíos, tramos múltiples, períodos de 31, 30, 16 y 15 días).
  - Total de la suite incrementado a 38 pruebas pasando al 100%.
  - `CausationModule` con endpoints de simulación/previsualización (`POST /api/v1/causation/preview`) y generación de lotes inmutables (`POST /api/v1/causation/generate`).
- **Cambios Manuales Realizados y Motivo:**
  - Se configuró el modo de redondeo `Decimal.ROUND_HALF_UP` en todos los cálculos monetarios para honrar estrictamente la especificación rectora del proyecto ("Redondeo HALF_UP a 2 decimales").

#### Sesión 8: Módulo 4 - Solicitudes de Pago, Máquina de Estados, Cuatro Ojos y Amortización FIFO
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Implementar el ciclo completo de solicitudes de pago con su máquina de estados finita (`BORRADOR` -> `ENVIADA` -> `APROBADA`/`RECHAZADA` -> `ENTREGADA` -> `CERRADA`), la regla obligatoria de cuatro ojos (`creador !== revisor`), el algoritmo puro de imputación FIFO (`FIFOAllocationEngine`), emisión de recibos correlativos inmutables y la regla estricta: "Ningún pago aplicado supera la deuda pendiente" y "causado - pagado = saldo".
- **Resultado Obtenido:**
  - 12 pruebas unitarias de dominio para la máquina de estados y el motor FIFO.
  - Total de la suite incrementado a 50 pruebas pasando al 100%.
  - Módulos `PaymentRequestsModule` y `DisbursementsModule` completamente integrados en NestJS.
  - Generación de numeración secuencial de recibos correlativos con `receipt_number_seq`.
- **Cambios Manuales Realizados y Motivo:**
  - Se añadieron campos opcionales `periodDescription` en `createPaymentRequestSchema` y `paymentRequestId` en `registerDisbursementSchema` para soporte unificado tanto por cuerpo JSON como por parámetro REST.

#### Sesión 9: Módulo 5 - Cajas Chicas y Arrastre de Saldos
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Implementar el módulo de cajas chicas multi-proyecto: apertura mensual con arrastre automático de saldo de cierre previo, emisión y aprobación de vales, desembolsos con control de fondos suficientes, rendición con comprobante/factura validando cuadratura exacta (`rendido + vuelto = desembolsado`), movimientos inmutables (`petty_cash_movements`) y cierre mensual.
- **Resultado Obtenido:**
  - 5 pruebas unitarias de dominio para el motor contable `PettyCashLedgerEngine`.
  - Total de la suite incrementado a 55 pruebas pasando al 100%.
  - Módulo `PettyCashModule` en NestJS con RBAC estricto para Receptor y Generador.
- **Cambios Manuales Realizados y Motivo:**
  - Se modeló la relación muchos-a-muchos entre cajas chicas y proyectos en la tabla `petty_cash_projects` para permitir que una misma caja respalde múltiples líneas de investigación.

#### Sesión 10: Módulo 6 - Generación de PDFs, Auditoría Inmutable, Seeds y Respaldo de BD
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Completar los entregables de la especificación: generación de recibos individuales en PDF institucional (`PdfReceiptGenerator`) y descarga binaria en endpoint (`GET /api/v1/disbursements/receipts/:id/pdf`), módulo de auditoría `AuditModule` para consultas exclusivas de ADMIN (`GET /api/v1/audit`), script de seed `seed.ts` con los 6 escenarios requeridos (completo, parcial, cambio a mitad de período, pago parcial, pago que excede la deuda y solicitud rechazada) y contraseñas hasheadas en Argon2id, scripts multiplataforma de respaldo y restauración (`scripts/backup.sh`, `scripts/restore.sh`, `backup.ps1`, `restore.ps1`), y actualización exhaustiva de `README.md`.
- **Resultado Obtenido:**
  - Suite de 56 pruebas unitarias y de dominio ejecutadas y pasando al 100%.
  - Verificación estricta de tipos TypeScript (`npm run typecheck`) sin ningún error en los tres workspaces (`@scienpay/shared`, `@scienpay/api`, `@scienpay/web`).
  - Compilación de producción exitosa (`npm run build`) para todas las aplicaciones y paquetes.
  - Generador de PDF institucional con desglose de imputaciones FIFO y firmas legales.
- **Cambios Manuales Realizados y Motivo:**
  - Se instaló la librería `pdfkit` y `@types/pdfkit` en `@scienpay/api` para generar documentos PDF en backend como stream binario inmutable sin requerir dependencias pesadas de navegadores headless.

#### Sesión 11: Normalización de Entorno, Compatibilidad Multiplataforma y Preparación para Carga a GitHub
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Realizar la verificación de compatibilidad e higiene del repositorio antes de la publicación a las ramas remotas de GitHub (`feature/frontend-responsive`, `develop`, etc.), eliminando assets redundantes con espacios en raíz, normalizando saltos de línea LF y asegurando la disponibilidad de esquemas SQL en la etapa de empaquetado de producción y contenedores Docker.
- **Resultado Obtenido:**
  - Creación de `.gitattributes` para forzar terminaciones LF en scripts `.sh`, esquemas SQL y archivos Docker en entornos Windows/Linux/macOS.
  - Eliminación del archivo binario redundante con espacios en la raíz (`logo web.jpg`), conservando el imagotipo optimizado dentro de `apps/web/public/logo.jpg`.
  - Actualización del script `build` en `apps/api/package.json` y del `Dockerfile` para asegurar que las migraciones SQL se sincronicen automáticamente en `dist/infrastructure/database/migrations` en cualquier entorno de ejecución compilado.
  - Verificación exitosa de la suite completa: 56 pruebas pasando, 0 errores de typecheck, 100% build exitoso.
- **Cambios Manuales Realizados y Motivo:**
  - Se añadió fallback dinámico de resolución de rutas en `migrate.ts` para permitir la ejecución tanto directa desde TypeScript (`tsx src/...`) como desde JavaScript empaquetado (`node dist/...`).

#### Sesión 12: Orquestación de Compilación de Contratos Compartidos en CI
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Diagnosticar y resolver el error de verificación de tipos (`TS2307: Cannot find module '@scienpay/shared'`) en el pipeline de GitHub Actions durante entornos de ejecución efímeros limpios.
- **Resultado Obtenido:**
  - Identificación de la causa raíz: en entornos efímeros sin compilación previa, `packages/shared/dist/index.d.ts` no existía al invocar `tsc --noEmit` en `apps/api`.
  - Actualización de los scripts raíz en `package.json` (`build:shared`, `typecheck`, `test`) para garantizar la compilación previa de `@scienpay/shared`.
  - Incorporación del paso explícito `Compilar contratos compartidos (@scienpay/shared)` en el pipeline `.github/workflows/ci.yml` inmediatamente posterior a `npm ci`.
  - Validación local simulando runner limpio: eliminación de `dist` y ejecución exitosa de `typecheck` y `test` en verde.
- **Cambios Manuales Realizados y Motivo:**
  - No se modificó ningún algoritmo financiero ni regla de negocio; el cambio se limitó estrictamente a la orquestación del proceso de compilación TypeScript en el monorepo.

#### Sesión 13: Navegación por Historial del Navegador, Modal de Salida, Tarjetas Clickeables y Modo Oscuro/Sistema
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Reestructurar la navegación de la SPA para admitir historial nativo del navegador (adelante/atrás mediante evento `popstate`), interceptar el retroceso hacia la pantalla de acceso con un cuadro de diálogo de confirmación ("¿Está seguro de cerrar sesión?"), hacer las tarjetas del modo Generador interactivas con modal de detalles expandidos, e implementar un selector de tema (Claro / Oscuro / Sistema) con colorimetría y persistencia.
- **Resultado Obtenido:**
  - `ThemeContext` y `ThemeToggle` con soporte para `'light'`, `'dark'` y `'system'` (`prefers-color-scheme`), persistencia en `localStorage` y configuración `darkMode: 'class'` en Tailwind.
  - Sincronización del historial del navegador en `App.tsx` con `window.history.pushState` y escucha de `popstate`.
  - Cuadro de diálogo modal institucional de confirmación ante retroceso hacia el login o al pulsar "Cerrar Sesión".
  - `ItemDetailModal` integrado en `GeneratorView` para desplegar detalles completos de proyectos, asignaciones y solicitudes al hacer clic en las tarjetas.
  - Adaptación completa de todas las vistas (`NotionLogin`, `NotionSidebar`, `AdminView`, `GeneratorView`, `ReceptorView`) a la paleta Notion Dark (`#191919`, `#202020`, `#2F2F2F`, `#FFFFFF`).
  - Suite completa validada: 56 tests pasando al 100%, 0 errores de typecheck en monorepo y build de producción exitoso.
- **Cambios Manuales Realizados y Motivo:**
  - Se configuró la intercepción de `popstate` reponiendo el estado en el historial antes de desplegar el modal de confirmación, evitando que el navegador abandone la aplicación sin la debida confirmación del usuario.

#### Sesión 14: Despliegue en la Nube (Fly.io), Clúster PostgreSQL y Contenedorización Fullstack
- **Fecha:** 6 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Configurar y ejecutar el despliegue del sistema Scienpay en la infraestructura cloud de Fly.io dentro del plan gratuito (sin tarjeta bancaria requerida), integrando la base de datos PostgreSQL gestionada, secretos de producción, contenedorización multi-etapa y disponibilidad pública para la presentación y demostración del proyecto.
- **Resultado Obtenido:**
  - `Dockerfile` multi-stage optimizado que compila los 3 paquetes (`@scienpay/shared`, `@scienpay/api`, `@scienpay/web`) y genera un runner ligero en `node:20-slim` (imagen de 102 MB).
  - Configuración de hosting estático unificado en `apps/api/src/main.ts` para servir la SPA de React desde la raíz `/` y la API en `/api/v1` en una única máquina eficiente.
  - Creación y vinculación del clúster PostgreSQL en Fly.io (`scienpay-db`) a la aplicación (`scienpay-app`), inyectando de forma segura `DATABASE_URL` y variables de entorno (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `COOKIE_SECRET`).
  - Control de idempotencia en `apps/api/src/infrastructure/database/seed.ts` para evitar fallos por inserción duplicada en reinicios del contenedor.
  - Ejecución automática de migraciones y seeds en el arranque del contenedor mediante `apps/api/package.json`.
  - Despliegue exitoso verificado en vivo en `https://scienpay-app.fly.dev` con endpoint de salud `https://scienpay-app.fly.dev/api/v1/health` retornando estado `ok`.
- **Cambios Manuales Realizados y Motivo:**
  - Se unificó el servicio de la SPA dentro de NestJS para no requerir un segundo servicio o máquina virtual separada en la nube, optimizando recursos y garantizando latencia cero entre cliente y servidor.

#### Sesión 15: Ejecución Controlada de Fases 1–3 del Plan de Completitud (rama `plan/execution-tracking`)
- **Fecha:** 7 de Noviembre de 2026
- **Herramienta de análisis y planificación:** Nemotron 3 Ultra (Free) vía OpenRouter, ejecutado en OpenCode.
- **Herramienta de ejecución:** DeepSeek V4.1 Flash Free vía OpenCode Zen.
- **Objetivo del Prompt:** Ejecutar únicamente las Fases 1, 2 y 3 del plan de completitud de Scienpay, sin tocar `main` ni iniciar las Fases 4 y 5. Mantener `docs/HANDOFF.md` como especificación viva y registrar cada decisión, hallazgo y validación en `docs/avances.md`, `docs/bitacora_ia.md`, `docs/uso-de-ia.md` y `docs/decisiones/`.
- **Resultado Obtenido (Fase 1):**
  - Migración `0002` con triggers de inmutabilidad por columna y contador transaccional de recibos `receipt_sequences` / `next_receipt_number(year)`.
  - Motor `FinancialImmutabilityEngine` ampliado con `CAUSATION_ITEM_MUTABLE_COLUMNS`, `CAUSATION_BATCH_MUTABLE_COLUMNS` y DDL de la secuencia transaccional.
  - Autenticación con identificador único (`username` o `email`), refresh rotativo con `jti`, detección de replay, revocación de familia y rate limiting de 5 intentos/minuto por IP.
  - `ZodExceptionFilter` global y `ZodValidationPipe` reutilizable aplicados a 9 controladores; el login conserva `safeParse` para responder 401.
  - Anulación formal de causación con `CausationAnnulmentPolicy`, endpoint `POST /causation/batches/:id/annul`, auditoría transaccional y validaciones de lote/proyecto/monto en la creación de solicitudes.
  - Suite backend: **72/72 tests** pasando; `typecheck` sin errores en `@scienpay/shared` y `@scienpay/api`.
- **Cambios Manuales Realizados y Motivo:**
  - Se añadió `jwtid` aleatorio a los refresh tokens porque dos emisiones en el mismo segundo generaban tokens idénticos y la rotación no invalidaba el anterior.
  - Se ajustaron los tests de inmutabilidad para verificar la lista negra de columnas (inmutables presentes, mutables ausentes), que es el mecanismo real del trigger.
  - Se extrajo la política de anulación a una clase pura de dominio para poder probarla sin PostgreSQL, dado que Docker no está disponible en el entorno de ejecución.
  - No se ejecutaron tests de integración contra PostgreSQL por ausencia de Docker; la limitación quedó registrada en `docs/HANDOFF.md`.
- **Resultado Obtenido (Fase 2):**
  - `PettyCashService` reescrito con consultas GET, validaciones de existencia y pertenencia, transacciones, bloqueo `FOR UPDATE` y numeración de vales `next_voucher_number(year)`; cierre bloqueado con vales pendientes.
  - Migración `0003` con `voucher_sequences` y el índice parcial de idempotencia que permite regenerar lotes anulados.
  - `AuditService.listLogs` con filtros combinados, paginación y contrato `auditQuerySchema`.
  - `PdfReceiptGenerator.generatePaymentRequestPdf` y endpoint `GET /payment-requests/:id/pdf`.
  - `FIFOAllocationEngine` con desempate determinista por ID y `registerDisbursement` transaccional con bloqueo, filtro por proyecto y validación de total.
  - Suite backend: **87/87 tests** pasando; typecheck de API/shared/web y build de API correctos.
- **Cambios Manuales Realizados y Motivo (Fase 2):**
  - Se corrigió la nota previa de HANDOFF sobre el índice de idempotencia: la restricción sí existía en `0001`; la migración `0003` la reemplaza por un índice parcial para permitir regenerar períodos anulados sin perder idempotencia entre lotes activos.
  - Se ordenó el bloqueo período→vale en desembolso y rendición para evitar interbloqueos entre transacciones concurrentes.
  - Se recalculan las cifras del PDF de solicitud desde la BD al generar el documento, para reflejar el estado real y no una foto potencialmente desactualizada.
- **Resultado Obtenido (Fase 3):**
  - Frontend conectado a la API real: `apiClient` con token en memoria, `credentials: 'include'`, refresh/retry en 401 y descargas autenticadas; `queryClient` de TanStack Query.
  - `AuthContext` con restauración de sesión, refresh programado, deduplicación de refresh concurrente y logout; `App.tsx` con pantalla de carga, navegación por rol e historial.
  - 10 módulos de hooks por dominio y 12 formularios de dominio RHF+Zod (más el login) que reutilizan los schemas de `@scienpay/shared`.
  - `AdminView`, `GeneratorView` y `ReceptorView` operativas con datos reales, mutaciones, toasts y estados de carga/error/vacío.
  - Descarga real de PDF de solicitud y de recibo; cierre de solicitudes entregadas desde la bandeja del receptor.
  - Eliminación de `apps/web/src/data/mockData.ts` y `apps/web/src/types/app.types.ts`; no quedan mocks en producción.
  - Verificación: `npm run typecheck --workspace=@scienpay/web` sin errores, `npm run build --workspace=@scienpay/web` exitoso y **87/87 tests** de API pasando.
- **Cambios Manuales Realizados y Motivo (Fase 3):**
  - Se implementó `lib/zodResolver.ts` en lugar de instalar `@hookform/resolvers`, que no está disponible en el workspace; se mantiene la misma interfaz para poder sustituirlo sin tocar los formularios.
  - Se deduplicó el refresh con una promesa module-level porque React StrictMode monta el efecto dos veces y el segundo refresh con el mismo token era interpretado como replay por el backend.
  - Se usó `initializedUserId` (ref) en `App.tsx` para que el refresco de `/auth/me` no reinicie la pestaña activa del usuario.
  - Se calculan los montos del desembolso en centavos para que la suma coincida exactamente con la validación `Decimal` del backend.
  - Se documentó que la deuda mostrada en el desembolso corresponde solo al lote de la solicitud, mientras el FIFO del backend abarca todas las causaciones pendientes del proyecto.
  - En la sesión de Fase 3 no se ejecutaron pruebas automatizadas de componentes; la integración con PostgreSQL se verificó después, en la Sesión 16 (158/158 PASS).

#### Sesión 16: Verificación final de Fases 1-3
- **Fecha:** 9 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / OpenCode
- **Objetivo:** Verificar que las Fases 1-3 estén completas, confirmar la integración con PostgreSQL aislado y dejar constancia del estado final.
- **Resultado Obtenido:**
  - Fases 1-3 completadas y verificadas (17/17 tareas).
  - Integración con el contenedor aislado `scienpay_verify_db` (puerto 55432): **158/158 PASS** (corrida del 2026-11-08).
  - Backend: 87/87 tests; typecheck y build de API, shared y web sin errores (reverificados el 2026-11-09).
  - Documentación final actualizada en `HANDOFF.md`, `avances.md` y `bitacora_ia.md`.
  - Sin tareas pendientes ni bloqueos dentro del alcance.

> Nota: la reejecución de la suite de integración se completó el 2026-11-09 con Docker Desktop disponible; el resultado se registra en la Sesión 17.

#### Sesión 17: Reejecución de la suite de integración
- **Fecha:** 9 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / OpenCode
- **Objetivo:** Reejecutar la suite end-to-end contra PostgreSQL aislado con Docker Desktop disponible y confirmar que el resultado 158/158 se mantiene.
- **Entorno:**
  - Contenedor `scienpay_verify_db` (PostgreSQL 16 Alpine, puerto `55432`) iniciado desde el volumen de verificación existente.
  - Las 3 migraciones se aplicaron de forma idempotente; el seed se omitió porque la base ya contenía usuarios sembrados.
  - API compilada (`apps/api/dist/main.js`) arrancada con `DATABASE_URL` apuntando al puerto `55432`.
- **Resultado Obtenido:**
  - **158/158 PASS, 0 FAIL** en la suite de integración (health, autenticación/refresh/replay, RBAC, catálogos, causación, solicitudes/cuatro ojos, FIFO, recibos/PDF, anulación/regeneración, auditoría, caja chica, usuarios, rate limit, logout y UUID inválidos).
  - El proceso de API usado para la verificación se detuvo al finalizar.
  - Documentación actualizada para sustituir la limitación previa por la reejecución exitosa.

#### Sesión 18: Redefinición de las Fases 4 y 5
- **Fecha:** 10 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / OpenCode
- **Objetivo:** Reemplazar la declaración de “fuera de alcance” por un plan de Fases 4 y 5 ajustado al estado real del repositorio.
- **Hallazgos:**
  - El `HANDOFF.md` versionado solo contenía las etiquetas de Fase 4 y 5, sin tareas ni criterios.
  - El plan original completo existía en `C:\Users\Usuario\.opencode\plan\HANDOFF.md`, fuera del repositorio.
  - La suite de 158 verificaciones vive en un script temporal fuera del repositorio y no corre en CI.
  - `apps/web` y `packages/shared` tienen tests placeholder (`exit 0`).
  - El CI no ejecuta `npm run lint` y ningún workspace define `lint`.
  - El seed declara los escenarios de la especificación, pero la caja chica no tiene un vale completo y no hay verificación automática.
  - `bitacora_ia.md` tenía dos sesiones duplicadas como 6 y 7; `uso-de-ia.md` solo llegaba a la sesión 5.
- **Resultado:**
  - Fase 4 redefinida en 6 tareas: suite de integración versionada, E2E con Playwright, stress FIFO, lint/CI, OpenAPI desde Zod y cierre de deuda técnica.
  - Fase 5 redefinida en 6 tareas: seed verificado, despliegue Docker Compose + Fly.io, manuales, bitácora IA, demo y defensa.
  - Se normalizó la numeración de sesiones (16 y 17) y se añadió la sesión 18.
  - Se actualizaron `HANDOFF.md`, `avances.md` y `uso-de-ia.md`; no se modificó `main`.


#### Sesión 19: Calidad, OpenAPI, deuda técnica e integración
- **Fecha:** 15 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / OpenCode
- **Objetivo:** Ejecutar las tareas 4.1, 4.3, 4.4, 4.5 y 4.6 del plan de Fase 4.
- **Resultado:**
  - ESLint flat config, Prettier y scripts de lint/formato; CI con pasos bloqueantes y ADR-008.
  - OpenAPI generado desde Zod en `/api/docs` y `/api/docs.json`, con test de contrato.
  - Migración `0005` para numeración transaccional de solicitudes y persistencia de `notes`.
  - Tests frontend reales con Vitest/RTL (10 pruebas) y eliminación del placeholder.
  - Infraestructura de integración versionada: Docker Compose de pruebas, runner, helpers y suites por dominio; job de CI con PostgreSQL 16.
  - Test de concurrencia FIFO con 20 desembolsos paralelos y 10 repeticiones.
- **Verificación:** typecheck sin errores, 98/98 tests de API, 10/10 tests web, lint y formato correctos.
- **Limitación inicial:** Docker no estaba disponible localmente; la suite se validó después en la Sesión 20.

#### Sesión 20: Ejecución real de la integración y cierre de Fase 4
- **Fecha:** 15 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / OpenCode
- **Objetivo:** Levantar PostgreSQL de pruebas, ejecutar la suite versionada, implementar Playwright/E2E y verificar las tareas 4.1, 4.2 y 4.3.
- **Resultado:**
  - Docker 28.4.0 disponible; `docker-compose.test.yml` levantó PostgreSQL 16 en `55432` con estado `healthy`.
  - `npm run test:integration` ejecutó migraciones, seed, API compilada y seis suites: **13/13 tests PASS, 0 FAIL** en 20.4 s.
  - La prueba de concurrencia FIFO (20 desembolsos × 10 repeticiones) pasó en 19.8 s sin sobrepago, saldos negativos ni descuadres SQL.
  - Playwright configurado en `apps/web/playwright.config.ts` con API en `4300`, Vite en `5173`, PostgreSQL de pruebas y bypass de rate limit solo en entorno no productivo. Seis pruebas E2E: **6/6 PASS** en 25.1 s.
  - Se agregó el job `e2e` al CI con PostgreSQL 16, Chromium y publicación del reporte ante fallos.
  - Correcciones: resolución directa de `tsx` para Windows, labels accesibles en el login, expectativa 201 en preview de causación, contraseña inválida con longitud válida y lectura de respuestas binarias antes de consumir el cuerpo.
- **Verificación:** 13/13 integración, 6/6 E2E, 98/98 API, 10/10 web, typecheck, lint y formato.
- **Estado:** Fase 4 completada y cerrada satisfactoriamente.

#### Sesión 21: Fase 5 - OpenAPI Integral, Auditoría Transaccional, Administración de Usuarios y Arquitectura Serverless
- **Fecha:** 16 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Extender la trazabilidad del sistema completando la auditoría append-only en todas las mutaciones financieras y administrativas; generar la especificación OpenAPI 3.0 formal mapeada desde los contratos Zod compartidos mediante `@asteasolutions/zod-to-openapi` servida en `/api/docs` y `/api/docs.json`; implementar la gestión administrativa completa de usuarios (desactivación/reactivación lógica, mutación controlada de roles y reseteo de claves con hash Argon2id bajo la migración `0004_user_deactivation_and_audit_indexes.sql`); y reestructurar el backend para soportar empaquetado dual (servidor HTTP standalone y función Serverless en Vercel vía `apps/api/src/serverless.ts` y `api/[...path].mjs`).
- **Resultado Obtenido:**
  - Especificación OpenAPI 3.0 con 43 rutas, esquemas de entrada/salida tipados, respuestas HTTP canónicas y seguridad Bearer JWT documentada.
  - Módulo de administración de usuarios en `UsersController` y `UsersService` con filtros de seguridad, auditoría transaccional de cambios de privilegios y migración `0004` con índices optimizados en `audit_log`.
  - Módulo Serverless en `apps/api/src/serverless.ts` que instancia y almacena en caché la aplicación NestJS/Express entre invocaciones en caliente para mitigar cold starts en Vercel Functions.
  - Siembra de datos (`seed.ts`) robustecida con arrastre de saldos de cajas chicas y soporte idempotente para ejecución en frío.
- **Cambios Manuales Realizados y Motivo:**
  - Se implementó un singleton en memoria para el servidor NestJS en modo serverless (`cachedApp`), garantizando que la conexión a la base de datos y la inicialización de módulos solo ocurran durante el primer arranque del contenedor efímero.

#### Sesión 22: Infraestructura Cloud Serverless (Vercel), Compatibilidad Vercel Postgres, Auto-Siembra y Skew Protection
- **Fecha:** 16 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Migrar la estrategia de despliegue desde máquinas virtuales monolíticas de Fly.io hacia una arquitectura Cloud Serverless en Vercel de alta disponibilidad y latencia reducida. Configurar `vercel.json` con multi-service routing (`api` y `web`), soportar cadenas de conexión nativas de Vercel Postgres (`POSTGRES_URL` con `sslmode=require`), implementar auto-detección y siembra automática (`ensureDatabaseSeeded`) para bases de datos recién aprovisionadas, habilitar Skew Protection para garantizar concordancia atómica entre el frontend compilado y las lambdas API, y resolver omisiones del compilador TypeScript (`tsc`) blindando `installCommand` para retener `devDependencies`.
- **Resultado Obtenido:**
  - Configuración consolidada en `vercel.json` con runner personalizado (`apps/api/scripts/vercel-runner.mjs`), `installCommand: "npm ci --include=dev"` y protección contra sesgo de despliegue (`skewProtection: true`).
  - Capa de abstracción de base de datos en `connection.ts` compatible con variables de entorno de Vercel Postgres (`POSTGRES_URL`), pool de conexiones SSL optimizado para funciones serverless y ejecución automática de migraciones/seed si no existen registros.
  - Archivo `.npmrc` configurado con `loglevel=error` para suprimir advertencias innecesarias de empaquetado en los registros de despliegue de Vercel.
  - Purga de seguridad: exclusión estricta de variables `.env.local` y eliminación de cualquier credencial residual del empaquetado del cliente.
- **Cambios Manuales Realizados y Motivo:**
  - Se configuró el flag `--include=dev` en la fase de instalación de Vercel debido a que Vercel por defecto descarta `devDependencies` cuando detecta entornos de producción, lo que provocaba la falla de compilación de los paquetes TypeScript (`tsc`) del monorepo.

#### Sesión 23: Panel Demo 1-Click con Roles Institucionales y Blindaje de Selectores E2E en Playwright
- **Fecha:** 16 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer
- **Objetivo del Prompt:** Diseñar e integrar un panel de acceso rápido para demostración académica ("Demo 1-Click") en `NotionLogin.tsx` con botones preconfigurados para los tres roles operativos (Administrador, Generador, Receptor), exponiendo visualmente las credenciales institucionales y ejecutando el login de forma desatendida. Calibrar los umbrales de rate limiting para evitar bloqueos durante revisiones docentes y resolver colisiones de selectores en la suite de pruebas E2E de Playwright.
- **Resultado Obtenido:**
  - Panel interactivo en la tarjeta de login con badges semánticos por rol y botón de acceso directo que despacha el formulario automáticamente.
  - Ajuste en `auth.controller.ts` para que los límites de intentos fallidos permitan la fluidez de la presentación académica sin comprometer la política de seguridad central.
  - Refactorización de selectores en `apps/web/e2e/helpers.ts` utilizando coincidencia exacta `{ exact: true }` y diferenciación de etiquetas semánticas (`aria-label="Acceso rápido como [Rol]"` y texto 'Acceder' vs 'Ingresar'), logrando la ejecución impecable de las 6 pruebas E2E (6/6 PASS).
- **Cambios Manuales Realizados y Motivo:**
  - Se desacopló el texto accesible del botón de inicio de sesión estándar del botón de acceso demo para evitar que el localizador `getByRole('button', { name: 'Ingresar' })` de Playwright encontrara múltiples nodos coincidentes en el DOM.

#### Sesión 24: Rectificación UI Mobile-First, Accesibilidad WCAG y Aplicación de la Skill `modern-web-guidance`
- **Fecha:** 16 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / Antigravity Agentic Senior Software Engineer apoyado por la skill `modern-web-guidance`
- **Objetivo del Prompt:** Ejecutar una auditoría exhaustiva y refactorización técnica de la interfaz web para garantizar una arquitectura estrictamente Mobile-First y cumplimiento de estándares de accesibilidad WCAG 2.1/2.2, apoyándose metodológicamente en las directrices de la skill `modern-web-guidance`. Implementar el patrón `navigation-drawer` accesible en `NotionSidebar.tsx` con manejo de tecla `Escape`, backdrop overlay translúcido con light dismiss y bloqueo de scroll; adaptar la barra superior (`header`) en `App.tsx` con botón de menú hamburguesa accesible (`aria-expanded`, `aria-controls`); incorporar reglas CSS para touch targets de 44px en dispositivos táctiles (`@media (pointer: coarse)`) y medios fluidos (`max-inline-size: 100%`); y transformar el componente `ThemeToggle` en un grupo accesible (`role="group"`, `aria-pressed`, `aria-label`).
- **Resultado Obtenido:**
  - Adopción integral de las recomendaciones de `modern-web-guidance` (`navigation-drawer.md`, `light-dismiss-a-dialog.md`, `accessibility.md`, `css-layout.md` y `dark-mode.md`).
  - Navegación móvil perfeccionada: la barra lateral conmuta fluidamente entre Drawer off-canvas flotante en pantallas pequeñas (< 768px) y barra colapsable de espacio de trabajo en pantallas grandes, sincronizando el estado con el evento `resize` del viewport.
  - Barra superior responsive con botón hamburguesa accesible, min-size de 44x44px en controles táctiles, logotipo adaptativo FACYT/UC y migas de pan con truncado inteligente.
  - Inclusión de variables CSS en `apps/web/src/index.css`: `--target-size: 24px` escalada a `44px` en punteros táctiles, `overflow-wrap: break-word` y normalización de contenedores multimedia.
  - Selector de temas accesible (`ThemeToggle`) estructurado como grupo ARIA con retroalimentación de estado (`aria-pressed`), adaptable en modo compacto para la barra lateral y expandido en login móvil.
  - Formateo estricto del código frontend validado con Prettier (`npm run format:check` 100% exitoso) y suite de pruebas frontend y backend sin regresiones.
- **Cambios Manuales Realizados y Motivo:**
  - Se mantuvo la sincronización del listener de teclado `Escape` directamente en `App.tsx` para cerrar el drawer móvil sin requerir dependencias externas de manejo de foco, garantizando que el usuario pueda salir de la navegación modal con teclado físico o gestos de retroceso estándar.
