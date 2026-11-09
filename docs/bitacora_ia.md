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
  - En la sesión de Fase 3 no se ejecutaron pruebas automatizadas de componentes; la integración con PostgreSQL se verificó después, en la Sesión 6 (158/158 PASS).

#### Sesión 6: Verificación final de Fases 1-3
- **Fecha:** 9 de Noviembre de 2026
- **Herramienta:** Asistente de Codificación / OpenCode
- **Objetivo:** Verificar que las Fases 1-3 estén completas, confirmar la integración con PostgreSQL aislado y dejar constancia del estado final.
- **Resultado Obtenido:**
  - Fases 1-3 completadas y verificadas (17/17 tareas).
  - Integración con el contenedor aislado `scienpay_verify_db` (puerto 55432): **158/158 PASS** (corrida del 2026-11-08).
  - Backend: 87/87 tests; typecheck y build de API, shared y web sin errores (reverificados el 2026-11-09).
  - Documentación final actualizada en `HANDOFF.md`, `avances.md` y `bitacora_ia.md`.
  - Sin tareas pendientes ni bloqueos dentro del alcance.

> Nota: la reejecución de la suite de integración se completó el 2026-11-09 con Docker Desktop disponible; el resultado se registra en la Sesión 7.

#### Sesión 7: Reejecución de la suite de integración
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

