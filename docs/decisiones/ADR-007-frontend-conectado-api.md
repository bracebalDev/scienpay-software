# ADR-007: Frontend Conectado a la API, Sesión y Organización por Dominio

## Estado
Aceptado

## Contexto
La Fase 3 del plan de completitud exige sustituir por completo el frontend basado en mocks (`mockData.ts`, contraseñas en cliente y vistas estáticas) por una SPA que consuma la API real de Scienpay. La aplicación debe mantener la segregación de funciones por rol, restaurar la sesión sin persistir tokens sensibles, mostrar estados de carga/error/vacío y descargar documentos PDF autenticados.

El backend entrega el access token en el cuerpo de `/auth/login` y `/auth/refresh`, y el refresh token en una cookie `HttpOnly`, `Secure`, `SameSite=Strict`. La API usa el prefijo `/api/v1` y los `numeric` de PostgreSQL llegan como strings.

## Decisión
1. **Cliente HTTP único (`lib/apiClient.ts`):**
   - Todas las peticiones usan `credentials: 'include'` y el access token se guarda **solo en memoria** (variable de módulo), nunca en `localStorage` ni `sessionStorage`.
   - Ante un 401 en una ruta que no sea `/auth/*`, se intenta un refresh y se reintenta la petición una sola vez. Si el refresh falla, se ejecuta el manejador de sesión expirada y se vuelve al login.
   - Las descargas se realizan con `fetch` + `blob`, respetando `Content-Disposition`, y también reintentan una vez tras refresh.
2. **Sesión (`context/AuthContext.tsx`):**
   - Al montar se intenta restaurar la sesión con `POST /auth/refresh`.
   - El refresh automático se programa 60 segundos antes del vencimiento del access token.
   - Los refresh concurrentes se deduplican con una promesa module-level para evitar que React StrictMode genere dos refresh con el mismo token y el backend lo interprete como replay.
3. **Datos y mutaciones (`hooks/`):**
   - Se usa TanStack Query con hooks co-localizados por dominio: proyectos, personas, asignaciones, causación, solicitudes, desembolsos/recibos, caja chica, usuarios y auditoría.
   - Cada mutación invalida las claves afectadas; las vistas consumen los hooks y no llaman a `apiClient` directamente salvo en casos puntuales de descarga.
4. **Formularios (`components/Forms/`):**
   - React Hook Form + los schemas Zod de `@scienpay/shared` como fuente única de validación.
   - `@hookform/resolvers` no está instalado; se implementa `lib/zodResolver.ts` con la interfaz mínima compatible con RHF. Si la dependencia se instala y verifica, puede sustituirse sin cambiar los formularios.
5. **Vistas por rol:**
   - `AdminView`, `GeneratorView` y `ReceptorView` son componentes independientes; `App.tsx` solo aporta la pestaña activa y el shell de navegación.
   - Ocultar pestañas o acciones por rol es una ayuda de UX; la autorización efectiva permanece en los guards y servicios del backend.
6. **Feedback y documentos:**
   - `ToastProvider` global para éxito/error/información; estados `LoadingState`, `EmptyState` y `ErrorState` en las vistas.
   - Descarga real de `SOL-*.pdf` y `REC-*.pdf` mediante hooks; no se genera ningún PDF en el cliente.
7. **Precisión monetaria en el cliente:**
   - Los montos que se suman o comparan en el formulario de desembolso se convierten a centavos para evitar desajustes de coma flotante frente a la validación `Decimal` del backend.

## Consecuencias
### Positivas
- No hay mocks ni credenciales en el código de producción del frontend.
- El access token no queda expuesto a persistencia local; el refresh token sigue en cookie `HttpOnly`.
- La organización por dominio reduce el acoplamiento entre vistas y facilita la invalidación de caché.
- La validación cliente y servidor comparte los mismos schemas Zod.

### Negativas / Mitigaciones
- Recargar la página siempre dispara un refresh; es el costo de no persistir el access token. Se mitiga con la deduplicación y el refresh programado.
- El resolver Zod local es código propio que debe mantenerse si cambia la API de RHF. Está aislado en un único archivo y cubierto por `typecheck` y `build`.
- No existe suite automatizada de componentes en el workspace web; la verificación de Fase 3 se limita a typecheck, build y pruebas de API. La cobertura de frontend queda para la Fase 4, fuera del alcance autorizado.
