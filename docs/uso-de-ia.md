# Bitácora de Uso de Inteligencia Artificial (docs/uso-de-ia.md)
## Sistema de Control de Pagos y Asignaciones - Scienpay

Este documento registra los prompts utilizados, las decisiones aceptadas y rechazadas, los bloques de código o modelos arquitectónicos generados con asistencia de Inteligencia Artificial, y las revisiones y validaciones humanas realizadas durante todo el ciclo de desarrollo de **Scienpay**, de acuerdo con las pautas de evaluación y defensa técnica del proyecto.

---

## 1. Registro Cronológico de Prompts e Interacciones

### Sesión 1: Fase 0 - Planificación y Arquitectura
- **Fecha:** Octubre 2026
- **Prompt Maestro de Entrada:**
  > "Eres un ingeniero de software senior especializado en sistemas financieros, arquitectura limpia y ciberseguridad. Vas a desarrollar Scienpay, un sistema web de control de pagos y asignaciones para una empresa que gestiona equipos de trabajo en proyectos de física, química y biología. Todo el código, la interfaz, los comentarios de dominio, la documentación y los mensajes de commit de usuario deben estar en español. [...] Antes de escribir código, realiza la Fase 0 completa: diagrama de arquitectura, modelo entidad-relación, endpoints por rol, máquina de estados y plan de ramas. Presenta todo en un artefacto revisable."
- **Objetivo del Prompt:** Generar el diseño global del sistema sin saltar a la implementación, estableciendo bases formales de arquitectura limpia, reglas financieras inmutables, modelo entidad-relación en PostgreSQL y matriz de control de acceso basada en roles (RBAC).
- **Herramientas de IA utilizadas:** Asistente de codificación y arquitectura avanzada.

### Sesión 2: Fase 1 - Setup, Despliegue Local Docker y Módulo de Autenticación
- **Fecha:** Octubre 2026
- **Prompts de Entrada:**
  > "Vamos a desplegar para verla en local"
  > "No se ha construido ningún contenedor, verifica que se esté haciendo y sube todos los cambios al repositorio en sus ramas respectivas"
  > "Verifica que el sistema posea un login que cumpla con los usuarios y sus diferentes modalidades de ingreso al mismo. Crea un documento privado con las credenciales (usuario y contraseña) de los siguientes roles de usuario para poder hacer las pruebas del sistema"
- **Objetivo del Prompt:** Levantar y verificar los servicios en Docker Desktop, crear el flujo de ramas git (`chore/setup-monorepo`, `chore/devops-docker-ci`, `develop`), proteger las credenciales en documentos privados excluidos por `.gitignore`, e implementar la interfaz de Login multifuncional con soporte para los 3 roles y segregación visual de funciones.
- **Herramientas de IA utilizadas:** Asistente de codificación y arquitectura avanzada.

### Sesión 3: Diseño Notion Workspace, Login Anti-Fuerza Bruta y Segregación Visual
- **Fecha:** Octubre 2026
- **Prompt de Entrada:**
  > "Vamos a proceder con la mejora de la interfaz, vamos a crear una vista similar a Notion, y un login. La tarjeta del login debe ir centrada, con los campos 'Usuario' y 'Contraseña', debes añadir un timer para evitar intentos fallidos de ingreso, una vez se equivoqué en el usuario o contraseña 3 veces debe esperar 5 minutos, un cuarto error bloquea el usuario y solo el administrador del sistema tiene acceso a él. Dependiendo del rol del usuario este tiene unas vistas específicas: Usuarios y Roles: El sistema debe manejar 3 roles con permisos específicos y segregación de funciones: a. Administrador del Sistema [...], b. Generador de Nómina [...], c. Receptor de Nómina [...]. Nota: Los beneficiarios (el personal que cobra) NO tendrán usuario en el sistema."
- **Objetivo del Prompt:** Crear una interfaz de usuario minimalista y elegante inspirada en Notion (Sidebar colapsable, estructura de espacio de trabajo, tablas de base de datos Notion), implementar tarjeta de Login centrada con campos explícitos "Usuario" y "Contraseña", temporizador de bloqueo de 5 minutos al 3er intento fallido con cronómetro reactivo y bloqueo permanente de cuenta al 4to error (con botón de desbloqueo exclusivo para el Administrador), y vistas operativas completas y segregadas para ADMIN, GENERADOR y RECEPTOR.
- **Herramientas de IA utilizadas:** Asistente de codificación y diseño de interfaces.

