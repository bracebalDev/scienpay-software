# Manual de Usuario del Sistema Scienpay

**Sistema de Control de Pagos, Asignaciones y Fondos de Investigación**  
**Universidad de Carabobo — Facultad Experimental de Ciencias y Tecnología (FACYT)**  
**Escuela de Computación — Cátedra de Sistemas de Información**  
**Equipo Desarrollador:** Angel Bandres, Andrés Crespo, Brayan Ceballos, Joshtin Mejias.  

---

## 1. Introducción y Objetivo del Sistema

Scienpay es una plataforma de software diseñada para administrar el flujo financiero de estipendios, asignaciones y cajas chicas en proyectos científicos universitarios (áreas de Física, Química y Biología). 

El sistema trabaja exclusivamente en **Dólares Estadounidenses (USD)**, sin deducciones fiscales ni parafiscales. Su diseño sustituye las planillas manuales de Excel por una base de datos relacional inmutable protegida por disparadores (triggers SQL), garantizando que todo cálculo de prorrateo, desembolso FIFO y comprobante emitido cuente con respaldo auditable.

Por recomendación de evaluación administrativa, la interfaz del sistema funciona **exclusivamente en Modo Claro**, garantizando contraste uniforme, nitidez en salas de control administrativo y cumplimiento de estándares de oficina.

---

## 2. Modos de Ingreso y Segregación de Funciones (Roles)

Para cumplir con las normas de control interno, el sistema prohíbe que una sola persona gestione todo el ciclo del dinero. Hay tres modos de ingreso bien diferenciados:

```
+-----------------------------------------------------------------------------------+
| ROL 1: ADMINISTRADOR      | ROL 2: GENERADOR              | ROL 3: RECEPTOR       |
| (Lic. Carlos Mendoza)     | (Dra. Elena Rostova)          | (Mg. Roberto Silva)   |
| admin                     | generador                     | receptor              |
+---------------------------+-------------------------------+-----------------------+
| - Usuarios del sistema    | - Proyectos y presupuestos    | - Aprobación (4 ojos) |
| - Parámetros globales     | - Padrón de beneficiarios     | - Pagos FIFO          |
| - Registro de auditoría   | - Asignaciones y tabuladores  | - Facturas / Recibos  |
| - Desbloqueo de cuentas   | - Cálculo de nómina/causación | - Fondos caja chica   |
|                           | - Emisión de órdenes de pago  |                       |
| (NO toca dinero)          | (NO aprueba ni paga)          | (NO crea asignaciones)|
+-----------------------------------------------------------------------------------+
```

> **Aviso importante sobre los beneficiarios:** Los investigadores, tesistas y asistentes de laboratorio que cobran asignaciones **no tienen usuario ni contraseña**. Son registrados como beneficiarios en el sistema por la Coordinación.

---

## 3. Acceso al Sistema y Medidas de Seguridad

### 3.1. Pantalla de Inicio de Sesión
1. Abra el navegador e ingrese a la dirección del sistema (en local: `http://localhost:8080` o en el enlace oficial de Vercel).
2. Introduzca su **Usuario** o **Correo Electrónico** institucional y su **Contraseña**.
3. Presione el botón **Iniciar Sesión**.

### 3.2. Bloqueo por Intentos Fallidos (Protección Anti-Fuerza Bruta)
* **3 intentos erróneos:** El sistema suspende temporalmente el acceso por **5 minutos**. Se mostrará un cronómetro en pantalla.
* **4to intento erróneo:** La cuenta queda **bloqueada de forma permanente**. En este caso, el usuario debe comunicarse con el **Administrador del Sistema** para que proceda a reactivar la cuenta desde el panel de seguridad.

---

## 4. Guías Paso a Paso para Usos Comunes

---

### CASO A: Cómo generar un presupuesto y registrar asignaciones de personal

Este procedimiento lo realiza el usuario con rol **Generador de Nómina** (`generador`).

#### Paso 1: Crear o verificar el Proyecto Científico
1. Inicie sesión con la cuenta del Generador.
2. En la barra lateral izquierda, seleccione **Proyectos Científicos**.
3. Haga clic en el botón superior **+ Nuevo Proyecto**.
4. Complete los datos requeridos:
   * **Código:** Identificador único (por ejemplo: `FIS-02`, `QUI-03`, `BIO-04`).
   * **Nombre:** Título formal de la investigación.
   * **Área:** Seleccione `Física`, `Química` o `Biología`.
   * **Ámbito:** Indique si los fondos son `Internos` (presupuesto universitario) o `Externos` (financiamiento de convenios).
   * **Presupuesto Asignado (USD):** Monto techo del proyecto (ejemplo: `22000.00`).
   * **Vigencia:** Fechas de inicio y culminación.
