import PDFDocument from 'pdfkit';

export interface AllocationDetailPdf {
  period: string;
  allocatedAmountUSD: string;
  debtBeforeUSD: string;
  debtAfterUSD: string;
  status: string;
}

export interface ReceiptPdfData {
  receiptNumber: string;
  issuedDate: string;
  projectName: string;
  beneficiaryName: string;
  beneficiaryDocument: string;
  totalAmountUSD: string;
  remainingDebtAfterUSD: string;
  paymentMethod: string;
  referenceNumber: string;
  issuerName: string;
  allocations: AllocationDetailPdf[];
}

export interface PaymentRequestItemPdf {
  beneficiaryName: string;
  beneficiaryDocument: string;
  period: string;
  calculatedAmountUSD: string;
  paidAmountUSD: string;
  remainingDebtUSD: string;
  status: string;
}

export interface PaymentRequestPdfData {
  requestCode: string;
  issuedDate: string;
  projectName: string;
  periodDescription: string;
  status: string;
  totalAmountUSD: string;
  createdByName: string;
  reviewedByName: string;
  items: PaymentRequestItemPdf[];
  totalCalculatedUSD: string;
  totalPaidUSD: string;
  totalRemainingUSD: string;
}

export class PdfReceiptGenerator {
  public static async generateReceiptPdf(data: ReceiptPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // 1. Cabecera Institucional
      doc.fontSize(10).fillColor('#4B5563').text('UNIVERSIDAD DE CARABOBO', { align: 'center' });
      doc.fontSize(8).text('FACULTAD EXPERIMENTAL DE CIENCIAS Y TECNOLOGÍA (FACyT)', { align: 'center' });
      doc.text('SCIENPAY - SISTEMA DE CONTROL DE PAGOS Y ASIGNACIONES CIENTÍFICAS', { align: 'center' });
      doc.moveDown(0.5);

      // Línea divisoria
      doc.strokeColor('#D1D5DB').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      // 2. Título y Número de Recibo
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('RECIBO INDIVIDUAL DE PAGO', { align: 'center' });
      doc.fontSize(11).font('Helvetica').fillColor('#2563EB').text(data.receiptNumber, { align: 'center' });
      doc.moveDown(1);

      // 3. Ficha de Datos del Pago
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('DATOS DE LA TRANSACCIÓN:');
      doc.font('Helvetica').fillColor('#1F2937');
      doc.text(`Fecha de Emisión: ${data.issuedDate}`);
      doc.text(`Proyecto Científico: ${data.projectName}`);
      doc.text(`Beneficiario: ${data.beneficiaryName} (Doc: ${data.beneficiaryDocument})`);
      doc.text(`Método de Entrega: ${data.paymentMethod} (Ref: ${data.referenceNumber || 'N/A'})`);
      doc.text(`Monto Total Desembolsado: $ ${data.totalAmountUSD} USD`);
      doc.text(`Saldo Restante Adeudado: $ ${data.remainingDebtAfterUSD} USD`);
      doc.moveDown(1);

      // 4. Desglose de Imputaciones FIFO
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('DESGLOSE DE AMORTIZACIÓN POR FIFO:');
      doc.moveDown(0.5);

      // Cabecera de Tabla
      const startX = 40;
      let curY = doc.y;
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#4B5563');
      doc.text('Período Causado', startX, curY);
      doc.text('Deuda Inicial', startX + 160, curY);
      doc.text('Abonado USD', startX + 260, curY);
      doc.text('Saldo Final', startX + 360, curY);
      doc.text('Estado Resultante', startX + 440, curY);
      doc.moveDown(0.5);

      doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(startX, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.4);

      // Filas
      doc.font('Helvetica').fillColor('#111827');
      for (const item of data.allocations) {
        curY = doc.y;
        doc.text(item.period, startX, curY);
        doc.text(`$ ${item.debtBeforeUSD}`, startX + 160, curY);
        doc.text(`$ ${item.allocatedAmountUSD}`, startX + 260, curY);
        doc.text(`$ ${item.debtAfterUSD}`, startX + 360, curY);
        doc.text(item.status, startX + 440, curY);
        doc.moveDown(0.4);
      }

      doc.moveDown(1.5);
      doc.strokeColor('#D1D5DB').lineWidth(1).moveTo(startX, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(2);

      // 5. Firma y Validez Legal
      const signY = doc.y;
      doc.strokeColor('#9CA3AF').lineWidth(0.8).moveTo(60, signY + 30).lineTo(220, signY + 30).stroke();
      doc.strokeColor('#9CA3AF').lineWidth(0.8).moveTo(330, signY + 30).lineTo(490, signY + 30).stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#4B5563');
      doc.text('Firma del Beneficiario', 60, signY + 35, { width: 160, align: 'center' });
      doc.text(data.beneficiaryName, 60, signY + 45, { width: 160, align: 'center' });

      doc.text('Autorizado por Receptor', 330, signY + 35, { width: 160, align: 'center' });
      doc.text(data.issuerName, 330, signY + 45, { width: 160, align: 'center' });

      doc.moveDown(3);
      doc.fontSize(7).fillColor('#9CA3AF').text(
        'Este recibo constituye un comprobante financiero inmutable emitido por el sistema Scienpay bajo norma contable institucional sin deducciones legales. Toda anulación debe estar formalmente justificada en acta de auditoría.',
        40,
        signY + 80,
        { width: 475, align: 'center' },
      );

      doc.end();
    });
  }

  /**
   * PDF consolidado de una solicitud de pago (HANDOFF 2.3).
   * Incluye cabecera institucional, datos de la solicitud, desglose por
   * beneficiario con causado/pagado/pendiente, totales y firmas.
   */
  public static async generatePaymentRequestPdf(data: PaymentRequestPdfData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 40, size: 'A4' });
      const buffers: Buffer[] = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      // 1. Cabecera Institucional
      doc.fontSize(10).fillColor('#4B5563').text('UNIVERSIDAD DE CARABOBO', { align: 'center' });
      doc.fontSize(8).text('FACULTAD EXPERIMENTAL DE CIENCIAS Y TECNOLOGÍA (FACyT)', { align: 'center' });
      doc.text('SCIENPAY - SISTEMA DE CONTROL DE PAGOS Y ASIGNACIONES CIENTÍFICAS', { align: 'center' });
      doc.moveDown(0.5);

      doc.strokeColor('#D1D5DB').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      // 2. Título y Código
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#111827').text('SOLICITUD CONSOLIDADA DE PAGO', { align: 'center' });
      doc.fontSize(11).font('Helvetica').fillColor('#2563EB').text(data.requestCode, { align: 'center' });
      doc.moveDown(1);

      // 3. Ficha de la Solicitud
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('DATOS DE LA SOLICITUD:');
      doc.font('Helvetica').fillColor('#1F2937');
      doc.text(`Fecha de Emisión: ${data.issuedDate}`);
      doc.text(`Proyecto Científico: ${data.projectName}`);
      doc.text(`Período: ${data.periodDescription}`);
      doc.text(`Estado: ${data.status}`);
      doc.text(`Monto Solicitado: $ ${data.totalAmountUSD} USD`);
      doc.text(`Creada por: ${data.createdByName}`);
      doc.text(`Revisada por: ${data.reviewedByName || 'Pendiente de revisión'}`);
      doc.moveDown(1);

      // 4. Desglose por Beneficiario
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('DESGLOSE POR BENEFICIARIO:');
      doc.moveDown(0.5);

      const startX = 40;
      let curY = doc.y;
      doc.fontSize(7).font('Helvetica-Bold').fillColor('#4B5563');
      doc.text('Beneficiario', startX, curY, { width: 110 });
      doc.text('Documento', startX + 115, curY, { width: 70 });
      doc.text('Período', startX + 190, curY, { width: 90 });
      doc.text('Causado', startX + 285, curY, { width: 55 });
      doc.text('Pagado', startX + 345, curY, { width: 55 });
      doc.text('Pendiente', startX + 405, curY, { width: 55 });
      doc.text('Estado', startX + 465, curY, { width: 70 });
      doc.moveDown(0.5);

      doc.strokeColor('#E5E7EB').lineWidth(0.5).moveTo(startX, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.4);

      doc.font('Helvetica').fillColor('#111827');
      for (const item of data.items) {
        curY = doc.y;
        doc.text(item.beneficiaryName, startX, curY, { width: 110 });
        doc.text(item.beneficiaryDocument, startX + 115, curY, { width: 70 });
        doc.text(item.period, startX + 190, curY, { width: 90 });
        doc.text(`$ ${item.calculatedAmountUSD}`, startX + 285, curY, { width: 55 });
        doc.text(`$ ${item.paidAmountUSD}`, startX + 345, curY, { width: 55 });
        doc.text(`$ ${item.remainingDebtUSD}`, startX + 405, curY, { width: 55 });
        doc.text(item.status, startX + 465, curY, { width: 70 });
        doc.moveDown(0.5);
      }

      doc.moveDown(0.5);
      doc.strokeColor('#D1D5DB').lineWidth(1).moveTo(startX, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(0.8);

      // 5. Totales
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#374151').text('TOTALES CONSOLIDADOS:');
      doc.font('Helvetica').fillColor('#1F2937');
      doc.text(`Total Causado: $ ${data.totalCalculatedUSD} USD`);
      doc.text(`Total Pagado: $ ${data.totalPaidUSD} USD`);
      doc.text(`Total Pendiente: $ ${data.totalRemainingUSD} USD`);
      doc.moveDown(2);

      // 6. Firmas
      const signY = doc.y;
      doc.strokeColor('#9CA3AF').lineWidth(0.8).moveTo(50, signY + 30).lineTo(210, signY + 30).stroke();
      doc.strokeColor('#9CA3AF').lineWidth(0.8).moveTo(230, signY + 30).lineTo(390, signY + 30).stroke();
      doc.strokeColor('#9CA3AF').lineWidth(0.8).moveTo(410, signY + 30).lineTo(555, signY + 30).stroke();

      doc.fontSize(8).font('Helvetica').fillColor('#4B5563');
      doc.text('Generador de Nómina', 50, signY + 35, { width: 160, align: 'center' });
      doc.text(data.createdByName, 50, signY + 45, { width: 160, align: 'center' });

      doc.text('Receptor de Nómina', 230, signY + 35, { width: 160, align: 'center' });
      doc.text(data.reviewedByName || '____________________', 230, signY + 45, { width: 160, align: 'center' });

      doc.text('Administración Scienpay', 410, signY + 35, { width: 145, align: 'center' });
      doc.text('Sello Institucional', 410, signY + 45, { width: 145, align: 'center' });

      doc.moveDown(3);
      doc.fontSize(7).fillColor('#9CA3AF').text(
        'Documento consolidado generado por Scienpay. Las cifras corresponden al lote de causación asociado y son inmutables una vez emitido el pago. Toda corrección requiere anulación formal justificada.',
        40,
        signY + 80,
        { width: 475, align: 'center' },
      );

      doc.end();
    });
  }
}
