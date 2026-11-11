# ADR-008 — Calidad y pipeline de CI

- **Estado:** Aceptado
- **Fecha:** 2026-11-11
- **Contexto:** Fase 4 del plan de completitud (`docs/HANDOFF.md`)

## Contexto

Hasta la Fase 3 el pipeline de CI ejecutaba `typecheck`, `test` y `build`, pero no
tenía análisis estático ni verificación de formato. El script raíz `npm run lint`
existía y era un no-op porque ningún workspace lo definía, y los escaneos de
seguridad (`gitleaks`, `semgrep`, `npm audit`) estaban marcados como
`continue-on-error`, de modo que nunca podían romper el pipeline.

## Decisión

1. **ESLint flat config en la raíz** (`eslint.config.mjs`) con `@eslint/js` y
   `typescript-eslint` en el preset `recommended` —sin type-checking explícito—
   para que el lint sea rápido y estable. El rigor de tipos se mantiene en
   `npm run typecheck`, que ya usa `strict: true`.
2. **Prettier** como única fuente de verdad de estilo. `.prettierrc` existente se
   conserva (100 columnas, comillas simples, punto y coma, trailing comma).
3. **Cada workspace declara `lint`.** Un guard (`scripts/check-lint-workspaces.mjs`)
   recorre `apps/*` y `packages/*` y falla si algún `package.json` no declara el
   script, de modo que un workspace nuevo no puede quedar fuera del pipeline.
4. **React Hooks:** se activan únicamente `rules-of-hooks` y `exhaustive-deps`.
   El preset `recommended` de `eslint-plugin-react-hooks@7` incluye las reglas del
   React Compiler (`purity`, `incompatible-library`), que marcan como error el uso
   normal de `react-hook-form` (`form.watch`) y `Date.now()` en render. Adoptarlas
   exigiría refactorizar la SPA completa y excede el alcance de la Fase 4; queda
   registrado como mejora futura.
5. **`no-explicit-any` queda como `warning`**, no como error. Los `any` existentes
   están en bordes de framework (respuestas Express/Nest y mocks de test) y su
   sustitución es una tarea de tipos, no de lint.
6. **CI bloqueante:** `npm run format:check` y `npm run lint` se ejecutan antes de
   `typecheck`, `test` y `build`. Gitleaks pasa a ser **bloqueante**.
7. **Política de escaneos:**
   - **Gitleaks:** bloqueante. Un secreto detectado detiene el pipeline.
   - **Semgrep:** no bloqueante mientras se hace triage de los hallazgos actuales;
     la política pasa a bloqueante cuando el reporte esté en cero.
   - **`npm audit --audit-level=high`:** no bloqueante con baseline documentado
     (14 advisories al 2026-11-11, ninguno con exploit path en la aplicación);
     se revisa en cada iteración y se vuelve bloqueante tras el triage.
   El objetivo es no normalizar el rojo: cada excepción tiene fecha y motivo.

## Consecuencias

- `npm run lint` y `npm run format:check` son verificables localmente y en CI.
- El primer `prettier --write` reformateó 70 archivos sin cambios semánticos; el
  commit correspondiente es puramente de estilo y se separa del resto.
- El lint detectó y permitió corregir defectos reales: un `let` con asignación
  inútil en `ThemeContext`, variables calculadas sin uso en el motor FIFO,
  imports muertos en `causation.service` y en el seed, y un parámetro sin uso en
  `PaymentRequestsService.sendRequest`.
- Los 25 `warning` de `any` quedan visibles en cada corrida para priorizarlos.

## Alternativas descartadas

- **Biome** en lugar de ESLint + Prettier: más rápido, pero exigiría reemplazar la
  configuración y las reglas de React Hooks ya conocidas por el equipo.
- **`typescript-eslint` con type-checking** (`projectService`): detecta más
  defectos, pero multiplica el tiempo de lint en un monorepo de este tamaño y
  duplica lo que ya hace `tsc --noEmit`.
