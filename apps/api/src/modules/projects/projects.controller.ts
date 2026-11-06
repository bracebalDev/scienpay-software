import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole, createProjectSchema, updateProjectSchema } from '@scienpay/shared';
import { ProjectsService } from './projects.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

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
  async getProjectById(@Param('id') id: string) {
    return this.projectsService.getProjectById(id);
  }

  @Post()
  @Roles(UserRole.GENERADOR)
  async createProject(@Body() body: unknown) {
    const parsed = createProjectSchema.parse(body);
    return this.projectsService.createProject(parsed);
  }

  @Patch(':id')
  @Roles(UserRole.GENERADOR)
  async updateProject(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updateProjectSchema.parse(body);
    return this.projectsService.updateProject(id, parsed);
  }
}
