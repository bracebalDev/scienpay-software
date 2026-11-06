import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { loginSchema } from '@scienpay/shared';
import { AuthService } from './auth.service.js';
import { PasswordService } from '../../domain/security/password.service.js';
import { AccountSecurityPolicy } from '../../domain/security/account-security.policy.js';
import { DatabaseService } from '../database/database.service.js';
import { users, refreshTokens } from '../database/schema.js';
import { eq } from 'drizzle-orm';
import { JwtAuthGuard } from './jwt-auth.guard.js';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      throw new UnauthorizedException({
        message: 'DATOS_INVALIDOS: Credenciales con formato inválido',
        errors: parseResult.error.flatten(),
      });
    }

    const { email, password } = parseResult.data;

    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('CREDENCIALES_INVALIDAS: Correo o contraseña incorrectos');
    }

    // 1. Verificar bloqueo definitivo (4to error)
    if (user.permanentLock) {
      throw new UnauthorizedException(
        'USUARIO_BLOQUEADO: Cuenta bloqueada por seguridad. Contacte al Administrador del Sistema.',
      );
    }

    // 2. Verificar bloqueo temporal de 5 minutos (3er error)
    const now = Date.now();
    if (user.isLocked && user.lockoutExpiresAt) {
      const expiresAtMs = new Date(user.lockoutExpiresAt).getTime();
      if (expiresAtMs > now) {
        const remainingSecs = Math.ceil((expiresAtMs - now) / 1000);
        throw new UnauthorizedException(
          `BLOQUEO_TEMPORAL: Demasiados intentos fallidos. Espere ${remainingSecs} segundos antes de reintentar.`,
        );
      }
    }

    // 3. Validar contraseña con Argon2id
    const isPasswordValid = await this.passwordService.verify(user.passwordHash, password);

    if (!isPasswordValid) {
      const securityState = AccountSecurityPolicy.recordFailedAttempt(
        {
          failedAttempts: user.failedAttempts,
          isLocked: user.isLocked,
          lockoutExpiresAt: user.lockoutExpiresAt ? new Date(user.lockoutExpiresAt).getTime() : null,
          permanentLock: user.permanentLock,
        },
        now,
      );

      await this.databaseService.db
        .update(users)
        .set({
          failedAttempts: securityState.failedAttempts,
          isLocked: securityState.isLocked,
          lockoutExpiresAt: securityState.lockoutExpiresAt ? new Date(securityState.lockoutExpiresAt) : null,
          permanentLock: securityState.permanentLock,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));

      if (securityState.permanentLock) {
        throw new UnauthorizedException(
          'USUARIO_BLOQUEADO: Cuenta bloqueada definitivamente al 4to intento fallido. Contacte al Administrador.',
        );
      }

      if (securityState.isLocked) {
        throw new UnauthorizedException(
          'BLOQUEO_TEMPORAL: Ha superado 3 intentos fallidos. Debe esperar 5 minutos para volver a intentar.',
        );
      }

      throw new UnauthorizedException('CREDENCIALES_INVALIDAS: Correo o contraseña incorrectos');
    }

    // 4. Intento exitoso: limpiar contador y bloqueos
    await this.databaseService.db
      .update(users)
      .set({
        failedAttempts: 0,
        isLocked: false,
        lockoutExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // 5. Emitir Access Token y Refresh Token Rotativo
    const userPayload = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    const accessToken = this.authService.generateAccessToken(userPayload);
    const { refreshToken, familyId } = this.authService.generateRefreshToken(userPayload);
    const tokenHash = this.authService.hashRefreshToken(refreshToken);

    const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.databaseService.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt: refreshExpiresAt,
    });

    res.cookie('scienpay_refresh', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/v1/auth',
    });

    return {
      message: 'AUTENTICACION_EXITOSA',
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        title: user.title,
        role: user.role,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.scienpay_refresh;
    if (refreshToken) {
      const tokenHash = this.authService.hashRefreshToken(refreshToken);
      await this.databaseService.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    res.clearCookie('scienpay_refresh', { path: '/api/v1/auth' });
    return { message: 'SESION_CERRADA' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request & { user: any }) {
    const [user] = await this.databaseService.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        fullName: users.fullName,
        title: users.title,
        role: users.role,
        failedAttempts: users.failedAttempts,
        isLocked: users.isLocked,
        permanentLock: users.permanentLock,
      })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('USUARIO_NO_ENCONTRADO');
    }

    return user;
  }
}