### Sesión 4: Identidad Visual Oficial (Favicon/Logo) y Bitácora de Avances para el Equipo
- **Fecha:** 17 de Octubre de 2026
- **Prompt de Entrada:**
  > "vamos a reemplazar el ícono de la web, con la imagen 'logo web.jpg' para así crear uniformidad en el sistema"
  > "Dame un resumen de todo lo que se ha hecho en el sistema. Lleva un archivo con los avances realizados con la fecha para que los compañeros puedan ir viendo los avances. Recuerda mantener bien la estructuras de las ramas del GitHub para un manejo profesional"
- **Objetivo del Prompt:** Incorporar el archivo de imagen oficial `logo web.jpg` en la aplicación web como favicon e imagotipo en componentes UI; documentar detalladamente el progreso del proyecto en un archivo fechado `docs/avances.md` para facilitar la trazabilidad y consulta por parte de los compañeros de equipo; y mantener la convención estricta de ramas en GitHub con Conventional Commits.
- **Herramientas de IA utilizadas:** Asistente de codificación, documentación y gestión de repositorios Git.

### Sesión 5: Ejecución Controlada de Fases 1–3 (rama `plan/execution-tracking`)
- **Fecha:** Noviembre 2026
- **Modelo de análisis y planificación:** Nemotron 3 Ultra (Free) vía OpenRouter en OpenCode.
- **Modelo de ejecución:** DeepSeek V4.1 Flash Free vía OpenCode Zen.
- **Prompt de Entrada:**
  > "Ejecuta únicamente las Fases 1, 2 y 3 del plan de completitud de Scienpay en la rama `plan/execution-tracking`. No toques `main`, no inicies las Fases 4 ni 5. Mantén `docs/HANDOFF.md` como especificación viva y documenta cada avance, decisión y validación en `docs/avances.md`, `docs/bitacora_ia.md`, `docs/uso-de-ia.md` y `docs/decisiones/`. Sin adivinanzas ni supuestos: toda decisión debe quedar documentada."
- **Objetivo del Prompt:** Completar las correcciones críticas de backend (Fase 1), los módulos backend faltantes (Fase 2) y la conexión real del frontend a la API (Fase 3), con verificación de typecheck, tests y build, commits atómicos y trazabilidad documental completa.
- **Herramientas de IA utilizadas:** Nemotron 3 Ultra (Free) para análisis/planificación y DeepSeek V4.1 Flash Free para ejecución, ambos en OpenCode.

### Sesión 6: Redefinición de las Fases 4 y 5
- **Fecha:** 10 de Noviembre de 2026
- **Prompt de Entrada:**
  > "Revisé el HANDOFF y no habla casi nada de lo que se tiene que hacer en las fases 4 y 5. O me equivoco?"
  > "Redefine según el estado actual"
- **Objetivo del Prompt:** Reemplazar la declaración de “fuera de alcance” por un plan de Fases 4 y 5 que parta del estado real del repositorio, sin atribuir trabajo no realizado ni asumir herramientas que no están instaladas.
- **Resultado:** Se definieron 6 tareas para la Fase 4 (suite de integración versionada, E2E con Playwright, stress FIFO, lint/CI, OpenAPI desde Zod y cierre de deuda técnica) y 6 para la Fase 5 (seed verificado, despliegue Docker Compose + Fly.io, manuales por rol, bitácora IA, demo y defensa). Se normalizó la numeración de sesiones y se actualizaron `HANDOFF.md` y `avances.md`.
- **Herramientas de IA utilizadas:** Asistente de Codificación / OpenCode.

