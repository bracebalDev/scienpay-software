import React, { useState, useEffect } from 'react';
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
import { ThemeToggle } from './context/ThemeContext.js';
import { AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  // Estado de sesión
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('usuarios');

  // Estado del cuadro de confirmación para cerrar sesión (Atrás en navegador / Logout)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Estado del almacén reactivo
  const [users, setUsers] = useState<UserAccount[]>(INITIAL_USERS);
  const [projects] = useState<ProjectItem[]>(INITIAL_PROJECTS);
  const [beneficiaries] = useState<BeneficiaryItem[]>(INITIAL_BENEFICIARIES);
  const [assignments] = useState<AssignmentItem[]>(INITIAL_ASSIGNMENTS);
  const [requests, setRequests] = useState<PaymentRequestItem[]>(INITIAL_REQUESTS);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>(INITIAL_AUDIT_LOGS);

  // Manejo de navegación del navegador (Atrás / Adelante con popstate)
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      if (!currentUser) return;

      const state = event.state;
      if (state && state.isAuth && state.tab) {
        // El usuario navegó a otra sección del sistema con la flecha
        setActiveTab(state.tab);
      } else {
        // El usuario presionó hacia atrás hasta el estado previo al login
        // Reponemos el estado en el historial para evitar salir sin confirmar
        window.history.pushState(
          { isAuth: true, tab: activeTab, userId: currentUser.id },
          '',
          `#${activeTab}`,
        );
        setShowLogoutConfirm(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [currentUser, activeTab]);

  // Manejo de inicio de sesión exitoso con inicialización en el historial
  const handleLoginSuccess = (user: UserAccount) => {
    setCurrentUser(user);
    let initialTab = 'usuarios';
    if (user.role === UserRole.ADMIN) initialTab = 'usuarios';
    else if (user.role === UserRole.GENERADOR) initialTab = 'proyectos';
    else if (user.role === UserRole.RECEPTOR) initialTab = 'solicitudes_bandeja';

    setActiveTab(initialTab);
    window.history.pushState(
      { isAuth: true, tab: initialTab, userId: user.id },
      '',
      `#${initialTab}`,
    );
  };

  // Cambio de sección con sincronización en el historial del navegador
  const handleSelectTab = (tab: string) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (currentUser) {
      window.history.pushState(
        { isAuth: true, tab, userId: currentUser.id },
        '',
        `#${tab}`,
      );
    }
  };

  // Cierre de sesión efectivo
  const handleLogout = () => {
    setCurrentUser(null);
    window.history.pushState({ isAuth: false }, '', '#login');
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
    <div className="flex h-screen bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#E6E6E6] overflow-hidden font-sans transition-colors duration-200">
      {/* Barra lateral Notion */}
      <NotionSidebar
        currentUser={currentUser}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={() => setShowLogoutConfirm(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      {/* Área de contenido principal Notion */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Barra superior de breadcrumbs */}
        <header className="h-12 border-b border-[#EDEDEB] dark:border-[#2F2F2F] px-6 flex items-center justify-between bg-white/80 dark:bg-[#1C1C1C]/90 backdrop-blur sticky top-0 z-10 transition-colors">
          <div className="flex items-center space-x-2 text-xs text-[#787774] dark:text-[#9B9A97]">
            <span className="font-medium">Scienpay</span>
            <span>/</span>
            <span className="font-semibold text-[#37352F] dark:text-white capitalize">
              {activeTab.replace('_', ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-[#9B9A97] dark:text-[#888886]">Moneda Base: USD ($)</span>
            <div className="h-3 w-px bg-slate-200 dark:bg-[#333333]" />
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                currentUser.role === UserRole.ADMIN
                  ? 'bg-violet-100 dark:bg-violet-950/60 text-violet dark:text-violet-300'
                  : currentUser.role === UserRole.GENERADOR
                  ? 'bg-blue-100 dark:bg-blue-950/60 text-primary dark:text-blue-300'
                  : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
              }`}
            >
              {currentUser.role}
            </span>
            <div className="h-3 w-px bg-slate-200 dark:bg-[#333333]" />
            <ThemeToggle compact />
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

      {/* Cuadro de Diálogo de Confirmación: Salir / Atrás en Navegador */}
      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2F2F2F] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center space-x-3 text-rose-600 dark:text-rose-400">
              <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#37352F] dark:text-white">
                ¿Está seguro de cerrar sesión?
              </h3>
            </div>
            <p className="text-xs text-[#787774] dark:text-[#9B9A97] leading-relaxed">
              Ha utilizado la navegación hacia atrás o solicitado salir del sistema. Si continúa, se cerrará su sesión de trabajo activa en Scienpay.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#787774] dark:text-[#A4A4A2] hover:bg-[#F7F6F3] dark:hover:bg-[#2A2A2A] transition"
              >
                Permanecer en el sistema
              </button>
              <button
                onClick={() => {
                  setShowLogoutConfirm(false);
                  handleLogout();
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white shadow-sm transition"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
