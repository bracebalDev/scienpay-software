import { createDatabaseConnection } from './connection.js';
import { PasswordService } from '../../domain/security/password.service.js';
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
    const { db, client } = createDatabaseConnection();
    const passwordService = new PasswordService();

    console.log(`[Scienpay Seed] (Intento ${attempt}/${maxRetries}) Verificando e iniciando siembra de datos...`);

    try {
      const existingUsers = await db.select({ id: users.id }).from(users).limit(1);
      if (existingUsers.length > 0) {
        console.log('[Scienpay Seed] La base de datos ya cuenta con registros sembrados. Omitiendo.');
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

    // 2. Catálogo de Proyectos Científicos (Física, Química, Biología)
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

    // 3. Grupos de Pago (Mensual y Quincenal)
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

    // 4. Beneficiarios (NO tienen usuario en el sistema)
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

    // =========================================================================
    // ESCENARIOS DE PRUEBA EXIGIDOS POR LA ESPECIFICACIÓN
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
    // Tramo A: 1 al 15 de Octubre ($ 400.00/mes) -> 400 * 15 / 31 = 193.55
    // Tramo B: 16 al 31 de Octubre ($ 800.00/mes) -> 800 * 16 / 31 = 412.90
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

    const [solicitudAprobada] = await db
      .insert(paymentRequests)
      .values({
        requestCode: 'SOL-2026-001',
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

    const [reciboParcial] = await db
      .insert(receipts)
      .values({
        receiptNumber: 'REC-2026-000001',
        disbursementId: desembolsoParcial.id,
        personId: ben1.id,
        projectId: projectFis.id,
        totalAmountUSD: '500.00',
        remainingDebtAfterUSD: '350.00', // Cuadratura: 850 - 500 = 350
        issuedByUserId: recUser.id,
        notes: 'Recibo oficial inmutable de pago parcial',
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
    await db
      .insert(paymentRequests)
      .values({
        requestCode: 'SOL-2026-002',
        projectId: projectQui.id,
        causationBatchId: batchOct.id,
        periodDescription: 'Octubre 2026 (Borrador con error)',
        totalAmountUSD: '600.00',
        status: PaymentRequestStatus.RECHAZADA,
        createdByUserId: genUser.id,
        reviewedByUserId: recUser.id,
        reviewedAt: new Date('2026-10-16T14:30:00Z'),
        rejectionReason: 'RECHAZADA: Falta confirmación de avance de laboratorio en el informe mensual.',
      })
      .onConflictDoNothing();

    // 5. Caja Chica Institucional con Apertura y Vale Rendido
    console.log('-> Sembrando caja chica y movimientos inmutables...');
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

    await db.insert(pettyCashProjects).values({
      pettyCashId: cajaChica.id,
      projectId: projectFis.id,
    });

    const [periodoCaja] = await db
      .insert(pettyCashPeriods)
      .values({
        pettyCashId: cajaChica.id,
        periodYear: 2026,
        periodMonth: 10,
        openingBalance: '500.00',
        disbursedTotal: '85.25',
        renderedTotal: '85.25',
        closingBalance: '414.75',
        status: PettyCashPeriodStatus.ABIERTO,
        openedByUserId: recUser.id,
      })
      .onConflictDoNothing()
      .returning();

    await db.insert(pettyCashMovements).values({
      pettyCashPeriodId: periodoCaja.id,
      movementType: PettyCashMovementType.APERTURA_ARRASTRE,
      amount: '500.00',
      previousBalance: '0.00',
      newBalance: '500.00',
      performedByUserId: recUser.id,
      notes: 'Apertura mensual de caja chica Octubre 2026',
    });

    // 6. Auditoría Inmutable (audit_log con valores anteriores y nuevos)
    console.log('-> Sembrando pista de auditoría...');
    await db.insert(auditLog).values({
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
    });

    await db.insert(auditLog).values({
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
        receiptNumber: 'REC-2026-000001',
      },
      ipAddress: '127.0.0.1',
    });

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
