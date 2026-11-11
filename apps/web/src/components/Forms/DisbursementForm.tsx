import React, { useMemo, useState } from 'react';
import { PaymentMethod } from '@scienpay/shared';
import { useRegisterDisbursement } from '../../hooks/useDisbursements.js';
import { useToast } from '../../context/ToastContext.js';
import { getApiErrorMessage } from '../../lib/apiClient.js';
import { formatCurrency, personFullName, todayISO } from '../../lib/format.js';
import type { CausationBatchDetail, PaymentRequest, Person } from '../../types/api.types.js';
import {
  Button,
  FormActions,
  FormField,
  SelectInput,
  TextArea,
  TextInput,
} from '../ui/FormControls.js';

interface DisbursementFormProps {
  request: PaymentRequest;
  batch: CausationBatchDetail;
  persons: Person[];
  onSuccess: () => void;
}

interface PersonDebt {
  personId: string;
  name: string;
  document: string;
  remainingDebt: number;
}

export const DisbursementForm: React.FC<DisbursementFormProps> = ({
  request,
  batch,
  persons,
  onSuccess,
}) => {
  const { showToast } = useToast();
  const registerDisbursement = useRegisterDisbursement();

  const [amounts, setAmounts] = useState<Record<string, string>>({});
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFERENCIA);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [notes, setNotes] = useState('');

  const personDebts = useMemo<PersonDebt[]>(() => {
    const map = new Map<string, PersonDebt>();

    for (const item of batch.items) {
      if (item.status === 'ANULADO') continue;
      const debt = Number.parseFloat(item.remainingDebt);
      if (!Number.isFinite(debt) || debt <= 0) continue;

      const person = persons.find((candidate) => candidate.id === item.personId);
      const current = map.get(item.personId) ?? {
        personId: item.personId,
        name: person ? personFullName(person) : item.personId,
        document: person ? `${person.documentType}-${person.documentNumber}` : '—',
        remainingDebt: 0,
      };
      current.remainingDebt += debt;
      map.set(item.personId, current);
    }

    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [batch.items, persons]);

  const allocations = useMemo(
    () =>
      personDebts
        .map((debt) => ({
          personId: debt.personId,
          amount: Number.parseFloat(amounts[debt.personId] ?? '0'),
        }))
        .filter((allocation) => Number.isFinite(allocation.amount) && allocation.amount > 0),
    [amounts, personDebts],
  );

  const totalCents = allocations.reduce(
    (sum, allocation) => sum + Math.round(allocation.amount * 100),
    0,
  );
  const total = totalCents / 100;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (allocations.length === 0) {
      showToast('Debe indicar al menos un monto a entregar', 'error');
      return;
    }

    try {
      const result = await registerDisbursement.mutateAsync({
        paymentRequestId: request.id,
        disbursementDate: todayISO(),
        totalDeliveredAmount: total,
        paymentMethod,
        referenceNumber: referenceNumber.trim(),
        notes: notes.trim(),
        allocations,
      });
      showToast(
        `Desembolso registrado por $${formatCurrency(total)} USD. Se emitieron ${result.receipts.length} recibo(s).`,
        'success',
      );
      setAmounts({});
      setReferenceNumber('');
      setNotes('');
      onSuccess();
    } catch (error) {
      showToast(getApiErrorMessage(error), 'error');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="p-3 rounded-lg bg-[#F7F6F3] dark:bg-[#262626] border border-[#E9E9E7] dark:border-[#333333] text-[11px] flex items-center justify-between">
        <span className="text-[#787774] dark:text-[#9B9A97]">
          Solicitud{' '}
          <strong className="text-[#37352F] dark:text-white">{request.requestCode}</strong> ·{' '}
          {request.periodDescription}
        </span>
        <span className="font-mono font-bold text-[#37352F] dark:text-white">
          ${formatCurrency(request.totalAmountUSD)} USD
        </span>
      </div>

      <p className="text-[10px] text-[#9B9A97] dark:text-[#888886]">
        La deuda mostrada corresponde solo al lote de esta solicitud. El backend aplica FIFO sobre
        todas las causaciones pendientes del beneficiario en el proyecto, empezando por la más
        antigua.
      </p>

      <div>
        <h4 className="text-xs font-bold text-[#37352F] dark:text-white mb-2">
          Asignación por beneficiario
        </h4>
        {personDebts.length === 0 ? (
          <p className="text-[11px] text-[#9B9A97]">
            El lote no tiene deuda pendiente para este proyecto.
          </p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-[#E9E9E7] dark:border-[#2F2F2F]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F3] dark:bg-[#262626] text-[#787774] dark:text-[#9B9A97] font-semibold">
                <tr>
                  <th className="py-2 px-3">Beneficiario</th>
                  <th className="py-2 px-3">Deuda en este lote</th>
                  <th className="py-2 px-3 w-40">Monto a entregar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EDEDEB] dark:divide-[#2F2F2F]">
                {personDebts.map((debt) => (
                  <tr key={debt.personId}>
                    <td className="py-2 px-3">
                      <div className="font-semibold text-[#37352F] dark:text-white">
                        {debt.name}
                      </div>
                      <div className="text-[10px] text-[#9B9A97]">{debt.document}</div>
                    </td>
                    <td className="py-2 px-3 font-mono text-[#787774] dark:text-[#9B9A97]">
                      ${formatCurrency(debt.remainingDebt)}
                    </td>
                    <td className="py-2 px-3">
                      <TextInput
                        type="number"
                        min={0}
                        step="0.01"
                        placeholder="0.00"
                        value={amounts[debt.personId] ?? ''}
                        onChange={(event) =>
                          setAmounts((current) => ({
                            ...current,
                            [debt.personId]: event.target.value,
                          }))
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#F7F6F3] dark:bg-[#262626]">
                <tr>
                  <td
                    className="py-2 px-3 font-semibold text-[#37352F] dark:text-white"
                    colSpan={2}
                  >
                    Total a entregar
                  </td>
                  <td className="py-2 px-3 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                    ${formatCurrency(total)} USD
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField label="Método de pago" required>
          <SelectInput
            value={paymentMethod}
            onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
          >
            {Object.values(PaymentMethod).map((method) => (
              <option key={method} value={method}>
                {method}
              </option>
            ))}
          </SelectInput>
        </FormField>

        <FormField label="Referencia" hint="Opcional">
          <TextInput
            value={referenceNumber}
            onChange={(event) => setReferenceNumber(event.target.value)}
            placeholder="Nro. de transferencia o comprobante"
          />
        </FormField>
      </div>

      <FormField label="Notas" hint="Opcional">
        <TextArea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </FormField>

      <FormActions>
        <Button type="button" variant="secondary" onClick={onSuccess}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="success"
          disabled={registerDisbursement.isPending || allocations.length === 0}
        >
          {registerDisbursement.isPending
            ? 'Registrando…'
            : `Registrar Desembolso y Emitir Recibos`}
        </Button>
      </FormActions>
    </form>
  );
};
