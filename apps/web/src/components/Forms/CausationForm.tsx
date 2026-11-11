import React from 'react';
import { useForm } from 'react-hook-form';
import {
  previewCausationSchema,
  type PreviewCausationInput,
} from '@scienpay/shared';
import { useGenerateCausationBatch, usePreviewCausation } from '../../hooks/useCausation.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';
import { firstDayOfMonthISO, formatCurrency, lastDayOfMonthISO } from '../../lib/format.js';
import type { PaymentGroup, Project } from '../../types/api.types.js';
import { Button, FormActions, FormField, SelectInput, TextInput } from '../ui/FormControls.js';
import { EmptyState, ErrorState, LoadingState, StatusBadge } from '../ui/Feedback.js';

interface CausationFormProps {
  projects: Project[];
  paymentGroups: PaymentGroup[];
  onGenerated: () => void;
}

export const CausationForm: React.FC<CausationFormProps> = ({
  projects,
  paymentGroups,
  onGenerated,
}) => {
  const { showToast } = useToast();
  const preview = usePreviewCausation();
  const generate = useGenerateCausationBatch();

  const form = useForm<PreviewCausationInput>({
    resolver: zodResolver<PreviewCausationInput>(previewCausationSchema),
    defaultValues: {
      projectId: '',
      paymentGroupId: '',
      periodStartDate: firstDayOfMonthISO(),
      periodEndDate: lastDayOfMonthISO(),
    },
  });

  const errors = form.formState.errors;
  const watchedValues = form.watch();
  const previewMatches = Boolean(
    preview.data &&
      preview.data.projectId === watchedValues.projectId &&
      preview.data.paymentGroupId === watchedValues.paymentGroupId &&
      preview.data.periodStartDate === watchedValues.periodStartDate &&
      preview.data.periodEndDate === watchedValues.periodEndDate,
  );

  const handlePreview = form.handleSubmit(async (values) => {
    try {
      await preview.mutateAsync(values);
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  const handleGenerate = form.handleSubmit(async (values) => {
    try {
      const result = await generate.mutateAsync(values);
      showToast(
        `Lote generado con ${result.itemsCount} beneficiario(s) por $${formatCurrency(
          result.batch.totalCausationAmount,
        )} USD`,
        'success',
      );
      preview.reset();
      onGenerated();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      <div className="xl:col-span-5 bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)] space-y-4">
        <h3 className="text-sm font-bold text-[#37352F] dark:text-white">Parámetros del Corte</h3>

        <FormField label="Proyecto" required error={errors.projectId?.message}>
          <SelectInput hasError={Boolean(errors.projectId)} {...form.register('projectId')}>
            <option value="">Seleccione un proyecto…</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} — {project.name}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Grupo de pago" required error={errors.paymentGroupId?.message}>
          <SelectInput hasError={Boolean(errors.paymentGroupId)} {...form.register('paymentGroupId')}>
            <option value="">Seleccione un grupo…</option>
            {paymentGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.periodicity})
              </option>
            ))}
          </SelectInput>
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Inicio del período" required error={errors.periodStartDate?.message}>
            <TextInput
              type="date"
              hasError={Boolean(errors.periodStartDate)}
              {...form.register('periodStartDate')}
            />
          </FormField>
          <FormField label="Fin del período" required error={errors.periodEndDate?.message}>
            <TextInput
              type="date"
              hasError={Boolean(errors.periodEndDate)}
              {...form.register('periodEndDate')}
            />
          </FormField>
        </div>

        <FormActions>
          <Button
            type="button"
            variant="secondary"
            onClick={handlePreview}
            disabled={preview.isPending}
          >
            {preview.isPending ? 'Calculando…' : 'Calcular Previsualización'}
          </Button>
          <Button
            type="button"
            onClick={handleGenerate}
            disabled={generate.isPending || !previewMatches}
          >
            {generate.isPending ? 'Generando…' : 'Generar y Congelar Lote'}
          </Button>
        </FormActions>

        <p className="text-[10px] text-[#9B9A97] dark:text-[#888886]">
          Fórmula: monto causado = monto del período × (días activos / días totales), con redondeo
          HALF_UP a 2 decimales. El lote generado es inmutable.
        </p>
      </div>

      <div className="xl:col-span-7 bg-white dark:bg-[#202020] p-5 rounded-xl border border-[#E9E9E7] dark:border-[#2F2F2F] shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
        <h3 className="text-sm font-bold text-[#37352F] dark:text-white mb-3">
          Previsualización del Cálculo
        </h3>

        {preview.isPending && <LoadingState message="Calculando prorrateo…" />}
        {preview.isError && (
          <ErrorState message={getApiErrorMessage(preview.error)} onRetry={handlePreview} />
        )}
        {!preview.isPending && !preview.isError && !preview.data && (
          <EmptyState message="Seleccione proyecto, grupo y período para calcular la causación." />
        )}

        {preview.data && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#787774] dark:text-[#9B9A97]">
                {preview.data.itemsCount} beneficiario(s) con asignaciones activas
              </span>
              <span className="font-mono font-bold text-[#37352F] dark:text-white">
                Total: ${formatCurrency(preview.data.totalCausationAmount)} USD
              </span>
            </div>

            {preview.data.items.length === 0 ? (
              <EmptyState message="No hay asignaciones activas para el proyecto y grupo seleccionados." />
            ) : (
              <div className="overflow-hidden rounded-lg border border-[#E9E9E7] dark:border-[#2F2F2F]">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold">
                    <tr>
                      <th className="py-2 px-3">Beneficiario</th>
                      <th className="py-2 px-3">Días</th>
                      <th className="py-2 px-3">Base</th>
                      <th className="py-2 px-3 text-right">Causado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                    {preview.data.items.map((item) => (
                      <tr key={item.assignmentId}>
                        <td className="py-2 px-3">
                          <div className="font-semibold text-[#37352F] dark:text-white">
                            {item.beneficiaryName}
                          </div>
                          <div className="text-[10px] text-[#9B9A97]">{item.beneficiaryDocument}</div>
                        </td>
                        <td className="py-2 px-3 text-[#787774] dark:text-[#9B9A97]">
                          {item.activeDays}/{item.totalDaysInPeriod}
                        </td>
                        <td className="py-2 px-3 font-mono text-[#787774] dark:text-[#9B9A97]">
                          ${formatCurrency(item.baseAmount)}
                        </td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-[#37352F] dark:text-white">
                          ${formatCurrency(item.calculatedAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex items-center space-x-2 text-[10px] text-[#9B9A97]">
              {previewMatches ? (
                <>
                  <StatusBadge label="Cálculo no persistido" tone="amber" />
                  <span>El lote solo se congela al pulsar «Generar y Congelar Lote».</span>
                </>
              ) : (
                <>
                  <StatusBadge label="Parámetros modificados" tone="red" />
                  <span>Vuelva a calcular la previsualización antes de generar el lote.</span>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
