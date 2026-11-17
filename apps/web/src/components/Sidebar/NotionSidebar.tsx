import React from 'react';
import { UserRole } from '@scienpay/shared';
import type { AuthUser } from '../../types/api.types.js';
import {
  Users,
  Sliders,
  FileText,
  FolderKanban,
  UserCheck,
  FileSpreadsheet,
  CheckCircle2,
  DollarSign,
  Receipt,
  PiggyBank,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Layers,
  X,
} from 'lucide-react';

interface NotionSidebarProps {
  currentUser: AuthUser;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const NotionSidebar: React.FC<NotionSidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onLogout,
  collapsed,
  onToggleCollapse,
  mobileOpen = false,
  onCloseMobile = () => {},
}) => {
  // Configuración de menús por Rol
  const getNavItems = () => {
    switch (currentUser.role) {
      case UserRole.ADMIN:
        return [
          { id: 'usuarios', label: 'Usuarios y Roles', icon: Users },
          { id: 'parametros', label: 'Parámetros del Sistema', icon: Sliders },
          { id: 'auditoria', label: 'Registro de Auditoría', icon: FileText },
        ];
      case UserRole.GENERADOR:
        return [
          { id: 'proyectos', label: 'Proyectos Científicos', icon: FolderKanban },
          { id: 'beneficiarios', label: 'Personal (Beneficiarios)', icon: UserCheck },
          { id: 'asignaciones', label: 'Asignaciones y Grupos', icon: Layers },
          { id: 'causacion', label: 'Motor de Causación', icon: FileSpreadsheet },
          { id: 'solicitudes_creadas', label: 'Mis Solicitudes', icon: FileText },
        ];
      case UserRole.RECEPTOR:
        return [
          { id: 'solicitudes_bandeja', label: 'Bandeja de Aprobación', icon: CheckCircle2 },
          { id: 'pagos_fifo', label: 'Entregas de Fondos', icon: DollarSign },
          { id: 'recibos', label: 'Recibos de Pago', icon: Receipt },
          { id: 'caja_chica', label: 'Cajas Chicas', icon: PiggyBank },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {/* Backdrop overlay para drawer móvil (WCAG / modern-web-guidance navigation-drawer) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity duration-200 md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        id="main-sidebar"
        role={mobileOpen ? 'dialog' : undefined}
        aria-modal={mobileOpen ? 'true' : undefined}
        aria-label="Navegación principal"
        className={`
          fixed inset-y-0 left-0 z-50 flex flex-col bg-[#F7F6F3] dark:bg-[#1C1C1C] border-r border-[#E9E9E7] dark:border-[#2B2B2B] select-none
          transition-all duration-200 ease-in-out
          md:static md:inset-auto md:z-0 md:translate-x-0
          ${mobileOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          ${collapsed ? 'md:w-16' : 'md:w-64'}
          w-72 max-w-[calc(100vw-3rem)]
        `}
      >
        {/* Encabezado del Workspace Notion */}
        <div className="p-3 border-b border-[#EDEDEB] dark:border-[#2B2B2B] flex items-center justify-between min-w-0 gap-2">
          <div
            className={`flex items-center min-w-0 ${
              collapsed ? 'md:justify-center md:w-full' : 'flex-1 space-x-2.5'
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-white dark:bg-[#252525] border border-[#E9E9E7] dark:border-[#333333] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-xs p-1">
              <img
                src="/logo.jpg"
                alt="Logo Scienpay"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            {/* Texto de identidad: se muestra siempre en mobile drawer, y en desktop solo si no está collapsed */}
            <div className={`min-w-0 flex-1 truncate ${collapsed ? 'md:hidden' : 'block'}`}>
              <div className="text-xs font-bold text-[#37352F] dark:text-white truncate leading-tight">
                Scienpay
              </div>
              <div className="text-[10px] text-[#9B9A97] dark:text-[#888886] truncate leading-tight">
                Universidad de Carabobo - FACYT
              </div>
            </div>
          </div>

          {/* Botón de cierre para mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="p-1.5 rounded-md text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#EAE9E5] dark:hover:bg-[#2B2B2B] transition flex-shrink-0 md:hidden min-h-[36px] min-w-[36px] flex items-center justify-center"
            title="Cerrar menú"
            aria-label="Cerrar menú de navegación"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Botón de colapsar / expandir para desktop */}
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`p-1.5 rounded-md text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#EAE9E5] dark:hover:bg-[#2B2B2B] transition flex-shrink-0 hidden md:block ${
              collapsed ? 'mx-auto' : ''
            }`}
            title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
            aria-label={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Perfil del usuario activo */}
        <div className="p-3 border-b border-[#EDEDEB] dark:border-[#2B2B2B]">
          <div
            className={`bg-white dark:bg-[#242424] p-2.5 rounded-lg border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)] ${
              collapsed ? 'md:hidden' : 'block'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light flex items-center justify-center font-bold text-xs flex-shrink-0">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="truncate min-w-0 flex-1">
                <div className="text-xs font-semibold text-[#37352F] dark:text-white truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-[#787774] dark:text-[#9B9A97] truncate">
                  {currentUser.title || currentUser.role}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#EDEDEB] dark:border-[#2F2F2F] flex items-center justify-between gap-1">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded truncate ${
                  currentUser.role === UserRole.ADMIN
                    ? 'bg-violet-100 dark:bg-violet-950/60 text-violet dark:text-violet-300'
                    : currentUser.role === UserRole.GENERADOR
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-primary dark:text-blue-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {currentUser.role}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center flex-shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> En línea
              </span>
            </div>
          </div>

          <div
            className={`w-8 h-8 mx-auto rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light hidden md:flex items-center justify-center font-bold text-xs ${
              collapsed ? 'md:flex' : 'md:hidden'
            }`}
          >
            {currentUser.fullName.charAt(0)}
          </div>
        </div>

        {/* Lista de navegación de módulos */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-1" aria-label="Módulos del sistema">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  onSelectTab(item.id);
                  onCloseMobile();
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`w-full flex items-center space-x-2.5 px-2.5 py-2 rounded-md text-xs transition min-h-[40px] sm:min-h-[36px] ${
                  isActive
                    ? 'bg-[#EAE9E5] dark:bg-[#2C2C2C] text-[#37352F] dark:text-white font-semibold'
                    : 'text-[#5A5A58] dark:text-[#A4A4A2] hover:bg-[#EDEDEB] dark:hover:bg-[#272727] hover:text-[#37352F] dark:hover:text-white'
                }`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="w-4 h-4 flex-shrink-0 text-[#787774] dark:text-[#9B9A97]" />
                <span className={`truncate ${collapsed ? 'md:hidden' : 'inline'}`}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Pie de barra lateral */}
        <div className="p-3 border-t border-[#EDEDEB] dark:border-[#2B2B2B]">
          <button
            type="button"
            onClick={() => {
              onLogout();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-center space-x-2 px-2.5 py-2 rounded text-xs text-[#787774] dark:text-[#9B9A97] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition min-h-[40px] sm:min-h-[36px]"
            title="Cerrar sesión"
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            <span className={collapsed ? 'md:hidden' : 'inline'}>Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
