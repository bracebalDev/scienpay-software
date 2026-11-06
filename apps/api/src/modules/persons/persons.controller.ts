import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole, createPersonSchema, updatePersonSchema } from '@scienpay/shared';
import { PersonsService } from './persons.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';

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
  async getPersonById(@Param('id') id: string) {
    return this.personsService.getPersonById(id);
  }

  @Post()
  @Roles(UserRole.GENERADOR)
  async createPerson(@Body() body: unknown) {
    const parsed = createPersonSchema.parse(body);
    return this.personsService.createPerson(parsed);
  }

  @Patch(':id')
  @Roles(UserRole.GENERADOR)
  async updatePerson(@Param('id') id: string, @Body() body: unknown) {
    const parsed = updatePersonSchema.parse(body);
    return this.personsService.updatePerson(id, parsed);
  }
}
