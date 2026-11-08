import React from 'react';
import { useForm } from 'react-hook-form';
import { createPersonSchema, type CreatePersonInput } from '@scienpay/shared';
import { useCreatePerson } from '../../hooks/usePersons.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';
import { Button, FormActions, FormField, TextInput } from '../ui/FormControls.js';

interface PersonFormProps {
  onSuccess: () => void;
}

export const PersonForm: React.FC<PersonFormProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const createPerson = useCreatePerson();

  const form = useForm<CreatePersonInput>({
    resolver: zodResolver<CreatePersonInput>(createPersonSchema),
    defaultValues: {
      documentType: 'V',
      documentNumber: '',
      firstName: '',
      lastName: '',
      email: null,
      phone: null,
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createPerson.mutateAsync(values);
      showToast('Beneficiario registrado correctamente', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Tipo de documento" required error={errors.documentType?.message}>
          <TextInput
            placeholder="V"
            hasError={Boolean(errors.documentType)}
            {...form.register('documentType')}
          />
        </FormField>

        <FormField label="Número de documento" required error={errors.documentNumber?.message}>
          <TextInput
            placeholder="12345678"
            hasError={Boolean(errors.documentNumber)}
            {...form.register('documentNumber')}
          />
        </FormField>

        <FormField label="Nombres" required error={errors.firstName?.message}>
          <TextInput hasError={Boolean(errors.firstName)} {...form.register('firstName')} />
        </FormField>

        <FormField label="Apellidos" required error={errors.lastName?.message}>
          <TextInput hasError={Boolean(errors.lastName)} {...form.register('lastName')} />
        </FormField>

        <FormField label="Correo electrónico" error={errors.email?.message} hint="Opcional">
          <TextInput
            type="email"
            hasError={Boolean(errors.email)}
            {...form.register('email', {
              setValueAs: (value) => (value === '' ? null : value),
            })}
          />
        </FormField>

        <FormField label="Teléfono" error={errors.phone?.message} hint="Opcional">
          <TextInput
            hasError={Boolean(errors.phone)}
            {...form.register('phone', {
              setValueAs: (value) => (value === '' ? null : value),
            })}
          />
        </FormField>
      </div>

      <p className="text-[10px] text-[#9B9A97] dark:text-[#888886]">
        Los beneficiarios son datos de pago y no poseen credenciales de acceso al sistema.
      </p>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createPerson.isPending}>
          {createPerson.isPending ? 'Guardando…' : 'Registrar Beneficiario'}
        </Button>
      </FormActions>
    </form>
  );
};
