import React from 'react';
import { UserRole } from '@scienpay/shared';
import { Shield, DollarSign, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface-muted">
      {/* Barra superior de navegación */}
      <header className="bg-white border-b border-surface-border shadow-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center text-white font-bold text-xl shadow-md">
              S
            </div>
            <div>
              <span className="text-xl font-bold text-surface-dark tracking-tight">Scienpay</span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet">
                Fase 1: Setup
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <span className="text-sm font-medium text-slate-600 hidden md:inline">
              Control de Pagos y Asignaciones
            </span>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Entorno Activo
            </span>
          </div>
        </div>
      </header>

      {/* Contenido principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-sm border border-surface-border mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-dark mb-2">
            Sistema de Control de Pagos y Asignaciones
          </h1>
          <p className="text-slate-600 text-sm sm:text-base max-w-3xl">
            Plataforma para la gestión financiera de estipendios científicos en proyectos de{' '}
            <strong className="text-primary">Física</strong>,{' '}
            <strong className="text-secondary">Química</strong> y{' '}
            <strong className="text-accent">Biología</strong> en dólares (USD).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="p-5 rounded-xl border border-surface-border bg-slate-50/50 hover:border-primary/50 transition">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-3">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-surface-dark mb-1">Segregación de Funciones</h3>
              <p className="text-xs text-slate-500">
                Roles estrictos ({UserRole.ADMIN}, {UserRole.GENERADOR}, {UserRole.RECEPTOR}) y regla de cuatro ojos en el backend.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-surface-border bg-slate-50/50 hover:border-secondary/50 transition">
              <div className="w-10 h-10 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center mb-3">
                <DollarSign className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-surface-dark mb-1">Inmutabilidad Financiera</h3>
              <p className="text-xs text-slate-500">
                Aritmética decimal exacta en USD, redondeo bancario y secuencias de recibos sin huecos protegidas por triggers.
              </p>
            </div>

            <div className="p-5 rounded-xl border border-surface-border bg-slate-50/50 hover:border-violet/50 transition">
              <div className="w-10 h-10 rounded-lg bg-violet/10 text-violet flex items-center justify-center mb-3">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="font-semibold text-surface-dark mb-1">Causación y FIFO</h3>
              <p className="text-xs text-slate-500">
                Prorrateo por días activos en períodos variables y liquidación de pagos parciales por orden cronológico.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Pie de página */}
      <footer className="bg-white border-t border-surface-border py-4 text-center text-xs text-slate-500">
        Scienpay © 2026 • Universidad de Carabobo • Sistemas de Información
      </footer>
    </div>
  );
};
