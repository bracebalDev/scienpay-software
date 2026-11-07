import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PdfReceiptGenerator } from '../../src/infrastructure/pdf/pdf-receipt.generator.js';

describe('PDF consolidado de solicitud (Fase 2.3)', () => {
  it('debe generar un buffer PDF válido con beneficiarios y totales', async () => {
    const buffer = await PdfReceiptGenerator.generatePaymentRequestPdf({
      requestCode: 'SOL-2026-001',
      issuedDate: '2026-11-07',
      projectName: 'Proyecto Física (FIS-01)',
      periodDescription: '2026-10-01 al 2026-10-31',
      status: 'APROBADA',
      totalAmountUSD: '300.00',
      createdByName: 'Generador de Prueba',
      reviewedByName: 'Receptor de Prueba',
      items: [
        {
          beneficiaryName: 'Ana Pérez',
          beneficiaryDocument: 'V-12345678',
          period: '2026-10-01 al 2026-10-31',
          calculatedAmountUSD: '300.00',
          paidAmountUSD: '100.00',
          remainingDebtUSD: '200.00',
          status: 'PAGADO_PARCIAL',
        },
      ],
      totalCalculatedUSD: '300.00',
      totalPaidUSD: '100.00',
      totalRemainingUSD: '200.00',
    });

    assert.ok(buffer.length > 1000, 'El PDF debe contener información suficiente');
    assert.equal(buffer.subarray(0, 4).toString(), '%PDF');
  });
});
