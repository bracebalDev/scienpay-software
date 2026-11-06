import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { DatabaseService } from '../../infrastructure/database/database.service.js';
import { users } from '../../infrastructure/database/schema.js';
import { PasswordService } from '../../domain/security/password.service.js';
import { eq } from 'drizzle-orm';
import { CreateUserInput } from '@scienpay/shared';

@Injectable()
export class UsersService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly passwordService: PasswordService,
  ) {}

  async listUsers() {
    return this.databaseService.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        title: users.title,
        role: users.role,
        failedAttempts: users.failedAttempts,
        isLocked: users.isLocked,
        lockoutExpiresAt: users.lockoutExpiresAt,
        permanentLock: users.permanentLock,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(users.createdAt);
  }

  async createUser(input: CreateUserInput & { username: string; title?: string }) {
    const existing = await this.databaseService.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, input.email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      throw new ConflictException('CORREO_DUPLICADO: Ya existe un usuario con este correo electrónico');
    }

    const passwordHash = await this.passwordService.hash(input.password);

    const [created] = await this.databaseService.db
      .insert(users)
      .values({
        username: input.username.toLowerCase(),
        email: input.email.toLowerCase(),
        fullName: input.fullName,
        title: input.title || '',
        role: input.role,
        passwordHash,
      })
      .returning({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        title: users.title,
        role: users.role,
        createdAt: users.createdAt,
      });

    return created;
  }

  async unlockUser(userId: string) {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('USUARIO_NO_ENCONTRADO: El ID de usuario no existe');
    }

    await this.databaseService.db
      .update(users)
      .set({
        failedAttempts: 0,
        isLocked: false,
        lockoutExpiresAt: null,
        permanentLock: false,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { message: 'USUARIO_DESBLOQUEADO_EXITOSAMENTE', userId };
  }

  async resetAttempts(userId: string) {
    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('USUARIO_NO_ENCONTRADO: El ID de usuario no existe');
    }

    await this.databaseService.db
      .update(users)
      .set({
        failedAttempts: 0,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    return { message: 'INTENTOS_REINICIADOS', userId };
  }
}
