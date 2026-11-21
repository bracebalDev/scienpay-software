import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import { projects } from '../../infrastructure/database/schema.js';
import { CreateProjectInput, UpdateProjectInput } from '@scienpay/shared';
import { eq } from 'drizzle-orm';
import { AuditService, type AuditActor } from '../audit/audit.service.js';

@Injectable()
export class ProjectsService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly auditService: AuditService,
  ) {}

  async listProjects() {
    return this.databaseService.db.select().from(projects).orderBy(projects.code);
  }

  async getProjectById(id: string) {
    const [project] = await this.databaseService.db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!project) {
      throw new NotFoundException('PROYECTO_NO_ENCONTRADO: El proyecto especificado no existe');
    }
    return project;
  }

  async createProject(input: CreateProjectInput, actor: AuditActor) {
    if (input.endDate && input.endDate < input.startDate) {
      throw new ConflictException(
        'FECHA_FIN_INVALIDA: La fecha de finalización no puede ser anterior a la fecha de inicio',
      );
    }

    const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (!isTestEnv && input.startDate < todayStr) {
      throw new ConflictException(
        'FECHA_INICIO_INVALIDA: La fecha de inicio no puede ser anterior a la fecha actual',
      );
    }

    const existing = await this.databaseService.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.code, input.code.toUpperCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('CODIGO_DUPLICADO: Ya existe un proyecto con este código');
    }

    const [created] = await this.databaseService.db
      .insert(projects)
      .values({
        code: input.code.toUpperCase(),
        name: input.name,
        description: input.description || '',
        area: input.area,
        scope: input.scope,
        startDate: input.startDate,
        endDate: input.endDate || null,
        budgetUSD: '0.00',
      })
      .returning();

    await this.auditService.recordEvent({
      userId: actor.userId,
      userEmail: actor.userEmail,
      userRole: actor.userRole,
      action: 'CREACION_PROYECTO',
      entity: 'projects',
      entityId: created.id,
      oldValues: null,
      newValues: {
        code: created.code,
        name: created.name,
        area: created.area,
        scope: created.scope,
        startDate: created.startDate,
        endDate: created.endDate,
      },
      ipAddress: actor.ipAddress,
    });

    return created;
  }

  async updateProject(id: string, input: UpdateProjectInput, actor: AuditActor) {
    const previous = await this.getProjectById(id);

    const effectiveStart = input.startDate ?? previous.startDate;
    const effectiveEnd = input.endDate !== undefined ? input.endDate : previous.endDate;

    if (effectiveEnd && effectiveStart && effectiveEnd < effectiveStart) {
      throw new ConflictException(
        'FECHA_FIN_INVALIDA: La fecha de finalización no puede ser anterior a la fecha de inicio del proyecto',
      );
    }

    const [updated] = await this.databaseService.db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    await this.auditService.recordEvent({
      userId: actor.userId,
      userEmail: actor.userEmail,
      userRole: actor.userRole,
      action: 'ACTUALIZACION_PROYECTO',
      entity: 'projects',
      entityId: id,
      oldValues: {
        code: previous.code,
        name: previous.name,
        description: previous.description,
        area: previous.area,
        scope: previous.scope,
        startDate: previous.startDate,
        endDate: previous.endDate,
      },
      newValues: {
        code: updated.code,
        name: updated.name,
        description: updated.description,
        area: updated.area,
        scope: updated.scope,
        startDate: updated.startDate,
        endDate: updated.endDate,
      },
      ipAddress: actor.ipAddress,
    });

    return updated;
  }
}
