export enum Periodicity {
  SEMANAL = 'SEMANAL',
  QUINCENAL = 'QUINCENAL',
  MENSUAL = 'MENSUAL',
}

export enum AssignmentStatus {
  ACTIVO = 'ACTIVO',
  INACTIVO = 'INACTIVO',
  CANCELADO = 'CANCELADO',
}

export enum CausationBatchStatus {
  CALCULADO = 'CALCULADO',
  CON_SOLICITUD = 'CON_SOLICITUD',
  ANULADO = 'ANULADO',
}

export enum CausationItemStatus {
  PENDIENTE = 'PENDIENTE',
  PAGADO_PARCIAL = 'PAGADO_PARCIAL',
  PAGADO_TOTAL = 'PAGADO_TOTAL',
  ANULADO = 'ANULADO',
}

export enum PaymentMethod {
  EFECTIVO = 'EFECTIVO',
  TRANSFERENCIA = 'TRANSFERENCIA',
  ZELLE = 'ZELLE',
}
