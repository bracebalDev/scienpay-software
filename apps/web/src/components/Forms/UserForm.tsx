import React from 'react';
import { useForm } from 'react-hook-form';
import { UserRole, createUserSchema, type CreateUserInput } from '@scienpay/shared';
import { useCreateUser } from '../../hooks/useUsers.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';
import { Button, FormActions, FormField, SelectInput, TextInput } from '../ui/FormControls.js';

interface UserFormProps {
  onSuccess: () => void;
}

export const UserForm: React.FC<UserFormProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const createUser = useCreateUser();

  const form = useForm<CreateUserInput>({
    resolver: zodResolver<CreateUserInput>(createUserSchema),
    defaultValues: {
      email: '',
      fullName: '',
      role: UserRole.GENERADOR,
      password: '',
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createUser.mutateAsync(values);
      showToast('Usuario creado correctamente', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField label="Correo institucional" required error={errors.email?.message}>
        <TextInput
          type="email"
          placeholder="usuario@scienpay.uc.edu.ve"
          hasError={Boolean(errors.email)}
          {...form.register('email')}
        />
      </FormField>

      <FormField label="Nombre completo" required error={errors.fullName?.message}>
        <TextInput hasError={Boolean(errors.fullName)} {...form.register('fullName')} />
      </FormField>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Rol" required error={errors.role?.message}>
          <SelectInput hasError={Boolean(errors.role)} {...form.register('role')}>
            {Object.values(UserRole).map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField
          label="Contraseña inicial"
          required
          error={errors.password?.message}
          hint="Mínimo 8 caracteres"
        >
          <TextInput
            type="password"
            hasError={Boolean(errors.password)}
            {...form.register('password')}
          />
        </FormField>
      </div>

      <p className="text-[10px] text-[#9B9A97] dark:text-[#888886]">
        El nombre de usuario se deriva automáticamente de la parte local del correo.
      </p>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createUser.isPending}>
          {createUser.isPending ? 'Creando…' : 'Crear Usuario'}
        </Button>
      </FormActions>
    </form>
  );
};