### Sesión 7: Fase 4 - Aseguramiento de Calidad, OpenAPI, Deuda Técnica e Infraestructura de Integración
- **Fecha:** 15 de Noviembre de 2026
- **Prompt Técnico de Entrada:**
  > "Actúa como Ingeniero de Software Senior / Antigravity Agent. Implementa las tareas 4.1 a 4.6 del plan de Fase 4 en Scienpay: 1) Configura ESLint flat config (`eslint.config.mjs`) y Prettier con scripts de verificación y formateo que bloqueen el pipeline de CI ante fallos; 2) Genera la especificación completa OpenAPI 3.0 desde los esquemas Zod compartidos en `@scienpay/shared` utilizando `@asteasolutions/zod-to-openapi`, exponiendo los endpoints `/api/docs` y `/api/docs.json` con test de contrato automatizado; 3) Resuelve la deuda técnica pendiente implementando la migración `0005_request_sequences_and_notes.sql` para numeración correlativa transaccional de solicitudes (`request_sequences` / `next_request_number`) y persistencia de `notes`; 4) Implementa tests de frontend unitarios reales con Vitest, React Testing Library y jsdom (eliminando el placeholder `exit 0`); 5) Diseña la infraestructura versionada de pruebas de integración con `docker-compose.test.yml`, runner automatizado y suites por dominio; y 6) Diseña una prueba de estrés de concurrencia FIFO con 20 transacciones de desembolso simultáneas sobre la misma deuda repetidas 10 veces para auditar bloqueos `FOR UPDATE` y prevenir sobrepagos o descuadres."
- **Objetivo del Prompt:** Establecer un estándar riguroso de calidad técnica, formalizar la documentación de la API en OpenAPI sin duplicación de modelos, cerrar la deuda técnica de numeración atómica en solicitudes y blindar matemáticamente la concurrencia en la imputación de pagos antes del pase a producción.
- **Herramientas de IA utilizadas:** Asistente de codificación y arquitectura avanzada.

### Sesión 8: Fase 4 - Ejecución de Integración con Docker y Automatización E2E con Playwright
- **Fecha:** 15 de Noviembre de 2026
- **Prompt Técnico de Entrada:**
  > "Aprovisiona el contenedor PostgreSQL 16 aislado en el puerto 55432 con `docker-compose.test.yml` y ejecuta la suite completa de pruebas de integración versionada (`npm run test:integration`). Corrige cualquier discrepancia de ejecución en entorno Windows (compatibilidad de rutas en `tsx`), normaliza el bypass condicional de rate limit de login (`DISABLE_LOGIN_RATE_LIMIT`) restringido estrictamente a entornos no productivos, y valida la prueba de estrés FIFO. Posteriormente, configura Playwright E2E (`apps/web/playwright.config.ts`) contra la API compilada en el puerto 4300 y el bundle Vite en 5173; automatiza los flujos de login inválido, sesión persistente vía cookies HttpOnly, modal de confirmación de salida y recorridos por cada rol (ADMIN, GENERADOR, RECEPTOR). Integra el job `e2e` en GitHub Actions."
- **Objetivo del Prompt:** Validar de extremo a extremo el comportamiento real del sistema contra una instancia nativa de base de datos relacional y un navegador Chromium automatizado, confirmando que la lógica transaccional, las cookies seguras y la segregación de interfaces por rol funcionen sin fallos ni condiciones de carrera.
- **Herramientas de IA utilizadas:** Asistente de testing automatizado y DevOps.

### Sesión 9: Transición a Arquitectura Serverless en Vercel, Soporte Vercel Postgres y Auto-Siembra
- **Fecha:** 16 de Noviembre de 2026
- **Prompt Técnico de Entrada:**
  > "Reestructura la arquitectura de despliegue en la nube para migrar de Fly.io a la plataforma Serverless de Vercel. Configura `vercel.json` para orquestar la compilación estática de `@scienpay/web` y el empaquetado serverless de `@scienpay/api` mediante la función de entrada `api/[...path].mjs` y el handler optimizado `apps/api/src/serverless.ts` con instancia en caché. Adapta la capa de persistencia en `connection.ts` para reconocer de forma nativa variables de entorno de Vercel Postgres (`POSTGRES_URL`), forzando conexiones SSL seguras. Implementa una rutina de inicialización y auto-siembra (`ensureDatabaseSeeded`) que aplique migraciones y datos base (`seed.ts`) de manera idempotente si la base de datos remota está vacía. Habilita Vercel Skew Protection para garantizar coherencia entre chunks de cliente y handlers serverless, y blinda el `installCommand` con `npm ci --include=dev` para retener las dependencias de TypeScript necesarias durante el build."
