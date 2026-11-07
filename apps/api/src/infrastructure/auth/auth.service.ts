import { Injectable, Optional } from '@nestjs/common';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { UserRole } from '@scienpay/shared';
import { PasswordService } from '../../domain/security/password.service.js';

export interface UserTokenPayload {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AccessTokenClaims extends UserTokenPayload {
  iat: number;
  exp: number;
}

export interface RefreshTokenClaims extends UserTokenPayload {
  familyId: string;
  iat: number;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly passwordService: PasswordService,
    @Optional()
    private readonly jwtAccessSecret: string = process.env.JWT_ACCESS_SECRET ||
      'dev_jwt_access_secret_scienpay_minimum_64_characters_super_secure_key_12345',
    @Optional()
    private readonly jwtRefreshSecret: string = process.env.JWT_REFRESH_SECRET ||
      'dev_jwt_refresh_secret_scienpay_minimum_64_characters_super_secure_key_67890',
  ) {}

  generateAccessToken(user: UserTokenPayload): string {
    return jwt.sign(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
      this.jwtAccessSecret,
      { expiresIn: '15m' },
    );
  }

  verifyAccessToken(token: string): AccessTokenClaims {
    return jwt.verify(token, this.jwtAccessSecret) as AccessTokenClaims;
  }

  generateRefreshToken(
    user: UserTokenPayload,
    existingFamilyId?: string,
  ): { refreshToken: string; familyId: string } {
    const familyId = existingFamilyId || crypto.randomUUID();
    const refreshToken = jwt.sign(
      {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        familyId,
      },
      this.jwtRefreshSecret,
      { expiresIn: '7d', jwtid: crypto.randomUUID() },
    );

    return { refreshToken, familyId };
  }

  verifyRefreshToken(token: string): RefreshTokenClaims {
    return jwt.verify(token, this.jwtRefreshSecret) as RefreshTokenClaims;
  }

  hashRefreshToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
