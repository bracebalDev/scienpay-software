import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException(
        'NO_AUTORIZADO: Se requiere token de autorización Bearer válido',
      );
    }

    const token = authHeader.substring(7);
    try {
      const decoded = this.authService.verifyAccessToken(token);
      request.user = decoded;
      return true;
    } catch {
      throw new UnauthorizedException(
        'TOKEN_INVALIDO: El token de acceso ha expirado o es inválido',
      );
    }
  }
}
