import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import {
  UserRole,
  createPersonSchema,
  updatePersonSchema,
  type CreatePersonInput,
  type UpdatePersonInput,
} from '@scienpay/shared';
import { PersonsService } from './persons.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';
import { UuidParam } from '../../infrastructure/validation/uuid-param.decorator.js';

@Controller('persons')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PersonsController {
  constructor(private readonly personsService: PersonsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async listPersons() {
    return this.personsService.listPersons();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.GENERADOR, UserRole.RECEPTOR)
  async getPersonById(@UuidParam() id: string) {
    return this.personsService.getPersonById(id);
  }

  @Post()
  @Roles(UserRole.GENERADOR)
  async createPerson(@Body(new ZodValidationPipe(createPersonSchema)) body: CreatePersonInput) {
    return this.personsService.createPerson(body);
  }

  @Patch(':id')
  @Roles(UserRole.GENERADOR)
  async updatePerson(
    @UuidParam() id: string,
    @Body(new ZodValidationPipe(updatePersonSchema)) body: UpdatePersonInput,
  ) {
    return this.personsService.updatePerson(id, body);
  }
}
