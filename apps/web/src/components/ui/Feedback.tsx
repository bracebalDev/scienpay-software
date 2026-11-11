import React from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw } from 'lucide-react';
import { Button } from './FormControls.js';

export type StatusTone = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'violet';

const toneClasses: Record<StatusTone, string> = {
  green:
    'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300',
  amber: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300',
  red: 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300',
  blue: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300',
  slate: 'bg-slate-100 dark:bg-[#2C2C2C] text-slate-700 dark:text-slate-300',
  violet: 'bg-violet-100 dark:bg-violet-950/60 text-violet-800 dark:text-violet-300',
};

export const StatusBadge: React.FC<{ label: string; tone?: StatusTone; className?: string }> = ({
  label,
  tone = 'slate',
  className,
}) => (
  <span
    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${toneClasses[tone]} ${className ?? ''}`}
  >
    {label}
  </span>
);

/** Mapea los estados del dominio a un tono visual consistente. */
export function statusTone(status: string): StatusTone {
  switch (status) {
    case 'ACTIVO':
    case 'ACTIVA':
    case 'APROBADA':
    case 'ENTREGADA':
    case 'PAGADO_TOTAL':
    case 'RENDIDO':
    case 'CERRADO':
      return 'green';
    case 'ENVIADA':
    case 'PENDIENTE':
    case 'SOLICITADO':
    case 'CALCULADO':
    case 'ABIERTO':
      return 'amber';
    case 'RECHAZADA':
    case 'ANULADA':
    case 'ANULADO':
    case 'INACTIVO':
    case 'CANCELADO':
    case 'BLOQUEADO':
      return 'red';
    case 'APROBADO':
    case 'DESEMBOLSADO':
    case 'PAGADO_PARCIAL':
      return 'blue';
    case 'CON_SOLICITUD':
    case 'FINALIZADO':
      return 'violet';
    default:
      return 'slate';
  }
}

export const LoadingState: React.FC<{ message?: string }> = ({ message = 'Cargando información…' }) => (
  <div className="flex items-center justify-center space-x-2 py-10 text-xs text-[#787774] dark:text-[#9B9A97]">
    <Loader2 className="w-4 h-4 animate-spin" />
    <span>{message}</span>
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void }> = ({
  message,
  onRetry,
}) => (
  <div className="flex flex-col items-center justify-center py-10 space-y-2 text-xs text-rose-700 dark:text-rose-300">
    <AlertTriangle className="w-5 h-5" />
    <span className="max-w-md text-center">{message}</span>
    {onRetry && (
      <Button variant="secondary" size="sm" onClick={onRetry}>
        <RefreshCw className="w-3 h-3" />
        <span>Reintentar</span>
      </Button>
    )}
  </div>
);

export const EmptyState: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex flex-col items-center justify-center py-10 space-y-2 text-xs text-[#9B9A97] dark:text-[#888886]">
    <Inbox className="w-6 h-6" />
    <span>{message}</span>
  </div>
);
