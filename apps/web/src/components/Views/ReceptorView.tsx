import React, { useState } from 'react';
import {
  CheckCircle2,
  DollarSign,
  Receipt,
  PiggyBank,
  XCircle,
  Check,
  Shield,
  FileDown,
  Plus,
  Calendar,
} from 'lucide-react';
import { PaymentRequestStatus } from '@scienpay/shared';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { formatCurrency, formatDateTime, personFullName } from '../../lib/format.js';
import { useCausationBatch } from '../../hooks/useCausation.js';
import {
  useDisbursements,
  useDownloadReceiptPdf,
  useReceipts,
} from '../../hooks/useDisbursements.js';
import {
  useApprovePaymentRequest,
  useClosePaymentRequest,
  useDownloadPaymentRequestPdf,
  usePaymentRequests,
  useRejectPaymentRequest,
} from '../../hooks/usePaymentRequests.js';
import { usePersons } from '../../hooks/usePersons.js';
import { useProjects } from '../../hooks/useProjects.js';
import {
  useApprovePettyCashVoucher,
  useClosePettyCashPeriod,
  useDisbursePettyCashVoucher,
  usePettyCashes,
  usePettyCashPeriods,
  usePettyCashVouchers,
} from '../../hooks/usePettyCash.js';
import type { PaymentRequest, PettyCashVoucher } from '../../types/api.types.js';
import { DisbursementForm } from '../Forms/DisbursementForm.js';
import {
  CreatePettyCashForm,
  OpenPeriodForm,
  RenderVoucherForm,
  VoucherRequestForm,
} from '../Forms/PettyCashForms.js';
import { ItemDetailModal, type DetailModalData } from '../Modals/ItemDetailModal.js';
import { Button, FormField, SelectInput, TextArea } from '../ui/FormControls.js';
import { EmptyState, ErrorState, LoadingState, StatusBadge, statusTone } from '../ui/Feedback.js';
import { Modal } from '../ui/Modal.js';
import { PageHeader, SectionBanner } from '../ui/PageHeader.js';

interface ReceptorViewProps {
  activeTab: string;
}

