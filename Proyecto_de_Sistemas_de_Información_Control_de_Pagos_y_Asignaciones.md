## Universidad de Carabobo

## Escuela de Computación

Asignatura: Sistemas de Información

## Proyecto Final: Sistema de Control de Pagos y Asignaciones

## 1. Descripción del Problema

Una empresa que gestiona equipos de trabajo para proyectos de física, química y biología requiere un sistema robusto para llevar el control de los pagos y las entregas de dinero a su personal.

Actualmente, el control se lleva en hojas de cálculo de Excel, lo que dificulta el manejo de relaciones complejas, la segregación de funciones y la auditoría. El sistema debe responder preguntas clave como: cuánto se ha causado, cuánto se ha pagado, cuándo, a quién, por qué proyecto y cuánto se le adeuda a cada persona. No es una nómina legal, sino un control de asignaciones en dólares (USD) sin deducciones.

## 2. Requerimientos Funcionales

## 2.1. Gestión de Catálogos y Usuarios

- Usuarios y Roles: El sistema debe manejar 3 roles con permisos específicos y segregación de funciones:

- a. Administrador del Sistema: Gestiona usuarios, parámetros y catálogos. No participa en operaciones de dinero.

- b. Generador de Nómina (ej. Coordinador General): Gestiona proyectos, asignaciones y personas. Genera la causación y crea las solicitudes de pago.

- c. Receptor de Nómina (ej. Gerente de Administración): Recibe, aprueba o rechaza las solicitudes de pago y registra la entrega de fondos.

- Nota: Los beneficiarios (el personal que cobra) NO tendrán usuario en el sistema.


- Proyectos: Cada proyecto pertenece a un área (física, química, biología), tiene un ámbito (interno/externo) y una vigencia.

- Grupos de Pago: Configuración de la periodicidad (semanal, quincenal, mensual) y fechas de corte adaptables.

- Asignaciones: Cruce entre persona, proyecto y grupo de pago, con un monto específico por período.

## 2.2. Motor de Causación y Prorrateo

- Cálculo exacto del monto causado por período basado en los días activos de la asignación frente a los días totales del período (Prorrateo).

- Generación de causación y nómina por lote (agrupado por proyecto y período).

## 2.3. Ciclo de Solicitudes y Pagos

- Flujo de estados: Creación de solicitud -> Envío -> Aprobación/Rechazo -> Entrega de fondos -> Cierre.

- Pagos parciales permitidos con aplicación FIFO (primero en entrar, primero en salir) sobre la deuda pendiente.

- Todos los registros financieros (pagos, recibos, causaciones) son inmutables; los errores se corrigen mediante anulaciones justificadas.

## 2.4. Control de Cajas Chicas

- Módulo para gestionar múltiples cajas chicas asignables a proyectos desde la interfaz.

- Apertura mensual, solicitud de vales, aprobación por gerencia, desembolso, rendición con comprobante y arrastre de saldo para el mes siguiente.

## 2.5. Reportes, Documentos y Auditoría

- Generación de PDFs para Recibos Individuales y Solicitudes Consolidadas.

- Trazabilidad completa mediante un log de auditoría (audit_log) que registre quién, cuándo y qué cambió en la base de datos.

## 3. Arquitectura y Stack Tecnológico

El proyecto debe desarrollarse bajo una arquitectura cliente-servidor completa y robusta.

- Tecnología Libre: Los equipos de desarrollo tienen total libertad para elegir el stack tecnológico (Frontend, Backend y Base de Datos Relacional) que mejor se adapte a sus fortalezas, siempre y cuando cumplan con los requerimientos funcionales y de arquitectura (separación de capas).


- Despliegue: El sistema debe estar preparado para ser desplegado en un entorno de servidor (puede ser local para efectos de la demostración), simulando un ambiente de producción.

## 4. Entregables del Proyecto

- 2. Código Fuente: Repositorio estructurado.

- 3. Base de Datos: Scripts de creación de base de datos y carga de datos iniciales (seed ficticios para pruebas).

- 4. Documentación (README): Instrucciones claras de instalación y ejecución del proyecto.

- 5. Uso de IA: Se permite y fomenta el uso de herramientas de Inteligencia Artificial generativa como asistentes de codificación. Los equipos deberán estar preparados para sustentar y explicar la lógica de los bloques de código o decisiones arquitectónicas sugeridas por la IA durante la defensa del proyecto.

Debe ser realizado en grupos de 4 a 5 estudiantes. Indispensable, entregar un archivo con las indicaciones suministradas a la IA y

detalles sobre su uso.

Debe estar atento a las recomendaciones que se hagan por el grupo de telegram.
