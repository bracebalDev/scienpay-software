# ADR-002: Representación Numérica Monetaria y Política de Redondeo Bancario

## Estado
Aceptado

## Contexto
En sistemas financieros, el uso de tipos de datos de coma flotante binaria (`float`, `double` en JavaScript y C) genera imprecisiones acumulativas conocidas (por ejemplo `0.1 + 0.2 !== 0.3`). Dado que Scienpay controla estipendios de investigación y genera recibos vinculantes en dólares americanos (USD), cualquier descuadre de centavos invalida la auditoría contable.

## Decisión
1. **En Base de Datos:** Todas las columnas monetarias (`amount`, `amount_per_period`, `calculated_amount`, `paid_amount`, `remaining_debt`, etc.) se declaran como `NUMERIC(14,2)` en PostgreSQL.
2. **En Backend (Node.js/TypeScript):** Queda estrictamente prohibido el uso del tipo nativo `number` para operaciones aritméticas monetarias en la capa de dominio y aplicación. Se utiliza la librería de precisión arbitraria `decimal.js` (o big.js) para todos los cálculos.
3. **Política de Redondeo:** Se adopta el **Redondeo Bancario (*Round Half to Even*)** a 2 decimales exactos. En caso de fracciones intermedias exactas (e.g. `$ 10.125`), se redondea al número par más cercano (`$ 10.12`), evitando el sesgo inflacionario del redondeo hacia arriba tradicional (*Round Half Up*).
4. **En Moneda:** La moneda oficial única del sistema es **USD ($)**.

## Consecuencias
### Positivas
- Precisión contable absoluta y total correspondencia entre cálculos del backend y almacenamiento en PostgreSQL.
- Cuadratura exacta de sumatorias de causaciones frente a montos desembolsados y saldos pendientes.

### Negativas / Mitigaciones
- Los DTOs de entrada/salida deben transformar strings numéricos hacia y desde objetos `Decimal` en las fronteras de serialización.
