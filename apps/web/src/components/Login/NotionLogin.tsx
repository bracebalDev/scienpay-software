import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { loginSchema, type LoginInput } from '@scienpay/shared';
import { AlertTriangle, Eye, EyeOff, Lock, ShieldAlert, User } from 'lucide-react';
import { ThemeToggle } from '../../context/ThemeContext.js';
import { useAuth } from '../../context/AuthContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';

/**
 * Pantalla de inicio de sesión real (HANDOFF 3.2).
 *
 * El bloqueo por intentos fallidos lo aplica el backend
 * (`AccountSecurityPolicy`); la interfaz solo muestra el mensaje devuelto.
 * No existen credenciales de prueba ni datos simulados en el cliente.
 */
export const NotionLogin: React.FC = () => {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver<LoginInput>(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError('');
    setIsSubmitting(true);
    try {
      await login(values);
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  });

  const isLockMessage =
    serverError.includes('BLOQUEO_TEMPORAL') || serverError.includes('USUARIO_BLOQUEADO');

  return (
    <div className="relative min-h-screen bg-[#FBFBFA] dark:bg-[#191919] flex flex-col items-center justify-center p-4 selection:bg-primary/20 transition-colors duration-200">
      {/* Selector de tema en esquina superior derecha */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Contenedor centrado estilo Notion */}
      <div className="w-full max-w-[420px]">
        {/* Cabecera / Identidad Notion */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white dark:bg-[#202020] border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-sm mb-3 overflow-hidden p-1.5">
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
          <h1 className="text-2xl font-bold tracking-tight text-[#37352F] dark:text-white font-sans">
            Iniciar Sesión en Scienpay
          </h1>
          <p className="text-xs text-[#787774] dark:text-[#9B9A97] mt-1.5">
            Sistema de Control de Pagos y Asignaciones Científicas
          </p>
        </div>

        {/* Tarjeta de Login Centrada */}
        <div className="bg-white dark:bg-[#202020] rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_3px_rgba(0,0,0,0.05)] p-7 transition-all">
          {/* Mensajes de Estado / Alertas */}
          {isLockMessage ? (
            <div className="mb-5 p-4 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-800 dark:text-rose-300 text-xs">
              <div className="flex items-center space-x-2 font-semibold mb-1">
                <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                <span>Cuenta Bloqueada por Seguridad</span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-700 dark:text-rose-400">
                {serverError}
              </p>
            </div>
          ) : serverError ? (
            <div className="mb-5 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
              <span>{serverError}</span>
            </div>
          ) : null}

          {/* Formulario */}
          <form onSubmit={onSubmit} className="space-y-4" noValidate>
            {/* Campo Usuario o Correo */}
            <div>
              <label className="block text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider mb-1.5">
                Usuario o correo
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B9A97]">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  autoComplete="username"
                  placeholder="usuario@scienpay.uc.edu.ve"
                  {...form.register('identifier')}
                  className={`w-full pl-9 pr-3 py-2 text-sm text-[#37352F] dark:text-white bg-[#F7F6F3]/50 dark:bg-[#2A2A2A] border rounded-lg focus:outline-none focus:bg-white dark:focus:bg-[#2F2F2F] focus:ring-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.identifier
                      ? 'border-rose-400 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-[#E9E9E7] dark:border-[#383838] focus:border-primary focus:ring-primary'
                  }`}
                />
              </div>
              {errors.identifier && (
                <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400 mt-1">
                  {errors.identifier.message}
                </p>
              )}
            </div>

            {/* Campo Contraseña */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-semibold text-[#787774] dark:text-[#9B9A97] uppercase tracking-wider">
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
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  {...form.register('password')}
                  className={`w-full pl-9 pr-10 py-2 text-sm text-[#37352F] dark:text-white bg-[#F7F6F3]/50 dark:bg-[#2A2A2A] border rounded-lg focus:outline-none focus:bg-white dark:focus:bg-[#2F2F2F] focus:ring-1 transition disabled:opacity-50 disabled:cursor-not-allowed ${
                    errors.password
                      ? 'border-rose-400 dark:border-rose-700 focus:border-rose-500 focus:ring-rose-500'
                      : 'border-[#E9E9E7] dark:border-[#383838] focus:border-primary focus:ring-primary'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#9B9A97] hover:text-[#37352F] dark:hover:text-white transition"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[10px] font-medium text-rose-600 dark:text-rose-400 mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Botón de Ingreso */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-lg text-sm font-medium text-white bg-primary hover:bg-primary-hover active:bg-[#353FDB] transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              <span>{isSubmitting ? 'Verificando…' : 'Ingresar'}</span>
            </button>
          </form>

          <p className="mt-4 pt-3 border-t border-[#EDEDEB] dark:border-[#2F2F2F] text-[10px] leading-relaxed text-[#9B9A97] dark:text-[#888886]">
            Tras 3 intentos fallidos la cuenta se suspende 5 minutos. Un cuarto intento la bloquea
            definitivamente y solo el Administrador del Sistema puede restaurarla.
          </p>
        </div>

        {/* Pie de página Notion */}
        <div className="text-center mt-6 text-[11px] text-[#9B9A97]">
          Scienpay • Universidad de Carabobo • Seguridad ASVS Nivel 2
        </div>
      </div>
    </div>
  );
};
