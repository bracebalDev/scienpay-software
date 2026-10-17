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

---

## 2. Decisiones Aceptadas vs. Rechazadas

| Identificador | Propuesta Asistida por IA | Decisión | Justificación / Ajuste Realizado |
|---|---|---|---|
| **DEC-IA-01** | Uso de arquitectura Monorepo con npm workspaces para alojar `apps/api`, `apps/web` y `packages/shared`. | **Aceptada** | Permite compartir tipos y esquemas de validación Zod sin duplicar código entre cliente y servidor. |
| **DEC-IA-02** | Selección de Drizzle ORM sobre Prisma. | **Aceptada** | Drizzle permite generar y ejecutar SQL nativo directo para triggers de inmutabilidad (`BEFORE UPDATE OR DELETE`), secuencias consecutivas sin huecos (`CREATE SEQUENCE`) e índices de exclusión (`btree_gist`), reduciendo el overhead en runtime. |
| **DEC-IA-03** | Cálculo de causaciones en memoria con flotantes y redondeo JavaScript nativo (`Math.round`). | **Rechazada** | En sistemas financieros está estrictamente prohibido el uso de flotantes binarios. Se adoptó `decimal.js` y `NUMERIC(14,2)` con política de redondeo bancario (*Half to Even*). |
| **DEC-IA-04** | Almacenamiento de refresh tokens en localStorage del navegador. | **Rechazada** | Inseguro frente a ataques XSS. Se implementó cookie `HttpOnly`, `Secure`, `SameSite=Strict` con rotación estricta y detección de reutilización por familia. |
| **DEC-IA-05** | Regla de cuatro ojos validada únicamente en el cliente deshabilitando botones. | **Rechazada** | La interfaz es fácilmente manipulable. La regla se impone estrictamente en el backend (`created_by_user_id !== reviewer_user_id`) y a nivel de restricción en base de datos. |

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
