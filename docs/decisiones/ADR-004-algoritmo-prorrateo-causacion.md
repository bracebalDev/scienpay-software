# ADR-004: Algoritmo de Prorrateo de Causación por Días Calendario Activos

## Estado
Aceptado

## Contexto
Los beneficiarios vinculados a proyectos de investigación científica poseen asignaciones con fechas de vigencia que pueden iniciar o culminar en días intermedios del ciclo de pago. Además, los períodos varían según el grupo de pago (semanal de 7 días, quincenal de 13 a 16 días, mensual de 28 a 31 días). Se requiere un algoritmo de cálculo transparente, determinístico y matemáticamente exacto.

## Decisión
Se define la fórmula de causación prorrateada:

$$\text{Monto Causado} = \text{round}_{\text{bancario}}\left( \text{Monto Período} \times \frac{\text{Días Activos en Período}}{\text{Días Totales del Período}}, 2 \right)$$

1. **Días Totales del Período ($D_{\text{tot}}$):** Número de días calendario comprendidos entre la fecha de inicio y fin del corte configurado en el grupo de pago:
   $$D_{\text{tot}} = (\text{FechaFin} - \text{FechaInicio}) + 1$$
2. **Días Activos ($D_{\text{act}}$):** Intersección entre la vigencia de la asignación y el período de causación:
   $$\text{InicioEfectivo} = \max(\text{FechaInicioPeríodo}, \text{FechaInicioAsignación})$$
   $$\text{FinEfectivo} = \min(\text{FechaFinPeríodo}, \text{COALESCE}(\text{FechaFinAsignación}, \text{FechaFinPeríodo}))$$
   $$D_{\text{act}} = \max(0, (\text{FinEfectivo} - \text{InicioEfectivo}) + 1)$$
3. **Múltiples Asignaciones Consecutivas:** Si el monto de una persona cambia a mitad de período, se modela como dos asignaciones no solapadas; el motor prorratea cada tramo por sus respectivos días activos y totaliza la causación en el lote.
4. **Agrupación por Lote:** La causación se genera en bloque (*batch*) para un proyecto y período, congelando los cálculos en `causation_items`.

## Consecuencias
### Positivas
- Tratamiento justo y proporcional del estipendio de cada investigador.
- Cobertura consistente para cualquier duración de mes o quincena.

### Negativas / Mitigaciones
- Requiere pruebas unitarias exhaustivas con fechas límite (febrero bisiesto, semanas cruzadas, inicio/fin el mismo día).