5. Presione **Guardar Proyecto**.

#### Paso 2: Registrar al Personal en el Padrón de Beneficiarios
1. En la barra lateral, pulse en **Personal (Beneficiarios)**.
2. Presione **+ Nuevo Beneficiario**.
3. Ingrese la cédula o pasaporte (`V-19452881`), nombres, apellidos, correo institucional y especialidad académica (ej. *Físico Experimental Senior*).
4. Guarde el registro.

#### Paso 3: Configurar el Tabulador / Grupo de Pago
1. Diríjase a la sección **Asignaciones y Grupos**.
2. En la pestaña de grupos, verifique o agregue una frecuencia de corte (Mensual al día 30, Quincenal los días 15 y 30, o Semanal los viernes).

#### Paso 4: Crear la Asignación Presupuestaria
1. En **Asignaciones y Grupos**, presione **+ Nueva Asignación**.
2. Seleccione el **Beneficiario**, el **Proyecto Científico** y el **Grupo de Pago**.
3. Defina el **Monto por Período en USD** (ejemplo: `$850.00`).
4. Indique la fecha de inicio y la fecha de finalización.
5. El sistema verificará de forma automática que no exista solapamiento de fechas para esa persona en el mismo proyecto. Presione **Crear Asignación**.

---

### CASO B: Cómo calcular una nómina con el sistema (Causación y Prorrateo)

La causación determina con exactitud matemática cuánto dinero devengó cada persona en un lapso determinado, considerando los días que estuvo activa la asignación frente a los días calendario del período.

#### Paso 1: Previsualizar el Cálculo
1. Como usuario **Generador de Nómina**, seleccione **Motor de Causación** en la barra lateral.
2. Seleccione el **Proyecto** a liquidar y el **Grupo de Pago**.
3. Indique las fechas del corte (por ejemplo, del `2026-10-01` al `2026-10-31`).
4. Presione el botón **Previsualizar Cálculo**.
5. Se mostrará una tabla con el desglose exacto:
   * Si la persona trabajó el mes completo (31 de 31 días), causa el 100% de la asignación.
   * Si ingresó a mitad de corte (por ejemplo, día 16), el sistema prorratea proporcionalmente:  
     $$\text{Monto Causado} = \text{Monto Base} \times \frac{\text{Días Activos}}{\text{Días Totales del Período}}$$
     aplicando la norma de redondeo `HALF_UP` a 2 decimales.

#### Paso 2: Generar el Lote Oficial de Causación
1. Tras revisar que las cifras cuadren, presione **Generar Lote Oficial**.
2. El sistema creará un registro inmutable con el identificador del lote.

#### Paso 3: Emitir la Orden de Pago (Solicitud Consolidada)
1. En la parte inferior del lote generado, pulse **Crear Solicitud de Pago**.
2. Ingrese una descripción de período (ejemplo: *Octubre 2026 - Asignaciones Regulares*).
3. Presione **Guardar Solicitud**. La solicitud se creará con el correlativo consecutivo `SOL-2026-NNN` en estado `BORRADOR`.
4. En la pestaña **Mis Solicitudes y Órdenes**, ubique la solicitud y presione el botón **Enviar a Revisión**.
5. La solicitud cambiará a estado `ENVIADA` y pasará a la bandeja de fiscalización de la Administración.

---

### CASO C: Cómo tramitar, desembolsar y generar una Factura / Recibo de Pago

Este procedimiento lo lleva a cabo el **Receptor de Nómina** (`receptor`).

#### Paso 1: Aprobación bajo Regla de Cuatro Ojos
1. Inicie sesión con el usuario `receptor`.
2. En la barra lateral, pulse en **Bandeja de Aprobación**.
3. Verá las solicitudes en estado `ENVIADA`.
4. El sistema comprueba que el usuario revisor sea distinto al generador (`creador !== revisor`). Si intenta aprobar una solicitud que usted mismo generó, el sistema la rechazará de inmediato por norma de control interno.
5. Si los recaudos están conformes, haga clic en **Aprobar Solicitud**. El estado pasa a `APROBADA`.
   *(Si existiera alguna inconsistencia, presione **Rechazar**, indicando obligatoriamente el motivo formal en el formulario).*

