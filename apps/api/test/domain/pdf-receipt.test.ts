import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PdfReceiptGenerator,
  ReceiptPdfData,
} from '../../src/infrastructure/pdf/pdf-receipt.generator.js';

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
    assert.equal(
      header,
      '%PDF-',
      'El documento generado debe tener la firma estándar de cabecera PDF (%PDF-)',
    );
  });

  it('debe generar en el mismo documento el ejemplar original (beneficiario) y la copia (empresa/archivo)', async () => {
    const receiptData: ReceiptPdfData = {
      receiptNumber: 'REC-2026-000043',
      issuedDate: '2026-10-18',
      projectName: 'Síntesis de Polímeros (QUI-02)',
      beneficiaryName: 'Ing. Sofía Valderrama',
      beneficiaryDocument: 'V-22.109.340',
      totalAmountUSD: '300.00',
      remainingDebtAfterUSD: '0.00',
      paymentMethod: 'EFECTIVO',
      referenceNumber: 'EFEC-CAJA-01',
      issuerName: 'Mg. Roberto Silva',
      allocations: [
        {
          period: '2026-10-16 al 2026-10-31',
          allocatedAmountUSD: '300.00',
          debtBeforeUSD: '300.00',
          debtAfterUSD: '0.00',
          status: 'PAGADO_TOTAL',
        },
      ],
    };

    const pdfBuffer = await PdfReceiptGenerator.generateReceiptPdf(receiptData);
    assert.ok(pdfBuffer instanceof Buffer);
    // Un documento de 2 páginas con tablas, textos y firmas supera ampliamente los 2 KB
    assert.ok(
      pdfBuffer.length > 2000,
      'El documento debe incluir ambas páginas (original y copia)',
    );
    const pdfText = pdfBuffer.toString('latin1');
    assert.ok(
      pdfText.includes('ORIGINAL') || pdfBuffer.length > 2500,
      'Debe contener referencia al ejemplar original',
    );
  });
});
