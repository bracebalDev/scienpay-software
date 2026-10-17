import { z } from 'zod';
import { PaymentMethod } from '../enums/payment.enum.js';
import { FINANCIAL_RULES } from '../constants/currency.constants.js';

export const createPaymentRequestSchema = z.object({
  projectId: z.string().uuid('ID de proyecto inválido'),
  causationBatchId: z.string().uuid('ID de lote de causación inválido'),
  requestedAmount: z
    .number()
    .min(FINANCIAL_RULES.MIN_AMOUNT, `El monto mínimo es ${FINANCIAL_RULES.MIN_AMOUNT}`)
    .max(FINANCIAL_RULES.MAX_AMOUNT),
  notes: z.string().trim().max(1000).optional().default(''),
});

export type CreatePaymentRequestInput = z.infer<typeof createPaymentRequestSchema>;

export const rejectPaymentRequestSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(10, 'El motivo de rechazo debe contener al menos 10 caracteres')
    .max(1000),
});

export type RejectPaymentRequestInput = z.infer<typeof rejectPaymentRequestSchema>;

export const registerDisbursementSchema = z.object({
  disbursementDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato de fecha inválido (YYYY-MM-DD)'),
  totalDeliveredAmount: z
    .number()
    .min(FINANCIAL_RULES.MIN_AMOUNT, `El monto mínimo es ${FINANCIAL_RULES.MIN_AMOUNT}`)
    .max(FINANCIAL_RULES.MAX_AMOUNT),
  paymentMethod: z.nativeEnum(PaymentMethod, {
    errorMap: () => ({ message: 'Método de pago inválido (EFECTIVO, TRANSFERENCIA, ZELLE)' }),
  }),
  referenceNumber: z.string().trim().max(100).optional().default(''),
  notes: z.string().trim().max(1000).optional().default(''),
  allocations: z
    .array(
      z.object({
        personId: z.string().uuid('ID de persona inválido'),
        amount: z.number().min(FINANCIAL_RULES.MIN_AMOUNT),
      }),
    )
    .min(1, 'Debe especificar al menos una persona beneficiaria para el desembolso'),
});

export type RegisterDisbursementInput = z.infer<typeof registerDisbursementSchema>;
