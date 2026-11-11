import React, { useEffect, useRef, useState } from 'react';
import { UserRole } from '@scienpay/shared';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { NotionLogin } from './components/Login/NotionLogin.js';
import { NotionSidebar } from './components/Sidebar/NotionSidebar.js';
import { AdminView } from './components/Views/AdminView.js';
import { GeneratorView } from './components/Views/GeneratorView.js';
import { ReceptorView } from './components/Views/ReceptorView.js';
import { ThemeToggle } from './context/ThemeContext.js';
import { useAuth } from './context/AuthContext.js';

function defaultTabForRole(role: UserRole): string {
  switch (role) {
    case UserRole.ADMIN:
      return 'usuarios';
    case UserRole.GENERADOR:
      return 'proyectos';
    case UserRole.RECEPTOR:
      return 'solicitudes_bandeja';
    default:
      return 'usuarios';
  }
}

function roleBadgeClass(role: UserRole): string {
  if (role === UserRole.ADMIN) {
    return 'bg-violet-100 dark:bg-violet-950/60 text-violet dark:text-violet-300';
  }
  if (role === UserRole.GENERADOR) {
    return 'bg-blue-100 dark:bg-blue-950/60 text-primary dark:text-blue-300';
  }
  return 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300';
}

export const App: React.FC = () => {
  const { user, isLoading, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('usuarios');
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const initializedUserId = useRef<string | null>(null);

  // Al autenticarse, ubica la vista inicial del rol en el historial.
  // Se usa el ID para no reiniciar la pestaña cuando `/auth/me` refresca el perfil.
  useEffect(() => {
    if (!user) {
      initializedUserId.current = null;
      return;
    }
    if (initializedUserId.current === user.id) return;

    initializedUserId.current = user.id;
    const initialTab = defaultTabForRole(user.role);
    setActiveTab(initialTab);
    window.history.pushState(
      { isAuth: true, tab: initialTab, userId: user.id },
      '',
      `#${initialTab}`,
    );
  }, [user]);

  // Manejo de navegación del navegador (Atrás / Adelante con popstate).
  useEffect(() => {
    if (!user) return;

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { isAuth?: boolean; tab?: string } | null;
      if (state?.isAuth && state.tab) {
        setActiveTab(state.tab);
      } else {
        // El usuario retrocedió antes del estado de login: se repone el estado
        // actual para no salir sin confirmación.
        window.history.pushState(
          { isAuth: true, tab: activeTab, userId: user.id },
          '',
          `#${activeTab}`,
        );
        setShowLogoutConfirm(true);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user, activeTab]);

  const handleSelectTab = (tab: string) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    if (user) {
      window.history.pushState({ isAuth: true, tab, userId: user.id }, '', `#${tab}`);
    }
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    await logout();
    window.history.pushState({ isAuth: false }, '', '#login');
  };

  // Restauración de sesión en curso.
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-3 bg-[#FBFBFA] dark:bg-[#191919] text-[#787774] dark:text-[#9B9A97]">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs">Verificando sesión…</span>
      </div>
    );
  }

  if (!user) {
    return <NotionLogin />;
  }

  return (
    <div className="flex h-screen bg-white dark:bg-[#191919] text-[#37352F] dark:text-[#E6E6E6] overflow-hidden font-sans transition-colors duration-200">
      <NotionSidebar
        currentUser={user}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
        onLogout={() => setShowLogoutConfirm(true)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-12 border-b border-[#EDEDEB] dark:border-[#2F2F2F] px-6 flex items-center justify-between bg-white/80 dark:bg-[#1C1C1C]/90 backdrop-blur sticky top-0 z-10 transition-colors">
          <div className="flex items-center space-x-2 text-xs text-[#787774] dark:text-[#9B9A97]">
            <span className="font-medium">Scienpay</span>
            <span>/</span>
            <span className="font-semibold text-[#37352F] dark:text-white capitalize">
              {activeTab.replace(/_/g, ' ')}
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-[11px] text-[#9B9A97] dark:text-[#888886]">
              Moneda Base: USD ($)
            </span>
            <div className="h-3 w-px bg-slate-200 dark:bg-[#333333]" />
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded ${roleBadgeClass(user.role)}`}
            >
              {user.role}
            </span>
            <div className="h-3 w-px bg-slate-200 dark:bg-[#333333]" />
            <ThemeToggle compact />
          </div>
        </header>

        <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
          {user.role === UserRole.ADMIN && <AdminView activeTab={activeTab} />}
          {user.role === UserRole.GENERADOR && <GeneratorView activeTab={activeTab} />}
          {user.role === UserRole.RECEPTOR && <ReceptorView activeTab={activeTab} />}
        </main>
      </div>

      {showLogoutConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-150"
          onClick={() => setShowLogoutConfirm(false)}
        >
          <div
            className="bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2F2F2F] rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 transition-colors"
            onClick={(event) => event.stopPropagation()}
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
              Ha utilizado la navegación hacia atrás o solicitado salir del sistema. Si continúa, se
              cerrará su sesión de trabajo activa en Scienpay.
            </p>
            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-[#787774] dark:text-[#A4A4A2] hover:bg-[#F7F6F3] dark:hover:bg-[#2A2A2A] transition"
              >
                Permanecer en el sistema
              </button>
              <button
                onClick={() => void handleLogout()}
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
