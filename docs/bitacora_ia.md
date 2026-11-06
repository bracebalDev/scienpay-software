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
