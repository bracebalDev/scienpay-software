import React from 'react';
import { useForm } from 'react-hook-form';
import { createPaymentRequestSchema, type CreatePaymentRequestInput } from '@scienpay/shared';
import { useCreatePaymentRequest } from '../../hooks/usePaymentRequests.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';
import { formatCurrency } from '../../lib/format.js';
import type { CausationBatch, Project } from '../../types/api.types.js';
import {
  Button,
  FormActions,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from '../ui/FormControls.js';

interface PaymentRequestFormProps {
  projects: Project[];
  batches: CausationBatch[];
  onSuccess: () => void;
}

export const PaymentRequestForm: React.FC<PaymentRequestFormProps> = ({
  projects,
  batches,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const createRequest = useCreatePaymentRequest();

  const form = useForm<CreatePaymentRequestInput>({
    resolver: zodResolver<CreatePaymentRequestInput>(createPaymentRequestSchema),
    defaultValues: {
      projectId: '',
      causationBatchId: '',
      periodDescription: '',
      requestedAmount: 0,
      notes: '',
    },
  });

  const errors = form.formState.errors;
  const selectedProjectId = form.watch('projectId');
  const selectedBatchId = form.watch('causationBatchId');

  const availableBatches = batches.filter(
    (batch) => batch.projectId === selectedProjectId && batch.status !== 'ANULADO',
  );
  const selectedBatch = availableBatches.find((batch) => batch.id === selectedBatchId);

  const projectRegistration = form.register('projectId');
  const batchRegistration = form.register('causationBatchId');

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createRequest.mutateAsync(values);
      showToast('Solicitud de pago creada en estado BORRADOR', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Proyecto" required error={errors.projectId?.message}>
          <SelectInput
            hasError={Boolean(errors.projectId)}
            {...projectRegistration}
            onChange={(event) => {
              void projectRegistration.onChange(event);
              form.setValue('causationBatchId', '');
              form.setValue('requestedAmount', 0);
            }}
          >
            <option value="">Seleccione un proyecto…</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.code} — {project.name}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField
          label="Lote de causación"
          required
          error={errors.causationBatchId?.message}
          hint={
            selectedProjectId
              ? `${availableBatches.length} lote(s) activo(s) para el proyecto`
              : 'Seleccione primero un proyecto'
          }
        >
          <SelectInput
            hasError={Boolean(errors.causationBatchId)}
            disabled={!selectedProjectId}
            {...batchRegistration}
            onChange={(event) => {
              void batchRegistration.onChange(event);
              const batch = batches.find((candidate) => candidate.id === event.target.value);
              if (batch) {
                form.setValue('requestedAmount', Number.parseFloat(batch.totalCausationAmount));
              }
            }}
          >
            <option value="">Seleccione un lote…</option>
            {availableBatches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.periodStartDate} al {batch.periodEndDate} — $
                {formatCurrency(batch.totalCausationAmount)} ({batch.status})
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField
          label="Monto solicitado (USD)"
          required
          error={errors.requestedAmount?.message}
          hint={
            selectedBatch
              ? `Máximo permitido: $${formatCurrency(selectedBatch.totalCausationAmount)} USD`
              : undefined
          }
        >
          <TextInput
            type="number"
            min={0.01}
            step="0.01"
            hasError={Boolean(errors.requestedAmount)}
            {...form.register('requestedAmount', { valueAsNumber: true })}
          />
        </FormField>

        <FormField label="Descripción del período" error={errors.periodDescription?.message}>
          <TextInput
            placeholder="Octubre 2026"
            hasError={Boolean(errors.periodDescription)}
            {...form.register('periodDescription')}
          />
        </FormField>
      </div>

      <FormField label="Notas" error={errors.notes?.message}>
        <TextArea rows={2} {...form.register('notes')} />
      </FormField>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createRequest.isPending}>
          {createRequest.isPending ? 'Creando…' : 'Crear Solicitud'}
        </Button>
      </FormActions>
    </form>
  );
};
