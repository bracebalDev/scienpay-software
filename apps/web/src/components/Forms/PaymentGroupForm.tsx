import React from 'react';
import { useForm } from 'react-hook-form';
import {
  Periodicity,
  createPaymentGroupSchema,
  type CreatePaymentGroupInput,
} from '@scienpay/shared';
import { useCreatePaymentGroup } from '../../hooks/usePaymentGroups.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';
import {
  Button,
  FormActions,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from '../ui/FormControls.js';

interface PaymentGroupFormProps {
  onSuccess: () => void;
}

export const PaymentGroupForm: React.FC<PaymentGroupFormProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const createGroup = useCreatePaymentGroup();

  const form = useForm<CreatePaymentGroupInput>({
    resolver: zodResolver<CreatePaymentGroupInput>(createPaymentGroupSchema),
    defaultValues: {
      name: '',
      periodicity: Periodicity.MENSUAL,
      cutOffConfig: {},
      description: '',
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createGroup.mutateAsync(values);
      showToast('Grupo de pago creado correctamente', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Nombre del grupo" required error={errors.name?.message}>
          <TextInput
            placeholder="Nómina mensual de investigadores"
            hasError={Boolean(errors.name)}
            {...form.register('name')}
          />
        </FormField>

        <FormField label="Periodicidad" required error={errors.periodicity?.message}>
          <SelectInput hasError={Boolean(errors.periodicity)} {...form.register('periodicity')}>
            {Object.values(Periodicity).map((periodicity) => (
              <option key={periodicity} value={periodicity}>
                {periodicity}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField
          label="Día de corte del mes"
          error={errors.cutOffConfig?.dayOfMonth?.message}
          hint="Opcional, entre 1 y 31"
        >
          <TextInput
            type="number"
            min={1}
            max={31}
            hasError={Boolean(errors.cutOffConfig?.dayOfMonth)}
            {...form.register('cutOffConfig.dayOfMonth', {
              setValueAs: (value) => (value === '' ? undefined : Number(value)),
            })}
          />
        </FormField>
      </div>

      <FormField label="Descripción" error={errors.description?.message}>
        <TextArea rows={3} {...form.register('description')} />
      </FormField>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createGroup.isPending}>
          {createGroup.isPending ? 'Guardando…' : 'Crear Grupo de Pago'}
        </Button>
      </FormActions>
    </form>
  );
};
