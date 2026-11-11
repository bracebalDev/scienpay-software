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
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { LoginRateLimiter } from './login-rate-limiter.js';

const REFRESH_COOKIE_NAME = 'scienpay_refresh';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  private readonly loginRateLimiter = new LoginRateLimiter(60_000, 5);

  constructor(
    private readonly authService: AuthService,
    private readonly passwordService: PasswordService,
    private readonly databaseService: DatabaseService,
  ) {}

  private getClientIp(req: Request): string {
    return req.ip || req.socket?.remoteAddress || 'unknown';
  }

  private getRefreshCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: REFRESH_TOKEN_TTL_MS,
      path: REFRESH_COOKIE_PATH,
    };
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
    });
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: unknown,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    this.loginRateLimiter.check(this.getClientIp(req));

    const parseResult = loginSchema.safeParse(body);
    if (!parseResult.success) {
      throw new UnauthorizedException({
        message: 'DATOS_INVALIDOS: Credenciales con formato inválido',
        errors: parseResult.error.flatten(),
      });
    }

    const { identifier, password } = parseResult.data;
    const normalizedIdentifier = identifier.toLowerCase();

    const [user] = await this.databaseService.db
      .select()
      .from(users)
      .where(
        or(
          eq(users.email, normalizedIdentifier),
          sql`LOWER(${users.username}) = ${normalizedIdentifier}`,
        ),
      )
      .limit(1);

    if (!user) {
      throw new UnauthorizedException('CREDENCIALES_INVALIDAS: Usuario o contraseña incorrectos');
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
          lockoutExpiresAt: user.lockoutExpiresAt
            ? new Date(user.lockoutExpiresAt).getTime()
            : null,
          permanentLock: user.permanentLock,
        },
        now,
      );

      await this.databaseService.db
        .update(users)
        .set({
          failedAttempts: securityState.failedAttempts,
          isLocked: securityState.isLocked,
          lockoutExpiresAt: securityState.lockoutExpiresAt
            ? new Date(securityState.lockoutExpiresAt)
            : null,
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

      throw new UnauthorizedException('CREDENCIALES_INVALIDAS: Usuario o contraseña incorrectos');
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
    const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);

    await this.databaseService.db.insert(refreshTokens).values({
      userId: user.id,
      tokenHash,
      familyId,
      expiresAt: refreshExpiresAt,
    });

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, this.getRefreshCookieOptions());

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

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (!refreshToken) {
      throw new UnauthorizedException('REFRESH_TOKEN_AUSENTE: No hay sesión renovable activa');
    }

    let claims;
    try {
      claims = this.authService.verifyRefreshToken(refreshToken);
    } catch {
      this.clearRefreshCookie(res);
      throw new UnauthorizedException(
        'REFRESH_TOKEN_INVALIDO: El token de renovación ha expirado o es inválido',
      );
    }

    const tokenHash = this.authService.hashRefreshToken(refreshToken);
    const now = new Date();

    // La transacción y el FOR UPDATE serializan renovaciones concurrentes del mismo token.
    const outcome = await this.databaseService.db.transaction(async (tx) => {
      const [record] = await tx
        .select()
        .from(refreshTokens)
        .where(eq(refreshTokens.tokenHash, tokenHash))
        .limit(1)
        .for('update');

      if (!record) {
        // Token firmado válido pero desconocido: se revoca la familia declarada en el JWT.
        await tx
          .update(refreshTokens)
          .set({ revokedAt: now })
          .where(and(eq(refreshTokens.familyId, claims.familyId), isNull(refreshTokens.revokedAt)));
        return { status: 'not_found' as const };
      }

      if (record.revokedAt) {
        // Replay detectado: se revoca toda la familia, no solo el token reutilizado.
        await tx
          .update(refreshTokens)
          .set({ revokedAt: now })
          .where(and(eq(refreshTokens.familyId, record.familyId), isNull(refreshTokens.revokedAt)));
        return { status: 'replay' as const };
      }

      if (new Date(record.expiresAt).getTime() <= now.getTime()) {
        return { status: 'expired' as const };
      }

      const userPayload = {
        id: claims.id,
        email: claims.email,
        fullName: claims.fullName,
        role: claims.role,
      };

      const { refreshToken: newRefreshToken, familyId } = this.authService.generateRefreshToken(
        userPayload,
        record.familyId,
      );
      const newTokenHash = this.authService.hashRefreshToken(newRefreshToken);

      await tx.update(refreshTokens).set({ revokedAt: now }).where(eq(refreshTokens.id, record.id));

      await tx.insert(refreshTokens).values({
        userId: record.userId,
        tokenHash: newTokenHash,
        familyId,
        expiresAt: new Date(now.getTime() + REFRESH_TOKEN_TTL_MS),
      });

      return {
        status: 'ok' as const,
        accessToken: this.authService.generateAccessToken(userPayload),
        refreshToken: newRefreshToken,
      };
    });

    if (outcome.status !== 'ok') {
      this.clearRefreshCookie(res);

      if (outcome.status === 'replay') {
        throw new UnauthorizedException(
          'TOKEN_REPLAY_DETECTADO: Se detectó reutilización de un refresh token. Toda la familia de sesiones fue revocada.',
        );
      }
      if (outcome.status === 'expired') {
        throw new UnauthorizedException(
          'REFRESH_TOKEN_EXPIRADO: La sesión expiró. Inicie sesión nuevamente.',
        );
      }
      throw new UnauthorizedException(
        'REFRESH_TOKEN_REVOCADO: La sesión ya no es válida. Inicie sesión nuevamente.',
      );
    }

    res.cookie(REFRESH_COOKIE_NAME, outcome.refreshToken, this.getRefreshCookieOptions());

    return {
      message: 'TOKEN_RENOVADO',
      accessToken: outcome.accessToken,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    if (refreshToken) {
      const tokenHash = this.authService.hashRefreshToken(refreshToken);
      await this.databaseService.db
        .update(refreshTokens)
        .set({ revokedAt: new Date() })
        .where(eq(refreshTokens.tokenHash, tokenHash));
    }

    this.clearRefreshCookie(res);
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
