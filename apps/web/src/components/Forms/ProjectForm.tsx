import React from 'react';
import { useForm } from 'react-hook-form';
import {
  ProjectArea,
  ProjectScope,
  createProjectSchema,
  type CreateProjectInput,
} from '@scienpay/shared';
import { useCreateProject } from '../../hooks/useProjects.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';
import { todayISO } from '../../lib/format.js';
import {
  Button,
  FormActions,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from '../ui/FormControls.js';

interface ProjectFormProps {
  onSuccess: () => void;
}

export const ProjectForm: React.FC<ProjectFormProps> = ({ onSuccess }) => {
  const { showToast } = useToast();
  const createProject = useCreateProject();

  const form = useForm<CreateProjectInput>({
    resolver: zodResolver<CreateProjectInput>(createProjectSchema),
    defaultValues: {
      code: '',
      name: '',
      description: '',
      area: ProjectArea.FISICA,
      scope: ProjectScope.INTERNO,
      startDate: todayISO(),
      endDate: null,
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createProject.mutateAsync(values);
      showToast('Proyecto registrado correctamente', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Código" required error={errors.code?.message}>
          <TextInput
            placeholder="FIS-01"
            hasError={Boolean(errors.code)}
            {...form.register('code')}
          />
        </FormField>

        <FormField label="Nombre del proyecto" required error={errors.name?.message}>
          <TextInput
            placeholder="Estudio de partículas de alta energía"
            hasError={Boolean(errors.name)}
            {...form.register('name')}
          />
        </FormField>

        <FormField label="Área científica" required error={errors.area?.message}>
          <SelectInput hasError={Boolean(errors.area)} {...form.register('area')}>
            {Object.values(ProjectArea).map((area) => (
              <option key={area} value={area}>
                {area}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Ámbito" required error={errors.scope?.message}>
          <SelectInput hasError={Boolean(errors.scope)} {...form.register('scope')}>
            {Object.values(ProjectScope).map((scope) => (
              <option key={scope} value={scope}>
                {scope}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Fecha de inicio" required error={errors.startDate?.message}>
          <TextInput
            type="date"
            hasError={Boolean(errors.startDate)}
            {...form.register('startDate')}
          />
        </FormField>

        <FormField label="Fecha de culminación" error={errors.endDate?.message} hint="Opcional">
          <TextInput
            type="date"
            hasError={Boolean(errors.endDate)}
            {...form.register('endDate', { setValueAs: (value) => (value === '' ? null : value) })}
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
        <Button type="submit" disabled={createProject.isPending}>
          {createProject.isPending ? 'Guardando…' : 'Registrar Proyecto'}
        </Button>
      </FormActions>
    </form>
  );
};