- **Objetivo del Prompt:** Desplegar el sistema en una plataforma cloud elástica, de alta disponibilidad y sin costo de mantenimiento por máquinas virtuales ociosas, asegurando que la base de datos se auto-configure desde cero en el primer arranque y que los usuarios no experimenten desajustes de versiones en despliegues continuos.
- **Herramientas de IA utilizadas:** Asistente de arquitectura cloud y Serverless.

### Sesión 10: Optimización de Modo Demostración 1-Click y Blindaje de Selectores Playwright E2E
- **Fecha:** 16 de Noviembre de 2026
- **Prompt Técnico de Entrada:**
  > "Integra en la tarjeta de login (`NotionLogin.tsx`) un selector de perfiles de demostración rápida ('Demo 1-Click') que permita al evaluador acceder instantáneamente con los roles de Administrador, Generador y Receptor sin necesidad de escribir manualmente usuario y contraseña, visualizando las credenciales de prueba de forma transparente. Calibra los umbrales del rate limiter en `auth.controller.ts` para evitar que las pruebas de demostración sean bloqueadas. Resuelve la colisión de selectores en la suite de pruebas E2E de Playwright (`apps/web/e2e/helpers.ts`), especificando coincidencia exacta (`{ exact: true }`) y asignando atributos de accesibilidad diferenciados (`aria-label`) y copy semántico ('Acceder' en tarjetas demo vs 'Ingresar' en el botón del formulario principal), verificando que la suite E2E mantenga 6/6 tests exitosos."
- **Objetivo del Prompt:** Facilitar una experiencia de revisión y evaluación docente inmediata y sin fricciones durante la defensa del proyecto, blindando a la vez los localizadores de prueba de Playwright para evitar falsos positivos por ambigüedad semántica en el DOM.
- **Herramientas de IA utilizadas:** Asistente de UI/UX y testing E2E.

### Sesión 11: Auditoría UI Mobile-First, Accesibilidad Web y Adopción de la Skill `modern-web-guidance`
- **Fecha:** 16 de Noviembre de 2026
- **Prompt Técnico de Entrada:**
  > "Audita y refactoriza la interfaz de usuario de Scienpay para garantizar una experiencia responsive Mobile-First y cumplimiento de normas de accesibilidad web modernas (WCAG 2.1/2.2), consultando y aplicando rigurosamente los patrones y directrices de la skill `modern-web-guidance`. Implementa el patrón `navigation-drawer` en `NotionSidebar.tsx` con soporte para apertura/cierre reactivo, backdrop overlay translúcido con light dismiss, bloqueo de scroll en el documento y cierre mediante la tecla `Escape`; adapta el header en `App.tsx` con botón hamburguesa accesible (`aria-expanded`, `aria-controls="main-sidebar"`), logotipo adaptativo FACYT/UC y migas de pan con truncado semántico; define en `index.css` touch targets mínimos de 44px para dispositivos táctiles mediante `@media (pointer: coarse)` escalando la variable `--target-size`, asegura adaptación fluida de imágenes y videos (`max-inline-size: 100%`) y rotura de palabras (`overflow-wrap: break-word`); y optimiza el componente `ThemeToggle` estructurándolo con roles ARIA semánticos (`role="group"`, `aria-pressed`, `aria-label`) para su integración armónica tanto en la barra lateral como en la cabecera del login móvil. Valida el código con `npm run format:check` y `npm run typecheck`."
- **Objetivo del Prompt:** Transformar la interfaz de usuario de una visualización enfocada en escritorio a un sistema de diseño adaptable y accesible de grado profesional, siguiendo las mejores prácticas contemporáneas dictadas por la skill `modern-web-guidance` para garantizar una interacción fluida tanto en dispositivos móviles táctiles como en monitores de escritorio.
- **Herramientas de IA utilizadas:** Asistente senior frontend potenciado por la skill `modern-web-guidance`.

---

## 2. Decisiones Aceptadas vs. Rechazadas

