import React, { useState } from 'react';
import {
  FolderKanban,
  UserCheck,
  Layers,
  FileSpreadsheet,
  FileText,
  Plus,
  Send,
  ExternalLink,
  FileDown,
  Ban,
  Eye,
} from 'lucide-react';
import { PaymentRequestStatus } from '@scienpay/shared';
import { useAuth } from '../../context/AuthContext.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { formatCurrency, formatDate, personFullName } from '../../lib/format.js';
import { useAssignments, useTerminateAssignment } from '../../hooks/useAssignments.js';
import {
  useAnnulCausationBatch,
  useCausationBatch,
  useCausationBatches,
} from '../../hooks/useCausation.js';
import { usePaymentGroups } from '../../hooks/usePaymentGroups.js';
import {
  useDownloadPaymentRequestPdf,
  usePaymentRequests,
  useSendPaymentRequest,
} from '../../hooks/usePaymentRequests.js';
import { usePersons } from '../../hooks/usePersons.js';
import { useProjects } from '../../hooks/useProjects.js';
import type { Assignment, CausationBatch } from '../../types/api.types.js';
import { ItemDetailModal, type DetailModalData } from '../Modals/ItemDetailModal.js';
import { AssignmentForm } from '../Forms/AssignmentForm.js';
import { CausationForm } from '../Forms/CausationForm.js';
import { PaymentGroupForm } from '../Forms/PaymentGroupForm.js';
import { PaymentRequestForm } from '../Forms/PaymentRequestForm.js';
import { PersonForm } from '../Forms/PersonForm.js';
import { ProjectForm } from '../Forms/ProjectForm.js';
import { Button, FormField, TextArea, TextInput } from '../ui/FormControls.js';
import { EmptyState, ErrorState, LoadingState, StatusBadge, statusTone } from '../ui/Feedback.js';
import { Modal } from '../ui/Modal.js';
import { PageHeader, SectionBanner } from '../ui/PageHeader.js';

interface GeneratorViewProps {
  activeTab: string;
}

