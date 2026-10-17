# ADR-001: Selección del Stack Tecnológico, Monorepo y Persistencia

## Estado
Aceptado

## Contexto
El sistema **Scienpay** gestiona flujos financieros sensibles (causación, pagos, recibos con correlativo estricto y cajas chicas) entre tres roles clave (`ADMIN`, `GENERADOR`, `RECEPTOR`). Se requiere una arquitectura cliente-servidor con estricta separación de capas (Presentación → Aplicación → Dominio → Infraestructura), tipado estático end-to-end, validación centralizada de contratos y la capacidad de ejecutar reglas avanzadas en PostgreSQL 16+ (triggers de inmutabilidad, índices de exclusión y secuencias atómicas).

## Decisión
Se decide estructurar el proyecto como un **Monorepo** administrado mediante **npm workspaces**:
1. **`apps/api` (Backend):** Node.js 20+ LTS con **NestJS** y TypeScript. NestJS ofrece inyección de dependencias robusta, soporte nativo de Guards para RBAC, interceptores de auditoría y arquitectura modular por dominios.
2. **`apps/web` (Frontend):** **React 18+** con **Vite**, **TypeScript** y **Tailwind CSS**. Manejo del estado del servidor mediante **TanStack Query (React Query)** y formularios reactivos con **React Hook Form** + validación Zod.
3. **`packages/shared`:** Paquete común de tipos TypeScript, contratos de datos, enums y esquemas **Zod** compartidos entre frontend y backend para garantizar consistencia bidireccional en las fronteras.
4. **Base de Datos y ORM:** **PostgreSQL 16+** con **Drizzle ORM**. Se prefiere Drizzle sobre Prisma porque Drizzle mantiene compatibilidad directa y sin fricciones con SQL nativo para crear secuencias correlativas sin huecos (`CREATE SEQUENCE`), triggers de inmutabilidad (`BEFORE UPDATE OR DELETE`) y extensiones PostgreSQL como `btree_gist`, manteniendo máxima ligereza en runtime y tipado inferido estricto.
5. **Contenedorización:** **Docker Compose** para orquestar los servicios `web`, `api`, `db` (PostgreSQL 16) y un proxy inverso Nginx con TLS simulado.

## Consecuencias
### Positivas
- Se elimina la duplicación de esquemas de validación entre cliente y servidor.
- Garantía de tipado seguro desde la base de datos hasta los componentes de interfaz.
- Facilidad para levantar todo el ecosistema con un solo comando (`docker compose up`).
- SQL de alto rendimiento y control total sobre triggers y restricciones a nivel de motor.

### Negativas / Mitigaciones
- Requiere configuración cuidadosa de las rutas de build y referencias de TypeScript en el monorepo.
