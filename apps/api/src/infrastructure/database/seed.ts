import { sql } from 'drizzle-orm';
import { createMigrationDatabaseConnection } from './connection.js';
import { PasswordService } from '../../domain/security/password.service.js';
import { FinancialImmutabilityEngine } from '../../domain/financial/financial-immutability.engine.js';
import {
  users,
  projects,
  paymentGroups,
  persons,
  assignments,
  causationBatches,
  causationItems,
  paymentRequests,
  disbursements,
  receipts,
  receiptAllocations,
  pettyCash,
  pettyCashProjects,
  pettyCashPeriods,
  pettyCashVouchers,
  pettyCashMovements,
  auditLog,
} from './schema.js';
import {
  UserRole,
  ProjectArea,
  ProjectScope,
  ProjectStatus,
  Periodicity,
  AssignmentStatus,
  CausationBatchStatus,
  CausationItemStatus,
  PaymentRequestStatus,
  PaymentMethod,
  PettyCashStatus,
  PettyCashPeriodStatus,
  PettyCashVoucherStatus,
  PettyCashMovementType,
} from '@scienpay/shared';

export async function runSeed(maxRetries = 5, delayMs = 3000) {
  let attempt = 0;

  while (attempt < maxRetries) {
    attempt++;
    const { db, client } = createMigrationDatabaseConnection();
    const passwordService = new PasswordService();

    console.log(
      `[Scienpay Seed] (Intento ${attempt}/${maxRetries}) Verificando e iniciando siembra de datos...`,
    );

    try {
      const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
      if (existingUsers.length > 0) {
        console.log(
          '[Scienpay Seed] La base de datos ya cuenta con registros sembrados. Omitiendo.',
        );
        await client.end();
        return;
      }

      // 1. Usuarios Oficiales con Hashing Argon2id
      console.log('-> Sembrando usuarios institucionales con hash Argon2id...');
      const adminHash = await passwordService.hash('Admin#Scienpay2026!');
      const genHash = await passwordService.hash('Coord#Scienpay2026!');
      const recHash = await passwordService.hash('Finan#Scienpay2026!');

      const [adminUser] = await db
        .insert(users)
        .values({
          username: 'admin',
          email: 'admin@scienpay.uc.edu.ve',
          fullName: 'Lic. Carlos Mendoza',
          title: 'Administrador del Sistema',
          role: UserRole.ADMIN,
          passwordHash: adminHash,
        })
        .onConflictDoNothing()
        .returning();

      const [genUser] = await db
        .insert(users)
        .values({
          username: 'generador',
          email: 'generador@scienpay.uc.edu.ve',
          fullName: 'Dra. Elena Rostova',
          title: 'Coordinadora General de Proyectos',
          role: UserRole.GENERADOR,
          passwordHash: genHash,
        })
        .onConflictDoNothing()
        .returning();

      const [recUser] = await db
        .insert(users)
        .values({
          username: 'receptor',
          email: 'receptor@scienpay.uc.edu.ve',
          fullName: 'Mg. Roberto Silva',
          title: 'Gerente de Administración y Finanzas',
          role: UserRole.RECEPTOR,
          passwordHash: recHash,
        })
        .onConflictDoNothing()
        .returning();

      // 2. Catálogo Extendido de Proyectos Científicos (Física, Química, Biología)
      console.log('-> Sembrando proyectos científicos...');
      const [projectFis] = await db
        .insert(projects)
        .values({
          code: 'FIS-01',
          name: 'Mecánica Cuántica y Resonancia Magnética',
          description: 'Investigación en física de partículas y resonancia en materiales avanzados',
          area: ProjectArea.FISICA,
          scope: ProjectScope.EXTERNO,
          status: ProjectStatus.ACTIVO,
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          budgetUSD: '14500.00',
        })
        .onConflictDoNothing()
        .returning();

      const [projectQui] = await db
        .insert(projects)
        .values({
          code: 'QUI-02',
          name: 'Síntesis de Polímeros y Catalizadores Verdes',
          description: 'Desarrollo de biomateriales y química verde sostenible',
          area: ProjectArea.QUIMICA,
          scope: ProjectScope.INTERNO,
          status: ProjectStatus.ACTIVO,
          startDate: '2026-02-01',
          endDate: '2026-11-30',
          budgetUSD: '12000.00',
        })
        .onConflictDoNothing()
        .returning();

      const [projectBio] = await db
        .insert(projects)
        .values({
          code: 'BIO-03',
          name: 'Microbiología Celular y Resistencia Viral',
          description: 'Análisis genómico de cepas y factores de transcripción celular',
          area: ProjectArea.BIOLOGIA,
          scope: ProjectScope.EXTERNO,
          status: ProjectStatus.ACTIVO,
          startDate: '2026-03-01',
          endDate: '2026-10-31',
          budgetUSD: '18000.00',
        })
        .onConflictDoNothing()
        .returning();

      const [projectFis2] = await db
        .insert(projects)
        .values({
          code: 'FIS-02',
          name: 'Superconductores y Sensores Cuánticos de Alta Precisión',
          description:
            'Desarrollo de sensores magnéticos avanzados con aleaciones superconductoras',
          area: ProjectArea.FISICA,
          scope: ProjectScope.INTERNO,
          status: ProjectStatus.ACTIVO,
          startDate: '2026-01-15',
          endDate: '2026-12-31',
          budgetUSD: '22000.00',
        })
        .onConflictDoNothing()
        .returning();

      const [projectQui3] = await db
        .insert(projects)
        .values({
          code: 'QUI-03',
          name: 'Espectrometría de Masa y Análisis Químico Ambiental',
          description:
            'Monitoreo de contaminantes en cuencas hidrográficas y análisis cromatográfico',
          area: ProjectArea.QUIMICA,
          scope: ProjectScope.EXTERNO,
          status: ProjectStatus.ACTIVO,
          startDate: '2026-03-01',
          endDate: '2026-11-30',
          budgetUSD: '15500.00',
        })
        .onConflictDoNothing()
        .returning();

      const [projectBio4] = await db
        .insert(projects)
        .values({
          code: 'BIO-04',
          name: 'Biotecnología Marina y Extracción de Compuestos Bioactivos',
          description: 'Aislamiento de principios activos y enzimas termoestables de flora marina',
          area: ProjectArea.BIOLOGIA,
          scope: ProjectScope.INTERNO,
          status: ProjectStatus.ACTIVO,
          startDate: '2026-02-01',
          endDate: '2026-12-15',
          budgetUSD: '26000.00',
        })
        .onConflictDoNothing()
        .returning();

      // 3. Grupos de Pago (Mensual, Quincenal y Semanal)
      console.log('-> Sembrando grupos de pago...');
      const [groupMensual] = await db
        .insert(paymentGroups)
        .values({
          name: 'Corte Mensual Fin de Mes',
          periodicity: Periodicity.MENSUAL,
          cutOffConfig: { dayOfMonth: 30 },
          description: 'Corte regular al cierre de mes calendario',
        })
        .onConflictDoNothing()
        .returning();

      const [groupQuincenal] = await db
        .insert(paymentGroups)
        .values({
          name: 'Corte Quincenal Regular',
          periodicity: Periodicity.QUINCENAL,
          cutOffConfig: { days: [15, 30] },
          description: 'Corte en días 15 y 30 de cada mes',
        })
        .onConflictDoNothing()
        .returning();

      const [groupSemanal] = await db
        .insert(paymentGroups)
        .values({
          name: 'Corte Semanal Personal Técnico',
          periodicity: Periodicity.SEMANAL,
          cutOffConfig: { dayOfWeek: 5 },
          description: 'Corte semanal los días viernes para personal técnico de soporte',
        })
        .onConflictDoNothing()
        .returning();

      // 4. Padrón Extendido de Beneficiarios (NO tienen usuario en el sistema)
      console.log('-> Sembrando beneficiarios (personal sin usuario)...');
      const [ben1] = await db
        .insert(persons)
        .values({
          documentType: 'V',
          documentNumber: '19452881',
          firstName: 'Alejandro',
          lastName: 'Morales',
          specialty: 'Físico Experimental Senior',
          email: 'alejandro.morales@uc.edu.ve',
          status: 'ACTIVO',
        })
        .onConflictDoNothing()
        .returning();

      const [ben2] = await db
        .insert(persons)
        .values({
          documentType: 'V',
          documentNumber: '22109340',
          firstName: 'Sofía',
          lastName: 'Valderrama',
          specialty: 'Investigadora Química Computacional',
          email: 'sofia.valderrama@uc.edu.ve',
          status: 'ACTIVO',
        })
        .onConflictDoNothing()
        .returning();

      const [ben3] = await db
        .insert(persons)
        .values({
          documentType: 'E',
          documentNumber: '84301765',
          firstName: 'Klaus',
          lastName: 'Becker',
          specialty: 'Biólogo Molecular Invitado',
          email: 'klaus.becker@uc.edu.ve',
          status: 'ACTIVO',
        })
        .onConflictDoNothing()
        .returning();

      const [ben4] = await db
        .insert(persons)
        .values({
          documentType: 'V',
          documentNumber: '20198442',
          firstName: 'Valentina',
          lastName: 'Rivas',
          specialty: 'Química Farmacéutica y Diseñadora Molecular',
          email: 'valentina.rivas@uc.edu.ve',
          status: 'ACTIVO',
        })
        .onConflictDoNothing()
        .returning();

      const [ben5] = await db
        .insert(persons)
        .values({
          documentType: 'V',
          documentNumber: '17882109',
          firstName: 'Marcos',
          lastName: 'Domínguez',
          specialty: 'Físico Teórico y Modelado Computacional',
          email: 'marcos.dominguez@uc.edu.ve',
          status: 'ACTIVO',
        })
        .onConflictDoNothing()
        .returning();

      const [ben6] = await db
        .insert(persons)
        .values({
          documentType: 'V',
          documentNumber: '24551903',
          firstName: 'Gabriela',
          lastName: 'Navarro',
          specialty: 'Asistente de Investigación Bioquímica',
          email: 'gabriela.navarro@uc.edu.ve',
          status: 'ACTIVO',
        })
        .onConflictDoNothing()
        .returning();

      const [ben7] = await db
        .insert(persons)
        .values({
          documentType: 'E',
          documentNumber: '82114990',
          firstName: 'David',
          lastName: 'Hernández',
          specialty: 'Ecólogo y Bioestadístico Consultor',
          email: 'david.hernandez@uc.edu.ve',
          status: 'ACTIVO',
        })
        .onConflictDoNothing()
        .returning();

      // =========================================================================
      // ESCENARIOS DE PRUEBA EXIGIDOS POR LA ESPECIFICACIÓN (1 AL 6)
      // =========================================================================

      // ESCENARIO 1: ASIGNACIÓN COMPLETA (Dr. Alejandro Morales, todo Octubre)
      console.log('-> Escenario 1: Asignación completa...');
      const [asgCompleta] = await db
        .insert(assignments)
        .values({
          personId: ben1.id,
          projectId: projectFis.id,
          paymentGroupId: groupMensual.id,
          amountPerPeriod: '850.00',
          currency: 'USD',
          startDate: '2026-01-01',
          endDate: '2026-12-31',
          status: AssignmentStatus.ACTIVO,
          notes: 'Investigador Principal de Mecánica Cuántica',
        })
        .onConflictDoNothing()
        .returning();

      // ESCENARIO 2: ASIGNACIÓN PARCIAL (Ing. Sofía Valderrama, inicia a mitad de corte)
      console.log('-> Escenario 2: Asignación parcial...');
      const [asgParcial] = await db
        .insert(assignments)
        .values({
          personId: ben2.id,
          projectId: projectQui.id,
          paymentGroupId: groupMensual.id,
          amountPerPeriod: '600.00',
          currency: 'USD',
          startDate: '2026-10-16', // 16 días en mes de 31 días: 600 * 16 / 31 = 309.68
          endDate: '2026-12-31',
          status: AssignmentStatus.ACTIVO,
          notes: 'Ingreso a mitad de corte mensual de Octubre',
        })
        .onConflictDoNothing()
        .returning();

      // ESCENARIO 3: CAMBIO DE MONTO A MITAD DE PERÍODO (Dr. Klaus Becker)
      console.log('-> Escenario 3: Cambio a mitad de período...');
      const [asgTramoA] = await db
        .insert(assignments)
        .values({
          personId: ben3.id,
          projectId: projectBio.id,
          paymentGroupId: groupMensual.id,
          amountPerPeriod: '400.00',
          currency: 'USD',
          startDate: '2026-10-01',
          endDate: '2026-10-15',
          status: AssignmentStatus.INACTIVO,
          notes: 'Tramo A: Primera quincena antes de ascenso',
        })
        .onConflictDoNothing()
        .returning();

      const [asgTramoB] = await db
        .insert(assignments)
        .values({
          personId: ben3.id,
          projectId: projectBio.id,
          paymentGroupId: groupMensual.id,
          amountPerPeriod: '800.00',
          currency: 'USD',
          startDate: '2026-10-16',
          endDate: '2026-12-31',
          status: AssignmentStatus.ACTIVO,
          notes: 'Tramo B: Segunda quincena con nuevo monto asignado',
        })
        .onConflictDoNothing()
        .returning();

      // ESCENARIOS ADICIONALES DE ASIGNACIONES (Personal extendido)
      console.log('-> Sembrando asignaciones adicionales para simulación realista...');
      const [asgBen4] = await db
        .insert(assignments)
        .values({
          personId: ben4.id,
          projectId: projectQui3.id,
          paymentGroupId: groupMensual.id,
          amountPerPeriod: '900.00',
          currency: 'USD',
          startDate: '2026-03-01',
          endDate: '2026-11-30',
          status: AssignmentStatus.ACTIVO,
          notes: 'Líder técnica de análisis cromatográfico ambiental',
        })
        .onConflictDoNothing()
        .returning();

      const [asgBen5] = await db
        .insert(assignments)
        .values({
          personId: ben5.id,
          projectId: projectFis2.id,
          paymentGroupId: groupMensual.id,
          amountPerPeriod: '900.00',
          currency: 'USD',
          startDate: '2026-01-15',
          endDate: '2026-12-31',
          status: AssignmentStatus.ACTIVO,
          notes: 'Modelado computacional de aleaciones cuánticas',
        })
        .onConflictDoNothing()
        .returning();

      const [asgBen6] = await db
        .insert(assignments)
        .values({
          personId: ben6.id,
          projectId: projectBio4.id,
          paymentGroupId: groupMensual.id,
          amountPerPeriod: '640.00',
          currency: 'USD',
          startDate: '2026-02-01',
          endDate: '2026-12-15',
          status: AssignmentStatus.ACTIVO,
          notes: 'Técnica de cultivo y fraccionamiento celular marino',
        })
        .onConflictDoNothing()
        .returning();

      const [asgBen7] = await db
        .insert(assignments)
        .values({
          personId: ben7.id,
          projectId: projectBio.id,
          paymentGroupId: groupQuincenal.id,
          amountPerPeriod: '375.00',
          currency: 'USD',
          startDate: '2026-04-01',
          endDate: '2026-10-31',
          status: AssignmentStatus.ACTIVO,
          notes: 'Bioestadístico asesor quincenal en microbiología celular',
        })
        .onConflictDoNothing()
        .returning();

      // ESCENARIO 4 & 5: LOTE CAUSADO, PAGO PARCIAL Y PREVENCIÓN DE EXCESO
      console.log('-> Escenario 4 y 5: Lote causado y Pago Parcial con FIFO...');
      const [batchOct] = await db
        .insert(causationBatches)
        .values({
          projectId: projectFis.id,
          paymentGroupId: groupMensual.id,
          periodStartDate: '2026-10-01',
          periodEndDate: '2026-10-31',
          totalCausationAmount: '850.00',
          status: CausationBatchStatus.CON_SOLICITUD,
          calculatedByUserId: genUser.id,
        })
        .onConflictDoNothing()
        .returning();

      const [itemOct] = await db
        .insert(causationItems)
        .values({
          batchId: batchOct.id,
          personId: ben1.id,
          assignmentId: asgCompleta.id,
          periodStartDate: '2026-10-01',
          periodEndDate: '2026-10-31',
          totalDaysInPeriod: 31,
          activeDays: 31,
          baseAmount: '850.00',
          calculatedAmount: '850.00',
          paidAmount: '500.00', // Pago parcial de $ 500.00
          remainingDebt: '350.00', // Resta $ 350.00
          status: CausationItemStatus.PAGADO_PARCIAL,
        })
        .onConflictDoNothing()
        .returning();

      const seqSol1Res = await db.execute(sql`SELECT next_request_number(2026) AS next_number`);
      const seqSol1 = Number(
        (seqSol1Res as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 1,
      );
      const codigoSol1 = `SOL-2026-${String(seqSol1).padStart(3, '0')}`;

      const [solicitudAprobada] = await db
        .insert(paymentRequests)
        .values({
          requestCode: codigoSol1,
          projectId: projectFis.id,
          causationBatchId: batchOct.id,
          periodDescription: 'Octubre 2026 (Mensual Completo)',
          totalAmountUSD: '850.00',
          status: PaymentRequestStatus.ENTREGADA,
          createdByUserId: genUser.id,
          reviewedByUserId: recUser.id, // Cuatro ojos: gen != rec
          reviewedAt: new Date('2026-10-15T10:00:00Z'),
        })
        .onConflictDoNothing()
        .returning();

      const [desembolsoParcial] = await db
        .insert(disbursements)
        .values({
          paymentRequestId: solicitudAprobada.id,
          disbursedByUserId: recUser.id,
          paymentMethod: PaymentMethod.TRANSFERENCIA,
          referenceNumber: 'TRF-BANC-11223344',
          totalAmount: '500.00',
          notes: 'Pago parcial por liquidez del fondo de investigación',
        })
        .onConflictDoNothing()
        .returning();

      const seedReceiptSequenceResult = await db.execute(
        sql`SELECT next_receipt_number(2026) AS next_number`,
      );
      const seedReceiptSequence = Number(
        (seedReceiptSequenceResult as unknown as Array<{ next_number: string | number }>)[0]
          ?.next_number ?? 0,
      );
      const seedReceiptNumber = FinancialImmutabilityEngine.formatReceiptNumber(
        2026,
        seedReceiptSequence,
      );

      const [reciboParcial] = await db
        .insert(receipts)
        .values({
          receiptNumber: seedReceiptNumber,
          disbursementId: desembolsoParcial.id,
          personId: ben1.id,
          projectId: projectFis.id,
          totalAmountUSD: '500.00',
          remainingDebtAfterUSD: '350.00', // Cuadratura: 850 - 500 = 350
          issuedByUserId: recUser.id,
          notes: 'Recibo oficial inmutable de pago parcial (Original y Copia generados)',
        })
        .onConflictDoNothing()
        .returning();

      await db.insert(receiptAllocations).values({
        receiptId: reciboParcial.id,
        causationItemId: itemOct.id,
        allocatedAmountUSD: '500.00',
        debtBeforeAllocationUSD: '850.00',
        debtAfterAllocationUSD: '350.00',
      });

      // ESCENARIO 6: SOLICITUD RECHAZADA FORMALMENTE CON JUSTIFICACIÓN
      console.log('-> Escenario 6: Solicitud rechazada formalmente...');
      const seqSol2Res = await db.execute(sql`SELECT next_request_number(2026) AS next_number`);
      const seqSol2 = Number(
        (seqSol2Res as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 2,
      );
      const codigoSol2 = `SOL-2026-${String(seqSol2).padStart(3, '0')}`;

      await db
        .insert(paymentRequests)
        .values({
          requestCode: codigoSol2,
          projectId: projectQui.id,
          causationBatchId: batchOct.id,
          periodDescription: 'Octubre 2026 (Borrador con error)',
          totalAmountUSD: '600.00',
          status: PaymentRequestStatus.RECHAZADA,
          createdByUserId: genUser.id,
          reviewedByUserId: recUser.id,
          reviewedAt: new Date('2026-10-16T14:30:00Z'),
          rejectionReason:
            'RECHAZADA: Falta confirmación de avance de laboratorio en el informe mensual.',
        })
        .onConflictDoNothing();

      // =========================================================================
      // SOLICITUDES, PAGOS Y FACTURAS ADICIONALES (SIMULACIÓN REALISTA COMPLETA)
      // =========================================================================
      console.log('-> Sembrando facturas, pagos completos y solicitudes en diversos estados...');

      // Lote y Solicitud CERRADA con pago completo (Dra. Valentina Rivas en QUI-03)
      const [batchOctQui3] = await db
        .insert(causationBatches)
        .values({
          projectId: projectQui3.id,
          paymentGroupId: groupMensual.id,
          periodStartDate: '2026-10-01',
          periodEndDate: '2026-10-31',
          totalCausationAmount: '900.00',
          status: CausationBatchStatus.CON_SOLICITUD,
          calculatedByUserId: genUser.id,
        })
        .onConflictDoNothing()
        .returning();

      const [itemOctQui3] = await db
        .insert(causationItems)
        .values({
          batchId: batchOctQui3.id,
          personId: ben4.id,
          assignmentId: asgBen4.id,
          periodStartDate: '2026-10-01',
          periodEndDate: '2026-10-31',
          totalDaysInPeriod: 31,
          activeDays: 31,
          baseAmount: '900.00',
          calculatedAmount: '900.00',
          paidAmount: '900.00',
          remainingDebt: '0.00',
          status: CausationItemStatus.PAGADO_TOTAL,
        })
        .onConflictDoNothing()
        .returning();

      const seqSol3Res = await db.execute(sql`SELECT next_request_number(2026) AS next_number`);
      const seqSol3 = Number(
        (seqSol3Res as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 3,
      );
      const codigoSol3 = `SOL-2026-${String(seqSol3).padStart(3, '0')}`;

      const [solicitudCerrada] = await db
        .insert(paymentRequests)
        .values({
          requestCode: codigoSol3,
          projectId: projectQui3.id,
          causationBatchId: batchOctQui3.id,
          periodDescription: 'Octubre 2026 (Mensual Completo)',
          totalAmountUSD: '900.00',
          status: PaymentRequestStatus.CERRADA,
          createdByUserId: genUser.id,
          reviewedByUserId: recUser.id,
          reviewedAt: new Date('2026-10-25T11:00:00Z'),
          notes: 'Pago total liquidado al 100% y cerrado formalmente',
        })
        .onConflictDoNothing()
        .returning();

      const [desembolsoTotal] = await db
        .insert(disbursements)
        .values({
          paymentRequestId: solicitudCerrada.id,
          disbursedByUserId: recUser.id,
          paymentMethod: PaymentMethod.TRANSFERENCIA,
          referenceNumber: 'TRF-BANC-55667788',
          totalAmount: '900.00',
          notes: 'Liquidación total del período Octubre para investigadora principal',
        })
        .onConflictDoNothing()
        .returning();

      const seedReceiptSequenceResult2 = await db.execute(
        sql`SELECT next_receipt_number(2026) AS next_number`,
      );
      const seedReceiptSequence2 = Number(
        (seedReceiptSequenceResult2 as unknown as Array<{ next_number: string | number }>)[0]
          ?.next_number ?? 0,
      );
      const seedReceiptNumber2 = FinancialImmutabilityEngine.formatReceiptNumber(
        2026,
        seedReceiptSequence2,
      );

      const [reciboTotal] = await db
        .insert(receipts)
        .values({
          receiptNumber: seedReceiptNumber2,
          disbursementId: desembolsoTotal.id,
          personId: ben4.id,
          projectId: projectQui3.id,
          totalAmountUSD: '900.00',
          remainingDebtAfterUSD: '0.00',
          issuedByUserId: recUser.id,
          notes: 'Recibo oficial inmutable con copia para archivo institucional de la empresa',
        })
        .onConflictDoNothing()
        .returning();

      await db.insert(receiptAllocations).values({
        receiptId: reciboTotal.id,
        causationItemId: itemOctQui3.id,
        allocatedAmountUSD: '900.00',
        debtBeforeAllocationUSD: '900.00',
        debtAfterAllocationUSD: '0.00',
      });

      // Solicitud APROBADA en espera de desembolso (Lcda. Gabriela Navarro en BIO-04)
      const [batchOctBio4] = await db
        .insert(causationBatches)
        .values({
          projectId: projectBio4.id,
          paymentGroupId: groupMensual.id,
          periodStartDate: '2026-10-01',
          periodEndDate: '2026-10-31',
          totalCausationAmount: '640.00',
          status: CausationBatchStatus.CON_SOLICITUD,
          calculatedByUserId: genUser.id,
        })
        .onConflictDoNothing()
        .returning();

      await db
        .insert(causationItems)
        .values({
          batchId: batchOctBio4.id,
          personId: ben6.id,
          assignmentId: asgBen6.id,
          periodStartDate: '2026-10-01',
          periodEndDate: '2026-10-31',
          totalDaysInPeriod: 31,
          activeDays: 31,
          baseAmount: '640.00',
          calculatedAmount: '640.00',
          paidAmount: '0.00',
          remainingDebt: '640.00',
          status: CausationItemStatus.PENDIENTE,
        })
        .onConflictDoNothing();

      const seqSol4Res = await db.execute(sql`SELECT next_request_number(2026) AS next_number`);
      const seqSol4 = Number(
        (seqSol4Res as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 4,
      );
      const codigoSol4 = `SOL-2026-${String(seqSol4).padStart(3, '0')}`;

      await db
        .insert(paymentRequests)
        .values({
          requestCode: codigoSol4,
          projectId: projectBio4.id,
          causationBatchId: batchOctBio4.id,
          periodDescription: 'Octubre 2026 (Mensual Regular)',
          totalAmountUSD: '640.00',
          status: PaymentRequestStatus.APROBADA,
          createdByUserId: genUser.id,
          reviewedByUserId: recUser.id,
          reviewedAt: new Date('2026-11-02T09:30:00Z'),
          notes: 'Aprobada por Gerencia Administrativa. Lista para desembolso en ventanilla/banco.',
        })
        .onConflictDoNothing();

      // Solicitud ENVIADA en espera de revisión (Prof. Marcos Domínguez en FIS-02)
      const [batchNovFis2] = await db
        .insert(causationBatches)
        .values({
          projectId: projectFis2.id,
          paymentGroupId: groupMensual.id,
          periodStartDate: '2026-11-01',
          periodEndDate: '2026-11-30',
          totalCausationAmount: '900.00',
          status: CausationBatchStatus.CON_SOLICITUD,
          calculatedByUserId: genUser.id,
        })
        .onConflictDoNothing()
        .returning();

      await db
        .insert(causationItems)
        .values({
          batchId: batchNovFis2.id,
          personId: ben5.id,
          assignmentId: asgBen5.id,
          periodStartDate: '2026-11-01',
          periodEndDate: '2026-11-30',
          totalDaysInPeriod: 30,
          activeDays: 30,
          baseAmount: '900.00',
          calculatedAmount: '900.00',
          paidAmount: '0.00',
          remainingDebt: '900.00',
          status: CausationItemStatus.PENDIENTE,
        })
        .onConflictDoNothing();

      const seqSol5Res = await db.execute(sql`SELECT next_request_number(2026) AS next_number`);
      const seqSol5 = Number(
        (seqSol5Res as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 5,
      );
      const codigoSol5 = `SOL-2026-${String(seqSol5).padStart(3, '0')}`;

      await db
        .insert(paymentRequests)
        .values({
          requestCode: codigoSol5,
          projectId: projectFis2.id,
          causationBatchId: batchNovFis2.id,
          periodDescription: 'Noviembre 2026 (Mensual en Curso)',
          totalAmountUSD: '900.00',
          status: PaymentRequestStatus.ENVIADA,
          createdByUserId: genUser.id,
          notes:
            'Enviada por Coordinación General de Proyectos. Requiere revisión bajo cuatro ojos.',
        })
        .onConflictDoNothing();

      // Solicitud en BORRADOR en FIS-01
      const seqSol6Res = await db.execute(sql`SELECT next_request_number(2026) AS next_number`);
      const seqSol6 = Number(
        (seqSol6Res as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 6,
      );
      const codigoSol6 = `SOL-2026-${String(seqSol6).padStart(3, '0')}`;

      await db
        .insert(paymentRequests)
        .values({
          requestCode: codigoSol6,
          projectId: projectFis.id,
          causationBatchId: batchOct.id,
          periodDescription: 'Noviembre 2026 (Borrador Preliminar)',
          totalAmountUSD: '850.00',
          status: PaymentRequestStatus.BORRADOR,
          createdByUserId: genUser.id,
          notes: 'Borrador en preparación técnica por coordinación',
        })
        .onConflictDoNothing();

      // 5. Cajas Chicas Institucionales
      console.log('-> Sembrando fondos de caja chica, cierres con arrastre y vales rendidos...');
      const [cajaChica] = await db
        .insert(pettyCash)
        .values({
          name: 'Caja Chica Laboratorio Central',
          description: 'Gastos menores de suministros y reactivos de laboratorio',
          custodianName: 'Lic. Mariana Pernía',
          status: PettyCashStatus.ACTIVA,
        })
        .onConflictDoNothing()
        .returning();

      await db.insert(pettyCashProjects).values([
        {
          pettyCashId: cajaChica.id,
          projectId: projectFis.id,
        },
        {
          pettyCashId: cajaChica.id,
          projectId: projectQui.id,
        },
      ]);

      // Segunda caja chica institucional
      const [cajaChicaBio] = await db
        .insert(pettyCash)
        .values({
          name: 'Caja Chica Estación Marina y Biotecnología',
          description: 'Gastos operativos menores en expediciones marinas y muestras biológicas',
          custodianName: 'Dra. Valentina Rivas',
          status: PettyCashStatus.ACTIVA,
        })
        .onConflictDoNothing()
        .returning();

      await db.insert(pettyCashProjects).values([
        {
          pettyCashId: cajaChicaBio.id,
          projectId: projectBio.id,
        },
        {
          pettyCashId: cajaChicaBio.id,
          projectId: projectBio4.id,
        },
      ]);

      // 5.1 Período Septiembre 2026 en Caja 1 (CERRADO con saldo final $394.50 para arrastrar a Octubre)
      const [periodoSeptiembre] = await db
        .insert(pettyCashPeriods)
        .values({
          pettyCashId: cajaChica.id,
          periodYear: 2026,
          periodMonth: 9,
          openingBalance: '500.00',
          disbursedTotal: '120.00',
          renderedTotal: '105.50',
          closingBalance: '394.50',
          status: PettyCashPeriodStatus.CERRADO,
          openedByUserId: recUser.id,
          closedByUserId: recUser.id,
        })
        .onConflictDoNothing()
        .returning();

      const seqValeSepRes = await db.execute(sql`SELECT next_voucher_number(2026) AS next_number`);
      const seqValeSep = Number(
        (seqValeSepRes as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 1,
      );
      const codigoValeSep = `VAL-2026-${String(seqValeSep).padStart(4, '0')}`;

      const [valeSeptiembre] = await db
        .insert(pettyCashVouchers)
        .values({
          voucherNumber: codigoValeSep,
          pettyCashPeriodId: periodoSeptiembre.id,
          projectId: projectQui.id,
          requestedAmount: '120.00',
          renderedAmount: '105.50',
          changeAmount: '14.50',
          purpose: 'Compra de cristalería graduada y solventes de alta pureza',
          invoiceReference: 'FAC-2026-00891',
          status: PettyCashVoucherStatus.RENDIDO,
          requestedBy: genUser.fullName,
          approvedByUserId: recUser.id,
          disbursedByUserId: recUser.id,
        })
        .onConflictDoNothing()
        .returning();

      await db.insert(pettyCashMovements).values([
        {
          pettyCashPeriodId: periodoSeptiembre.id,
          movementType: PettyCashMovementType.APERTURA_ARRASTRE,
          amount: '500.00',
          previousBalance: '0.00',
          newBalance: '500.00',
          performedByUserId: recUser.id,
          notes: 'Apertura inicial de caja chica Septiembre 2026',
        },
        {
          pettyCashPeriodId: periodoSeptiembre.id,
          voucherId: valeSeptiembre.id,
          movementType: PettyCashMovementType.DESEMBOLSO_VALE,
          amount: '120.00',
          previousBalance: '500.00',
          newBalance: '380.00',
          performedByUserId: recUser.id,
          notes: `Desembolso de vale ${codigoValeSep}`,
        },
        {
          pettyCashPeriodId: periodoSeptiembre.id,
          voucherId: valeSeptiembre.id,
          movementType: PettyCashMovementType.DEVOLUCION_CAMBIO,
          amount: '14.50',
          previousBalance: '380.00',
          newBalance: '394.50',
          performedByUserId: recUser.id,
          notes: `Reintegro de vuelto en rendición de ${codigoValeSep} (Factura FAC-2026-00891)`,
        },
      ]);

      // 5.2 Período Octubre 2026 en Caja 1 (ABIERTO con arrastre automático de $394.50 desde Septiembre)
      const [periodoCaja] = await db
        .insert(pettyCashPeriods)
        .values({
          pettyCashId: cajaChica.id,
          periodYear: 2026,
          periodMonth: 10,
          openingBalance: '394.50',
          disbursedTotal: '85.25',
          renderedTotal: '85.25',
          closingBalance: '309.25',
          status: PettyCashPeriodStatus.ABIERTO,
          openedByUserId: recUser.id,
        })
        .onConflictDoNothing()
        .returning();

      const seqValeOctRes = await db.execute(sql`SELECT next_voucher_number(2026) AS next_number`);
      const seqValeOct = Number(
        (seqValeOctRes as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 2,
      );
      const codigoValeOct = `VAL-2026-${String(seqValeOct).padStart(4, '0')}`;

      const [valeOctubre] = await db
        .insert(pettyCashVouchers)
        .values({
          voucherNumber: codigoValeOct,
          pettyCashPeriodId: periodoCaja.id,
          projectId: projectFis.id,
          requestedAmount: '85.25',
          renderedAmount: '85.25',
          changeAmount: '0.00',
          purpose: 'Reposición de filtros de membrana y guantes de nitrilo para sala limpia',
          invoiceReference: 'FAC-2026-01042',
          status: PettyCashVoucherStatus.RENDIDO,
          requestedBy: genUser.fullName,
          approvedByUserId: recUser.id,
          disbursedByUserId: recUser.id,
        })
        .onConflictDoNothing()
        .returning();

      await db.insert(pettyCashMovements).values([
        {
          pettyCashPeriodId: periodoCaja.id,
          movementType: PettyCashMovementType.APERTURA_ARRASTRE,
          amount: '394.50',
          previousBalance: '394.50',
          newBalance: '394.50',
          performedByUserId: recUser.id,
          notes:
            'Apertura mensual Octubre 2026 con arrastre de saldo desde Septiembre 2026 ($394.50)',
        },
        {
          pettyCashPeriodId: periodoCaja.id,
          voucherId: valeOctubre.id,
          movementType: PettyCashMovementType.DESEMBOLSO_VALE,
          amount: '85.25',
          previousBalance: '394.50',
          newBalance: '309.25',
          performedByUserId: recUser.id,
          notes: `Desembolso y rendición exacta de vale ${codigoValeOct} (Factura FAC-2026-01042)`,
        },
      ]);

      // 5.3 Período Octubre 2026 en Caja 2 (ABIERTO con vale rendido y vale solicitado)
      const [periodoBio] = await db
        .insert(pettyCashPeriods)
        .values({
          pettyCashId: cajaChicaBio.id,
          periodYear: 2026,
          periodMonth: 10,
          openingBalance: '450.00',
          disbursedTotal: '112.40',
          renderedTotal: '112.40',
          closingBalance: '337.60',
          status: PettyCashPeriodStatus.ABIERTO,
          openedByUserId: recUser.id,
        })
        .onConflictDoNothing()
        .returning();

      const seqValeBioRes = await db.execute(sql`SELECT next_voucher_number(2026) AS next_number`);
      const seqValeBio = Number(
        (seqValeBioRes as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 3,
      );
      const codigoValeBio = `VAL-2026-${String(seqValeBio).padStart(4, '0')}`;

      const [valeBio1] = await db
        .insert(pettyCashVouchers)
        .values({
          voucherNumber: codigoValeBio,
          pettyCashPeriodId: periodoBio.id,
          projectId: projectBio4.id,
          requestedAmount: '112.40',
          renderedAmount: '112.40',
          changeAmount: '0.00',
          purpose: 'Adquisición de hielo seco y recipientes isotérmicos para transporte biológico',
          invoiceReference: 'FAC-2026-02119',
          status: PettyCashVoucherStatus.RENDIDO,
          requestedBy: 'Dra. Valentina Rivas',
          approvedByUserId: recUser.id,
          disbursedByUserId: recUser.id,
        })
        .onConflictDoNothing()
        .returning();

      await db.insert(pettyCashMovements).values([
        {
          pettyCashPeriodId: periodoBio.id,
          movementType: PettyCashMovementType.APERTURA_ARRASTRE,
          amount: '450.00',
          previousBalance: '450.00',
          newBalance: '450.00',
          performedByUserId: recUser.id,
          notes: 'Apertura inicial fondo de caja chica Biotecnología Marina Octubre 2026',
        },
        {
          pettyCashPeriodId: periodoBio.id,
          voucherId: valeBio1.id,
          movementType: PettyCashMovementType.DESEMBOLSO_VALE,
          amount: '112.40',
          previousBalance: '450.00',
          newBalance: '337.60',
          performedByUserId: recUser.id,
          notes: `Desembolso y rendición exacta de vale ${codigoValeBio} (Factura FAC-2026-02119)`,
        },
      ]);

      const seqValeBio2Res = await db.execute(sql`SELECT next_voucher_number(2026) AS next_number`);
      const seqValeBio2 = Number(
        (seqValeBio2Res as unknown as Array<{ next_number: string | number }>)[0]?.next_number ?? 4,
      );
      const codigoValeBio2 = `VAL-2026-${String(seqValeBio2).padStart(4, '0')}`;

      await db
        .insert(pettyCashVouchers)
        .values({
          voucherNumber: codigoValeBio2,
          pettyCashPeriodId: periodoBio.id,
          projectId: projectBio.id,
          requestedAmount: '85.00',
          purpose: 'Compra de puntas de micropipeta y viales criogénicos estériles',
          status: PettyCashVoucherStatus.SOLICITADO,
          requestedBy: 'Dr. Klaus Becker',
        })
        .onConflictDoNothing();

      // 6. Auditoría Inmutable (audit_log con valores anteriores y nuevos)
      console.log('-> Sembrando pista de auditoría completa...');
      await db.insert(auditLog).values([
        {
          userId: adminUser.id,
          userEmail: adminUser.email,
          userRole: UserRole.ADMIN,
          action: 'SISTEMA_INICIALIZADO',
          entity: 'system_parameters',
          entityId: 'ROOT',
          oldValues: null,
          newValues: {
            currency: 'USD',
            roundingPolicy: 'HALF_UP',
            immutabilityEnabled: true,
          },
          ipAddress: '127.0.0.1',
        },
        {
          userId: recUser.id,
          userEmail: recUser.email,
          userRole: UserRole.RECEPTOR,
          action: 'DESEMBOLSO_REGISTRADO',
          entity: 'disbursements',
          entityId: desembolsoParcial.id,
          oldValues: { status: 'APROBADA' },
          newValues: {
            status: 'ENTREGADA',
            amount: '500.00',
            receiptNumber: seedReceiptNumber,
          },
          ipAddress: '127.0.0.1',
        },
        {
          userId: recUser.id,
          userEmail: recUser.email,
          userRole: UserRole.RECEPTOR,
          action: 'DESEMBOLSO_REGISTRADO',
          entity: 'disbursements',
          entityId: desembolsoTotal.id,
          oldValues: { status: 'APROBADA' },
          newValues: {
            status: 'CERRADA',
            amount: '900.00',
            receiptNumber: seedReceiptNumber2,
          },
          ipAddress: '127.0.0.1',
        },
      ]);

      // Sincronizar secuencias transaccionales con los registros sembrados
      await db.execute(sql`
        INSERT INTO request_sequences (year, last_number)
        SELECT
          SUBSTRING(request_code FROM 5 FOR 4)::INTEGER AS year,
          MAX(SUBSTRING(request_code FROM 10)::BIGINT) AS last_number
        FROM payment_requests
        WHERE request_code ~ '^SOL-[0-9]{4}-[0-9]+$'
        GROUP BY 1
        ON CONFLICT (year) DO UPDATE
        SET last_number = GREATEST(request_sequences.last_number, EXCLUDED.last_number);
      `);

      await db.execute(sql`
        INSERT INTO receipt_sequences (year, last_number)
        SELECT
          SUBSTRING(receipt_number FROM 5 FOR 4)::INTEGER AS year,
          MAX(SUBSTRING(receipt_number FROM 10)::BIGINT) AS last_number
        FROM receipts
        WHERE receipt_number ~ '^REC-[0-9]{4}-[0-9]+$'
        GROUP BY 1
        ON CONFLICT (year) DO UPDATE
        SET last_number = GREATEST(receipt_sequences.last_number, EXCLUDED.last_number);
      `);

      await db.execute(sql`
        INSERT INTO voucher_sequences (year, last_number)
        SELECT
          SUBSTRING(voucher_number FROM 5 FOR 4)::INTEGER AS year,
          MAX(SUBSTRING(voucher_number FROM 10)::BIGINT) AS last_number
        FROM petty_cash_vouchers
        WHERE voucher_number ~ '^VAL-[0-9]{4}-[0-9]+$'
        GROUP BY 1
        ON CONFLICT (year) DO UPDATE
        SET last_number = GREATEST(voucher_sequences.last_number, EXCLUDED.last_number);
      `);

      console.log('[Scienpay Seed] ¡Siembra de base de datos completada exitosamente!');
      await client.end();
      return;
    } catch (err) {
      console.error(`[Scienpay Seed] Intento ${attempt} falló:`, err);
      try {
        await client.end();
      } catch {
        // Ignorar error al cerrar cliente
      }

      if (attempt >= maxRetries) {
        throw err;
      }
      console.log(`[Scienpay Seed] Reintentando en ${delayMs / 1000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

// Ejecutar directamente si se llama como script
if (process.argv[1]?.includes('seed')) {
  runSeed().catch((err) => {
    console.error('[Scienpay Seed] Error fatal durante la siembra:', err);
    process.exit(1);
  });
}