| Identificador | Propuesta Asistida por IA | Decisión | Justificación / Ajuste Realizado |
|---|---|---|---|
| **DEC-IA-01** | Uso de arquitectura Monorepo con npm workspaces para alojar `apps/api`, `apps/web` y `packages/shared`. | **Aceptada** | Permite compartir tipos y esquemas de validación Zod sin duplicar código entre cliente y servidor. |
| **DEC-IA-02** | Selección de Drizzle ORM sobre Prisma. | **Aceptada** | Drizzle permite generar y ejecutar SQL nativo directo para triggers de inmutabilidad (`BEFORE UPDATE OR DELETE`), secuencias consecutivas sin huecos (`CREATE SEQUENCE`) e índices de exclusión (`btree_gist`), reduciendo el overhead en runtime. |
| **DEC-IA-03** | Cálculo de causaciones en memoria con flotantes y redondeo JavaScript nativo (`Math.round`). | **Rechazada** | En sistemas financieros está estrictamente prohibido el uso de flotantes binarios. Se adoptó `decimal.js` y `NUMERIC(14,2)` con política `ROUND_HALF_UP` (decisión unificada el 2026-11-07; ver ADR-002). |
| **DEC-IA-04** | Almacenamiento de refresh tokens en localStorage del navegador. | **Rechazada** | Inseguro frente a ataques XSS. Se implementó cookie `HttpOnly`, `Secure`, `SameSite=Strict` con rotación estricta y detección de reutilización por familia. |
| **DEC-IA-05** | Regla de cuatro ojos validada únicamente en el cliente deshabilitando botones. | **Rechazada** | La interfaz es fácilmente manipulable. La regla se impone estrictamente en el backend (`created_by_user_id !== reviewer_user_id`) y a nivel de restricción en base de datos. |
| **DEC-IA-06** | Mantener el redondeo bancario *Half to Even* documentado en ADR-002. | **Rechazada** | Todo el código financiero ya usa `ROUND_HALF_UP` y los tests documentan `10.125 → 10.13`. Se actualizó ADR-002 para eliminar la contradicción sin alterar resultados. |
| **DEC-IA-07** | Permitir `UPDATE` completo en `causation_items` y `causation_batches` para desbloquear pagos y anulaciones. | **Rechazada** | Se implementó una lista negra por columna: solo `paid_amount`, `remaining_debt` y `status` en ítems; solo campos de anulación en lotes. `DELETE` permanece bloqueado. |
| **DEC-IA-08** | Seguir usando `nextval('receipt_number_seq')` para numerar recibos. | **Rechazada** | `nextval` no es transaccional y deja huecos ante rollback. Se creó `receipt_sequences` + `next_receipt_number(year)` dentro de la transacción del desembolso. |
| **DEC-IA-09** | Login solo por correo electrónico. | **Rechazada** | El requisito funcional exige usuario o correo. `loginSchema` ahora usa `identifier` y el backend busca por `username` o `email`. |
| **DEC-IA-10** | Rate limiting con dependencia externa (`@nestjs/throttler`). | **Rechazada** | Se implementó `LoginRateLimiter` en memoria (5/min por IP) para no añadir dependencias; queda documentado que debe migrarse a un almacén compartido si se escala horizontalmente. |
| **DEC-IA-11** | Mantener `.parse()` disperso en los controladores. | **Rechazada** | Se creó `ZodValidationPipe` reutilizable y `ZodExceptionFilter` global; los schemas compartidos siguen siendo la única fuente de verdad. |
| **DEC-IA-12** | Permitir anular lotes de causación con solicitudes o pagos asociados. | **Rechazada** | `CausationAnnulmentPolicy` bloquea lotes inexistentes, ya anulados, con solicitudes o con pagos aplicados. La anulación es transaccional y genera auditoría `ANULACION_CAUSACION`. |
| **DEC-IA-13** | Ignorar `requestedAmount` y usar siempre el total causado del lote al crear una solicitud. | **Rechazada** | El contrato Zod ya expone `requestedAmount`; se usa como `totalAmountUSD` y se rechaza si excede el total causado del lote. |
| **DEC-IA-14** | Numerar vales de caja chica con `count + 1`. | **Rechazada** | Bajo concurrencia produce duplicados y deja huecos ante rollback. Se creó `voucher_sequences` + `next_voucher_number(year)` dentro de la transacción del vale. |
| **DEC-IA-15** | Mantener la restricción única de idempotencia de causaciones tal cual. | **Rechazada** | Impedía regenerar un lote para un período anulado. Se sustituyó por un índice único parcial que solo considera lotes activos (`status <> 'ANULADO'`). |
| **DEC-IA-16** | Cerrar períodos de caja chica con vales pendientes. | **Rechazada** | `closePeriod` bloquea el cierre si existen vales en `SOLICITADO`, `APROBADO` o `DESEMBOLSADO`, e informa cuáles bloquean. |
| **DEC-IA-17** | Filtrar causaciones FIFO solo por `personId`. | **Rechazada** | Se añadió join con `causation_batches` para filtrar por proyecto, se excluyen ítems anulados o sin deuda y se bloquean las filas con `FOR UPDATE`. |
| **DEC-IA-18** | Aplicar FIFO sin desempate cuando dos cuotas comparten fecha. | **Rechazada** | El motor ordena por `periodStartDate` y desempata por ID para que el resultado sea determinista y reproducible. |
| **DEC-IA-19** | Congelar las cifras del PDF de solicitud al momento de crearla. | **Rechazada** | El PDF se genera bajo demanda y recalcula causado/pagado/pendiente desde la BD para reflejar el estado real del lote. |
| **DEC-IA-20** | Exponer la auditoría sin paginación ni filtros. | **Rechazada** | `auditQuerySchema` valida filtros y paginación (máximo 200) y la respuesta incluye `total` y `totalPages`. |
| **DEC-IA-21** | Persistir el access token en `localStorage` para simplificar la sesión del frontend. | **Rechazada** | Expone el token a XSS. El access token vive en memoria y la sesión se restaura con el refresh token `HttpOnly` mediante `POST /auth/refresh`. |
| **DEC-IA-22** | Instalar `@hookform/resolvers` para integrar Zod con React Hook Form. | **Rechazada** | La dependencia no está disponible en el workspace. Se implementó `lib/zodResolver.ts` compatible con RHF y se documentó para poder sustituirlo si se instala más adelante. |
| **DEC-IA-23** | Mantener los mocks temporalmente mientras se conectan las vistas. | **Rechazada** | Se eliminaron `mockData.ts` y `app.types.ts`; todas las vistas y formularios consumen `/api/v1`. No se admite código mock en producción. |
| **DEC-IA-24** | Refrescar la sesión en cada 401 sin coordinación entre llamadas concurrentes. | **Rechazada** | React StrictMode duplica el efecto de montaje y dos refresh con el mismo token se interpretan como replay. Se deduplicó con una promesa module-level compartida. |
| **DEC-IA-25** | Limitar el monto del desembolso a la deuda del lote de la solicitud. | **Rechazada** | El backend aplica FIFO sobre todas las causaciones pendientes del beneficiario en el proyecto, no solo sobre el lote. El formulario muestra la deuda del lote y advierte que el alcance real es el proyecto. |
| **DEC-IA-26** | Renderizar las tres experiencias de rol desde un único componente monolítico. | **Rechazada** | Se separaron `AdminView`, `GeneratorView` y `ReceptorView`, cada una con sus hooks y mutaciones; `App.tsx` solo coordina la pestaña activa. |
| **DEC-IA-27** | Añadir una librería de portales para los modales. | **Rechazada** | Se mantiene un `Modal` propio con overlay fijo, sin dependencias adicionales y coherente con el sistema visual existente. |
| **DEC-IA-28** | Sumar los montos del desembolso con aritmética de coma flotante. | **Rechazada** | Se convierten a centavos antes de sumar y comparar para que el total coincida con la validación `Decimal` del backend y no se rechacen desembolsos válidos. |
| **DEC-IA-29** | Mantener las Fases 4 y 5 como “fuera de alcance” sin desglose de tareas. | **Rechazada** | El HANDOFF solo tenía etiquetas; se redefinieron 12 tareas ajustadas al estado real (suite externa 158/158, CI sin lint, tests placeholder, seed incompleto). |

