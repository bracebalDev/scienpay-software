# ADR-006: Estrategia de Ciberseguridad, Autenticación y Segregación Cuatro Ojos

## Estado
Aceptado

## Contexto
Scienpay maneja fondos financieros en USD y asignaciones para proyectos de investigación. Requiere salvaguardas avanzadas contra accesos no autorizados, escalación de privilegios, inyección de datos y colusión interna (fraude), tomando como referencia las directrices de OWASP ASVS Nivel 2 y OWASP Top 10.

## Decisión
1. **Hashing de Contraseñas:** Se utiliza **Argon2id** con configuración de memoria de 64 MB, 3 iteraciones y paralelismo 4. Prohibido texto plano y logueo de credenciales.
2. **Ciclo de Sesión Híbrido:**
   - **Access Token JWT:** Vida corta ($\le 15$ minutos), firmado digitalmente, portando `userId`, `email` y `role`.
   - **Refresh Token Rotativo:** Vida de 7 días, persistido en base de datos con `family_id` y hash SHA-256, entregado al navegador exclusivamente mediante cookie `HttpOnly`, `Secure`, `SameSite=Strict` y `Path=/api/v1/auth`. Cada uso genera un nuevo refresh token; si se detecta uso de un token revocado, se revoca inmediatamente toda la familia de sesiones activas.
3. **Segregación de Funciones y Regla de Cuatro Ojos:**
   - Los roles `ADMIN`, `GENERADOR` y `RECEPTOR` tienen responsabilidades mutuamente excluyentes validadas en Guards de NestJS en backend.
   - Ningún usuario puede aprobar solicitudes creadas por él mismo (`created_by_user_id !== reviewer_user_id`), verificado tanto a nivel de servicio de aplicación como mediante restricción `CHECK` en PostgreSQL.
4. **Protección en Capas:**
   - Validación integral con esquemas Zod en todas las entradas (`body`, `params`, `query`).
   - Rate limiting diferenciado (5 intentos/min para login; 100 req/min general).
   - Prevención de inyección de fórmulas CSV mediante prefijo `'` a cualquier celda que inicie con `=`, `+`, `-`, `@`.
   - Helmet con Content-Security-Policy estricta y deshabilitación de `X-Powered-By`.

## Consecuencias
### Positivas
- Resiliencia comprobable frente a robo de sesiones, inyecciones y ataques de fuerza bruta.
- Cumplimiento de estándares bancarios e institucionales de segregación.

### Negativas / Mitigaciones
- Requiere manejo de CORS específico y credenciales activas (`credentials: 'include'`) en el cliente React/Vite.
