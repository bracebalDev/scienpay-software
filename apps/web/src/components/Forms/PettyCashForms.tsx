import React from 'react';
import { useForm } from 'react-hook-form';
import {
  createPettyCashSchema,
  openPettyCashPeriodSchema,
  renderPettyCashVoucherSchema,
  requestPettyCashVoucherSchema,
  type CreatePettyCashInput,
  type OpenPettyCashPeriodInput,
  type RenderPettyCashVoucherInput,
  type RequestPettyCashVoucherInput,
} from '@scienpay/shared';
import {
  useCreatePettyCash,
  useOpenPettyCashPeriod,
  useRenderPettyCashVoucher,
  useRequestPettyCashVoucher,
} from '../../hooks/usePettyCash.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { zodResolver } from '../../lib/zodResolver.js';
import type { Project } from '../../types/api.types.js';
import {
  Button,
  FormActions,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from '../ui/FormControls.js';

const MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

interface CreatePettyCashFormProps {
  projects: Project[];
  onSuccess: () => void;
}

export const CreatePettyCashForm: React.FC<CreatePettyCashFormProps> = ({
  projects,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const createPettyCash = useCreatePettyCash();

  const form = useForm<CreatePettyCashInput>({
    resolver: zodResolver<CreatePettyCashInput>(createPettyCashSchema),
    defaultValues: {
      name: '',
      description: '',
      custodianName: '',
      projectIds: [],
    },
  });

  const errors = form.formState.errors;
  const selectedProjects = form.watch('projectIds');

  const toggleProject = (projectId: string) => {
    const next = selectedProjects.includes(projectId)
      ? selectedProjects.filter((id) => id !== projectId)
      : [...selectedProjects, projectId];
    form.setValue('projectIds', next, { shouldValidate: true });
  };

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await createPettyCash.mutateAsync(values);
      showToast('Caja chica creada correctamente', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <FormField label="Nombre de la caja" required error={errors.name?.message}>
        <TextInput
          placeholder="Caja Chica Laboratorio Central"
          hasError={Boolean(errors.name)}
          {...form.register('name')}
        />
      </FormField>

      <FormField label="Custodio" required error={errors.custodianName?.message}>
        <TextInput
          placeholder="Nombre del responsable"
          hasError={Boolean(errors.custodianName)}
          {...form.register('custodianName')}
        />
      </FormField>

      <FormField label="Descripción" error={errors.description?.message}>
        <TextArea rows={2} {...form.register('description')} />
      </FormField>

      <FormField
        label="Proyectos asociados"
        required
        error={errors.projectIds?.message}
        hint="Seleccione al menos un proyecto"
      >
        <div className="max-h-40 overflow-y-auto rounded-lg border border-[#E9E9E7] dark:border-[#383838] bg-[#F7F6F3] dark:bg-[#2A2A2A] p-2 space-y-1">
          {projects.map((project) => (
            <label
              key={project.id}
              className="flex items-center space-x-2 text-[11px] text-[#37352F] dark:text-white cursor-pointer"
            >
              <input
                type="checkbox"
                checked={selectedProjects.includes(project.id)}
                onChange={() => toggleProject(project.id)}
                className="accent-primary"
              />
              <span>
                {project.code} — {project.name}
              </span>
            </label>
          ))}
          {projects.length === 0 && (
            <span className="text-[11px] text-[#9B9A97]">No hay proyectos registrados.</span>
          )}
        </div>
      </FormField>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={createPettyCash.isPending}>
          {createPettyCash.isPending ? 'Creando…' : 'Crear Caja Chica'}
        </Button>
      </FormActions>
    </form>
  );
};

interface OpenPeriodFormProps {
  cashId: string;
  onSuccess: () => void;
}

export const OpenPeriodForm: React.FC<OpenPeriodFormProps> = ({ cashId, onSuccess }) => {
  const { showToast } = useToast();
  const openPeriod = useOpenPettyCashPeriod();
  const now = new Date();

  const form = useForm<OpenPettyCashPeriodInput>({
    resolver: zodResolver<OpenPettyCashPeriodInput>(openPettyCashPeriodSchema),
    defaultValues: {
      periodYear: now.getUTCFullYear(),
      periodMonth: now.getUTCMonth() + 1,
      openingBalance: 0,
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await openPeriod.mutateAsync({ cashId, input: values });
      showToast('Período de caja chica aperturado', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField label="Año" required error={errors.periodYear?.message}>
          <TextInput
            type="number"
            min={2020}
            max={2050}
            hasError={Boolean(errors.periodYear)}
            {...form.register('periodYear', { valueAsNumber: true })}
          />
        </FormField>

        <FormField label="Mes" required error={errors.periodMonth?.message}>
          <SelectInput
            hasError={Boolean(errors.periodMonth)}
            {...form.register('periodMonth', { valueAsNumber: true })}
          >
            {MONTHS.map((month, index) => (
              <option key={month} value={index + 1}>
                {month}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Saldo de apertura (USD)" required error={errors.openingBalance?.message}>
          <TextInput
            type="number"
            min={0}
            step="0.01"
            hasError={Boolean(errors.openingBalance)}
            {...form.register('openingBalance', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={openPeriod.isPending}>
          {openPeriod.isPending ? 'Aperturando…' : 'Aperturar Período'}
        </Button>
      </FormActions>
    </form>
  );
};

interface VoucherRequestFormProps {
  periodId: string;
  projects: Project[];
  onSuccess: () => void;
}

export const VoucherRequestForm: React.FC<VoucherRequestFormProps> = ({
  periodId,
  projects,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const requestVoucher = useRequestPettyCashVoucher();

  const form = useForm<RequestPettyCashVoucherInput>({
    resolver: zodResolver<RequestPettyCashVoucherInput>(requestPettyCashVoucherSchema),
    defaultValues: {
      projectId: '',
      requestedAmount: 0,
      purpose: '',
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await requestVoucher.mutateAsync({ periodId, input: values });
      showToast('Vale solicitado correctamente', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        <FormField label="Monto solicitado (USD)" required error={errors.requestedAmount?.message}>
          <TextInput
            type="number"
            min={0.01}
            step="0.01"
            hasError={Boolean(errors.requestedAmount)}
            {...form.register('requestedAmount', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormField label="Concepto / motivo" required error={errors.purpose?.message}>
        <TextArea
          rows={3}
          placeholder="Compra de reactivos para el laboratorio…"
          hasError={Boolean(errors.purpose)}
          {...form.register('purpose')}
        />
      </FormField>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={requestVoucher.isPending}>
          {requestVoucher.isPending ? 'Solicitando…' : 'Solicitar Vale'}
        </Button>
      </FormActions>
    </form>
  );
};

interface RenderVoucherFormProps {
  voucherId: string;
  onSuccess: () => void;
}

export const RenderVoucherForm: React.FC<RenderVoucherFormProps> = ({ voucherId, onSuccess }) => {
  const { showToast } = useToast();
  const renderVoucher = useRenderPettyCashVoucher();

  const form = useForm<RenderPettyCashVoucherInput>({
    resolver: zodResolver<RenderPettyCashVoucherInput>(renderPettyCashVoucherSchema),
    defaultValues: {
      renderedAmount: 0,
      changeAmount: 0,
      invoiceReference: '',
      voucherDocumentUrl: '',
    },
  });

  const errors = form.formState.errors;

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await renderVoucher.mutateAsync({ id: voucherId, input: values });
      showToast('Vale rendido y conciliado correctamente', 'success');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Monto rendido (USD)" required error={errors.renderedAmount?.message}>
          <TextInput
            type="number"
            min={0}
            step="0.01"
            hasError={Boolean(errors.renderedAmount)}
            {...form.register('renderedAmount', { valueAsNumber: true })}
          />
        </FormField>

        <FormField label="Vuelto devuelto (USD)" required error={errors.changeAmount?.message}>
          <TextInput
            type="number"
            min={0}
            step="0.01"
            hasError={Boolean(errors.changeAmount)}
            {...form.register('changeAmount', { valueAsNumber: true })}
          />
        </FormField>
      </div>

      <FormField
        label="Referencia del comprobante"
        required
        error={errors.invoiceReference?.message}
      >
        <TextInput
          placeholder="FAC-2026-00123"
          hasError={Boolean(errors.invoiceReference)}
          {...form.register('invoiceReference')}
        />
      </FormField>

      <FormField
        label="URL del documento"
        error={errors.voucherDocumentUrl?.message}
        hint="Opcional"
      >
        <TextInput
          placeholder="https://…"
          hasError={Boolean(errors.voucherDocumentUrl)}
          {...form.register('voucherDocumentUrl')}
        />
      </FormField>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button type="submit" disabled={renderVoucher.isPending}>
          {renderVoucher.isPending ? 'Rindiendo…' : 'Registrar Rendición'}
        </Button>
      </FormActions>
    </form>
  );
};