---

## 3. Bloques Generados y Verificados

1. **Modelo Entidad-Relación y Triggers PL/pgSQL:**
   - *Generado:* Diagramas Mermaid, tablas relacionales con UUID v7, claves foráneas `ON DELETE RESTRICT` y funciones de disparo de inmutabilidad financiera.
   - *Revisión Humana:* Se verificó que ninguna tabla financiera (`disbursements`, `receipts`, `receipt_allocations`, `audit_log`) contenga sentencias `UPDATE` o `DELETE` permitidas.
2. **Máquina de Estados de Solicitudes y Pagos:**
   - *Generado:* Transiciones válidas `BORRADOR` → `ENVIADA` → `APROBADA`/`RECHAZADA` → `ENTREGADA` → `CERRADA`.
   - *Revisión Humana:* Se constató que cada transición genere una traza de auditoría append-only obligatoria.
3. **Setup de Monorepo y Docker:**
   - *Generado:* Configuración de workspaces, pipeline de CI en GitHub Actions y servicios docker-compose con proxy Nginx.
   - *Revisión Humana:* Se verificó que `.gitignore` excluya con rigor cualquier clave o archivo `.env`.
4. **Frontend real conectado a la API (Fase 3):**
   - *Generado:* `apiClient` con refresh/retry, `AuthContext` con deduplicación de refresh, 10 módulos de hooks TanStack Query, 12 formularios de dominio RHF+Zod (más el login), componentes UI reutilizables y las vistas `AdminView`, `GeneratorView` y `ReceptorView`.
   - *Revisión Humana:* Se verificó que no queden imports a `mockData.ts` ni a `app.types.ts`, que el access token no se persista en el navegador, que las mutaciones invaliden sus claves de caché y que `typecheck` y `build` del workspace web finalicen sin errores. La suite de API se mantuvo en 87/87.