#### Paso 2: Registrar la Entrega de Fondos (Desembolso Financiero)
1. Ingrese a la pestaña **Entregas de Fondos**.
2. Seleccione la solicitud que acaba de ser aprobada.
3. Se desplegará la nómina de beneficiarios con su saldo pendiente.
4. Puede realizar un pago total o abonos parciales:
   * El motor financiero aplica amortización **FIFO**: si una persona tiene deudas acumuladas de períodos previos, el dinero amortiza primero la cuota más antigua.
   * El sistema no permite ingresar un monto superior a la deuda acumulada real.
5. Seleccione el método de entrega: `Transferencia Bancaria`, `Efectivo en Caja` o `Cheque`.
6. Introduzca el número de referencia bancaria o comprobante (ejemplo: `TRF-BANC-55667788`).
7. Presione **Registrar Desembolso**.

#### Paso 3: Generación y Descarga de la Factura / Recibo (Original y Copia)
1. Diríjase a la sección **Recibos y Facturas de Pago**.
2. En la tabla de comprobantes emitidos verá el correlativo oficial inmutable `REC-2026-NNNNNN`.
3. Presione el botón **Factura / Recibo (Descargar)**.
4. El sistema generará y descargará inmediatamente un archivo PDF que contiene en el mismo documento:
   * **Página 1 (EJEMPLAR ORIGINAL — BENEFICIARIO):** Membrete institucional de la Universidad de Carabobo (FACYT), datos del investigador, proyecto, método de entrega, tabla de imputación FIFO, saldo remanente y líneas de firma formal de entrega/conformidad para el beneficiario.
   * **Página 2 (COPIA DE REGISTRO — ARCHIVO / EMPRESA):** Duplicado exacto con sello de registro contable y control interno para el resguardo de la administración de la institución o empresa.

---

### CASO D: Cómo operar un fondo de Caja Chica (Ciclo mensual y Vales)

El Receptor de Nómina gestiona los fondos fijos menores asignados a los laboratorios.

#### Paso 1: Apertura de Período con Arrastre Automático
1. En la barra lateral, pulse en **Cajas Chicas**.
2. Seleccione la caja correspondiente (ejemplo: *Caja Chica Laboratorio Central*).
3. Presione **Apertura de Mes**. El sistema arrastrará de forma automática el saldo final del mes previo como saldo de apertura del mes en curso.

#### Paso 2: Emisión y Desembolso de Vales
1. Al recibir una solicitud de gastos de suministros menores, presione **+ Solicitar Vale**.
2. Indique el monto requerido en USD, el proyecto científico que asume el gasto y el motivo específico.
3. El Receptor evalúa y presiona **Aprobar Vale** y posteriormente **Desembolsar Efectivo**. El saldo disponible en caja disminuye exactamente por el monto entregado.

#### Paso 3: Rendición con Factura y Devolución de Cambio
1. Cuando el custodio regresa con la factura de compra, ubique el vale y presione **Rendir Cuentas**.
2. Ingrese el número de factura fiscal física (ejemplo: `FAC-2026-01042`), el monto efectivamente gastado y el vuelto reintegrado.
3. El sistema valida la cuadratura exacta:
   $$\text{Monto Desembolsado} = \text{Monto Rendido} + \text{Vuelto Reintegrado}$$
4. El vuelto regresa a la disponibilidad de la caja chica y el vale queda cerrado en estado `RENDIDO`.

---

## 5. Preguntas Frecuentes y Soporte Operativo

### ¿Qué ocurre si se cometió un error en un cálculo ya emitido?
Debido al principio de **Inmutabilidad Financiera**, las tablas de pagos, recibos y movimientos no pueden ser editadas ni borradas directamente en la base de datos (los disparadores SQL abortarán cualquier intento). Si un lote de causación necesita corrección antes de ser pagado, el Generador debe usar la opción **Anular Lote**, registrando un motivo formal con un mínimo de 10 caracteres. Dicha acción quedará grabada en el `audit_log` con el usuario, la hora y la dirección IP.

### ¿Dónde consulto las pistas de auditoría?
El usuario **Administrador del Sistema** puede ingresar a la opción **Registro de Auditoría**, donde dispone de filtros por fecha, tipo de operación y actor, permitiendo rastrear cualquier evento ocurrido en la plataforma.
