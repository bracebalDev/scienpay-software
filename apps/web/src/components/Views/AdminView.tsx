import React from 'react';
import { UserAccount, AuditLogItem } from '../../types/app.types.js';
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
} from 'lucide-react';

interface AdminViewProps {
  activeTab: string;
  users: UserAccount[];
  auditLogs: AuditLogItem[];
  onUnlockUser: (username: string) => void;
  onResetAttempts: (username: string) => void;
}

export const AdminView: React.FC<AdminViewProps> = ({
  activeTab,
  users,
  auditLogs,
  onUnlockUser,
  onResetAttempts,
}) => {
  return (
    <div className="space-y-6">
      {/* Banner de Segregación de Funciones ADMIN */}
      <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 text-amber-900 dark:text-amber-200 text-xs flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Segregación de Funciones: Perfil Administrador del Sistema</span>
          <p className="text-[11px] text-amber-800 dark:text-amber-300 mt-0.5">
            El Administrador gestiona usuarios, parámetros y catálogos globales. Por norma de seguridad financiera,{' '}
            <strong>no participa en operaciones de dinero</strong> (no formula causaciones, no crea solicitudes, no aprueba ni desembolsa fondos).
          </p>
        </div>
      </div>

      {/* PESTAÑA: USUARIOS Y ROLES */}
      {activeTab === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEB] dark:border-[#2F2F2F]">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] dark:text-white flex items-center space-x-2">
                <Users className="w-5 h-5 text-violet dark:text-violet-light" />
                <span>Usuarios, Roles y Control de Seguridad</span>
              </h2>
              <p className="text-xs text-[#787774] dark:text-[#9B9A97] mt-0.5">
                Supervisión de cuentas institucionales, intentos de acceso y desbloqueo de usuarios.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-100 dark:bg-[#2A2A2A] text-slate-700 dark:text-slate-300">
              {users.length} Cuentas Registradas
            </span>
          </div>

          {/* Tabla de Usuarios estilo Notion */}
          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
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
                {users.map((u) => {
                  const isBlocked = u.permanentLock || u.failedAttempts >= 4;
                  const isTempLocked = u.lockoutExpiresAt && u.lockoutExpiresAt > Date.now();

                  return (
                    <tr key={u.id} className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525] transition">
                      <td className="py-3 px-4 font-medium text-[#37352F] dark:text-white flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-slate-100 dark:bg-[#2A2A2A] text-slate-700 dark:text-slate-300 flex items-center justify-center font-bold text-[10px]">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.username}</span>
                      </td>
                      <td className="py-3 px-4 text-[#37352F] dark:text-white">
                        <div className="font-medium">{u.fullName}</div>
                        <div className="text-[10px] text-[#9B9A97]">{u.email}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            u.role === 'ADMIN'
                              ? 'bg-violet-100 dark:bg-violet-950/60 text-violet dark:text-violet-300'
                              : u.role === 'GENERADOR'
                              ? 'bg-blue-100 dark:bg-blue-950/60 text-primary dark:text-blue-300'
                              : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-mono text-xs px-2 py-0.5 rounded ${
                            u.failedAttempts === 0
                              ? 'bg-slate-100 dark:bg-[#2A2A2A] text-slate-600 dark:text-slate-300'
                              : u.failedAttempts < 3
                              ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                              : 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-300 font-bold'
                          }`}
                        >
                          {u.failedAttempts} / 4
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
                        {isBlocked ? (
                          <button
                            onClick={() => onUnlockUser(u.username)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 text-white font-medium text-[11px] shadow-sm transition"
                          >
                            <Unlock className="w-3 h-3" />
                            <span>Desbloquear Usuario</span>
                          </button>
                        ) : u.failedAttempts > 0 ? (
                          <button
                            onClick={() => onResetAttempts(u.username)}
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded bg-slate-100 dark:bg-[#2C2C2C] hover:bg-slate-200 dark:hover:bg-[#383838] text-slate-700 dark:text-slate-300 font-medium text-[11px] transition"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Reset Intentos</span>
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#9B9A97] dark:text-[#787774]">Sin acciones</span>
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

      {/* PESTAÑA: PARÁMETROS DEL SISTEMA */}
      {activeTab === 'parametros' && (
        <div className="space-y-4">
          <div className="pb-2 border-b border-[#EDEDEB] dark:border-[#2F2F2F]">
            <h2 className="text-xl font-bold text-[#37352F] dark:text-white flex items-center space-x-2">
              <Sliders className="w-5 h-5 text-primary dark:text-primary-light" />
              <span>Parámetros Globales del Sistema</span>
            </h2>
            <p className="text-xs text-[#787774] dark:text-[#9B9A97] mt-0.5">
              Configuraciones inmutables de moneda, redondeo contable y políticas de sesión.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center space-x-2 text-primary dark:text-primary-light mb-2">
                <Database className="w-4 h-4" />
                <span className="font-semibold text-xs text-[#37352F] dark:text-white">Moneda Oficial</span>
              </div>
              <div className="text-lg font-bold text-[#37352F] dark:text-white">Dólares Americanos (USD)</div>
              <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-1">
                Almacenamiento exacto con columna PostgreSQL <code className="bg-slate-100 dark:bg-[#2C2C2C] px-1 rounded">NUMERIC(14,2)</code>.
              </p>
            </div>

            <div className="bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center space-x-2 text-violet dark:text-violet-light mb-2">
                <Sliders className="w-4 h-4" />
                <span className="font-semibold text-xs text-[#37352F] dark:text-white">Política de Redondeo</span>
              </div>
              <div className="text-lg font-bold text-[#37352F] dark:text-white">Redondeo Bancario</div>
              <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-1">
                Estándar <code className="bg-slate-100 dark:bg-[#2C2C2C] px-1 rounded">Round Half Up</code> a 2 decimales para eliminar sesgo contable.
              </p>
            </div>

            <div className="bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 mb-2">
                <Lock className="w-4 h-4" />
                <span className="font-semibold text-xs text-[#37352F] dark:text-white">Seguridad de Sesión</span>
              </div>
              <div className="text-lg font-bold text-[#37352F] dark:text-white">15 min JWT + Cookie 7d</div>
              <p className="text-[11px] text-[#787774] dark:text-[#9B9A97] mt-1">
                Refresh tokens rotativos con banderas <code className="bg-slate-100 dark:bg-[#2C2C2C] px-1 rounded">HttpOnly, Secure</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: AUDITORÍA INMUTABLE */}
      {activeTab === 'auditoria' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEB] dark:border-[#2F2F2F]">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] dark:text-white flex items-center space-x-2">
                <FileText className="w-5 h-5 text-secondary dark:text-secondary-light" />
                <span>Registro de Auditoría Append-Only (audit_log)</span>
              </h2>
              <p className="text-xs text-[#787774] dark:text-[#9B9A97] mt-0.5">
                Bitácora legal inalterable protegida por triggers de base de datos anti-UPDATE y anti-DELETE.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
              Integridad Verificada
            </span>
          </div>

          <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold border-b border-[#E9E9E7] dark:border-[#2F2F2F]">
                <tr>
                  <th className="py-2.5 px-4">Fecha y Hora (UTC)</th>
                  <th className="py-2.5 px-4">Usuario Responsable</th>
                  <th className="py-2.5 px-4">Rol</th>
                  <th className="py-2.5 px-4">Acción Ejecutada</th>
                  <th className="py-2.5 px-4">Entidad Afectada</th>
                  <th className="py-2.5 px-4">Detalles</th>
                  <th className="py-2.5 px-4">Resultado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FBFBFA] dark:hover:bg-[#252525] transition">
                    <td className="py-2.5 px-4 font-mono text-[11px] text-[#787774] dark:text-[#9B9A97]">{log.timestamp}</td>
                    <td className="py-2.5 px-4 font-medium text-[#37352F] dark:text-white">{log.user}</td>
                    <td className="py-2.5 px-4">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-100 dark:bg-[#2C2C2C] text-slate-700 dark:text-slate-300">
                        {log.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-mono text-[11px] font-semibold text-[#37352F] dark:text-white">{log.action}</td>
                    <td className="py-2.5 px-4 text-[#787774] dark:text-[#9B9A97] font-mono text-[11px]">{log.entity}</td>
                    <td className="py-2.5 px-4 text-[#787774] dark:text-[#9B9A97] text-[11px] max-w-xs truncate">{log.details}</td>
                    <td className="py-2.5 px-4">
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded">
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