5. **Infraestructura de Pruebas Versionada y Concurrencia FIFO (Fase 4):**
   - *Generado:* `docker-compose.test.yml`, runner automatizado `apps/api/scripts/run-integration.mjs`, suites por dominio con PostgreSQL 16 y prueba de estrés FIFO (20 desembolsos concurrentes × 10 iteraciones).
   - *Revisión Humana:* Se verificó mediante aserciones SQL que ningún desembolso sobrepasara la deuda insoluta, que los saldos remanentes no fueran negativos y que la numeración correlativa no sufriera huecos ni condiciones de carrera.
6. **Despliegue Cloud Serverless, Vercel Postgres y Auto-Siembra (Fase 5):**
   - *Generado:* `apps/api/src/serverless.ts`, `api/[...path].mjs`, configuración `vercel.json` con multi-service routing (`api` y `web`), integración nativa de `POSTGRES_URL` con SSL y rutina de inicialización desatendida (`ensureDatabaseSeeded`).
   - *Revisión Humana:* Se verificó la resiliencia ante arranques en frío (cold starts) reutilizando la instancia de NestJS en caché, la auto-siembra idempotente de datos demo y la activación de Skew Protection para evitar fallos de versiones entre cliente y servidor.
7. **Arquitectura UI Mobile-First y Accesibilidad con `modern-web-guidance`:**
   - *Generado:* Patrón `navigation-drawer` accesible en `NotionSidebar.tsx` con backdrop overlay translúcido, cierre por tecla `Escape`, adaptación responsive en `App.tsx` con botón hamburguesa accesible (`aria-expanded`, `aria-controls`), media query de puntero táctil (`@media (pointer: coarse)`) con targets mínimos de 44px, layout fluido y `ThemeToggle` estructurado con `role="group"` y `aria-pressed`.
   - *Revisión Humana:* Se validó la experiencia de uso en dispositivos móviles táctiles y de escritorio, el cumplimiento de WCAG 2.1/2.2 y la coherencia del diseño minimalista institucional FACYT/UC.

---

## 4. Decisiones de Calidad y CI (Fase 4)

