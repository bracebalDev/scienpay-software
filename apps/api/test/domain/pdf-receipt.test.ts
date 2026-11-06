import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PdfReceiptGenerator, ReceiptPdfData } from '../../src/infrastructure/pdf/pdf-receipt.generator.js';

describe('Reglas de Negocio y Formato de Documentos: Generación de PDFs', () => {
  it('debe generar un buffer binario de PDF válido que comience con %PDF-', async () => {
    const receiptData: ReceiptPdfData = {
      receiptNumber: 'REC-2026-000042',
      issuedDate: '2026-10-17',
      projectName: 'Mecánica Cuántica y Resonancia Magnética (FIS-01)',
      beneficiaryName: 'Dr. Alejandro Morales',
      beneficiaryDocument: 'V-19.452.881',
      totalAmountUSD: '500.00',
      remainingDebtAfterUSD: '420.00',
      paymentMethod: 'TRANSFERENCIA',
      referenceNumber: 'TRF-987654321',
      issuerName: 'Mg. Roberto Silva (Gerente de Administración)',
      allocations: [
        {
          period: '2026-09-01 al 2026-09-30',
          allocatedAmountUSD: '420.00',
          debtBeforeUSD: '420.00',
          debtAfterUSD: '0.00',
          status: 'PAGADO_TOTAL',
        },
        {
          period: '2026-10-01 al 2026-10-31',
          allocatedAmountUSD: '80.00',
          debtBeforeUSD: '500.00',
          debtAfterUSD: '420.00',
          status: 'PAGADO_PARCIAL',
        },
      ],
    };

    const pdfBuffer = await PdfReceiptGenerator.generateReceiptPdf(receiptData);

    assert.ok(pdfBuffer instanceof Buffer);
    assert.ok(pdfBuffer.length > 500, 'El PDF debe contener contenido renderizado');

    const header = pdfBuffer.subarray(0, 5).toString('ascii');
    assert.equal(header, '%PDF-', 'El documento generado debe tener la firma estándar de cabecera PDF (%PDF-)');
  });
});
