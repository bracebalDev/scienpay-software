import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { UserRole, createUserSchema, type CreateUserInput } from '@scienpay/shared';
import { UsersService } from './users.service.js';
import { JwtAuthGuard } from '../../infrastructure/auth/jwt-auth.guard.js';
import { RolesGuard } from '../../infrastructure/auth/roles.guard.js';
import { Roles } from '../../infrastructure/auth/roles.decorator.js';
import { ZodValidationPipe } from '../../infrastructure/validation/zod-validation.pipe.js';
import { UuidParam } from '../../infrastructure/validation/uuid-param.decorator.js';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async listUsers() {
    return this.usersService.listUsers();
  }

  @Post()
  async createUser(@Body(new ZodValidationPipe(createUserSchema)) body: CreateUserInput) {
    const username = body.email.split('@')[0];
    return this.usersService.createUser({ ...body, username });
  }

  @Patch(':id/unlock')
  async unlockUser(@UuidParam() id: string) {
    return this.usersService.unlockUser(id);
  }

  @Patch(':id/reset-attempts')
  async resetAttempts(@UuidParam() id: string) {
    return this.usersService.resetAttempts(id);
  }
}
