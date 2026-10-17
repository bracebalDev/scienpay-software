import React, { useState } from 'react';
import { ProjectItem, BeneficiaryItem, AssignmentItem, PaymentRequestItem } from '../../types/app.types.js';
import {
  FolderKanban,
  UserCheck,
  Layers,
  FileSpreadsheet,
  FileText,
  AlertCircle,
  Plus,
  Send,
  Calculator,
} from 'lucide-react';
import { PaymentRequestStatus } from '@scienpay/shared';

interface GeneratorViewProps {
  activeTab: string;
  projects: ProjectItem[];
  beneficiaries: BeneficiaryItem[];
  assignments: AssignmentItem[];
  requests: PaymentRequestItem[];
  onSendRequest: (requestId: string) => void;
}

export const GeneratorView: React.FC<GeneratorViewProps> = ({
  activeTab,
  projects,
  beneficiaries,
  assignments,
  requests,
  onSendRequest,
}) => {
  // Estado local para simulación de causación
  const [selectedProject, setSelectedProject] = useState(projects[0]?.code || 'FIS-01');
  const [activeDays, setActiveDays] = useState(30);
  const [totalDays, setTotalDays] = useState(30);
  const [baseAmount, setBaseAmount] = useState(850.0);
  const [calculatedAmount, setCalculatedAmount] = useState<number | null>(null);

  const handleCalculateCausation = () => {
    // Fórmula oficial: round_bancario(Monto * (dias_activos / dias_totales), 2)
    const factor = activeDays / totalDays;
    const result = Math.round(baseAmount * factor * 100) / 100;
    setCalculatedAmount(result);
  };

  return (
    <div className="space-y-6">
      {/* Banner de Segregación de Funciones GENERADOR */}
      <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-blue-950 text-xs flex items-start space-x-3">
        <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Segregación de Funciones: Perfil Generador (Coordinador General)</span>
          <p className="text-[11px] text-blue-900 mt-0.5">
            Gestiona proyectos científicos, beneficiarios, asignaciones y genera causaciones y solicitudes de pago. 
            <strong> Regla de Cuatro Ojos:</strong> Tiene terminantemente prohibido aprobar solicitudes y registrar entrega de fondos.
          </p>
        </div>
      </div>

      {/* PESTAÑA: PROYECTOS */}
      {activeTab === 'proyectos' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEB]">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
                <FolderKanban className="w-5 h-5 text-primary" />
                <span>Proyectos de Investigación Científica</span>
              </h2>
              <p className="text-xs text-[#787774] mt-0.5">
                Catálogo de proyectos clasificados por Área (Física, Química, Biología) y Ámbito (Interno/Externo).
              </p>
            </div>
            <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-sm transition">
              <Plus className="w-3.5 h-3.5" />
              <span>Nuevo Proyecto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.map((p) => (
              <div key={p.id} className="bg-white p-5 rounded-xl border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-[#37352F]">
                      {p.code}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                        p.area === 'FISICA'
                          ? 'bg-blue-100 text-primary'
                          : p.area === 'QUIMICA'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {p.area}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#37352F] mb-1">{p.name}</h3>
                  <div className="text-[11px] text-[#787774] space-y-0.5 mt-2">
                    <div>Ámbito: <strong className="text-[#37352F]">{p.scope}</strong></div>
                    <div>Vigencia: {p.startDate} al {p.endDate}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-[#EDEDEB] flex items-center justify-between text-xs">
                  <span className="text-[#787774]">Presupuesto Asignado:</span>
                  <span className="font-bold text-[#37352F] font-mono">
                    ${p.budgetUSD.toLocaleString('es-CO', { minimumFractionDigits: 2 })} USD
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* PESTAÑA: BENEFICIARIOS */}
      {activeTab === 'beneficiarios' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEB]">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
                <UserCheck className="w-5 h-5 text-secondary" />
                <span>Personal Beneficiario de Asignaciones</span>
              </h2>
              <p className="text-xs text-[#787774] mt-0.5">
                Investigadores y técnicos que reciben estipendios científicos en dólares (USD).
              </p>
            </div>
            <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-sm transition">
              <Plus className="w-3.5 h-3.5" />
              <span>Registrar Beneficiario</span>
            </button>
          </div>

          {/* Nota clave del negocio sobre beneficiarios */}
          <div className="p-3.5 rounded-xl bg-slate-100/80 border border-[#E9E9E7] text-xs text-[#5A5A58] flex items-center space-x-2">
            <span className="font-bold text-primary">📌 Regla de Negocio:</span>
            <span>Los beneficiarios <strong>NO tienen usuario en el sistema</strong>. Son personas registradas exclusivamente como datos de pago y no tienen credenciales de acceso.</span>
          </div>

          <div className="bg-white rounded-xl border border-[#E9E9E7] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] text-[#787774] font-semibold border-b border-[#E9E9E7]">
                <tr>
                  <th className="py-2.5 px-4">Documento Identidad</th>
                  <th className="py-2.5 px-4">Nombre Completo</th>
                  <th className="py-2.5 px-4">Especialidad / Cargo Científico</th>
                  <th className="py-2.5 px-4">Correo Contacto</th>
                  <th className="py-2.5 px-4">Acceso al Sistema</th>
                  <th className="py-2.5 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB]">
                {beneficiaries.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FBFBFA] transition">
                    <td className="py-3 px-4 font-mono font-medium text-[#37352F]">
                      {b.documentType}-{b.documentNumber}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#37352F]">{b.fullName}</td>
                    <td className="py-3 px-4 text-[#787774]">{b.specialty}</td>
                    <td className="py-3 px-4 text-[#787774] font-mono text-[11px]">{b.email}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600">
                        Solo Datos (Sin Usuario)
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: ASIGNACIONES */}
      {activeTab === 'asignaciones' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEB]">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
                <Layers className="w-5 h-5 text-violet" />
                <span>Asignaciones y Grupos de Pago</span>
              </h2>
              <p className="text-xs text-[#787774] mt-0.5">
                Vínculo persona + proyecto + periodicidad con montos exactos en USD y validación de no solapamiento.
              </p>
            </div>
            <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-sm transition">
              <Plus className="w-3.5 h-3.5" />
              <span>Nueva Asignación</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#E9E9E7] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] text-[#787774] font-semibold border-b border-[#E9E9E7]">
                <tr>
                  <th className="py-2.5 px-4">Beneficiario</th>
                  <th className="py-2.5 px-4">Proyecto</th>
                  <th className="py-2.5 px-4">Periodicidad</th>
                  <th className="py-2.5 px-4">Monto por Período</th>
                  <th className="py-2.5 px-4">Vigencia</th>
                  <th className="py-2.5 px-4">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB]">
                {assignments.map((a) => (
                  <tr key={a.id} className="hover:bg-[#FBFBFA] transition">
                    <td className="py-3 px-4 font-semibold text-[#37352F]">{a.beneficiaryName}</td>
                    <td className="py-3 px-4 font-mono font-medium text-primary">{a.projectCode}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {a.periodicity}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#37352F]">
                      ${a.amountUSD.toFixed(2)} USD
                    </td>
                    <td className="py-3 px-4 text-[#787774] text-[11px]">
                      {a.startDate} al {a.endDate}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PESTAÑA: MOTOR DE CAUSACIÓN */}
      {activeTab === 'causacion' && (
        <div className="space-y-4">
          <div className="pb-2 border-b border-[#EDEDEB]">
            <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
              <FileSpreadsheet className="w-5 h-5 text-violet" />
              <span>Motor de Causación y Prorrateo por Días Activos</span>
            </h2>
            <p className="text-xs text-[#787774] mt-0.5">
              Cálculo exacto: <code className="bg-slate-100 px-1 py-0.5 rounded">Monto Causado = Monto Período × (Días Activos / Días Totales)</code> con redondeo bancario a 2 decimales.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            {/* Simulador de Prorrateo */}
            <div className="md:col-span-5 bg-white p-5 rounded-xl border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
              <h3 className="text-sm font-bold text-[#37352F] flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-violet" />
                <span>Simulador de Prorrateo en Tiempo Real</span>
              </h3>

              <div>
                <label className="block text-[11px] font-semibold text-[#787774] mb-1">Proyecto</label>
                <select
                  value={selectedProject}
                  onChange={(e) => setSelectedProject(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-[#E9E9E7] bg-[#F7F6F3]"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.code} - {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#787774] mb-1">Monto Base del Período (USD)</label>
                <input
                  type="number"
                  value={baseAmount}
                  onChange={(e) => setBaseAmount(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs p-2 rounded-lg border border-[#E9E9E7] font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#787774] mb-1">Días Activos en Período</label>
                  <input
                    type="number"
                    value={activeDays}
                    onChange={(e) => setActiveDays(parseInt(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-[#E9E9E7] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#787774] mb-1">Días Totales del Período</label>
                  <input
                    type="number"
                    value={totalDays}
                    onChange={(e) => setTotalDays(parseInt(e.target.value) || 0)}
                    className="w-full text-xs p-2 rounded-lg border border-[#E9E9E7] font-mono"
                  />
                </div>
              </div>

              <button
                onClick={handleCalculateCausation}
                className="w-full py-2 px-3 rounded-lg bg-violet hover:bg-violet-hover text-white text-xs font-semibold shadow-sm transition"
              >
                Calcular Prorrateo
              </button>

              {calculatedAmount !== null && (
                <div className="p-3 rounded-lg bg-violet-50 border border-violet-200 text-violet">
                  <div className="text-[11px] font-medium">Monto Causado Calculado:</div>
                  <div className="text-xl font-mono font-bold mt-0.5">
                    ${calculatedAmount.toFixed(2)} USD
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    Factor de liquidación: {(activeDays / totalDays).toFixed(4)} • Redondeo bancario aplicado
                  </div>
                </div>
              )}
            </div>

            {/* Generación de Lote */}
            <div className="md:col-span-7 bg-white p-5 rounded-xl border border-[#E9E9E7] shadow-[0_1px_2px_rgba(0,0,0,0.02)] flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold text-[#37352F] mb-2">Generar Lote de Causación Masivo</h3>
                <p className="text-xs text-[#787774] mb-4">
                  El motor ejecuta el prorrateo automático para todas las asignaciones vigentes del proyecto seleccionado, congelando los registros en un lote inmutable.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-[#F7F6F3] border border-[#E9E9E7] flex items-center justify-between">
                    <span>Lote Activo de Octubre 2026:</span>
                    <span className="font-mono font-bold text-primary">LOT-2026-10-FIS01</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F6F3] border border-[#E9E9E7] flex items-center justify-between">
                    <span>Total Asignaciones Incluidas:</span>
                    <span className="font-bold">4 Investigadores</span>
                  </div>
                  <div className="p-3 rounded-lg bg-[#F7F6F3] border border-[#E9E9E7] flex items-center justify-between">
                    <span>Monto Total del Lote:</span>
                    <span className="font-mono font-bold text-emerald-700">$ 2,720.00 USD</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#EDEDEB]">
                <button className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition">
                  Generar y Congelar Lote de Causación
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PESTAÑA: SOLICITUDES DE PAGO */}
      {activeTab === 'solicitudes_creadas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#EDEDEB]">
            <div>
              <h2 className="text-xl font-bold text-[#37352F] flex items-center space-x-2">
                <FileText className="w-5 h-5 text-accent" />
                <span>Mis Solicitudes de Pago</span>
              </h2>
              <p className="text-xs text-[#787774] mt-0.5">
                Ciclo de estados: BORRADOR → ENVIADA. Las solicitudes aprobadas pasan a control del Receptor.
              </p>
            </div>
            <button className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-white hover:bg-primary-hover shadow-sm transition">
              <Plus className="w-3.5 h-3.5" />
              <span>Crear Solicitud de Pago</span>
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#E9E9E7] shadow-[0_1px_3px_rgba(0,0,0,0.02)] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] text-[#787774] font-semibold border-b border-[#E9E9E7]">
                <tr>
                  <th className="py-2.5 px-4">Código Solicitud</th>
                  <th className="py-2.5 px-4">Proyecto</th>
                  <th className="py-2.5 px-4">Período</th>
                  <th className="py-2.5 px-4">Monto Total</th>
                  <th className="py-2.5 px-4">Estado Actual</th>
                  <th className="py-2.5 px-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB]">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-[#FBFBFA] transition">
                    <td className="py-3 px-4 font-mono font-bold text-[#37352F]">{r.requestCode}</td>
                    <td className="py-3 px-4 font-mono text-primary font-medium">{r.projectCode}</td>
                    <td className="py-3 px-4 text-[#787774]">{r.period}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#37352F]">
                      ${r.totalAmountUSD.toFixed(2)} USD
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === PaymentRequestStatus.BORRADOR
                            ? 'bg-slate-100 text-slate-700'
                            : r.status === PaymentRequestStatus.ENVIADA
                            ? 'bg-blue-100 text-primary'
                            : r.status === PaymentRequestStatus.APROBADA
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {r.status === PaymentRequestStatus.BORRADOR ? (
                        <button
                          onClick={() => onSendRequest(r.id)}
                          className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-primary hover:bg-primary-hover text-white text-[11px] font-semibold shadow-sm transition"
                        >
                          <Send className="w-3 h-3" />
                          <span>Enviar a Revisión</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-[#9B9A97]">Enviada para Aprobación</span>
                      )}
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