export const GeneratorView: React.FC<GeneratorViewProps> = ({ activeTab }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const projectsQuery = useProjects();
  const personsQuery = usePersons();
  const groupsQuery = usePaymentGroups();
  const assignmentsQuery = useAssignments();
  const batchesQuery = useCausationBatches();
  const requestsQuery = usePaymentRequests();

  const sendRequest = useSendPaymentRequest();
  const downloadPdf = useDownloadPaymentRequestPdf();
  const annulBatch = useAnnulCausationBatch();
  const terminateAssignment = useTerminateAssignment();

  const [selectedDetail, setSelectedDetail] = useState<DetailModalData | null>(null);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showPersonForm, setShowPersonForm] = useState(false);
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [showAssignmentForm, setShowAssignmentForm] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [batchToAnnul, setBatchToAnnul] = useState<CausationBatch | null>(null);
  const [annulReason, setAnnulReason] = useState('');
  const [assignmentToTerminate, setAssignmentToTerminate] = useState<Assignment | null>(null);
  const [terminateDate, setTerminateDate] = useState('');
  const [terminateReason, setTerminateReason] = useState('');

  const batchDetailQuery = useCausationBatch(selectedBatchId);

  const projects = projectsQuery.data ?? [];
  const persons = personsQuery.data ?? [];
  const groups = groupsQuery.data ?? [];
  const assignments = assignmentsQuery.data ?? [];
  const batches = batchesQuery.data ?? [];
  const requests = (requestsQuery.data ?? []).filter(
    (request) => !user || request.createdByUserId === user.id,
  );

  const projectById = new Map(projects.map((project) => [project.id, project]));
  const personById = new Map(persons.map((person) => [person.id, person]));
  const groupById = new Map(groups.map((group) => [group.id, group]));

  const handleSendRequest = async (id: string) => {
    try {
      await sendRequest.mutateAsync(id);
      showToast('Solicitud enviada a revisión', 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleDownloadPdf = async (id: string) => {
    try {
      await downloadPdf.mutateAsync(id);
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleAnnul = async () => {
    if (!batchToAnnul) return;
    if (annulReason.trim().length < 10) {
      showToast('La justificación debe tener al menos 10 caracteres', 'error');
      return;
    }

    try {
      await annulBatch.mutateAsync({
        id: batchToAnnul.id,
        input: { annulmentReason: annulReason.trim() },
      });
      showToast('Lote de causación anulado', 'success');
      setBatchToAnnul(null);
      setAnnulReason('');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleTerminate = async () => {
    if (!assignmentToTerminate) return;
    if (!terminateDate || terminateReason.trim().length < 5) {
      showToast('Indique la fecha de fin y una justificación de al menos 5 caracteres', 'error');
      return;
    }

    try {
      await terminateAssignment.mutateAsync({
        id: assignmentToTerminate.id,
        input: { endDate: terminateDate, reason: terminateReason.trim() },
      });
      showToast('Asignación finalizada correctamente', 'success');
      setAssignmentToTerminate(null);
      setTerminateDate('');
      setTerminateReason('');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  return (
    <div className="space-y-6">
      <SectionBanner tone="blue" title="Segregación de Funciones: Perfil Generador (Coordinador General)">
        Gestiona proyectos científicos, beneficiarios, asignaciones y genera causaciones y
        solicitudes de pago. <strong>Regla de Cuatro Ojos:</strong> tiene terminantemente prohibido
        aprobar solicitudes y registrar entrega de fondos.
      </SectionBanner>

      {activeTab === 'proyectos' && (
        <div className="space-y-4">
          <PageHeader
            title="Proyectos de Investigación Científica"
            subtitle="Catálogo de proyectos clasificados por área y ámbito. Haga clic en una tarjeta para ver sus detalles."
            icon={<FolderKanban className="w-5 h-5 text-primary dark:text-primary-light" />}
            actions={
              <Button size="sm" onClick={() => setShowProjectForm(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>Nuevo Proyecto</span>
              </Button>
            }
          />

          {projectsQuery.isLoading && <LoadingState message="Cargando proyectos…" />}
          {projectsQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(projectsQuery.error)}
              onRetry={() => void projectsQuery.refetch()}
            />
          )}

          {projectsQuery.data && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {projects.map((project) => (
                  <div
                    key={project.id}
                    onClick={() => setSelectedDetail({ type: 'project', data: project })}
                    className="bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between cursor-pointer hover:border-primary/60 dark:hover:border-primary/60 hover:shadow-md transition-all duration-200 group"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-[#2A2A2A] text-[#37352F] dark:text-white">
                          {project.code}
                        </span>
                        <StatusBadge label={project.area} tone={statusTone(project.area)} />
                      </div>
                      <h3 className="font-bold text-sm text-[#37352F] dark:text-white mb-1 group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                      <div className="text-[11px] text-[#787774] dark:text-[#9B9A97] space-y-0.5 mt-2">
                        <div>
                          Ámbito:{' '}
                          <strong className="text-[#37352F] dark:text-white">{project.scope}</strong>
                        </div>
                        <div>
                          Vigencia: {formatDate(project.startDate)} al{' '}
                          {project.endDate ? formatDate(project.endDate) : 'sin fecha de cierre'}
                        </div>
                        <div>
                          Estado:{' '}
                          <strong className="text-[#37352F] dark:text-white">{project.status}</strong>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[#EDEDEB] dark:border-[#2F2F2F] flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[#787774] dark:text-[#9B9A97] block text-[10px]">
                          Presupuesto Asignado:
                        </span>
                        <span className="font-bold text-[#37352F] dark:text-white font-mono">
                          ${formatCurrency(project.budgetUSD)} USD
                        </span>
                      </div>
                      <span className="text-[10px] text-primary dark:text-primary-light font-medium flex items-center space-x-1 group-hover:underline">
                        <span>Detalles</span>
                        <ExternalLink className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {projects.length === 0 && (
                <EmptyState message="No hay proyectos registrados. Cree el primero con «Nuevo Proyecto»." />
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'beneficiarios' && (
        <div className="space-y-4">
          <PageHeader
            title="Personal Beneficiario de Asignaciones"
            subtitle="Investigadores y técnicos que reciben estipendios científicos en dólares (USD)."
            icon={<UserCheck className="w-5 h-5 text-secondary dark:text-secondary-light" />}
            actions={
              <Button size="sm" onClick={() => setShowPersonForm(true)}>
                <Plus className="w-3.5 h-3.5" />
                <span>Registrar Beneficiario</span>
              </Button>
            }
          />

          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-[#252525] border border-[#E9E9E7] dark:border-[#2F2F2F] text-xs text-[#5A5A58] dark:text-[#A4A4A2] flex items-center space-x-2">
            <span className="font-bold text-primary dark:text-primary-light">📌 Regla de Negocio:</span>
            <span>
              Los beneficiarios <strong>NO tienen usuario en el sistema</strong>. Son personas
              registradas exclusivamente como datos de pago y no tienen credenciales de acceso.
            </span>
          </div>

          {personsQuery.isLoading && <LoadingState message="Cargando beneficiarios…" />}
          {personsQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(personsQuery.error)}
              onRetry={() => void personsQuery.refetch()}
            />
          )}

          {personsQuery.data && (
            <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold border-b border-[#E9E9E7] dark:border-[#2F2F2F]">
                  <tr>
                    <th className="py-2.5 px-4">Documento Identidad</th>
                    <th className="py-2.5 px-4">Nombre Completo</th>
                    <th className="py-2.5 px-4">Especialidad / Cargo</th>
                    <th className="py-2.5 px-4">Correo Contacto</th>
                    <th className="py-2.5 px-4">Acceso al Sistema</th>
                    <th className="py-2.5 px-4">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                  {persons.map((person) => (
                    <tr key={person.id} className="hover:bg-[#FBFBFA] dark:hover:bg-[#262626] transition">
                      <td className="py-3 px-4 font-mono font-medium text-[#37352F] dark:text-white">
                        {person.documentType}-{person.documentNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#37352F] dark:text-white">
                        {personFullName(person)}
                      </td>
                      <td className="py-3 px-4 text-[#787774] dark:text-[#9B9A97]">
                        {person.specialty || '—'}
                      </td>
                      <td className="py-3 px-4 text-[#787774] dark:text-[#9B9A97] font-mono text-[11px]">
                        {person.email || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-[#2C2C2C] text-slate-600 dark:text-slate-300">
                          Solo Datos (Sin Usuario)
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge label={person.status} tone={statusTone(person.status)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {persons.length === 0 && <EmptyState message="No hay beneficiarios registrados." />}
            </div>
          )}
        </div>
      )}

      {activeTab === 'asignaciones' && (
        <div className="space-y-4">
          <PageHeader
            title="Asignaciones y Grupos de Pago"
            subtitle="Vínculo persona + proyecto + periodicidad con montos exactos en USD y validación de no solapamiento."
            icon={<Layers className="w-5 h-5 text-violet dark:text-violet-light" />}
            actions={
              <>
                <Button size="sm" variant="secondary" onClick={() => setShowGroupForm(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Grupo</span>
                </Button>
                <Button size="sm" onClick={() => setShowAssignmentForm(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Asignación</span>
                </Button>
              </>
            }
          />

          {assignmentsQuery.isLoading && <LoadingState message="Cargando asignaciones…" />}
          {assignmentsQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(assignmentsQuery.error)}
              onRetry={() => void assignmentsQuery.refetch()}
            />
          )}

          {assignmentsQuery.data && (
            <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold border-b border-[#E9E9E7] dark:border-[#2F2F2F]">
                  <tr>
                    <th className="py-2.5 px-4">Beneficiario</th>
                    <th className="py-2.5 px-4">Proyecto</th>
                    <th className="py-2.5 px-4">Grupo / Periodicidad</th>
                    <th className="py-2.5 px-4">Monto por Período</th>
                    <th className="py-2.5 px-4">Vigencia</th>
                    <th className="py-2.5 px-4">Estado</th>
                    <th className="py-2.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                  {assignments.map((assignment) => {
                    const person = personById.get(assignment.personId);
                    const project = projectById.get(assignment.projectId);
                    const group = groupById.get(assignment.paymentGroupId);

                    return (
                      <tr
                        key={assignment.id}
                        onClick={() =>
                          setSelectedDetail({
                            type: 'assignment',
                            data: assignment,
                            personName: person ? personFullName(person) : undefined,
                            projectCode: project?.code,
                            groupName: group ? `${group.name} (${group.periodicity})` : undefined,
                          })
                        }
                        className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525] transition cursor-pointer group"
                      >
                        <td className="py-3 px-4 font-semibold text-[#37352F] dark:text-white group-hover:text-primary transition-colors">
                          {person ? personFullName(person) : assignment.personId}
                        </td>
                        <td className="py-3 px-4 font-mono font-medium text-primary dark:text-primary-light">
                          {project?.code ?? '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-[#2C2C2C] text-slate-700 dark:text-slate-300">
                            {group ? `${group.name} · ${group.periodicity}` : '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-[#37352F] dark:text-white">
                          ${formatCurrency(assignment.amountPerPeriod)} USD
                        </td>
                        <td className="py-3 px-4 text-[#787774] dark:text-[#9B9A97] text-[11px]">
                          {formatDate(assignment.startDate)} al{' '}
                          {assignment.endDate ? formatDate(assignment.endDate) : 'indefinido'}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge
                            label={assignment.status}
                            tone={statusTone(assignment.status)}
                          />
                        </td>
                        <td className="py-3 px-4 text-right" onClick={(event) => event.stopPropagation()}>
                          {assignment.status === 'ACTIVO' ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => {
                                setAssignmentToTerminate(assignment);
                                setTerminateDate('');
                                setTerminateReason('');
                              }}
                            >
                              <Ban className="w-3 h-3" />
                              <span>Finalizar</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#9B9A97]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {assignments.length === 0 && <EmptyState message="No hay asignaciones registradas." />}
            </div>
          )}
        </div>
      )}

      {activeTab === 'causacion' && (
        <div className="space-y-6">
          <PageHeader
            title="Motor de Causación y Prorrateo por Días Activos"
            subtitle="Monto causado = monto del período × (días activos / días totales), con redondeo HALF_UP a 2 decimales."
            icon={<FileSpreadsheet className="w-5 h-5 text-violet dark:text-violet-light" />}
          />

          {projectsQuery.isLoading || groupsQuery.isLoading ? (
            <LoadingState message="Cargando catálogos…" />
          ) : (
            <CausationForm
              projects={projects}
              paymentGroups={groups}
              onGenerated={() => void batchesQuery.refetch()}
            />
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#37352F] dark:text-white">
                Lotes de Causación Registrados
              </h3>
              <span className="text-[11px] text-[#9B9A97]">
                {batches.length} lote(s) · inmutables salvo anulación auditada
              </span>
            </div>

            {batchesQuery.isLoading && <LoadingState message="Cargando lotes…" />}
            {batchesQuery.isError && (
              <ErrorState
                message={getApiErrorMessage(batchesQuery.error)}
                onRetry={() => void batchesQuery.refetch()}
              />
            )}

            {batchesQuery.data && (
              <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold">
                    <tr>
                      <th className="py-2.5 px-4">Período</th>
                      <th className="py-2.5 px-4">Proyecto</th>
                      <th className="py-2.5 px-4">Grupo</th>
                      <th className="py-2.5 px-4">Monto Total</th>
                      <th className="py-2.5 px-4">Estado</th>
                      <th className="py-2.5 px-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                    {batches.map((batch) => (
                      <tr key={batch.id} className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525]">
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#37352F] dark:text-white">
                          {formatDate(batch.periodStartDate)} → {formatDate(batch.periodEndDate)}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-primary dark:text-primary-light">
                          {projectById.get(batch.projectId)?.code ?? '—'}
                        </td>
                        <td className="py-2.5 px-4 text-[#787774] dark:text-[#9B9A97]">
                          {groupById.get(batch.paymentGroupId)?.name ?? '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono font-bold text-[#37352F] dark:text-white">
                          ${formatCurrency(batch.totalCausationAmount)}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge label={batch.status} tone={statusTone(batch.status)} />
                        </td>
                        <td className="py-2.5 px-4 text-right space-x-1">
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedBatchId(batch.id)}
                          >
                            <Eye className="w-3 h-3" />
                            <span>Ítems</span>
                          </Button>
                          {batch.status !== 'ANULADO' && (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => {
                                setBatchToAnnul(batch);
                                setAnnulReason('');
                              }}
                            >
                              <Ban className="w-3 h-3" />
                              <span>Anular</span>
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {batches.length === 0 && (
                  <EmptyState message="No hay lotes de causación generados." />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'solicitudes_creadas' && (
        <div className="space-y-4">
          <PageHeader
            title="Mis Solicitudes de Pago"
            subtitle="Ciclo de estados: BORRADOR → ENVIADA → APROBADA/RECHAZADA → ENTREGADA → CERRADA."
            icon={<FileText className="w-5 h-5 text-accent dark:text-accent-light" />}
            actions={
              <Button size="sm" onClick={() => setShowRequestForm(true)} disabled={batches.length === 0}>
                <Plus className="w-3.5 h-3.5" />
                <span>Crear Solicitud de Pago</span>
              </Button>
            }
          />

          {batches.length === 0 && (
            <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-800 dark:text-amber-300">
              Debe generar al menos un lote de causación antes de crear una solicitud de pago.
            </div>
          )}

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
                    <th className="py-2.5 px-4">Código Solicitud</th>
                    <th className="py-2.5 px-4">Proyecto</th>
                    <th className="py-2.5 px-4">Período</th>
                    <th className="py-2.5 px-4">Monto Total</th>
                    <th className="py-2.5 px-4">Estado Actual</th>
                    <th className="py-2.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                  {requests.map((request) => (
                    <tr
                      key={request.id}
                      onClick={() =>
                        setSelectedDetail({
                          type: 'request',
                          data: request,
                          projectCode: projectById.get(request.projectId)?.code,
                          createdByName: user?.fullName,
                        })
                      }
                      className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525] transition cursor-pointer group"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#37352F] dark:text-white group-hover:text-primary transition-colors">
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
                        className="py-3 px-4 text-right space-x-1"
                        onClick={(event) => event.stopPropagation()}
                      >
                        {request.status === PaymentRequestStatus.BORRADOR && (
                          <Button
                            size="sm"
                            onClick={() => void handleSendRequest(request.id)}
                            disabled={sendRequest.isPending}
                          >
                            <Send className="w-3 h-3" />
                            <span>Enviar</span>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => void handleDownloadPdf(request.id)}
                          disabled={downloadPdf.isPending}
                        >
                          <FileDown className="w-3 h-3" />
                          <span>PDF</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {requests.length === 0 && (
                <EmptyState message="No ha creado solicitudes de pago todavía." />
              )}
            </div>
          )}
        </div>
      )}

      <Modal
        open={showProjectForm}
        title="Registrar Nuevo Proyecto"
        subtitle="Código único, área científica y ámbito institucional."
        onClose={() => setShowProjectForm(false)}
      >
        <ProjectForm onSuccess={() => setShowProjectForm(false)} />
      </Modal>

      <Modal
        open={showPersonForm}
        title="Registrar Beneficiario"
        subtitle="Persona que recibirá estipendios; no posee credenciales de acceso."
        onClose={() => setShowPersonForm(false)}
      >
        <PersonForm onSuccess={() => setShowPersonForm(false)} />
      </Modal>

      <Modal
        open={showGroupForm}
        title="Nuevo Grupo de Pago"
        subtitle="Define la periodicidad y la configuración de corte."
        onClose={() => setShowGroupForm(false)}
      >
        <PaymentGroupForm onSuccess={() => setShowGroupForm(false)} />
      </Modal>

      <Modal
        open={showAssignmentForm}
        title="Nueva Asignación"
        subtitle="Vincule una persona, un proyecto y un grupo de pago."
        onClose={() => setShowAssignmentForm(false)}
        maxWidth="max-w-2xl"
      >
        <AssignmentForm
          persons={persons}
          projects={projects}
          paymentGroups={groups}
          onSuccess={() => setShowAssignmentForm(false)}
        />
      </Modal>

      <Modal
        open={showRequestForm}
        title="Crear Solicitud de Pago"
        subtitle="Seleccione un lote de causación activo y el monto a solicitar."
        onClose={() => setShowRequestForm(false)}
      >
        <PaymentRequestForm
          projects={projects}
          batches={batches}
          onSuccess={() => setShowRequestForm(false)}
        />
      </Modal>

      <Modal
        open={Boolean(selectedBatchId)}
        title="Ítems del Lote de Causación"
        subtitle={
          batchDetailQuery.data
            ? `${formatDate(batchDetailQuery.data.periodStartDate)} → ${formatDate(
                batchDetailQuery.data.periodEndDate,
              )}`
            : undefined
        }
        onClose={() => setSelectedBatchId(null)}
        maxWidth="max-w-3xl"
      >
        {batchDetailQuery.isLoading && <LoadingState message="Cargando ítems…" />}
        {batchDetailQuery.isError && (
          <ErrorState
            message={getApiErrorMessage(batchDetailQuery.error)}
            onRetry={() => void batchDetailQuery.refetch()}
          />
        )}
        {batchDetailQuery.data && (
          <div className="overflow-x-auto rounded-lg border border-[#E9E9E7] dark:border-[#2F2F2F]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold">
                <tr>
                  <th className="py-2 px-3">Beneficiario</th>
                  <th className="py-2 px-3">Días</th>
                  <th className="py-2 px-3">Causado</th>
                  <th className="py-2 px-3">Pagado</th>
                  <th className="py-2 px-3">Pendiente</th>
                  <th className="py-2 px-3">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                {batchDetailQuery.data.items.map((item) => {
                  const person = personById.get(item.personId);
                  return (
                    <tr key={item.id}>
                      <td className="py-2 px-3">
                        <div className="font-semibold text-[#37352F] dark:text-white">
                          {person ? personFullName(person) : item.personId}
                        </div>
                        <div className="text-[10px] text-[#9B9A97]">
                          {person ? `${person.documentType}-${person.documentNumber}` : ''}
                        </div>
                      </td>
                      <td className="py-2 px-3 text-[#787774] dark:text-[#9B9A97]">
                        {item.activeDays}/{item.totalDaysInPeriod}
                      </td>
                      <td className="py-2 px-3 font-mono">${formatCurrency(item.calculatedAmount)}</td>
                      <td className="py-2 px-3 font-mono">${formatCurrency(item.paidAmount)}</td>
                      <td className="py-2 px-3 font-mono font-bold">
                        ${formatCurrency(item.remainingDebt)}
                      </td>
                      <td className="py-2 px-3">
                        <StatusBadge label={item.status} tone={statusTone(item.status)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Modal>

      <Modal
        open={Boolean(batchToAnnul)}
        title="Anular Lote de Causación"
        subtitle="La anulación conserva el lote como registro histórico y audita la operación."
        onClose={() => setBatchToAnnul(null)}
      >
        <div className="space-y-4">
          <p className="text-[11px] text-[#787774] dark:text-[#9B9A97]">
            Se anulará el lote del período{' '}
            <strong className="text-[#37352F] dark:text-white">
              {batchToAnnul ? `${formatDate(batchToAnnul.periodStartDate)} → ${formatDate(batchToAnnul.periodEndDate)}` : ''}
            </strong>
            . La operación se rechaza si el lote tiene solicitudes o pagos asociados.
          </p>

          <FormField label="Justificación de la anulación" required>
            <TextArea
              rows={3}
              value={annulReason}
              onChange={(event) => setAnnulReason(event.target.value)}
              placeholder="Explique el motivo de la anulación (mínimo 10 caracteres)…"
            />
          </FormField>

          <div className="flex items-center justify-end space-x-2">
            <Button variant="secondary" onClick={() => setBatchToAnnul(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={() => void handleAnnul()} disabled={annulBatch.isPending}>
              {annulBatch.isPending ? 'Anulando…' : 'Confirmar Anulación'}
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={Boolean(assignmentToTerminate)}
        title="Finalizar Asignación"
        subtitle="La asignación quedará inactiva desde la fecha indicada."
        onClose={() => setAssignmentToTerminate(null)}
      >
        <div className="space-y-4">
          <FormField label="Fecha de finalización" required>
            <TextInput
              type="date"
              value={terminateDate}
              onChange={(event) => setTerminateDate(event.target.value)}
            />
          </FormField>

          <FormField label="Justificación" required>
            <TextArea
              rows={3}
              value={terminateReason}
              onChange={(event) => setTerminateReason(event.target.value)}
              placeholder="Motivo de la finalización (mínimo 5 caracteres)…"
            />
          </FormField>

          <div className="flex items-center justify-end space-x-2">
            <Button variant="secondary" onClick={() => setAssignmentToTerminate(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleTerminate()}
              disabled={terminateAssignment.isPending}
            >
              {terminateAssignment.isPending ? 'Finalizando…' : 'Finalizar Asignación'}
            </Button>
          </div>
        </div>
      </Modal>

      <ItemDetailModal modalData={selectedDetail} onClose={() => setSelectedDetail(null)} />
    </div>
  );
};
