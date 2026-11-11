import React, { useState } from 'react';
import {
  Users,
  Sliders,
  FileText,
  ShieldCheck,
  ShieldAlert,
  Unlock,
  AlertCircle,
  Database,
  Lock,
  RotateCcw,
  Plus,
  Filter,
} from 'lucide-react';
import { useResetUserAttempts, useUnlockUser, useUsers } from '../../hooks/useUsers.js';
import { useAuditLogs } from '../../hooks/useAudit.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { formatDateTime } from '../../lib/format.js';
import type { AuditFilters } from '../../types/api.types.js';
import { PageHeader, SectionBanner } from '../ui/PageHeader.js';
import { EmptyState, ErrorState, LoadingState, StatusBadge, statusTone } from '../ui/Feedback.js';
import { Button, TextInput } from '../ui/FormControls.js';
import { Modal } from '../ui/Modal.js';
import { UserForm } from '../Forms/UserForm.js';

interface AdminViewProps {
  activeTab: string;
}

export const AdminView: React.FC<AdminViewProps> = ({ activeTab }) => {
  const { showToast } = useToast();
  const usersQuery = useUsers();
  const unlockUser = useUnlockUser();
  const resetAttempts = useResetUserAttempts();

  const [showCreateUser, setShowCreateUser] = useState(false);
  const [draftFilters, setDraftFilters] = useState({
    entity: '',
    action: '',
    dateFrom: '',
    dateTo: '',
  });
  const [auditFilters, setAuditFilters] = useState<AuditFilters>({ page: 1, limit: 25 });
  const auditQuery = useAuditLogs(auditFilters);

  const handleUnlock = async (id: string, username: string) => {
    try {
      await unlockUser.mutateAsync(id);
      showToast(`Cuenta ${username} desbloqueada`, 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const handleReset = async (id: string, username: string) => {
    try {
      await resetAttempts.mutateAsync(id);
      showToast(`Intentos de ${username} reiniciados`, 'success');
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  const applyFilters = (event: React.FormEvent) => {
    event.preventDefault();
    setAuditFilters({
      entity: draftFilters.entity.trim() || undefined,
      action: draftFilters.action.trim() || undefined,
      dateFrom: draftFilters.dateFrom || undefined,
      dateTo: draftFilters.dateTo || undefined,
      page: 1,
      limit: auditFilters.limit ?? 25,
    });
  };

  return (
    <div className="space-y-6">
      <SectionBanner
        tone="amber"
        title="Segregación de Funciones: Perfil Administrador del Sistema"
      >
        El Administrador gestiona usuarios, parámetros y catálogos globales. Por norma de seguridad
        financiera, <strong>no participa en operaciones de dinero</strong> (no formula causaciones,
        no crea solicitudes, no aprueba ni desembolsa fondos).
      </SectionBanner>

      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <PageHeader
            title="Usuarios, Roles y Control de Seguridad"
            subtitle="Supervisión de cuentas institucionales, intentos de acceso y desbloqueo de usuarios."
            icon={<Users className="w-5 h-5 text-violet dark:text-violet-light" />}
            actions={
              <>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#2A2A2A] text-slate-700 dark:text-slate-300">
                  {usersQuery.data?.length ?? 0} Cuentas Registradas
                </span>
                <Button size="sm" onClick={() => setShowCreateUser(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nuevo Usuario</span>
                </Button>
              </>
            }
          />

          {usersQuery.isLoading && <LoadingState message="Cargando usuarios…" />}
          {usersQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(usersQuery.error)}
              onRetry={() => void usersQuery.refetch()}
            />
          )}

          {usersQuery.data && (
            <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold border-b border-[#E9E9E7] dark:border-[#2F2F2F]">
                  <tr>
                    <th className="py-2.5 px-4">Usuario</th>
                    <th className="py-2.5 px-4">Nombre / Cargo</th>
                    <th className="py-2.5 px-4">Rol Asignado</th>
                    <th className="py-2.5 px-4">Intentos Fallidos</th>
                    <th className="py-2.5 px-4">Estado de Cuenta</th>
                    <th className="py-2.5 px-4 text-right">Acción Administrativa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                  {usersQuery.data.map((user) => {
                    const isTempLocked =
                      user.isLocked &&
                      user.lockoutExpiresAt !== null &&
                      new Date(user.lockoutExpiresAt).getTime() > Date.now();
                    const isBlocked = user.permanentLock;

                    return (
                      <tr
                        key={user.id}
                        className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525] transition"
                      >
                        <td className="py-3 px-4 font-medium text-[#37352F] dark:text-white">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#2A2A2A] text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                              {user.username.charAt(0).toUpperCase()}
                            </div>
                            <span>{user.username}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-[#37352F] dark:text-white">
                          <div className="font-medium">{user.fullName}</div>
                          <div className="text-[10px] text-[#9B9A97]">
                            {user.title || 'Sin cargo'} · {user.email}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge
                            label={user.role}
                            tone={
                              user.role === 'ADMIN'
                                ? 'violet'
                                : user.role === 'GENERADOR'
                                  ? 'blue'
                                  : 'green'
                            }
                          />
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`font-mono text-xs px-2 py-0.5 rounded ${
                              user.failedAttempts === 0
                                ? 'bg-slate-100 dark:bg-[#2A2A2A] text-slate-600 dark:text-slate-300'
                                : user.failedAttempts < 3
                                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                                  : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold'
                            }`}
                          >
                            {user.failedAttempts} / 4
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {isBlocked ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-semibold text-[10px]">
                              <ShieldAlert className="w-3 h-3" />
                              <span>Bloqueado (4to intento)</span>
                            </span>
                          ) : isTempLocked ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold text-[10px]">
                              <Lock className="w-3 h-3" />
                              <span>Espera 5 min (3er intento)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 font-semibold text-[10px]">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Activa / Operativa</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {isBlocked || user.isLocked ? (
                            <Button
                              size="sm"
                              variant="danger"
                              onClick={() => void handleUnlock(user.id, user.username)}
                              disabled={unlockUser.isPending}
                            >
                              <Unlock className="w-3 h-3" />
                              <span>Desbloquear Usuario</span>
                            </Button>
                          ) : user.failedAttempts > 0 ? (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => void handleReset(user.id, user.username)}
                              disabled={resetAttempts.isPending}
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reset Intentos</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#9B9A97] dark:text-[#787774]">
                              Sin acciones
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {usersQuery.data.length === 0 && (
                <EmptyState message="No hay usuarios registrados." />
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'parametros' && (
        <div className="space-y-4">
          <PageHeader
            title="Parámetros Globales del Sistema"
            subtitle="Configuraciones inmutables de moneda, redondeo contable y políticas de sesión."
            icon={<Sliders className="w-5 h-5 text-primary dark:text-primary-light" />}
          />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center space-x-2 text-primary dark:text-primary-light mb-2">
                <Database className="w-4 h-4" />
                <span className="font-semibold text-xs text-[#37352F] dark:text-white">
                  Moneda Oficial
                </span>
              </div>
              <div className="text-lg font-bold text-[#37352F] dark:text-white">
                Dólares Americanos (USD)
              </div>
              <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-1">
                Almacenamiento exacto con columna PostgreSQL{' '}
                <code className="bg-slate-100 dark:bg-[#2C2C2C] px-1 rounded">NUMERIC(14,2)</code>.
              </p>
            </div>

            <div className="bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center space-x-2 text-violet dark:text-violet-light mb-2">
                <Sliders className="w-4 h-4" />
                <span className="font-semibold text-xs text-[#37352F] dark:text-white">
                  Política de Redondeo
                </span>
              </div>
              <div className="text-lg font-bold text-[#37352F] dark:text-white">HALF_UP</div>
              <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-1">
                Redondeo a 2 decimales con desempate hacia arriba, aplicado por{' '}
                <code className="bg-slate-100 dark:bg-[#2C2C2C] px-1 rounded">
                  CausationCalculator
                </code>
                .
              </p>
            </div>

            <div className="bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-2">
                <Lock className="w-4 h-4" />
                <span className="font-semibold text-xs text-[#37352F] dark:text-white">
                  Seguridad de Sesión
                </span>
              </div>
              <div className="text-lg font-bold text-[#37352F] dark:text-white">
                15 min JWT + Cookie 7d
              </div>
              <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-1">
                Refresh tokens rotativos con banderas{' '}
                <code className="bg-slate-100 dark:bg-[#2C2C2C] px-1 rounded">
                  HttpOnly, SameSite
                </code>{' '}
                y detección de replay.
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <PageHeader
            title="Registro de Auditoría Append-Only (audit_log)"
            subtitle="Bitácora legal inalterable protegida por triggers de base de datos anti-UPDATE y anti-DELETE."
            icon={<FileText className="w-5 h-5 text-secondary dark:text-secondary-light" />}
            actions={<StatusBadge label="Integridad Verificada" tone="green" />}
          />

          <form
            onSubmit={applyFilters}
            className="bg-white dark:bg-[#202020] p-4 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] grid grid-cols-1 md:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-[10px] font-semibold text-[#787774] dark:text-[#9B9A97] mb-1">
                Entidad
              </label>
              <TextInput
                placeholder="payment_requests"
                value={draftFilters.entity}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, entity: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#787774] dark:text-[#9B9A97] mb-1">
                Acción
              </label>
              <TextInput
                placeholder="APROBAR_SOLICITUD"
                value={draftFilters.action}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, action: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#787774] dark:text-[#9B9A97] mb-1">
                Desde
              </label>
              <TextInput
                type="date"
                value={draftFilters.dateFrom}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, dateFrom: event.target.value }))
                }
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#787774] dark:text-[#9B9A97] mb-1">
                Hasta
              </label>
              <TextInput
                type="date"
                value={draftFilters.dateTo}
                onChange={(event) =>
                  setDraftFilters((current) => ({ ...current, dateTo: event.target.value }))
                }
              />
            </div>
            <Button type="submit" size="sm">
              <Filter className="w-3.5 h-3.5" />
              <span>Aplicar Filtros</span>
            </Button>
          </form>

          {auditQuery.isLoading && <LoadingState message="Consultando auditoría…" />}
          {auditQuery.isError && (
            <ErrorState
              message={getApiErrorMessage(auditQuery.error)}
              onRetry={() => void auditQuery.refetch()}
            />
          )}

          {auditQuery.data && (
            <>
              <div className="flex items-center justify-between text-[11px] text-[#787774] dark:text-[#9B9A97]">
                <span>
                  {auditQuery.data.total} registro(s) · página {auditQuery.data.page} de{' '}
                  {Math.max(1, auditQuery.data.totalPages)}
                </span>
                <span className="inline-flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Los registros de auditoría no se pueden modificar ni eliminar.</span>
                </span>
              </div>

              <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold border-b border-[#E9E9E7] dark:border-[#2F2F2F]">
                    <tr>
                      <th className="py-2.5 px-4">Fecha y Hora</th>
                      <th className="py-2.5 px-4">Usuario Responsable</th>
                      <th className="py-2.5 px-4">Rol</th>
                      <th className="py-2.5 px-4">Acción Ejecutada</th>
                      <th className="py-2.5 px-4">Entidad Afectada</th>
                      <th className="py-2.5 px-4">Detalles</th>
                      <th className="py-2.5 px-4">IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                    {auditQuery.data.data.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525] transition"
                      >
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#787774] dark:text-[#9B9A97]">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-[#37352F] dark:text-white">
                          {log.userEmail || 'Sistema'}
                        </td>
                        <td className="py-2.5 px-4">
                          <StatusBadge
                            label={log.userRole || 'N/A'}
                            tone={statusTone(log.userRole)}
                          />
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-[#37352F] dark:text-white">
                          {log.action}
                        </td>
                        <td className="py-2.5 px-4 text-[#787774] dark:text-[#9B9A97] font-mono text-[11px]">
                          {log.entity}
                          {log.entityId ? `#${log.entityId.slice(0, 8)}` : ''}
                        </td>
                        <td className="py-2.5 px-4 text-[#787774] dark:text-[#9B9A97] text-[11px] max-w-xs truncate">
                          {log.newValues ? JSON.stringify(log.newValues) : '—'}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-[#9B9A97]">
                          {log.ipAddress || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {auditQuery.data.data.length === 0 && (
                  <EmptyState message="No hay registros que coincidan con los filtros." />
                )}
              </div>

              <div className="flex items-center justify-end space-x-2">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={(auditQuery.data.page ?? 1) <= 1}
                  onClick={() =>
                    setAuditFilters((current) => ({
                      ...current,
                      page: Math.max(1, (current.page ?? 1) - 1),
                    }))
                  }
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={(auditQuery.data.page ?? 1) >= Math.max(1, auditQuery.data.totalPages)}
                  onClick={() =>
                    setAuditFilters((current) => ({ ...current, page: (current.page ?? 1) + 1 }))
                  }
                >
                  Siguiente
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      <Modal
        open={showCreateUser}
        title="Registrar Nuevo Usuario"
        subtitle="El nombre de usuario se deriva del correo institucional."
        onClose={() => setShowCreateUser(false)}
      >
        <UserForm onSuccess={() => setShowCreateUser(false)} />
      </Modal>
    </div>
  );
};
