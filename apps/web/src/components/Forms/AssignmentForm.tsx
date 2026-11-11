import React from 'react';
import { useForm } from 'react-hook-form';
import { createAssignmentSchema, type CreateAssignmentInput } from '@scienpay/shared';
import { useCreateAssignment } from '../../hooks/useAssignments.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';
import { todayISO } from '../../lib/format.js';
import type { PaymentGroup, Person, Project } from '../../types/api.types.js';
import {
  Button,
  FormActions,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from '../ui/FormControls.js';

interface AssignmentFormProps {
  persons: Person[];
  projects: Project[];
  paymentGroups: PaymentGroup[];
  onSuccess: () => void;
}

export const AssignmentForm: React.FC<AssignmentFormProps> = ({
  persons,
  projects,
  paymentGroups,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const createAssignment = useCreateAssignment();

  const form = useForm<CreateAssignmentInput>({
    resolver: zodResolver<CreateAssignmentInput>(createAssignmentSchema),
    defaultValues: {
      personId: '',
      projectId: '',
      paymentGroupId: '',
      amountPerPeriod: 0,
      currency: 'USD',
      startDate: todayISO(),
      endDate: null,
      notes: '',
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createAssignment.mutateAsync(values);
      showToast('Asignación creada correctamente', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Beneficiario" required error={errors.personId?.message}>
          <SelectInput hasError={Boolean(errors.personId)} {...form.register('personId')}>
            <option value="">Seleccione una persona…</option>
            {persons.map((person) => (
              <option key={person.id} value={person.id}>
                {person.firstName} {person.lastName} ({person.documentType}-{person.documentNumber})
              </option>
            ))}
          </SelectInput>
        </FormField>

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
          <SelectInput
            hasError={Boolean(errors.paymentGroupId)}
            {...form.register('paymentGroupId')}
          >
            <option value="">Seleccione un grupo…</option>
            {paymentGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.periodicity})
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Monto por período (USD)" required error={errors.amountPerPeriod?.message}>
          <TextInput
            type="number"
            min={0.01}
            step="0.01"
            hasError={Boolean(errors.amountPerPeriod)}
            {...form.register('amountPerPeriod', { valueAsNumber: true })}
          />
        </FormField>

        <FormField label="Fecha de inicio" required error={errors.startDate?.message}>
          <TextInput
            type="date"
            hasError={Boolean(errors.startDate)}
            {...form.register('startDate')}
          />
        </FormField>

        <FormField label="Fecha de fin" error={errors.endDate?.message} hint="Opcional">
          <TextInput
            type="date"
            hasError={Boolean(errors.endDate)}
            {...form.register('endDate', { setValueAs: (value) => (value === '' ? null : value) })}
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
        <Button type="submit" disabled={createAssignment.isPending}>
          {createAssignment.isPending ? 'Guardando…' : 'Crear Asignación'}
        </Button>
      </FormActions>
    </form>
  );
};
