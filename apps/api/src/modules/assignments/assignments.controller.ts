import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  UserRole,
  createAssignmentSchema,
  terminateAssignmentSchema,
  type CreateAssignmentInput,
  type TerminateAssignmentInput,
} from '@scienpay/shared';
import { AssignmentsService } from './assignments.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';
import { UuidParam, UuidQuery } from '../../infrastructure/validation/uuid-param.decorator.js';

@Controller('assignments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listAssignments(@UuidQuery('projectId') projectId?: string) {
    return this.assignmentsService.listAssignments(projectId);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getAssignmentById(@UuidParam() id: string) {
    return this.assignmentsService.getAssignmentById(id);
  }

  @Post()
  @Roles(UserRole.GENERADOR)
  async createAssignment(
    @Body(new ZodValidationPipe(createAssignmentSchema)) body: CreateAssignmentInput,
  ) {
    return this.assignmentsService.createAssignment(body);
  }

  @Patch(':id/terminate')
  @Roles(UserRole.GENERADOR)
  async terminateAssignment(
    @UuidParam() id: string,
    @Body(new ZodValidationPipe(terminateAssignmentSchema)) body: TerminateAssignmentInput,
  ) {
    return this.assignmentsService.terminateAssignment(id, body);
  }
}
