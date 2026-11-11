import React, { useEffect } from 'react';
import { X, FolderKanban, Layers, FileText, Calendar, Shield } from 'lucide-react';
import type { Assignment, PaymentRequest, Project } from '../../types/api.types.js';
import { formatCurrency, formatDate } from '../../lib/format.js';
import { StatusBadge, statusTone } from '../ui/Feedback.js';

export type DetailModalData =
  | { type: 'project'; data: Project }
  | {
      type: 'assignment';
      data: Assignment;
      personName?: string;
      projectCode?: string;
      groupName?: string;
    }
  | {
      type: 'request';
      data: PaymentRequest;
      projectCode?: string;
      createdByName?: string;
      reviewedByName?: string;
    };

interface ItemDetailModalProps {
  modalData: DetailModalData | null;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ modalData, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    if (modalData) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalData, onClose]);

  if (!modalData) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2F2F2F] rounded-2xl shadow-2xl max-w-xl w-full p-6 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between pb-4 border-b border-[#EDEDEB] dark:border-[#2F2F2F]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light">
              {modalData.type === 'project' && <FolderKanban className="w-5 h-5" />}
              {modalData.type === 'assignment' && <Layers className="w-5 h-5" />}
              {modalData.type === 'request' && <FileText className="w-5 h-5" />}
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#9B9A97] dark:text-[#888886]">
                {modalData.type === 'project' && 'Detalles del Proyecto de Investigación'}
                {modalData.type === 'assignment' && 'Detalles de la Asignación Científica'}
                {modalData.type === 'request' && 'Detalles de la Solicitud de Pago'}
              </span>
              <h2 className="text-base font-bold text-[#37352F] dark:text-white leading-tight">
                {modalData.type === 'project' && `${modalData.data.code} — ${modalData.data.name}`}
                {modalData.type === 'assignment' &&
                  `Asignación de ${modalData.personName ?? modalData.data.personId}`}
                {modalData.type === 'request' && `Solicitud ${modalData.data.requestCode}`}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#F7F6F3] dark:hover:bg-[#2A2A2A] transition"
            title="Cerrar modal (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 overflow-y-auto space-y-4 text-xs">
          {modalData.type === 'project' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">
                    Área Científica
                  </span>
                  <StatusBadge label={modalData.data.area} tone={statusTone(modalData.data.area)} />
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">
                    Ámbito del Proyecto
                  </span>
                  <span className="font-semibold text-[#37352F] dark:text-white">
                    {modalData.data.scope === 'INTERNO'
                      ? 'Interno (Universidad)'
                      : 'Externo (Financiado)'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#787774] dark:text-[#9B9A97]">
                    Presupuesto Asignado en Divisas:
                  </span>
                  <span className="font-mono text-base font-bold text-primary dark:text-primary-light">
                    ${formatCurrency(modalData.data.budgetUSD)} USD
                  </span>
                </div>
                <p className="text-[10px] text-[#9B9A97] dark:text-[#888886]">
                  Moneda base inmutable: USD. Todos los pagos, asignaciones y rendiciones imputan
                  directamente a esta partida.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#37352F] dark:text-white flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-[#787774] dark:text-[#9B9A97]" />
                  <span>Vigencia y Estado</span>
                </h4>
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#787774] dark:text-[#9B9A97]">Fecha de Inicio: </span>
                    <strong className="text-[#37352F] dark:text-white">
                      {formatDate(modalData.data.startDate)}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#787774] dark:text-[#9B9A97]">
                      Fecha de Culminación:{' '}
                    </span>
                    <strong className="text-[#37352F] dark:text-white">
                      {modalData.data.endDate ? formatDate(modalData.data.endDate) : 'Sin definir'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-[#787774] dark:text-[#9B9A97]">Estado: </span>
                    <strong className="text-[#37352F] dark:text-white">
                      {modalData.data.status}
                    </strong>
                  </div>
                </div>
              </div>

              {modalData.data.description && (
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] text-[11px] text-[#5A5A58] dark:text-[#A4A4A2]">
                  {modalData.data.description}
                </div>
              )}

              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-[#242424] border border-[#E9E9E7] dark:border-[#333333] text-[11px] text-[#5A5A58] dark:text-[#9B9A97] flex items-start space-x-2">
                <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Regla de Negocio:</strong> el solapamiento de asignaciones de una misma
                  persona en este proyecto es rechazado automáticamente por el motor financiero.
                </span>
              </div>
            </div>
          )}

          {modalData.type === 'assignment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">
                    Beneficiario
                  </span>
                  <span className="font-bold text-[#37352F] dark:text-white text-xs block">
                    {modalData.personName ?? modalData.data.personId}
                  </span>
                  <span className="text-[10px] text-[#9B9A97] dark:text-[#888886]">
                    Proyecto: {modalData.projectCode ?? '—'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">
                    Grupo de Pago
                  </span>
                  <span className="font-semibold text-primary dark:text-primary-light text-xs">
                    {modalData.groupName ?? '—'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#787774] dark:text-[#9B9A97]">
                    Estipendio por Período:
                  </span>
                  <span className="font-mono text-base font-bold text-violet dark:text-violet-300">
                    ${formatCurrency(modalData.data.amountPerPeriod)} {modalData.data.currency}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-[#888886]">
                  Fórmula de prorrateo:{' '}
                  <code>monto_causado = monto_periodo × dias_activos / dias_periodo</code> (redondeo
                  HALF_UP a 2 decimales).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#787774] dark:text-[#9B9A97]">
                    Vigencia de la Asignación:
                  </span>
                  <strong className="text-[#37352F] dark:text-white">
                    {formatDate(modalData.data.startDate)} al{' '}
                    {modalData.data.endDate ? formatDate(modalData.data.endDate) : 'indefinido'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787774] dark:text-[#9B9A97]">
                    Estado de la Asignación:
                  </span>
                  <StatusBadge
                    label={modalData.data.status}
                    tone={statusTone(modalData.data.status)}
                  />
                </div>
              </div>

              {modalData.data.notes && (
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] text-[11px] text-[#5A5A58] dark:text-[#A4A4A2]">
                  {modalData.data.notes}
                </div>
              )}
            </div>
          )}

          {modalData.type === 'request' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">
                    Proyecto Imputado
                  </span>
                  <span className="font-mono font-bold text-primary dark:text-primary-light">
                    {modalData.projectCode ?? '—'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">
                    Estado de Aprobación
                  </span>
                  <StatusBadge
                    label={modalData.data.status}
                    tone={statusTone(modalData.data.status)}
                  />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#787774] dark:text-[#9B9A97]">
                    Monto Total de la Solicitud:
                  </span>
                  <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
                    ${formatCurrency(modalData.data.totalAmountUSD)} USD
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-[#888886]">
                  Período de corte: {modalData.data.periodDescription}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#787774] dark:text-[#9B9A97]">Generada por:</span>
                  <strong className="text-[#37352F] dark:text-white">
                    {modalData.createdByName ?? modalData.data.createdByUserId}
                  </strong>
                </div>
                {modalData.data.reviewedByUserId && (
                  <div className="flex justify-between">
                    <span className="text-[#787774] dark:text-[#9B9A97]">Evaluada por:</span>
                    <strong className="text-[#37352F] dark:text-white">
                      {modalData.reviewedByName ?? modalData.data.reviewedByUserId}
                    </strong>
                  </div>
                )}
                {modalData.data.rejectionReason && (
                  <div className="mt-2 pt-2 border-t border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-400">
                    <span className="font-bold">Motivo del Rechazo: </span>
                    {modalData.data.rejectionReason}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#EDEDEB] dark:border-[#2F2F2F] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#EAE9E5] dark:bg-[#2C2C2C] text-[#37352F] dark:text-white hover:bg-[#E2E1DC] dark:hover:bg-[#383838] transition"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  );
};
