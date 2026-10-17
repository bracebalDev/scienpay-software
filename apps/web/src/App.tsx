import React, { useState } from 'react';
import { UserRole, PaymentRequestStatus } from '@scienpay/shared';
import { UserAccount, ProjectItem, BeneficiaryItem, AssignmentItem, PaymentRequestItem, AuditLogItem } from './types/app.types.js';
import {
  INITIAL_USERS,
  INITIAL_PROJECTS,
  INITIAL_BENEFICIARIES,
  INITIAL_ASSIGNMENTS,
  INITIAL_REQUESTS,
  INITIAL_AUDIT_LOGS,
} from './data/mockData.js';
import { NotionLogin } from './components/Login/NotionLogin.js';
import { NotionSidebar } from './components/Sidebar/NotionSidebar.js';
import { AdminView } from './components/Views/AdminView.js';
import { GeneratorView } from './components/Views/GeneratorView.js';
import { ReceptorView } from './components/Views/ReceptorView.js';

export const App: React.FC = () => {
  // Estado de sesión
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('usuarios');

  // Estado del almacén reactivo
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [projects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [beneficiaries] = useState<BeneficiaryItem[]>(INITIAL_BENEFICIARIES);
  const [assignments] = useState<AssignmentItem[]>(INITIAL_ASSIGNMENTS);
  const [requests, setRequests] = useState<PaymentRequestItem[]>(INITIAL_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

  // Manejo de inicio de sesión exitoso
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    // Establecer pestaña predeterminada según el rol
    if (user.role === UserRole.ADMIN) setActiveTab('usuarios');
    else if (user.role === UserRole.GENERADOR) setActiveTab('proyectos');
    else if (user.role === UserRole.RECEPTOR) setActiveTab('solicitudes_bandeja');
  };

  // Manejo de intentos fallidos y bloqueos
  const handleUpdateUserAttempts = (
    username: string,
    failedAttempts: number,
    isLocked: boolean,
    lockoutExpiresAt: number | null,
    permanentLock: boolean,
  ) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.username.toLowerCase() === username.toLowerCase()) {
          return {
            ...u,
            failedAttempts,
            isLocked,
            lockoutExpiresAt,
            permanentLock,
          };
        }
        return u;
      }),
    );
  };

  // Administrador desbloquea usuario con 4 intentos
  const handleUnlockUser = (username: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.username.toLowerCase() === username.toLowerCase()) {
          return {
            ...u,
            failedAttempts: 0,
            isLocked: false,
            lockoutExpiresAt: null,
            permanentLock: false,
          };
        }
        return u;
      }),
    );

    // Registrar en auditoría
    const newLog: AuditLogItem = {
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: currentUser?.fullName || 'Administrador',
      role: UserRole.ADMIN,
      action: 'DESBLOQUEO_USUARIO',
      entity: 'users',
      details: `Desbloqueo de seguridad de la cuenta ${username} tras alcanzar límite de intentos.`,
      status: 'EXITO',
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  // Administrador resetea intentos
  const handleResetAttempts = (username: string) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.username.toLowerCase() === username.toLowerCase()) {
          return {
            ...u,
            failedAttempts: 0,
            isLocked: false,
            lockoutExpiresAt: null,
          };
        }
        return u;
      }),
    );
  };

  // Generador envía solicitud a revisión
  const handleSendRequest = (requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return { ...r, status: PaymentRequestStatus.ENVIADA };
        }
        return r;
      }),
    );

    const target = requests.find((r) => r.id === requestId);
    if (target) {
      const newLog: AuditLogItem = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: currentUser?.fullName || 'Generador',
        role: UserRole.GENERADOR,
        action: 'ENVIAR_SOLICITUD',
        entity: 'payment_requests',
        details: `Envío a revisión de la solicitud ${target.requestCode} por $ ${target.totalAmountUSD.toFixed(2)} USD`,
        status: 'EXITO',
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  // Receptor aprueba solicitud
  const handleApproveRequest = (requestId: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: PaymentRequestStatus.APROBADA,
            reviewedBy: currentUser?.fullName,
          };
        }
        return r;
      }),
    );

    const target = requests.find((r) => r.id === requestId);
    if (target) {
      const newLog: AuditLogItem = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: currentUser?.fullName || 'Receptor',
        role: UserRole.RECEPTOR,
        action: 'APROBAR_SOLICITUD',
        entity: 'payment_requests',
        details: `Aprobación de la solicitud ${target.requestCode}. Regla de Cuatro Ojos validada.`,
        status: 'EXITO',
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  // Receptor rechaza solicitud con justificación
  const handleRejectRequest = (requestId: string, reason: string) => {
    setRequests((prev) =>
      prev.map((r) => {
        if (r.id === requestId) {
          return {
            ...r,
            status: PaymentRequestStatus.RECHAZADA,
            reviewedBy: currentUser?.fullName,
            rejectionReason: reason,
          };
        }
        return r;
      }),
    );

    const target = requests.find((r) => r.id === requestId);
    if (target) {
      const newLog: AuditLogItem = {
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: currentUser?.fullName || 'Receptor',
        role: UserRole.RECEPTOR,
        action: 'RECHAZAR_SOLICITUD',
        entity: 'payment_requests',
        details: `Rechazo de solicitud ${target.requestCode}. Motivo: ${reason}`,
        status: 'EXITO',
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    }
  };

  // Si no hay usuario autenticado, renderizar la pantalla NotionLogin centrada
  if (!currentUser) {
    return (
      <NotionLogin
        users={users}
        onLoginSuccess={handleLoginSuccess}
        onUpdateUserAttempts={handleUpdateUserAttempts}
      />
    );
  }

  // Interfaz de Espacio de Trabajo Notion tras iniciar sesión
  return (
    <div className="flex h-screen bg-white text-[#37352F] overflow-hidden font-sans">
      {/* Barra lateral Notion */}
      <NotionSidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onLogout={() => setCurrentUser(null)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Área de contenido principal Notion */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Barra superior de breadcrumbs */}
        <header className="h-12 border-b border-[#EDEDEB] px-6 flex items-center justify-between bg-white/80 backdrop-blur sticky top-0 z-10">
          <div className="flex items-center space-x-2 text-xs text-[#787774]">
            <span>Scienpay</span>
            <span>/</span>
            <span className="font-semibold text-[#37352F] capitalize">
              {activeTab.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-[#9B9A97]">Moneda Base: USD ($)</span>
            <div className="h-3 w-px bg-slate-200" />
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                currentUser.role === UserRole.ADMIN
                  ? 'bg-violet-100 text-violet'
                  : currentUser.role === UserRole.GENERADOR
                  ? 'bg-blue-100 text-primary'
                  : 'bg-emerald-100 text-emerald-800'
              }`}
            >
              {currentUser.role}
            </span>
          </div>
        </header>

        {/* Cuerpo de página */}
        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
          {currentUser.role === UserRole.ADMIN && (
            <AdminView
              activeTab={activeTab}
              users={users}
              auditLogs={auditLogs}
              onUnlockUser={handleUnlockUser}
              onResetAttempts={handleResetAttempts}
            />
          )}

          {currentUser.role === UserRole.GENERADOR && (
            <GeneratorView
              activeTab={activeTab}
              projects={projects}
              beneficiaries={beneficiaries}
              assignments={assignments}
              requests={requests}
              onSendRequest={handleSendRequest}
            />
          )}

          {currentUser.role === UserRole.RECEPTOR && (
            <ReceptorView
              activeTab={activeTab}
              requests={requests}
              currentUserFullName={currentUser.fullName}
              onApproveRequest={handleApproveRequest}
              onRejectRequest={handleRejectRequest}
            />
          )}
        </main>
      </div>
    </div>
  );
};
