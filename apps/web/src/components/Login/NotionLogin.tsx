import React, { useState, useEffect } from 'react';
import { UserRole } from '@scienpay/shared';
import { UserAccount } from '../../types/app.types.js';
import { PASSWORDS } from '../../data/mockData.js';
import { Lock, Eye, EyeOff, AlertTriangle, ShieldAlert, Check, Clock, ChevronDown, ChevronUp, User } from 'lucide-react';

interface NotionLoginProps {
  users: UserAccount[];
  onLoginSuccess: (user: UserAccount) => void;
  onUpdateUserAttempts: (username: string, failedAttempts: number, isLocked: boolean, lockoutExpiresAt: number | null, permanentLock: boolean) => void;
}

export const NotionLogin: React.FC<NotionLoginProps> = ({
  users,
  onLoginSuccess,
  onUpdateUserAttempts,
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showQuickHelp, setShowQuickHelp] = useState(false);

  // Estado del temporizador de 5 minutos (300 segundos)
  const [remainingSeconds, setRemainingSeconds] = useState<number>(0);

  // Buscar usuario actual escrito
  const matchedUser = users.find(
    (u) =>
      u.username.toLowerCase() === usernameInput.trim().toLowerCase() ||
      u.email.toLowerCase() === usernameInput.trim().toLowerCase(),
  );

  // Efecto para sincronizar timer si el usuario seleccionado está en bloqueo temporal
  useEffect(() => {
    if (matchedUser && matchedUser.lockoutExpiresAt && !matchedUser.permanentLock) {
      const now = Date.now();
      if (matchedUser.lockoutExpiresAt > now) {
        const secs = Math.ceil((matchedUser.lockoutExpiresAt - now) / 1000);
        setRemainingSeconds(secs);
      } else {
        setRemainingSeconds(0);
      }
    } else {
      setRemainingSeconds(0);
    }
  }, [matchedUser]);

  // Cronómetro del temporizador de 5 minutos
  useEffect(() => {
    if (remainingSeconds <= 0) return;

    const interval = setInterval(() => {
      setRemainingSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingSeconds]);

  // Formatear segundos en MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!usernameInput || !passwordInput) {
      setErrorMessage('Por favor ingrese usuario y contraseña.');
      return;
    }

    if (!matchedUser) {
      setErrorMessage('Usuario o correo no encontrado en el sistema.');
      return;
    }

    // 1. Verificar si tiene bloqueo definitivo (4to intento)
    if (matchedUser.permanentLock) {
      setErrorMessage('Usuario bloqueado por seguridad. Solo el Administrador del Sistema tiene acceso a él.');
      return;
    }

    // 2. Verificar si está en período de espera de 5 minutos (3er intento)
    if (remainingSeconds > 0) {
      setErrorMessage(`Debe esperar ${formatTime(remainingSeconds)} antes de volver a intentar.`);
      return;
    }

    // 3. Validar contraseña
    const correctPassword = PASSWORDS[matchedUser.username];
    if (passwordInput === correctPassword) {
      // Éxito: resetear intentos
      onUpdateUserAttempts(matchedUser.username, 0, false, null, false);
      onLoginSuccess(matchedUser);
    } else {
      // Fallo de contraseña: incrementar contador
      const newAttempts = matchedUser.failedAttempts + 1;

      if (newAttempts === 3) {
        // Regla: 3er error activa espera obligatoria de 5 minutos (300 segundos)
        const expiresAt = Date.now() + 5 * 60 * 1000;
        setRemainingSeconds(300);
        onUpdateUserAttempts(matchedUser.username, 3, true, expiresAt, false);
        setErrorMessage('Ha fallado 3 veces. Por política de seguridad bancaria, debe esperar 5 minutos.');
      } else if (newAttempts >= 4) {
        // Regla: 4to error bloquea definitivamente la cuenta
        onUpdateUserAttempts(matchedUser.username, newAttempts, true, null, true);
        setErrorMessage('Usuario bloqueado por seguridad. Ha alcanzado el 4to error consecutivo. Solo el Administrador del Sistema puede desbloquear su cuenta.');
      } else {
        // 1er o 2do error
        onUpdateUserAttempts(matchedUser.username, newAttempts, false, null, false);
        setErrorMessage(`Contraseña incorrecta. Intento ${newAttempts} de 3 permitidos antes de suspensión temporal.`);
      }
    }
  };

  // Autocompletar para pruebas
  const fillCredentials = (user: UserAccount) => {
    setUsernameInput(user.username);
    setPasswordInput(PASSWORDS[user.username] || '');
    setErrorMessage('');
  };

  const isPermanentlyLocked = matchedUser?.permanentLock === true;
  const isTemporarilyLocked = remainingSeconds > 0;

  return (
    <div className="min-h-screen bg-[#FBFBFA] flex flex-col items-center justify-center p-4 selection:bg-primary/20">
      {/* Contenedor centrado estilo Notion */}
      <div className="w-full max-w-[420px]">
        {/* Cabecera / Identidad Notion */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white border border-[#E9E9E7] shadow-sm mb-3 overflow-hidden p-1.5">
            <img
              src="/logo.jpg"
              alt="Scienpay Logo"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                const target = e.target as HTMLElement;
                target.style.display = 'none';
              }}
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#37352F] font-sans">
            Iniciar Sesión en Scienpay
          </h1>
          <p className="text-xs text-[#787774] mt-1.5">
            Sistema de Control de Pagos y Asignaciones Científicas
          </p>
        </div>

        {/* Tarjeta de Login Centrada */}
        <div className="bg-white rounded-xl border border-[#E9E9E7] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-7 transition-all">
          {/* Mensajes de Estado / Alertas */}
          {isPermanentlyLocked ? (
            <div className="mb-5 p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
              <div className="flex items-center space-x-2 font-semibold mb-1">
                <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span>Cuenta Bloqueada por Seguridad</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700">
                Ha superado los 4 intentos fallidos. Conforme a las reglas de ciberseguridad, esta cuenta está bloqueada. <strong>Solo el Administrador del Sistema tiene acceso a ella para restaurarla.</strong>
              </p>
            </div>
          ) : isTemporarilyLocked ? (
            <div className="mb-5 p-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
              <div className="flex items-center justify-between font-semibold mb-1">
                <span className="flex items-center space-x-1.5">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>Espera de Seguridad Activa</span>
                </span>
                <span className="font-mono text-sm font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                  {formatTime(remainingSeconds)}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Se han registrado 3 errores consecutivos. Debe aguardar el tiempo indicado para volver a intentar. Un 4to error bloqueará la cuenta definitivamente.
              </p>
            </div>
          ) : errorMessage ? (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          ) : null}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Campo Usuario */}
            <div>
              <label className="block text-[11px] font-semibold text-[#787774] uppercase tracking-wider mb-1.5">
                Usuario
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B9A97]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  placeholder="admin / generador / receptor"
                  disabled={isPermanentlyLocked || isTemporarilyLocked}
                  required
                  className="w-full pl-9 pr-3 py-2 text-sm text-[#37352F] bg-[#F7F6F3]/50 border border-[#E9E9E7] rounded-lg focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Campo Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-[#787774] uppercase tracking-wider">
                  Contraseña
                </label>
                <span className="text-[10px] text-[#9B9A97]">Mínimo 12 car.</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B9A97]">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={isPermanentlyLocked || isTemporarilyLocked}
                  required
                  className="w-full pl-9 pr-10 py-2 text-sm text-[#37352F] bg-[#F7F6F3]/50 border border-[#E9E9E7] rounded-lg focus:outline-none focus:bg-white focus:border-primary focus:ring-1 focus:ring-primary transition disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9B9A97] hover:text-[#37352F] transition"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={isPermanentlyLocked || isTemporarilyLocked}
              className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover active:bg-[#353FDB] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>Ingresar</span>
            </button>
          </form>

          {/* Información de intentos del usuario si existe */}
          {matchedUser && !matchedUser.permanentLock && matchedUser.failedAttempts > 0 && (
            <div className="mt-4 pt-3 border-t border-[#EDEDEB] flex items-center justify-between text-[11px] text-[#787774]">
              <span>Intentos fallidos registrados:</span>
              <span className="font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {matchedUser.failedAttempts} de 4
              </span>
            </div>
          )}
        </div>

        {/* Acordeón de Acceso Rápido para Pruebas y Docente */}
        <div className="mt-5 bg-white rounded-xl border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.03)] overflow-hidden">
          <button
            onClick={() => setShowQuickHelp(!showQuickHelp)}
            className="w-full px-4 py-3 text-left flex items-center justify-between text-xs font-medium text-[#787774] hover:bg-[#F7F6F3] transition"
          >
            <span>Credenciales de prueba por Rol (Evaluar sistema)</span>
            {showQuickHelp ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showQuickHelp && (
            <div className="px-4 pb-4 pt-1 space-y-2 border-t border-[#EDEDEB] bg-[#FBFBFA]/50">
              <p className="text-[11px] text-[#787774] mb-2">
                Haz clic en cualquier rol para autocompletar usuario y contraseña autorizada:
              </p>

              {users.map((u) => (
                <div
                  key={u.id}
                  onClick={() => fillCredentials(u)}
                  className="p-2.5 rounded-lg border border-[#E9E9E7] bg-white hover:border-primary/50 cursor-pointer transition flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center space-x-2">
                      <span
                        className={`font-semibold px-1.5 py-0.5 rounded text-[10px] ${
                          u.role === UserRole.ADMIN
                            ? 'bg-violet-100 text-violet'
                            : u.role === UserRole.GENERADOR
                            ? 'bg-blue-100 text-primary'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {u.role}
                      </span>
                      <span className="font-medium text-[#37352F]">{u.username}</span>
                      {u.permanentLock && (
                        <span className="text-[10px] px-1 rounded bg-rose-100 text-rose-700 font-bold">
                          Bloqueado
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[#787774] mt-0.5">{u.fullName}</div>
                  </div>
                  <Check className="w-3.5 h-3.5 text-slate-400 opacity-60" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pie de página Notion */}
        <div className="text-center mt-6 text-[11px] text-[#9B9A97]">
          Scienpay • Universidad de Carabobo • Seguridad ASVS Nivel 2
        </div>
      </div>
    </div>
  );
};
