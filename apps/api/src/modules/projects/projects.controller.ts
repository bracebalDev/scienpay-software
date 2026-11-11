import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  UserRole,
  createProjectSchema,
  updateProjectSchema,
  type CreateProjectInput,
  type UpdateProjectInput,
} from '@scienpay/shared';
import { ProjectsService } from './projects.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';
import { UuidParam } from '../../infrastructure/validation/uuid-param.decorator.js';

@Controller('projects')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listProjects() {
    return this.projectsService.listProjects();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getProjectById(@UuidParam() id: string) {
    return this.projectsService.getProjectById(id);
  }

  @Post()
  @Roles(UserRole.GENERADOR)
  async createProject(
    @Body(new ZodValidationPipe(createProjectSchema)) body: CreateProjectInput,
  ) {
    return this.projectsService.createProject(body);
  }

  @Patch(':id')
  @Roles(UserRole.GENERADOR)
  async updateProject(
    @UuidParam() id: string,
    @Body(new ZodValidationPipe(updateProjectSchema)) body: UpdateProjectInput,
  ) {
    return this.projectsService.updateProject(id, body);
  }
}
