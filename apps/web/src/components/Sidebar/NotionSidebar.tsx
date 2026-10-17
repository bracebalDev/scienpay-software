import React from 'react';
import { UserRole } from '@scienpay/shared';
import { UserAccount } from '../../types/app.types.js';
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
  currentUser: UserAccount;
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
          { id: 'beneficiarios', label: 'Personal (Beneficiarios)', icon: UserCheck, badge: 'Sin cuenta' },
          { id: 'asignaciones', label: 'Asignaciones y Grupos', icon: Layers },
          { id: 'causacion', label: 'Motor de Causación', icon: FileSpreadsheet },
          { id: 'solicitudes_creadas', label: 'Mis Solicitudes', icon: FileText },
        ];
      case UserRole.RECEPTOR:
        return [
          { id: 'solicitudes_bandeja', label: 'Bandeja de Aprobación', icon: CheckCircle2, badge: '4 Ojos' },
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
      className={`bg-[#F7F6F3] border-r border-[#E9E9E7] flex flex-col transition-all duration-200 select-none ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Encabezado del Workspace Notion */}
      <div className="p-3 border-b border-[#EDEDEB] flex items-center justify-between">
        {!collapsed ? (
          <div className="flex items-center space-x-2.5 overflow-hidden">
            <div className="w-7 h-7 rounded bg-white border border-[#E9E9E7] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm p-0.5">
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
              <div className="text-xs font-bold text-[#37352F] truncate">Scienpay Workspace</div>
              <div className="text-[10px] text-[#9B9A97] truncate">Física • Química • Biología</div>
            </div>
          </div>
        ) : (
          <div className="w-7 h-7 mx-auto rounded bg-white border border-[#E9E9E7] flex items-center justify-center overflow-hidden shadow-sm p-0.5">
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
          className="p-1 rounded text-[#9B9A97] hover:text-[#37352F] hover:bg-[#EAE9E5] transition"
          title={collapsed ? 'Expandir barra lateral' : 'Colapsar barra lateral'}
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Perfil del usuario activo */}
      <div className="p-3 border-b border-[#EDEDEB]">
        {!collapsed ? (
          <div className="bg-white p-2.5 rounded-lg border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
            <div className="flex items-center space-x-2.5">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                {currentUser.fullName.charAt(0)}
              </div>
              <div className="truncate flex-1">
                <div className="text-xs font-semibold text-[#37352F] truncate">{currentUser.fullName}</div>
                <div className="text-[10px] text-[#787774] truncate">{currentUser.title}</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-[#EDEDEB] flex items-center justify-between">
              <span
                className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                  currentUser.role === UserRole.ADMIN
                    ? 'bg-violet-100 text-violet'
                    : currentUser.role === UserRole.GENERADOR
                    ? 'bg-blue-100 text-primary'
                    : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {currentUser.role}
              </span>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1" /> En línea
              </span>
            </div>
          </div>
        ) : (
          <div className="w-8 h-8 mx-auto rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
            {currentUser.fullName.charAt(0)}
          </div>
        )}
      </div>

      {/* Lista de navegación de módulos */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {!collapsed && (
          <div className="px-2 py-1 text-[10px] font-bold text-[#9B9A97] uppercase tracking-wider">
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
                  ? 'bg-[#EAE9E5] text-[#37352F] font-semibold'
                  : 'text-[#5A5A58] hover:bg-[#EDEDEB] hover:text-[#37352F]'
              }`}
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-4 h-4 flex-shrink-0 text-[#787774]" />
              {!collapsed && (
                <div className="flex-1 flex items-center justify-between truncate">
                  <span className="truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-200/80 text-slate-700 font-normal">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </nav>

      {/* Pie de barra lateral con aviso de segregación y botón de logout */}
      <div className="p-3 border-t border-[#EDEDEB] space-y-2">
        {!collapsed && (
          <div className="p-2 rounded bg-slate-100/70 border border-[#E9E9E7] text-[10px] text-[#787774] flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-primary flex-shrink-0" />
            <span className="truncate">Segregación estricta de funciones</span>
          </div>
        )}

        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center space-x-2 px-2.5 py-1.5 rounded text-xs text-[#787774] hover:text-rose-600 hover:bg-rose-50 transition"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span>Cerrar Sesión</span>}
        </button>
      </div>
    </aside>
  );
};
