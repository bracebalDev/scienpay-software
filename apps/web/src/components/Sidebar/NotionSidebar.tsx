import React from 'react';
import { UserRole } from '@scienpay/shared';
import type { AuthUser } from '../../types/api.types.js';
import { ThemeToggle } from '../../context/ThemeContext.js';
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
  Shield,
  Layers,
} from 'lucide-react';

interface NotionSidebarProps {
  currentUser: AuthUser;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const NotionSidebar: React.FC<NotionSidebarProps> = ({
  currentUser,
  activeTab,
  onSelectTab,
  onLogout,
  collapsed,
  onToggleCollapse,
}) => {
  // Configuración de menús por Rol
  const getNavItems = () => {
    switch (currentUser.role) {
      case UserRole.ADMIN:
        return [
          { id: 'usuarios', label: 'Usuarios y Roles', icon: Users, badge: 'Seguridad' },
          { id: 'parametros', label: 'Parámetros del Sistema', icon: Sliders },
          { id: 'auditoria', label: 'Registro de Auditoría', icon: FileText, badge: 'Inmutable' },
        ];
      case UserRole.GENERADOR:
        return [
          { id: 'proyectos', label: 'Proyectos Científicos', icon: FolderKanban },
          {
            id: 'beneficiarios',
            label: 'Personal (Beneficiarios)',
            icon: UserCheck,
            badge: 'Sin cuenta',
          },
          { id: 'asignaciones', label: 'Asignaciones y Grupos', icon: Layers },
          { id: 'causacion', label: 'Motor de Causación', icon: FileSpreadsheet },
          { id: 'solicitudes_creadas', label: 'Mis Solicitudes', icon: FileText },
        ];
      case UserRole.RECEPTOR:
        return [
          {
            id: 'solicitudes_bandeja',
            label: 'Bandeja de Aprobación',
            icon: CheckCircle2,
            badge: '4 Ojos',
          },
          { id: 'pagos_fifo', label: 'Entregas de Fondos (FIFO)', icon: DollarSign },
          { id: 'recibos', label: 'Recibos Inmutables', icon: Receipt },
          { id: 'caja_chica', label: 'Cajas Chicas', icon: PiggyBank },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems();

  return (
    <aside
      className={`bg-[#F7F6F3] dark:bg-[#1C1C1C] border-r border-[#E9E9E7] dark:border-[#2B2B2B] flex flex-col transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Encabezado del Workspace Notion */}
      <div className="p-3 border-b border-[#EDEDEB] dark:border-[#2B2B2B] flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-white dark:bg-[#252525] border border-[#E9E9E7] dark:border-[#333333] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm p-0.5">
              <img
                src="/logo.jpg"
                alt="Logo"
                className="w-full h-full object-contain"
                onError={(e) => {
                  const target = e.target as HTMLElement;
                  target.style.display = 'none';
                }}
              />
            </div>
            <div className="truncate">
              <div className="text-xs font-bold text-[#37352F] dark:text-white truncate">
                Scienpay Workspace
              </div>
              <div className="text-[10px] text-[#9B9A97] dark:text-[#888886] truncate">
                Física • Química • Biología
              </div>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded bg-white dark:bg-[#252525] border border-[#E9E9E7] dark:border-[#333333] flex items-center justify-center overflow-hidden shadow-sm p-0.5">
            <img
              src="/logo.jpg"
              alt="Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
              }}
            />
          </div>
        )}

        <button
          onClick={onToggleCollapse}
          className="p-1 rounded text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white hover:bg-[#EAE9E5] dark:hover:bg-[#2B2B2B] transition"
          title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Perfil del usuario activo */}
      <div className="p-3 border-b border-[#EDEDEB] dark:border-[#2B2B2B]">
        {!collapsed ? (
          <div className="bg-white dark:bg-[#242424] p-2.5 rounded-lg border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light flex items-center justify-center font-bold text-xs flex-shrink-0">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="truncate flex-1">
                <div className="text-xs font-semibold text-[#37352F] dark:text-white truncate">
                  {currentUser.fullName}
                </div>
                <div className="text-[10px] text-[#787774] dark:text-[#9B9A97] truncate">
                  {currentUser.title || currentUser.role}
                </div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#EDEDEB] dark:border-[#2F2F2F] flex items-center justify-between">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  currentUser.role === UserRole.ADMIN
                    ? 'bg-violet-100 dark:bg-violet-950/60 text-violet dark:text-violet-300'
                    : currentUser.role === UserRole.GENERADOR
                      ? 'bg-blue-100 dark:bg-blue-950/60 text-primary dark:text-blue-300'
                      : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {currentUser.role}
              </span>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> En línea
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 dark:bg-primary/20 text-primary dark:text-primary-light flex items-center justify-center font-bold text-xs">
            {currentUser.fullName.charAt(0)}
          </div>
        )}
      </div>

      {/* Lista de navegación de módulos */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {!collapsed && (
          <div className="px-2 py-1 text-[10px] font-bold text-[#9B9A97] dark:text-[#787774] uppercase tracking-wider">
            Vistas del Rol
          </div>
        )}

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center space-x-2.5 px-2.5 py-1.5 rounded text-xs transition ${
                isActive
                  ? 'bg-[#EAE9E5] dark:bg-[#2C2C2C] text-[#37352F] dark:text-white font-semibold'
                  : 'text-[#5A5A58] dark:text-[#A4A4A2] hover:bg-[#EDEDEB] dark:hover:bg-[#272727] hover:text-[#37352F] dark:hover:text-white'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-[#787774] dark:text-[#9B9A97]" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-[#2F2F2F] text-slate-700 dark:text-slate-300 font-normal">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pie de barra lateral con selector de tema, aviso de segregación y botón de logout */}
      <div className="p-3 border-t border-[#EDEDEB] dark:border-[#2B2B2B] space-y-2">
        {!collapsed ? (
          <div className="flex items-center justify-between px-1">
            <span className="text-[10px] text-[#787774] dark:text-[#888886] font-medium">
              Tema visual
            </span>
            <ThemeToggle compact />
          </div>
        ) : (
          <div className="flex justify-center">
            <ThemeToggle compact />
          </div>
        )}

        {!collapsed && (
          <div className="p-2 rounded bg-slate-100/70 dark:bg-[#222222] border border-[#E9E9E7] dark:border-[#2B2B2B] text-[10px] text-[#787774] dark:text-[#9B9A97] flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="truncate">Segregación estricta de funciones</span>
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 px-2.5 py-1.5 rounded text-xs text-[#787774] dark:text-[#9B9A97] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};