| ID | Propuesta | Decisión | Justificación |
|---|---|---|---|
| **DEC-IA-30** | Mantener el script de integración temporal fuera del repositorio. | **Rechazada** | No es reproducible ni bloqueante. Se versionaron suites por dominio, un runner con migraciones/seed/arranque de API y un job de CI con PostgreSQL 16. |
| **DEC-IA-31** | Usar Testcontainers para la integración. | **Rechazada** | Requiere Docker-in-Docker en CI y arranque más lento. Se usó un servicio PostgreSQL 16 y `docker-compose.test.yml` para desarrollo local. |
| **DEC-IA-32** | Mantener el placeholder de tests del frontend. | **Rechazada** | Se añadieron Vitest, React Testing Library y jsdom con 10 pruebas reales sobre `apiClient`, `AuthContext`, `zodResolver` y `DisbursementForm`. |
| **DEC-IA-33** | Publicar Swagger con DTOs duplicados. | **Rechazada** | El documento OpenAPI se genera desde los schemas Zod compartidos con `@asteasolutions/zod-to-openapi`, sin duplicar contratos. |
| **DEC-IA-34** | Desactivar el rate limit de login globalmente para las pruebas. | **Rechazada** | El bypass `DISABLE_LOGIN_RATE_LIMIT` solo se aplica cuando `NODE_ENV !== 'production'`; la protección se mantiene intacta en producción y el comportamiento se prueba en integración. |
| **DEC-IA-35** | Parsear como texto todas las respuestas HTTP del helper de integración. | **Rechazada** | Las respuestas binarias (PDF) se devuelven como `Response` antes de consumir el cuerpo; los errores sí se leen como texto para conservar el mensaje. |
| **DEC-IA-36** | Mockear la API en las pruebas E2E para mayor velocidad. | **Rechazada** | Playwright levanta la API compilada y PostgreSQL reales en puertos aislados (`4300`/`5173`) con migraciones y seed, de modo que se validan sesión, cookies y RBAC de extremo a extremo. |
| **DEC-IA-37** | Localizar los campos del login por placeholder o posición. | **Rechazada** | Se añadieron `id`/`htmlFor` a los labels y las pruebas usan `getByLabel` con coincidencia exacta; además de estabilizar E2E, mejora la accesibilidad del formulario. |

---

## 5. Decisiones de Despliegue Cloud, Demostración y Frontend Moderno (Fase 5 / Vercel / UI)

| ID | Propuesta | Decisión | Justificación |
|---|---|---|---|
| **DEC-IA-38** | Migrar de contenedores monolíticos en Fly.io a arquitectura Serverless en Vercel con micro-monorepo. | **Aceptada** | Elimina costos de máquinas virtuales siempre encendidas, ofrece escalabilidad elástica automática y permite desplegar frontend estático y backend serverless bajo un mismo dominio institucional sin problemas de CORS ni latencia adicional. |
| **DEC-IA-39** | Exigir siembra manual por terminal en la base de datos de producción Vercel Postgres. | **Rechazada** | En entornos serverless efímeros no hay acceso a terminal interactiva. Se implementó auto-detección y siembra automática (`ensureDatabaseSeeded`) en el primer cold start si la base de datos está vacía, garantizando disponibilidad inmediata del sistema. |
| **DEC-IA-40** | Permitir despliegues continuos sin control de versiones concurrentes entre frontend y backend. | **Rechazada** | Provoca errores de mismatch entre chunks de frontend en caché del usuario y endpoints del backend recién desplegados. Se activó Vercel Skew Protection (`skewProtection: true`) para garantizar sincronización atómica. |
| **DEC-IA-41** | Mantener credenciales de demo ocultas o solo en documentación externa. | **Rechazada** | Genera fricción y demoras durante la defensa docente. Se implementó el panel Demo 1-Click en `NotionLogin` con roles visibles y autologin seguro, acelerando la evaluación de las tres perspectivas de usuario sin comprometer la seguridad. |
| **DEC-IA-42** | Implementar menús móviles basados en toggles CSS ad-hoc sin estándares de accesibilidad. | **Rechazada** | Viola normas WCAG. Se utilizó la skill `modern-web-guidance` para aplicar el patrón normativo `navigation-drawer` con soporte de tecla Escape, light dismiss mediante backdrop translúcido, bloqueo de scroll en el body y touch targets mínimos de 44px (`@media (pointer: coarse)`). |
| **DEC-IA-43** | Emplear botones simples sin atributos ARIA para la alternancia de temas Claro/Oscuro/Sistema. | **Rechazada** | Los lectores de pantalla no comunican el estado activo al usuario invidente o con baja visión. Se refactorizó `ThemeToggle` estructurado con `role="group"`, `aria-label="Selector de tema de color"` y atributos `aria-pressed` individuales por botón. |
