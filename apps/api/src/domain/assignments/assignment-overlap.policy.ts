export interface AssignmentDateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD o null si es indefinida
  id?: string;
}

/**
 * Política de Prevención de Solapamiento de Asignaciones (Función Pura de Dominio).
 * Una misma persona no puede poseer dos asignaciones simultáneas activas en el mismo proyecto científico.
 * Los rangos son inclusivos [startDate, endDate].
 */
export class AssignmentOverlapPolicy {
  public static hasOverlap(
    existingRanges: AssignmentDateRange[],
    targetRange: AssignmentDateRange,
    excludeAssignmentId?: string,
  ): boolean {
    const targetStart = this.parseDate(targetRange.startDate);
    const targetEnd = targetRange.endDate ? this.parseDate(targetRange.endDate) : Infinity;

    if (targetRange.endDate && targetEnd < targetStart) {
      throw new Error('RANGO_INVALIDO: La fecha de fin no puede ser anterior a la fecha de inicio');
    }

    for (const existing of existingRanges) {
      if (excludeAssignmentId && existing.id === excludeAssignmentId) {
        continue;
      }

      const existingStart = this.parseDate(existing.startDate);
      const existingEnd = existing.endDate ? this.parseDate(existing.endDate) : Infinity;

      // Dos intervalos [A, B] y [C, D] se solapan si y solo si:
      // max(A, C) <= min(B, D)
      const maxStart = Math.max(targetStart, existingStart);
      const minEnd = Math.min(targetEnd, existingEnd);

      if (maxStart <= minEnd) {
        return true;
      }
    }

    return false;
  }

  private static parseDate(dateStr: string): number {
    const [year, month, day] = dateStr.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }
}