const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export const ReceptorView: React.FC<ReceptorViewProps> = ({ activeTab }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const requestsQuery = usePaymentRequests();
  const personsQuery = usePersons();
  const projectsQuery = useProjects();
  const disbursementsQuery = useDisbursements();
  const receiptsQuery = useReceipts();
  const pettyCashesQuery = usePettyCashes();

  const approveRequest = useApprovePaymentRequest();
  const rejectRequest = useRejectPaymentRequest();
  const closeRequest = useClosePaymentRequest();
  const downloadRequestPdf = useDownloadPaymentRequestPdf();
  const downloadReceiptPdf = useDownloadReceiptPdf();
  const approveVoucher = useApprovePettyCashVoucher();
  const disburseVoucher = useDisbursePettyCashVoucher();
  const closePeriod = useClosePettyCashPeriod();

  const [selectedDetail, setSelectedDetail] = useState<DetailModalData | null>(null);
  const [rejectingRequest, setRejectingRequest] = useState<PaymentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedApprovedId, setSelectedApprovedId] = useState<string | null>(null);
  const [showCreateCash, setShowCreateCash] = useState(false);
  const [showOpenPeriod, setShowOpenPeriod] = useState(false);
  const [showVoucherRequest, setShowVoucherRequest] = useState(false);
  const [voucherToRender, setVoucherToRender] = useState<PettyCashVoucher | null>(null);
  const [selectedCashId, setSelectedCashId] = useState<string | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);

  const cashes = pettyCashesQuery.data ?? [];
  const activeCash = cashes.find((cash) => cash.id === selectedCashId) ?? cashes[0];

  const periodsQuery = usePettyCashPeriods(activeCash?.id ?? null);
  const periods = periodsQuery.data ?? [];
  const activePeriod = periods.find((period) => period.id === selectedPeriodId) ?? periods[0];

  const vouchersQuery = usePettyCashVouchers(activePeriod?.id ?? null);
  const vouchers = vouchersQuery.data ?? [];

  const requests = requestsQuery.data ?? [];
  const persons = personsQuery.data ?? [];
  const projects = projectsQuery.data ?? [];
  const approvedRequests = requests.filter(
    (request) => request.status === PaymentRequestStatus.APROBADA,
  );
  const selectedApprovedRequest =
    approvedRequests.find((request) => request.id === selectedApprovedId) ?? approvedRequests[0];

  const batchDetailQuery = useCausationBatch(selectedApprovedRequest?.causationBatchId ?? null);

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const personById = new Map(persons.map((person) => [person.id, person]));
  const requestById = new Map(requests.map((request) => [request.id, request]));

  const pendingCount = requests.filter(
    (request) => request.status === PaymentRequestStatus.ENVIADA,
  ).length;

  const handleApprove = async (request: PaymentRequest) => {
    if (user && request.createdByUserId === user.id) {
      showToast('Regla de Cuatro Ojos: no puede aprobar una solicitud creada por usted', 'error');
      return;
    }
    try {
      await approveRequest.mutateAsync(request.id);
      showToast(`Solicitud ${request.requestCode} aprobada`, 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleReject = async () => {
    if (!rejectingRequest) return;
    if (rejectionReason.trim().length < 10) {
      showToast('El motivo de rechazo debe tener al menos 10 caracteres', 'error');
      return;
    }
    try {
      await rejectRequest.mutateAsync({
        id: rejectingRequest.id,
        input: { rejectionReason: rejectionReason.trim() },
      });
      showToast(`Solicitud ${rejectingRequest.requestCode} rechazada`, 'success');
      setRejectingRequest(null);
      setRejectionReason('');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleDownloadRequestPdf = async (id: string) => {
    try {
      await downloadRequestPdf.mutateAsync(id);
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleCloseRequest = async (request: PaymentRequest) => {
    try {
      await closeRequest.mutateAsync(request.id);
      showToast(`Solicitud ${request.requestCode} cerrada`, 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleDownloadReceiptPdf = async (id: string) => {
    try {
      await downloadReceiptPdf.mutateAsync(id);
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleVoucherAction = async (
    action: 'approve' | 'disburse',
    voucher: PettyCashVoucher,
  ) => {
    try {
      if (action === 'approve') {
        await approveVoucher.mutateAsync({ id: voucher.id });
        showToast(`Vale ${voucher.voucherNumber} aprobado`, 'success');
      } else {
        await disburseVoucher.mutateAsync({ id: voucher.id });
        showToast(`Vale ${voucher.voucherNumber} desembolsado`, 'success');
      }
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleClosePeriod = async () => {
    if (!activePeriod) return;
    try {
      await closePeriod.mutateAsync(activePeriod.id);
      showToast('Período de caja chica cerrado correctamente', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <SectionBanner tone="green" title="Segregación de Funciones: Perfil Receptor (Gerente de Administración)">
        Recibe, evalúa, aprueba o rechaza solicitudes de pago, registra entregas de fondos por FIFO,
        emite recibos y administra cajas chicas. <strong>Restricción:</strong> no puede crear
        proyectos, personas ni originar causaciones.
      </SectionBanner>

      {activeTab === 'solicitudes_bandeja' && (
        <div className="space-y-4">
          <PageHeader
            title="Bandeja de Fiscalización y Aprobación de Solicitudes"
            subtitle="Evaluación con regla de cuatro ojos estricta: ningún usuario puede autorizar sus propias solicitudes."
            icon={<CheckCircle2 className="w-5 h-5 text-emerald-700 dark:text-emerald-400" />}
            actions={<StatusBadge label={`${pendingCount} Pendientes de Revisión`} tone="amber" />}
          />

          {requestsQuery.isLoading && <LoadingState message="Cargando solicitudes…" />}
          {requestsQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(requestsQuery.error)}
              onRetry={() => void requestsQuery.refetch()}
            />
          )}

          {requestsQuery.data && (
            <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold border-b border-[#E9E9E7] dark:border-[#2F2F2F]">
                  <tr>
                    <th className="py-2.5 px-4">Código</th>
                    <th className="py-2.5 px-4">Proyecto</th>
                    <th className="py-2.5 px-4">Período</th>
                    <th className="py-2.5 px-4">Monto Solicitado</th>
                    <th className="py-2.5 px-4">Estado</th>
                    <th className="py-2.5 px-4 text-right">Decisión Gerencial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                  {requests.map((request) => {
                    const isCreatedBySelf = Boolean(user && request.createdByUserId === user.id);
                    const canAct = request.status === PaymentRequestStatus.ENVIADA;

                    return (
                      <tr
                        key={request.id}
                        onClick={() =>
                          setSelectedDetail({
                            type: 'request',
                            data: request,
                            projectCode: projectById.get(request.projectId)?.code,
                            createdByName: isCreatedBySelf ? user?.fullName : undefined,
                          })
                        }
                        className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525] transition cursor-pointer"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-[#37352F] dark:text-white">
                          {request.requestCode}
                        </td>
                        <td className="py-3 px-4 font-mono text-primary dark:text-primary-light font-medium">
                          {projectById.get(request.projectId)?.code ?? '—'}
                        </td>
                        <td className="py-3 px-4 text-[#787774] dark:text-[#9B9A97]">
                          {request.periodDescription}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#37352F] dark:text-white">
                          ${formatCurrency(request.totalAmountUSD)} USD
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge label={request.status} tone={statusTone(request.status)} />
                        </td>
                        <td
                          className="py-3 px-4 text-right"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {canAct ? (
                            isCreatedBySelf ? (
                              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-semibold inline-flex items-center space-x-1">
                                <Shield className="w-3 h-3" />
                                <span>Regla Cuatro Ojos: Creada por usted</span>
                              </span>
                            ) : (
                              <div className="flex items-center justify-end space-x-1">
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => void handleApprove(request)}
                                  disabled={approveRequest.isPending}
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Aprobar</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  onClick={() => {
                                    setRejectingRequest(request);
                                    setRejectionReason('');
                                  }}
                                >
                                  <XCircle className="w-3 h-3" />
                                  <span>Rechazar</span>
                                </Button>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => void handleDownloadRequestPdf(request.id)}
                                  disabled={downloadRequestPdf.isPending}
                                >
                                  <FileDown className="w-3 h-3" />
                                  <span>PDF</span>
                                </Button>
                              </div>
                            )
                          ) : (
                            <div className="flex items-center justify-end space-x-1">
                              {request.status === PaymentRequestStatus.ENTREGADA && (
                                <Button
                                  size="sm"
                                  variant="success"
                                  onClick={() => void handleCloseRequest(request)}
                                  disabled={closeRequest.isPending}
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Cerrar</span>
                                </Button>
                              )}
                              <span className="text-[11px] text-[#9B9A97] dark:text-[#787774]">
                                {request.status === PaymentRequestStatus.ENTREGADA
                                  ? 'Entregada'
                                  : 'Procesada'}
                              </span>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void handleDownloadRequestPdf(request.id)}
                                disabled={downloadRequestPdf.isPending}
                              >
                                <FileDown className="w-3 h-3" />
                                <span>PDF</span>
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {requests.length === 0 && <EmptyState message="No hay solicitudes registradas." />}
            </div>
          )}
        </div>
      )}

      {activeTab === 'pagos_fifo' && (
        <div className="space-y-4">
          <PageHeader
            title="Entregas de Fondos con Imputación FIFO"
            subtitle="Los pagos se aplican estrictamente sobre la causación pendiente más antigua del investigador, dentro de una transacción con bloqueo."
            icon={<DollarSign className="w-5 h-5 text-primary dark:text-primary-light" />}
          />

          {requestsQuery.isLoading && <LoadingState message="Cargando solicitudes aprobadas…" />}
          {requestsQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(requestsQuery.error)}
              onRetry={() => void requestsQuery.refetch()}
            />
          )}

          {requestsQuery.data && approvedRequests.length === 0 && (
            <EmptyState message="No hay solicitudes aprobadas pendientes de entrega de fondos." />
          )}

          {selectedApprovedRequest && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-8 bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="font-bold text-sm text-[#37352F] dark:text-white">
                    Registrar Desembolso de Fondos
                  </h3>
                  <div className="w-64">
                    <SelectInput
                      value={selectedApprovedRequest.id}
                      onChange={(event) => setSelectedApprovedId(event.target.value)}
                    >
                      {approvedRequests.map((request) => (
                        <option key={request.id} value={request.id}>
                          {request.requestCode} — ${formatCurrency(request.totalAmountUSD)}
                        </option>
                      ))}
                    </SelectInput>
                  </div>
                </div>

                {batchDetailQuery.isLoading && <LoadingState message="Cargando lote de causación…" />}
                {batchDetailQuery.isError && (
                  <ErrorState
                    message={getApiErrorMessage(batchDetailQuery.error)}
                    onRetry={() => void batchDetailQuery.refetch()}
                  />
                )}
                {batchDetailQuery.data && (
                  <DisbursementForm
                    key={selectedApprovedRequest.id}
                    request={selectedApprovedRequest}
                    batch={batchDetailQuery.data}
                    persons={persons}
                    onSuccess={() => setSelectedApprovedId(null)}
                  />
                )}
              </div>

              <div className="xl:col-span-4 bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
                <h3 className="font-bold text-sm text-[#37352F] dark:text-white mb-3">
                  Algoritmo FIFO en Servidor
                </h3>
                <div className="space-y-3 text-xs text-[#5A5A58] dark:text-[#A4A4A2]">
                  <div className="p-3 rounded-lg bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                    <span className="font-bold text-[#37352F] dark:text-white block mb-1">
                      1. Cola de Deudas:
                    </span>
                    <span>
                      Las causaciones se ordenan por{' '}
                      <code className="bg-white dark:bg-[#1E1E1E] px-1 rounded text-primary">
                        period_start_date ASC, id ASC
                      </code>
                      .
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                    <span className="font-bold text-[#37352F] dark:text-white block mb-1">
                      2. Amortización Progresiva:
                    </span>
                    <span>
                      Se salda cada cuota hasta agotar el monto entregado. Se generan registros
                      inmutables en{' '}
                      <code className="bg-white dark:bg-[#1E1E1E] px-1 rounded text-primary">
                        receipt_allocations
                      </code>
                      .
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                    <span className="font-bold text-[#37352F] dark:text-white block mb-1">
                      3. Secuencia sin Huecos:
                    </span>
                    <span>
                      El recibo consume el siguiente número de la secuencia PostgreSQL atómica dentro
                      de la misma transacción.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-[#37352F] dark:text-white">
              Desembolsos Registrados
            </h3>
            {disbursementsQuery.isLoading && <LoadingState message="Cargando desembolsos…" />}
            {disbursementsQuery.isError && (
              <ErrorState
                message={getApiErrorMessage(disbursementsQuery.error)}
                onRetry={() => void disbursementsQuery.refetch()}
              />
            )}
            {disbursementsQuery.data && (
              <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Fecha</th>
                      <th className="py-2.5 px-4">Solicitud</th>
                      <th className="py-2.5 px-4">Método</th>
                      <th className="py-2.5 px-4">Referencia</th>
                      <th className="py-2.5 px-4 text-right">Monto Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                    {disbursementsQuery.data.map((disbursement) => (
                      <tr key={disbursement.id}>
                        <td className="py-2.5 px-4 text-[#787774] dark:text-[#9B9A97]">
                          {formatDateTime(disbursement.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[#37352F] dark:text-white">
                          {requestById.get(disbursement.paymentRequestId)?.requestCode ?? '—'}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge label={disbursement.paymentMethod} tone="blue" />
                        </td>
                        <td className="py-2.5 px-4 text-[#787774] dark:text-[#9B9A97]">
                          {disbursement.referenceNumber || '—'}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-[#37352F] dark:text-white">
                          ${formatCurrency(disbursement.totalAmount)} USD
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {disbursementsQuery.data.length === 0 && (
                  <EmptyState message="No se han registrado desembolsos." />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'recibos' && (
        <div className="space-y-4">
          <PageHeader
            title="Recibos Individuales Inmutables"
            subtitle="Documentos de entrega legal con secuencia transaccional estricta sin saltos ni huecos."
            icon={<Receipt className="w-5 h-5 text-violet dark:text-violet-light" />}
            actions={<StatusBadge label="Numeración Correlativa Activa" tone="violet" />}
          />

          {receiptsQuery.isLoading && <LoadingState message="Cargando recibos…" />}
          {receiptsQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(receiptsQuery.error)}
              onRetry={() => void receiptsQuery.refetch()}
            />
          )}

          {receiptsQuery.data && (
            <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold border-b border-[#E9E9E7] dark:border-[#2F2F2F]">
                  <tr>
                    <th className="py-2.5 px-4">Número de Recibo</th>
                    <th className="py-2.5 px-4">Fecha Emisión</th>
                    <th className="py-2.5 px-4">Beneficiario</th>
                    <th className="py-2.5 px-4">Proyecto</th>
                    <th className="py-2.5 px-4">Monto Entregado</th>
                    <th className="py-2.5 px-4">Deuda Restante</th>
                    <th className="py-2.5 px-4 text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                  {receiptsQuery.data.map((receipt) => {
                    const person = personById.get(receipt.personId);
                    const project = projectById.get(receipt.projectId);
                    return (
                      <tr key={receipt.id} className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525]">
                        <td className="py-3 px-4 font-mono font-bold text-[#37352F] dark:text-white">
                          {receipt.receiptNumber}
                        </td>
                        <td className="py-3 px-4 text-[#787774] dark:text-[#9B9A97]">
                          {formatDateTime(receipt.issuedAt)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#37352F] dark:text-white">
                          {person ? personFullName(person) : receipt.personId}
                        </td>
                        <td className="py-3 px-4 font-mono text-primary dark:text-primary-light">
                          {project?.code ?? '—'}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          ${formatCurrency(receipt.totalAmountUSD)} USD
                        </td>
                        <td className="py-3 px-4 font-mono text-[#787774] dark:text-[#9B9A97]">
                          ${formatCurrency(receipt.remainingDebtAfterUSD)} USD
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => void handleDownloadReceiptPdf(receipt.id)}
                            disabled={downloadReceiptPdf.isPending}
                          >
                            <FileDown className="w-3 h-3" />
                            <span>Descargar PDF</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {receiptsQuery.data.length === 0 && (
                <EmptyState message="Aún no se han emitido recibos." />
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'caja_chica' && (
        <div className="space-y-4">
          <PageHeader
            title="Control Mensual de Cajas Chicas"
            subtitle="Flujo: apertura del mes → vales autorizados → rendición con comprobantes → arrastre de saldo."
            icon={<PiggyBank className="w-5 h-5 text-amber-700 dark:text-amber-400" />}
            actions={
              <>
                <Button size="sm" variant="secondary" onClick={() => setShowCreateCash(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Caja</span>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowOpenPeriod(true)}
                  disabled={!activeCash}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Aperturar Período</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => setShowVoucherRequest(true)}
                  disabled={!activePeriod || activePeriod.status !== 'ABIERTO'}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Solicitar Vale</span>
                </Button>
              </>
            }
          />

          {pettyCashesQuery.isLoading && <LoadingState message="Cargando cajas chicas…" />}
          {pettyCashesQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(pettyCashesQuery.error)}
              onRetry={() => void pettyCashesQuery.refetch()}
            />
          )}

          {pettyCashesQuery.data && cashes.length === 0 && (
            <EmptyState message="No hay cajas chicas registradas. Cree la primera con «Nueva Caja»." />
          )}

          {activeCash && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              <div className="xl:col-span-4 space-y-4">
                <div className="bg-white dark:bg-[#202020] p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F]">
                  <h3 className="text-xs font-bold text-[#37352F] dark:text-white mb-2">
                    Cajas Chicas
                  </h3>
                  <div className="space-y-1">
                    {cashes.map((cash) => (
                      <button
                        key={cash.id}
                        onClick={() => {
                          setSelectedCashId(cash.id);
                          setSelectedPeriodId(null);
                        }}
                        className={`w-full text-left p-2.5 rounded-lg border transition ${
                          cash.id === activeCash.id
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-[#E9E9E7] dark:border-[#2F2F2F] hover:bg-[#F7F6F3] dark:hover:bg-[#262626]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-[#37352F] dark:text-white">
                            {cash.name}
                          </span>
                          <StatusBadge label={cash.status} tone={statusTone(cash.status)} />
                        </div>
                        <div className="text-[10px] text-[#9B9A97] mt-0.5">
                          Custodio: {cash.custodianName}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white dark:bg-[#202020] p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F]">
                  <h3 className="text-xs font-bold text-[#37352F] dark:text-white mb-2">
                    Períodos de {activeCash.name}
                  </h3>
                  {periodsQuery.isLoading && <LoadingState message="Cargando períodos…" />}
                  {periodsQuery.isError && (
                    <ErrorState
                      message={getApiErrorMessage(periodsQuery.error)}
                      onRetry={() => void periodsQuery.refetch()}
                    />
                  )}
                  {periodsQuery.data && periods.length === 0 && (
                    <p className="text-[11px] text-[#9B9A97]">No hay períodos aperturados.</p>
                  )}
                  <div className="space-y-1">
                    {periods.map((period) => (
                      <button
                        key={period.id}
                        onClick={() => setSelectedPeriodId(period.id)}
                        className={`w-full text-left p-2 rounded-lg border transition ${
                          period.id === activePeriod?.id
                            ? 'border-primary bg-primary/5 dark:bg-primary/10'
                            : 'border-[#E9E9E7] dark:border-[#2F2F2F] hover:bg-[#F7F6F3] dark:hover:bg-[#262626]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-[#37352F] dark:text-white">
                            {MONTH_NAMES[period.periodMonth - 1]} {period.periodYear}
                          </span>
                          <StatusBadge label={period.status} tone={statusTone(period.status)} />
                        </div>
                        <div className="text-[10px] text-[#9B9A97] mt-0.5">
                          Apertura: ${formatCurrency(period.openingBalance)} · Saldo:{' '}
                          ${formatCurrency(period.closingBalance)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="xl:col-span-8 space-y-4">
                {!activePeriod && (
                  <EmptyState message="Seleccione o aperture un período para gestionar vales." />
                )}

                {activePeriod && (
                  <>
                    <div className="bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F]">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div>
                          <h3 className="font-bold text-sm text-[#37352F] dark:text-white">
                            {MONTH_NAMES[activePeriod.periodMonth - 1]} {activePeriod.periodYear}
                          </h3>
                          <span className="text-[10px] text-[#9B9A97]">
                            {activeCash.name} · {activeCash.custodianName}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <StatusBadge
                            label={activePeriod.status}
                            tone={statusTone(activePeriod.status)}
                          />
                          {activePeriod.status === 'ABIERTO' && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void handleClosePeriod()}
                              disabled={closePeriod.isPending}
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Cerrar Período</span>
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                        <div className="p-3 rounded-lg bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                          <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block">
                            Saldo de Apertura
                          </span>
                          <span className="font-mono font-bold text-[#37352F] dark:text-white">
                            ${formatCurrency(activePeriod.openingBalance)}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                          <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block">
                            Vales Desembolsados
                          </span>
                          <span className="font-mono font-bold text-[#37352F] dark:text-white">
                            ${formatCurrency(activePeriod.disbursedTotal)}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                          <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block">
                            Monto Rendido
                          </span>
                          <span className="font-mono font-bold text-[#37352F] dark:text-white">
                            ${formatCurrency(activePeriod.renderedTotal)}
                          </span>
                        </div>
                        <div className="p-3 rounded-lg bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333]">
                          <span className="text-[10px] text-[#787774] dark:text-[#9B9A97] block">
                            Saldo en Efectivo
                          </span>
                          <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                            ${formatCurrency(activePeriod.closingBalance)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold">
                          <tr>
                            <th className="py-2.5 px-4">Vale</th>
                            <th className="py-2.5 px-4">Proyecto</th>
                            <th className="py-2.5 px-4">Concepto</th>
                            <th className="py-2.5 px-4">Solicitado</th>
                            <th className="py-2.5 px-4">Rendido</th>
                            <th className="py-2.5 px-4">Estado</th>
                            <th className="py-2.5 px-4 text-right">Acciones</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                          {vouchers.map((voucher) => (
                            <tr key={voucher.id}>
                              <td className="py-2.5 px-4 font-mono font-bold text-[#37352F] dark:text-white">
                                {voucher.voucherNumber}
                              </td>
                              <td className="py-2.5 px-4 font-mono text-primary dark:text-primary-light">
                                {projectById.get(voucher.projectId)?.code ?? '—'}
                              </td>
                              <td className="py-2.5 px-4 text-[#787774] dark:text-[#9B9A97] max-w-xs truncate">
                                {voucher.purpose}
                              </td>
                              <td className="py-2.5 px-4 font-mono">
                                ${formatCurrency(voucher.requestedAmount)}
                              </td>
                              <td className="py-2.5 px-4 font-mono">
                                ${formatCurrency(voucher.renderedAmount)}
                              </td>
                              <td className="py-2.5 px-4">
                                <StatusBadge label={voucher.status} tone={statusTone(voucher.status)} />
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                {voucher.status === 'SOLICITADO' && (
                                  <Button
                                    size="sm"
                                    variant="success"
                                    onClick={() => void handleVoucherAction('approve', voucher)}
                                    disabled={approveVoucher.isPending}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Aprobar</span>
                                  </Button>
                                )}
                                {voucher.status === 'APROBADO' && (
                                  <Button
                                    size="sm"
                                    onClick={() => void handleVoucherAction('disburse', voucher)}
                                    disabled={disburseVoucher.isPending}
                                  >
                                    <DollarSign className="w-3 h-3" />
                                    <span>Desembolsar</span>
                                  </Button>
                                )}
                                {voucher.status === 'DESEMBOLSADO' && (
                                  <Button
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setVoucherToRender(voucher)}
                                  >
                                    <Receipt className="w-3 h-3" />
                                    <span>Rendir</span>
                                  </Button>
                                )}
                                {!['SOLICITADO', 'APROBADO', 'DESEMBOLSADO'].includes(
                                  voucher.status,
                                ) && <span className="text-[11px] text-[#9B9A97]">—</span>}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {vouchersQuery.isLoading && <LoadingState message="Cargando vales…" />}
                      {vouchersQuery.isError && (
                        <ErrorState
                          message={getApiErrorMessage(vouchersQuery.error)}
                          onRetry={() => void vouchersQuery.refetch()}
                        />
                      )}
                      {vouchersQuery.data && vouchers.length === 0 && (
                        <EmptyState message="No hay vales registrados en este período." />
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <Modal
        open={Boolean(rejectingRequest)}
        title="Rechazar Solicitud de Pago"
        subtitle="La solicitud pasará a estado RECHAZADA y el motivo quedará auditado."
        onClose={() => setRejectingRequest(null)}
      >
        <div className="space-y-4">
          <p className="text-[11px] text-[#787774] dark:text-[#9B9A97]">
            Solicitud{' '}
            <strong className="text-[#37352F] dark:text-white">
              {rejectingRequest?.requestCode}
            </strong>{' '}
            por ${formatCurrency(rejectingRequest?.totalAmountUSD ?? '0')} USD.
          </p>
          <FormField label="Motivo del rechazo" required>
            <TextArea
              rows={3}
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              placeholder="Explique el motivo del rechazo (mínimo 10 caracteres)…"
            />
          </FormField>
          <div className="flex items-center justify-end space-x-2">
            <Button variant="secondary" onClick={() => setRejectingRequest(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void handleReject()} disabled={rejectRequest.isPending}>
              {rejectRequest.isPending ? 'Rechazando…' : 'Confirmar Rechazo'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showCreateCash}
        title="Nueva Caja Chica"
        subtitle="Asocie la caja a uno o más proyectos científicos."
        onClose={() => setShowCreateCash(false)}
      >
        <CreatePettyCashForm projects={projects} onSuccess={() => setShowCreateCash(false)} />
      </Modal>

      <Modal
        open={showOpenPeriod}
        title="Aperturar Período de Caja Chica"
        subtitle={
          activeCash
            ? `Caja: ${activeCash.name}. El período anterior debe estar cerrado.`
            : 'Seleccione una caja chica.'
        }
        onClose={() => setShowOpenPeriod(false)}
      >
        {activeCash && (
          <OpenPeriodForm cashId={activeCash.id} onSuccess={() => setShowOpenPeriod(false)} />
        )}
      </Modal>

      <Modal
        open={showVoucherRequest}
        title="Solicitar Vale de Caja Chica"
        subtitle={
          activePeriod
            ? `Período ${MONTH_NAMES[activePeriod.periodMonth - 1]} ${activePeriod.periodYear}`
            : 'Seleccione un período abierto.'
        }
        onClose={() => setShowVoucherRequest(false)}
      >
        {activePeriod && (
          <VoucherRequestForm
            periodId={activePeriod.id}
            projects={projects}
            onSuccess={() => setShowVoucherRequest(false)}
          />
        )}
      </Modal>

      <Modal
        open={Boolean(voucherToRender)}
        title="Rendición de Vale"
        subtitle={voucherToRender ? `Vale ${voucherToRender.voucherNumber}` : undefined}
        onClose={() => setVoucherToRender(null)}
      >
        {voucherToRender && (
          <RenderVoucherForm
            voucherId={voucherToRender.id}
            onSuccess={() => setVoucherToRender(null)}
          />
        )}
      </Modal>

      <ItemDetailModal modalData={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </div>
  );
};
