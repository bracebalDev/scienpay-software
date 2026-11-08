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
