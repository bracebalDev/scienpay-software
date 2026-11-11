import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DisbursementForm } from './DisbursementForm.js';
import { ToastProvider } from '../../context/ToastContext.js';
import { PaymentRequestStatus, CausationBatchStatus, CausationItemStatus } from '@scienpay/shared';
import type { CausationBatchDetail, PaymentRequest, Person } from '../../types/api.types.js';

const mockRequest: PaymentRequest = {
  id: 'req-1',
  requestCode: 'SOL-2026-001',
  projectId: 'proj-1',
  causationBatchId: 'batch-1',
  periodDescription: 'Octubre 2026',
  totalAmountUSD: '1000.00',
  status: PaymentRequestStatus.APROBADA,
  createdByUserId: 'user-gen',
  reviewedByUserId: 'user-rec',
  reviewedAt: '2026-10-15',
  rejectionReason: null,
  notes: 'Solicitud aprobada',
  createdAt: '2026-10-15',
  updatedAt: '2026-10-15',
};

const mockBatch: CausationBatchDetail = {
  id: 'batch-1',
  projectId: 'proj-1',
  paymentGroupId: 'group-1',
  periodStartDate: '2026-10-01',
  periodEndDate: '2026-10-31',
  totalCausationAmount: '1000.00',
  status: CausationBatchStatus.CALCULADO,
  calculatedByUserId: 'user-gen',
  annulmentReason: null,
  annulledByUserId: null,
  annulledAt: null,
  createdAt: '2026-10-15',
  items: [
    {
      id: 'item-1',
      batchId: 'batch-1',
      personId: 'person-1',
      assignmentId: 'assign-1',
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-10-31',
      totalDaysInPeriod: 31,
      activeDays: 31,
      baseAmount: '600.00',
      calculatedAmount: '600.00',
      paidAmount: '0.00',
      remainingDebt: '600.00',
      status: CausationItemStatus.PENDIENTE,
      createdAt: '2026-10-15',
    },
    {
      id: 'item-2',
      batchId: 'batch-1',
      personId: 'person-2',
      assignmentId: 'assign-2',
      periodStartDate: '2026-10-01',
      periodEndDate: '2026-10-31',
      totalDaysInPeriod: 31,
      activeDays: 31,
      baseAmount: '400.00',
      calculatedAmount: '400.00',
      paidAmount: '0.00',
      remainingDebt: '400.00',
      status: CausationItemStatus.PENDIENTE,
      createdAt: '2026-10-15',
    },
  ],
};

const mockPersons: Person[] = [
  {
    id: 'person-1',
    documentType: 'V',
    documentNumber: '11223344',
    firstName: 'Elena',
    lastName: 'Rivas',
    email: 'elena@scienpay.org',
    phone: null,
    specialty: 'Física Teórica',
    status: 'ACTIVO',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'person-2',
    documentType: 'V',
    documentNumber: '55667788',
    firstName: 'Carlos',
    lastName: 'Mendoza',
    email: 'carlos@scienpay.org',
    phone: null,
    specialty: 'Óptica Cuántica',
    status: 'ACTIVO',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
];

describe('DisbursementForm — Validación y Cálculo en Centavos (HANDOFF 3.4 & 4.6.3)', () => {
  it('debe renderizar los beneficiarios con su deuda y calcular la suma en centavos sin error de coma flotante', () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <DisbursementForm
            request={mockRequest}
            batch={mockBatch}
            persons={mockPersons}
            onSuccess={vi.fn()}
          />
        </ToastProvider>
      </QueryClientProvider>,
    );

    expect(screen.getByText('Elena Rivas')).toBeInTheDocument();
    expect(screen.getByText('Carlos Mendoza')).toBeInTheDocument();

    const inputs = screen.getAllByPlaceholderText('0.00');
    expect(inputs).toHaveLength(2);

    // Ingresar 10.10 y 20.20 (que en punto flotante tradicional puede dar 30.299999999999997)
    fireEvent.change(inputs[0], { target: { value: '10.10' } });
    fireEvent.change(inputs[1], { target: { value: '20.20' } });

    // El formulario calcula con Math.round(val * 100) en centavos
    // totalCents = 1010 + 2020 = 3030 -> 30,30
    expect(screen.getByText(/30,30/)).toBeInTheDocument();
  });
});
