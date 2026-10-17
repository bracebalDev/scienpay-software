import { z } from 'zod';
import { FINANCIAL_RULES } from '../constants/currency.constants.js';

export const createPettyCashSchema = z.object({
  name: z.string().trim().min(3).max(100),
  description: z.string().trim().max(500).optional().default(''),
  custodianName: z.string().trim().min(3).max(100),
  projectIds: z.array(z.string().uuid('ID de proyecto inválido')).min(1, 'Debe asociar al menos un proyecto'),
});

export type CreatePettyCashInput = z.infer<typeof createPettyCashSchema>;

export const openPettyCashPeriodSchema = z.object({
  periodYear: z.number().int().min(2020).max(2050),
  periodMonth: z.number().int().min(1).max(12),
  openingBalance: z.number().min(0.0).max(FINANCIAL_RULES.MAX_AMOUNT),
});

export type OpenPettyCashPeriodInput = z.infer<typeof openPettyCashPeriodSchema>;

export const requestPettyCashVoucherSchema = z.object({
  projectId: z.string().uuid('ID de proyecto inválido'),
  requestedAmount: z
    .number()
    .min(FINANCIAL_RULES.MIN_AMOUNT, `El monto mínimo es ${FINANCIAL_RULES.MIN_AMOUNT}`)
    .max(FINANCIAL_RULES.MAX_AMOUNT),
  purpose: z.string().trim().min(10, 'El concepto o motivo debe tener al menos 10 caracteres').max(1000),
});

export type RequestPettyCashVoucherInput = z.infer<typeof requestPettyCashVoucherSchema>;

export const renderPettyCashVoucherSchema = z
  .object({
    renderedAmount: z.number().min(0.0).max(FINANCIAL_RULES.MAX_AMOUNT),
    changeAmount: z.number().min(0.0).max(FINANCIAL_RULES.MAX_AMOUNT),
    invoiceReference: z.string().trim().min(3, 'La referencia del comprobante/factura es obligatoria').max(100),
    voucherDocumentUrl: z.string().trim().max(500).optional().default(''),
  })
  .refine(
    (data) => data.renderedAmount + data.changeAmount > 0,
    {
      message: 'La suma de monto rendido y vuelto devuelto debe ser mayor a 0',
      path: ['renderedAmount'],
    },
  );

export type RenderPettyCashVoucherInput = z.infer<typeof renderPettyCashVoucherSchema>;
