import React, { useEffect } from 'react';
import { X, FolderKanban, Layers, FileText, Calendar, Shield } from 'lucide-react';
import { ProjectItem, AssignmentItem, PaymentRequestItem } from '../../types/app.types.js';
import { PaymentRequestStatus } from '@scienpay/shared';

export type DetailModalData =
  | { type: 'project'; data: ProjectItem }
  | { type: 'assignment'; data: AssignmentItem }
  | { type: 'request'; data: PaymentRequestItem };

interface ItemDetailModalProps {
  modalData: DetailModalData | null;
  onClose: () => void;
}

export const ItemDetailModal: React.FC<ItemDetailModalProps> = ({ modalData, onClose }) => {
  // Cerrar modal con tecla Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (modalData) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalData, onClose]);

  if (!modalData) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2F2F2F] rounded-2xl shadow-2xl max-w-xl w-full p-6 overflow-hidden max-h-[90vh] flex flex-col transition-colors duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabecera del Modal */}
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
                {modalData.type === 'assignment' && `Asignación de ${modalData.data.beneficiaryName}`}
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

        {/* Cuerpo del Modal con scroll si es necesario */}
        <div className="py-4 overflow-y-auto space-y-4 text-xs">
          {/* DETALLES DE PROYECTO */}
          {modalData.type === 'project' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">Área Científica</span>
                  <span
                    className={`inline-block text-[11px] font-bold px-2 py-0.5 rounded ${
                      modalData.data.area === 'FISICA'
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-primary dark:text-blue-300'
                        : modalData.data.area === 'QUIMICA'
                        ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300'
                        : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    }`}
                  >
                    {modalData.data.area}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">Ámbito del Proyecto</span>
                  <span className="font-semibold text-[#37352F] dark:text-white">
                    {modalData.data.scope === 'INTERNO' ? 'Interno (Universidad)' : 'Externo (Financiado)'}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gradient-to-br from-primary/5 to-transparent dark:from-primary/10 border border-primary/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#787774] dark:text-[#9B9A97]">Presupuesto Asignado en Divisas:</span>
                  <span className="font-mono text-base font-bold text-primary dark:text-primary-light">
                    ${modalData.data.budgetUSD.toLocaleString('es-CO', { minimumFractionDigits: 2 })} USD
                  </span>
                </div>
                <p className="text-[10px] text-[#9B9A97] dark:text-[#888886]">
                  Moneda base inmutable: USD. Todos los pagos, asignaciones y rendiciones imputan directamente a esta partida.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-bold text-[#37352F] dark:text-white flex items-center space-x-1.5">
                  <Calendar className="w-4 h-4 text-[#787774] dark:text-[#9B9A97]" />
                  <span>Vigencia y Calendario de Ejecución</span>
                </h4>
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-[#787774] dark:text-[#9B9A97]">Fecha de Inicio: </span>
                    <strong className="text-[#37352F] dark:text-white">{modalData.data.startDate}</strong>
                  </div>
                  <div>
                    <span className="text-[#787774] dark:text-[#9B9A97]">Fecha de Culminación: </span>
                    <strong className="text-[#37352F] dark:text-white">{modalData.data.endDate}</strong>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-100/70 dark:bg-[#242424] border border-[#E9E9E7] dark:border-[#333333] text-[11px] text-[#5A5A58] dark:text-[#9B9A97] flex items-start space-x-2">
                <Shield className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Regla de Negocio:</strong> Solapamiento de asignaciones de una misma persona en este proyecto es automáticamente rechazado por el motor financiero.
                </span>
              </div>
            </div>
          )}

          {/* DETALLES DE ASIGNACIÓN */}
          {modalData.type === 'assignment' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">Beneficiario</span>
                  <span className="font-bold text-[#37352F] dark:text-white text-xs block">
                    {modalData.data.beneficiaryName}
                  </span>
                  <span className="text-[10px] text-[#9B9A97] dark:text-[#888886]">
                    Proyecto: {modalData.data.projectCode}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">Periodicidad de Pago</span>
                  <span className="font-semibold text-primary dark:text-primary-light uppercase text-xs">
                    {modalData.data.periodicity}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200 dark:border-violet-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#787774] dark:text-[#9B9A97]">Estipendio por Período:</span>
                  <span className="font-mono text-base font-bold text-violet dark:text-violet-300">
                    ${modalData.data.amountUSD.toFixed(2)} USD
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-[#888886]">
                  Fórmula de prorrateo puro: <code>monto_causado = monto_periodo × dias_activos / dias_periodo</code> (Redondeo HALF_UP a 2 decimales).
                </p>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#787774] dark:text-[#9B9A97]">Vigencia de la Asignación:</span>
                  <strong className="text-[#37352F] dark:text-white">{modalData.data.startDate} al {modalData.data.endDate}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#787774] dark:text-[#9B9A97]">Estado de la Asignación:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">{modalData.data.status}</span>
                </div>
              </div>
            </div>
          )}

          {/* DETALLES DE SOLICITUD DE PAGO */}
          {modalData.type === 'request' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">Proyecto Imputado</span>
                  <span className="font-mono font-bold text-primary dark:text-primary-light">
                    {modalData.data.projectCode}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                  <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block mb-1">Estado de Aprobación</span>
                  <span
                    className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded ${
                      modalData.data.status === PaymentRequestStatus.BORRADOR
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        : modalData.data.status === PaymentRequestStatus.ENVIADA
                        ? 'bg-blue-100 dark:bg-blue-950/60 text-primary dark:text-blue-300'
                        : modalData.data.status === PaymentRequestStatus.APROBADA
                        ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {modalData.data.status}
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#787774] dark:text-[#9B9A97]">Monto Total de la Solicitud:</span>
                  <span className="font-mono text-base font-bold text-emerald-700 dark:text-emerald-400">
                    ${modalData.data.totalAmountUSD.toFixed(2)} USD
                  </span>
                </div>
                <div className="text-[10px] text-slate-500 dark:text-[#888886]">
                  Período de corte: {modalData.data.period}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] space-y-1.5 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-[#787774] dark:text-[#9B9A97]">Generada por:</span>
                  <strong className="text-[#37352F] dark:text-white">Dra. Elena Rostova (Generador)</strong>
                </div>
                {modalData.data.reviewedBy && (
                  <div className="flex justify-between">
                    <span className="text-[#787774] dark:text-[#9B9A97]">Evaluada por:</span>
                    <strong className="text-[#37352F] dark:text-white">{modalData.data.reviewedBy} (Receptor)</strong>
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

        {/* Pie del Modal */}
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
