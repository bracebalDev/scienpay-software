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
