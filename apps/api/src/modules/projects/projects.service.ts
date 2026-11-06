import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import { projects } from '../../infrastructure/database/schema.js';
import { CreateProjectInput, UpdateProjectInput } from '@scienpay/shared';
import { eq } from 'drizzle-orm';

@Injectable()
export class ProjectsService {
  constructor(private readonly databaseService: DatabaseService) {}

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

  async createProject(input: CreateProjectInput) {
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

    return created;
  }

  async updateProject(id: string, input: UpdateProjectInput) {
    await this.getProjectById(id);

    const [updated] = await this.databaseService.db
      .update(projects)
      .set({
        ...input,
        updatedAt: new Date(),
      })
      .where(eq(projects.id, id))
      .returning();

    return updated;
  }
}
