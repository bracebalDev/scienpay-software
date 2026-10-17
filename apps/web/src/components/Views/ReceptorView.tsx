import React, { useState } from 'react';
import { PaymentRequestItem } from '../../types/app.types.js';
import {
  CheckCircle2,
  DollarSign,
  Receipt,
  PiggyBank,
  AlertCircle,
  XCircle,
  Check,
  Shield,
} from 'lucide-react';
import { PaymentRequestStatus } from '@scienpay/shared';

interface ReceptorViewProps {
  activeTab: string;
  requests: PaymentRequestItem[];
  currentUserFullName: string;
  onApproveRequest: (requestId: string) => void;
  onRejectRequest: (requestId: string, reason: string) => void;
}

export const ReceptorView: React.FC<ReceptorViewProps> = ({
  activeTab,
  requests,
  currentUserFullName,
  onApproveRequest,
  onRejectRequest,
}) => {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Simulación de Pagos FIFO
  const [fifoAmount, setFifoAmount] = useState<number>(500.0);
  const [fifoResult, setFifoResult] = useState<string | null>(null);

  const handleRunFifo = () => {
    setFifoResult(
      `Monto de $ ${fifoAmount.toFixed(2)} USD aplicado exitosamente por FIFO:
• Causación 01 (Septiembre): $ 420.00 USD saldada al 100% (PAGADO_TOTAL)
• Causación 02 (Octubre): $ 80.00 USD abonados como pago parcial (PAGADO_PARCIAL)
• Recibo Inmutable emitido: REC-2026-000042`,
    );
  };

  const submitRejection = (id: string) => {
    if (!rejectionReason.trim()) return;
    onRejectRequest(id, rejectionReason);
    setRejectingId(null);
    setRejectionReason('');
  };

  return (
    <div className="space-y-6">
      {/* Banner de Segregación de Funciones RECEPTOR */}
      <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-emerald-950 text-xs flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Segregación de Funciones: Perfil Receptor (Gerente de Administración)</span>
          <p className="text-[11px] text-emerald-900 mt-0.5">
            Recibe, evalúa, aprueba o rechaza solicitudes de pago, registra entregas de fondos por FIFO, emite recibos y administra cajas chicas.
            <strong> Restricción:</strong> No puede crear proyectos, personas ni originar causaciones.
          </p>
        </div>
      </div>

      {/* PESTAÑA: BANDEJA DE APROBACIÓN */}
      {activeTab === 'solicitudes_bandeja' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEB]">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-700" />
                <span>Bandeja de Fiscalización y Aprobación de Solicitudes</span>
              </h2>
              <p className="text-xs text-[#787774] mt-0.5">
                Evaluación con regla de cuatro ojos estricta: ningún usuario puede autorizar sus propias solicitudes.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800">
              {requests.filter((r) => r.status === PaymentRequestStatus.ENVIADA).length} Pendientes de Revisión
            </span>
          </div>

          <div className="bg-white rounded-xl border border-[#E9E9E7] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] text-[#787774] font-semibold border-b border-[#E9E9E7]">
                <tr>
                  <th className="py-2.5 px-4">Código</th>
                  <th className="py-2.5 px-4">Proyecto</th>
                  <th className="py-2.5 px-4">Período</th>
                  <th className="py-2.5 px-4">Originado Por</th>
                  <th className="py-2.5 px-4">Monto Solicitado</th>
                  <th className="py-2.5 px-4">Estado</th>
                  <th className="py-2.5 px-4 text-right">Decisión Gerencial</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB]">
                {requests.map((r) => {
                  // Regla de Cuatro Ojos: Verificada en backend
                  const isCreatedBySelf = r.createdBy === currentUserFullName;
                  const canAct = r.status === PaymentRequestStatus.ENVIADA;

                  return (
                    <tr key={r.id} className="hover:bg-[#FBFBFA] transition">
                      <td className="py-3 px-4 font-mono font-bold text-[#37352F]">{r.requestCode}</td>
                      <td className="py-3 px-4 font-mono text-primary font-medium">{r.projectCode}</td>
                      <td className="py-3 px-4 text-[#787774]">{r.period}</td>
                      <td className="py-3 px-4 text-[#37352F] font-medium">{r.createdBy}</td>
                      <td className="py-3 px-4 font-mono font-bold text-[#37352F]">
                        ${r.totalAmountUSD.toFixed(2)} USD
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === PaymentRequestStatus.ENVIADA
                              ? 'bg-amber-100 text-amber-800'
                              : r.status === PaymentRequestStatus.APROBADA
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.status === PaymentRequestStatus.RECHAZADA
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {canAct ? (
                          isCreatedBySelf ? (
                            <span className="text-[10px] text-rose-600 font-semibold inline-flex items-center space-x-1">
                              <Shield className="w-3 h-3" />
                              <span>Regla Cuatro Ojos: Creada por usted</span>
                            </span>
                          ) : rejectingId === r.id ? (
                            <div className="flex items-center justify-end space-x-2">
                              <input
                                type="text"
                                placeholder="Motivo de rechazo..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="text-xs p-1 border rounded w-36"
                              />
                              <button
                                onClick={() => submitRejection(r.id)}
                                className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-semibold"
                              >
                                Confirmar
                              </button>
                              <button
                                onClick={() => setRejectingId(null)}
                                className="text-slate-400 text-xs"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                onClick={() => onApproveRequest(r.id)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-sm transition"
                              >
                                <Check className="w-3 h-3" />
                                <span>Aprobar</span>
                              </button>
                              <button
                                onClick={() => setRejectingId(r.id)}
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-[11px] transition"
                              >
                                <XCircle className="w-3 h-3" />
                                <span>Rechazar</span>
                              </button>
                            </div>
                          )
                        ) : (
                          <span className="text-[11px] text-[#9B9A97]">Procesada</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: ENTREGAS DE FONDOS FIFO */}
      {activeTab === 'pagos_fifo' && (
        <div className="space-y-4">
          <div className="pb-2 border-b border-[#EDEDEB]">
            <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
              <DollarSign className="w-5 h-5 text-primary" />
              <span>Entregas de Fondos con Imputación FIFO</span>
            </h2>
            <p className="text-xs text-[#787774] mt-0.5">
              Los pagos parciales se aplican estrictamente sobre la causación pendiente más antigua del investigador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-6 bg-white p-5 rounded-xl border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="font-bold text-sm text-[#37352F] flex items-center space-x-2">
                <span>Registrar Desembolso de Fondos</span>
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-[#787774] mb-1">Monto a Entregar (USD)</label>
                <input
                  type="number"
                  value={fifoAmount}
                  onChange={(e) => setFifoAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg border border-[#E9E9E7] font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#787774] mb-1">Método de Pago</label>
                <select className="w-full text-xs p-2 rounded-lg border border-[#E9E9E7] bg-[#F7F6F3]">
                  <option>TRANSFERENCIA BANCARIA INTERNACIONAL</option>
                  <option>ZELLE</option>
                  <option>EFECTIVO EN CUSTODIA</option>
                </select>
              </div>

              <button
                onClick={handleRunFifo}
                className="w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
              >
                Ejecutar Pago y Aplicar FIFO
              </button>

              {fifoResult && (
                <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-mono whitespace-pre-line leading-relaxed">
                  {fifoResult}
                </div>
              )}
            </div>

            <div className="md:col-span-6 bg-white p-5 rounded-xl border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <h3 className="font-bold text-sm text-[#37352F] mb-3">Algoritmo FIFO en Servidor</h3>
              <div className="space-y-3 text-xs text-[#5A5A58]">
                <div className="p-3 rounded-lg bg-[#F7F6F3] border border-[#E9E9E7]">
                  <span className="font-bold text-[#37352F] block mb-1">1. Cola de Deudas:</span>
                  <span>Las causaciones se ordenan por <code className="bg-white px-1 rounded">period_start_date ASC, created_at ASC</code>.</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F7F6F3] border border-[#E9E9E7]">
                  <span className="font-bold text-[#37352F] block mb-1">2. Amortización Progresiva:</span>
                  <span>Se salda cada cuota hasta agotar el monto entregado. Se generan registros inmutables en <code className="bg-white px-1 rounded">receipt_allocations</code>.</span>
                </div>
                <div className="p-3 rounded-lg bg-[#F7F6F3] border border-[#E9E9E7]">
                  <span className="font-bold text-[#37352F] block mb-1">3. Secuencia sin Huecos:</span>
                  <span>El recibo consume el siguiente número de la secuencia PostgreSQL atómica.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: RECIBOS INMUTABLES */}
      {activeTab === 'recibos' && (
        <div className="space-y-4">
          <div className="pb-2 border-b border-[#EDEDEB] flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-violet" />
                <span>Recibos Individuales Inmutables</span>
              </h2>
              <p className="text-xs text-[#787774] mt-0.5">
                Documentos de entrega legal con secuencia transaccional estricta sin saltos ni huecos.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-violet-100 text-violet">
              Numeración Correlativa Activa
            </span>
          </div>

          <div className="bg-white rounded-xl border border-[#E9E9E7] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] text-[#787774] font-semibold border-b border-[#E9E9E7]">
                <tr>
                  <th className="py-2.5 px-4">Número de Recibo</th>
                  <th className="py-2.5 px-4">Fecha Emisión</th>
                  <th className="py-2.5 px-4">Beneficiario</th>
                  <th className="py-2.5 px-4">Proyecto</th>
                  <th className="py-2.5 px-4">Monto Entregado</th>
                  <th className="py-2.5 px-4">Inmutabilidad</th>
                  <th className="py-2.5 px-4 text-right">PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB]">
                <tr className="hover:bg-[#FBFBFA]">
                  <td className="py-3 px-4 font-mono font-bold text-[#37352F]">REC-2026-000041</td>
                  <td className="py-3 px-4 text-[#787774]">2026-10-16 11:30</td>
                  <td className="py-3 px-4 font-semibold text-[#37352F]">Ing. Sofía Valderrama</td>
                  <td className="py-3 px-4 font-mono text-primary">QUI-02</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">$ 420.00 USD</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold">
                      Trigger Protegido
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-primary hover:underline font-semibold text-[11px]">
                      Descargar PDF
                    </button>
                  </td>
                </tr>
                <tr className="hover:bg-[#FBFBFA]">
                  <td className="py-3 px-4 font-mono font-bold text-[#37352F]">REC-2026-000040</td>
                  <td className="py-3 px-4 text-[#787774]">2026-10-15 16:45</td>
                  <td className="py-3 px-4 font-semibold text-[#37352F]">Dr. Alejandro Morales</td>
                  <td className="py-3 px-4 font-mono text-primary">FIS-01</td>
                  <td className="py-3 px-4 font-mono font-bold text-emerald-700">$ 850.00 USD</td>
                  <td className="py-3 px-4">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-semibold">
                      Trigger Protegido
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button className="text-primary hover:underline font-semibold text-[11px]">
                      Descargar PDF
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: CAJAS CHICAS */}
      {activeTab === 'caja_chica' && (
        <div className="space-y-4">
          <div className="pb-2 border-b border-[#EDEDEB] flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
                <PiggyBank className="w-5 h-5 text-amber-700" />
                <span>Control Mensual de Cajas Chicas</span>
              </h2>
              <p className="text-xs text-[#787774] mt-0.5">
                Flujo: Apertura del mes → Vales autorizados → Rendición con comprobantes → Arrastre de saldo.
              </p>
            </div>
            <button className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-sm transition">
              Aperturar Mes de Caja
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white p-5 rounded-xl border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                Período Octubre 2026: ABIERTO
              </span>
              <h3 className="font-bold text-sm text-[#37352F] mt-2 mb-1">Caja Chica Laboratorio Central</h3>
              <div className="text-xs text-[#787774] space-y-1">
                <div>Saldo Inicial Apertura: <strong>$ 500.00 USD</strong></div>
                <div>Vales Desembolsados: <strong>$ 180.00 USD</strong></div>
                <div>Saldo en Efectivo: <strong className="text-emerald-700 font-mono text-sm">$ 320.00 USD</strong></div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EDEDEB]">
                <button className="w-full py-1.5 rounded bg-slate-100 hover:bg-slate-200 text-[#37352F] text-xs font-medium transition">
                  Ver Vales del Mes
                </button>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                Período Septiembre 2026: CERRADO
              </span>
              <h3 className="font-bold text-sm text-[#37352F] mt-2 mb-1">Caja Chica Reactivos y Materiales</h3>
              <div className="text-xs text-[#787774] space-y-1">
                <div>Saldo de Cierre: <strong>$ 125.50 USD</strong></div>
                <div>Arrastre al Mes Siguiente: <strong className="text-primary font-mono">$ 125.50 USD</strong></div>
                <div>Estado de Rendición: <strong className="text-emerald-700">100% Rendido</strong></div>
              </div>
              <div className="mt-4 pt-3 border-t border-[#EDEDEB]">
                <span className="text-[11px] text-[#9B9A97] block text-center">Mes Conciliado y Cerrado</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
