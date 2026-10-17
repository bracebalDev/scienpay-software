## 📌 Objetivo del Pull Request
<!-- Describe de forma clara y concisa el propósito de este PR, la funcionalidad que añade o el bug que corrige. -->

## 🛠️ Cambios Realizados
- 
- 
- 

## 🧪 Pruebas Ejecutadas
- [ ] Pruebas unitarias ejecutadas (`npm run test`)
- [ ] Pruebas de integración o e2e ejecutadas
- [ ] Verificación de tipos TypeScript (`npm run typecheck`)
- [ ] Linter ejecutado sin advertencias ni errores (`npm run lint`)
- [ ] Compilación de monorepo exitosa (`npm run build`)

## 🔒 Checklist de Seguridad y Calidad (OWASP / Reglas de Proyecto)
- [ ] **Sin Secretos:** No se han añadido contraseñas, claves, tokens ni archivos `.env`.
- [ ] **Inmutabilidad Financiera:** No se crearon operaciones `UPDATE` o `DELETE` directas sobre tablas financieras sin justificación / anulación.
- [ ] **Precisión Decimal:** Todos los montos usan aritmética decimal exacta (`NUMERIC(14,2)` o `decimal.js`), sin `float` ni `double`.
- [ ] **Segregación de Funciones:** Permisos verificados en backend por rol (`ADMIN`, `GENERADOR`, `RECEPTOR`) y regla de cuatro ojos aplicada donde aplique.
- [ ] **Validación en Fronteras:** Entradas validadas exhaustivamente con esquemas Zod.
- [ ] **Protección de Salida:** Datos sanitizados para PDF / CSV (prevención de inyección de fórmulas).

## ⚠️ Riesgos Identificados y Mitigaciones
<!-- Detalla posibles impactos colaterales, migraciones requeridas o consideraciones de despliegue. -->
- 

## 📋 ADRs Relacionados
<!-- Enlaza los documentos de decisión de arquitectura asociados en docs/decisiones/ si aplica -->
- [ADR-00X](docs/decisiones/)
