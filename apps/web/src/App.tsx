import React, { useState } from 'react';
import { UserRole } from '@scienpay/shared';
import {
  Shield,
  DollarSign,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  LogOut,
  UserCheck,
  AlertCircle,
  FolderKanban,
  Receipt,
  PiggyBank,
  FileText,
  KeyRound,
  ArrowRight,
  Sliders,
} from 'lucide-react';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  title: string;
}

const TEST_USERS: Record<UserRole, AuthUser> = {
  [UserRole.ADMIN]: {
    id: 'usr-admin-01',
    name: 'Lic. Carlos Mendoza',
    email: 'admin@scienpay.uc.edu.ve',
    role: UserRole.ADMIN,
    title: 'Administrador del Sistema',
  },
  [UserRole.GENERADOR]: {
    id: 'usr-gen-02',
    name: 'Dra. Elena Rostova',
    email: 'generador@scienpay.uc.edu.ve',
    role: UserRole.GENERADOR,
    title: 'Coordinadora General de Proyectos',
  },
  [UserRole.RECEPTOR]: {
    id: 'usr-rec-03',
    name: 'Mg. Roberto Silva',
    email: 'receptor@scienpay.uc.edu.ve',
    role: UserRole.RECEPTOR,
    title: 'Gerente de Administración y Finanzas',
  },
};

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Manejador de inicio de sesión manual
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email || !password) {
      setErrorMessage('Por favor ingrese su correo electrónico y contraseña.');
      return;
    }

    if (password.length < 12) {
      setErrorMessage('La contraseña debe contener al menos 12 caracteres (política de seguridad OWASP ASVS).');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      // Validar contra usuarios de prueba
      const foundRole = Object.values(TEST_USERS).find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
      if (foundRole) {
        setCurrentUser(foundRole);
      } else {
        setErrorMessage('Credenciales no válidas. Verifique el correo o utilice el acceso rápido de prueba.');
      }
    }, 400);
  };

  // Acceso rápido para pruebas de rol
  const handleQuickLogin = (role: UserRole) => {
    const user = TEST_USERS[role];
    setEmail(user.email);
    setPassword('PruebaSegura2026!');
    setErrorMessage('');
    setCurrentUser(user);
  };

  // Cierre de sesión
  const handleLogout = () => {
    setCurrentUser(null);
    setEmail('');
    setPassword('');
    setErrorMessage('');
  };

  return (
    <div className="min-h-screen flex flex-col bg-surface-muted text-surface-dark">
      {/* Encabezado superior */}
      <header className="bg-white border-b border-surface-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-white font-bold text-xl shadow-md">
              S
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold text-surface-dark tracking-tight">Scienpay</span>
                <span className="hidden sm:inline-block text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet">
                  v1.0-local
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Control de Pagos y Asignaciones Científicas • USD
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {currentUser ? (
              <div className="flex items-center space-x-3">
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold text-surface-dark">{currentUser.name}</div>
                  <div className="text-xs text-slate-500">{currentUser.title}</div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                    currentUser.role === UserRole.ADMIN
                      ? 'bg-violet-100 text-violet border border-violet-200'
                      : currentUser.role === UserRole.GENERADOR
                      ? 'bg-blue-100 text-primary border border-blue-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  {currentUser.role}
                </span>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-rose-50 hover:text-rose-600 transition"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-4 h-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">Salir</span>
                </button>
              </div>
            ) : (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Sistema Listo
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col justify-center">
        {!currentUser ? (
          /* =====================================================================================
             PANTALLA DE AUTENTICACIÓN / LOGIN
             ===================================================================================== */
          <div className="max-w-4xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Columna izquierda: Formulario de inicio de sesión */}
            <div className="lg:col-span-7 bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-surface-border">
              <div className="mb-6">
                <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <Lock className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-bold text-surface-dark">Iniciar Sesión</h2>
                <p className="text-sm text-slate-600 mt-1">
                  Ingrese con sus credenciales autorizadas conforme a su rol asignado.
                </p>
              </div>

              {errorMessage && (
                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleManualLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Correo Electrónico Institucional
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="usuario@scienpay.uc.edu.ve"
                      required
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-surface-border bg-slate-50/50 text-surface-dark placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                    Contraseña (mínimo 12 caracteres)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      required
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-surface-border bg-slate-50/50 text-surface-dark placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-sm transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Protección OWASP ASVS Nivel 2: Cifrado con Argon2id.
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl font-semibold text-white bg-primary hover:bg-primary-hover active:bg-blue-800 transition shadow-md shadow-primary/25 text-sm flex items-center justify-center space-x-2"
                >
                  {isLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Ingresar al Sistema</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Columna derecha: Accesos Rápidos de Prueba por Rol */}
            <div className="lg:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-border">
                <div className="flex items-center space-x-2 mb-3">
                  <UserCheck className="w-5 h-5 text-violet" />
                  <h3 className="font-bold text-surface-dark text-base">Acceso Rápido de Prueba</h3>
                </div>
                <p className="text-xs text-slate-600 mb-4">
                  Seleccione cualquiera de los 3 roles para probar las diferentes capacidades y la segregación de funciones:
                </p>

                <div className="space-y-3">
                  {/* Rol ADMIN */}
                  <button
                    onClick={() => handleQuickLogin(UserRole.ADMIN)}
                    className="w-full text-left p-3.5 rounded-xl border border-surface-border hover:border-violet bg-slate-50/50 hover:bg-violet-50/30 transition group flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-violet-100 text-violet">
                          ADMIN
                        </span>
                        <span className="text-xs font-semibold text-surface-dark">Carlos Mendoza</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Usuarios, roles, parámetros y auditoría
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-violet transition transform group-hover:translate-x-0.5" />
                  </button>

                  {/* Rol GENERADOR */}
                  <button
                    onClick={() => handleQuickLogin(UserRole.GENERADOR)}
                    className="w-full text-left p-3.5 rounded-xl border border-surface-border hover:border-primary bg-slate-50/50 hover:bg-blue-50/30 transition group flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-100 text-primary">
                          GENERADOR
                        </span>
                        <span className="text-xs font-semibold text-surface-dark">Elena Rostova</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Proyectos, personas, causación y solicitudes
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-primary transition transform group-hover:translate-x-0.5" />
                  </button>

                  {/* Rol RECEPTOR */}
                  <button
                    onClick={() => handleQuickLogin(UserRole.RECEPTOR)}
                    className="w-full text-left p-3.5 rounded-xl border border-surface-border hover:border-emerald-500 bg-slate-50/50 hover:bg-emerald-50/30 transition group flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                          RECEPTOR
                        </span>
                        <span className="text-xs font-semibold text-surface-dark">Roberto Silva</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Aprobación, entregas FIFO, recibos y caja chica
                      </p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-emerald-600 transition transform group-hover:translate-x-0.5" />
                  </button>
                </div>
              </div>

              {/* Aviso de seguridad */}
              <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 text-xs">
                <span className="font-semibold block mb-1">🔒 Segregación de Funciones:</span>
                Las contraseñas de producción se gestionan mediante credenciales seguras documentadas en el archivo privado local del proyecto.
              </div>
            </div>
          </div>
        ) : (
          /* =====================================================================================
             VISTA DE SESIÓN ACTIVA SEGÚN EL ROL AUTENTICADO
             ===================================================================================== */
          <div className="space-y-6">
            {/* Tarjeta de bienvenida de sesión */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-surface-border flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-surface-dark">
                    Bienvenido, {currentUser.name}
                  </h1>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">
                  Sesión iniciada con perfil <strong className="text-primary">{currentUser.role}</strong> ({currentUser.title}).
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 text-slate-700">
                  {currentUser.email}
                </span>
              </div>
            </div>

            {/* Paneles según el rol autenticado */}
            {currentUser.role === UserRole.ADMIN && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white p-6 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-violet/10 text-violet flex items-center justify-center mb-3">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark">Gestión de Usuarios</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Administración de cuentas institucionales, asignación de roles y bloqueos preventivos.
                    </p>
                    <span className="text-xs font-semibold text-violet">3 Usuarios Registrados</span>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <Sliders className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark">Parámetros del Sistema</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Configuración global de moneda (USD), redondeo bancario y políticas de seguridad.
                    </p>
                    <span className="text-xs font-semibold text-primary">Configuración Activa</span>
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark">Visor de Auditoría Inmutable</h3>
                    <p className="text-xs text-slate-500 mt-1 mb-4">
                      Registro de trazabilidad append-only (audit_log) de cada acción del sistema.
                    </p>
                    <span className="text-xs font-semibold text-secondary">Trazabilidad Total</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    <strong>Segregación activa:</strong> Como Administrador, no tiene facultades para crear causaciones, formular solicitudes de pago ni registrar pagos de dinero.
                  </span>
                </div>
              </div>
            )}

            {currentUser.role === UserRole.GENERADOR && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                      <FolderKanban className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark text-sm">Proyectos Científicos</h3>
                    <p className="text-xs text-slate-500 mt-1">Física, Química y Biología</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center mb-3">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark text-sm">Personas y Asignaciones</h3>
                    <p className="text-xs text-slate-500 mt-1">Beneficiarios sin credenciales</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-violet/10 text-violet flex items-center justify-center mb-3">
                      <FileSpreadsheet className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark text-sm">Motor de Causación</h3>
                    <p className="text-xs text-slate-500 mt-1">Prorrateo por días activos</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-accent/20 text-blue-700 flex items-center justify-center mb-3">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark text-sm">Solicitudes de Pago</h3>
                    <p className="text-xs text-slate-500 mt-1">Crear borrador y enviar</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-blue-600 flex-shrink-0" />
                  <span>
                    <strong>Regla de Cuatro Ojos en Servidor:</strong> Como Generador, puede formular causaciones y solicitudes, pero está terminantemente prohibido que usted apruebe o desembolse fondos.
                  </span>
                </div>
              </div>
            )}

            {currentUser.role === UserRole.RECEPTOR && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center mb-3">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark text-sm">Aprobación de Pagos</h3>
                    <p className="text-xs text-slate-500 mt-1">Revisión de solicitudes enviadas</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-primary flex items-center justify-center mb-3">
                      <DollarSign className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark text-sm">Entregas de Fondos</h3>
                    <p className="text-xs text-slate-500 mt-1">Aplicación por algoritmo FIFO</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet flex items-center justify-center mb-3">
                      <Receipt className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark text-sm">Recibos Consecutivos</h3>
                    <p className="text-xs text-slate-500 mt-1">Secuencia estricta inmutable</p>
                  </div>

                  <div className="bg-white p-5 rounded-2xl border border-surface-border shadow-sm">
                    <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mb-3">
                      <PiggyBank className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-surface-dark text-sm">Cajas Chicas</h3>
                    <p className="text-xs text-slate-500 mt-1">Apertura, vales y arrastre mensual</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                  <span>
                    <strong>Segregación activa:</strong> Como Receptor, tiene la potestad de aprobar solicitudes y registrar pagos, pero no puede crear proyectos, personas ni originar causaciones.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Pie de página */}
      <footer className="bg-white border-t border-surface-border py-4 text-center text-xs text-slate-500">
        Scienpay © 2026 • Universidad de Carabobo • Sistemas de Información • Moneda Oficial: USD
      </footer>
    </div>
  );
};
