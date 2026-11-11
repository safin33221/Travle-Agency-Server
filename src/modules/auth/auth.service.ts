import {
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { PrismaService } from '../../database/prisma.service.js';
import { LoginDto } from './dto/login.dto.js';
import { StaffStatus } from '../../generated/prisma/client.js';
import { TokenService } from '../../common/services/token.service.js';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async login(loginDto: LoginDto, res: Response) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { email: loginDto.email.toLowerCase().trim() },
    });

    if (!staff) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (staff.status !== StaffStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Account has been deactivated. Please contact an administrator.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      staff.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = {
      sub: staff.id,
      email: staff.email,
      role: staff.role,
      name: staff.name,
    };

    const accessSecret =
      process.env.JWT_ACCESS_SECRET ||
      'travelpilot-access-secret-min-32-chars-long';
    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ||
      'travelpilot-refresh-secret-min-32-chars-long';

    const accessToken = await this.tokenService.signAsync(payload, {
      secret: accessSecret,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    });

    const refreshToken = await this.tokenService.signAsync(
      { sub: staff.id },
      {
        secret: refreshSecret,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
      },
    );

    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: {
        refreshTokenHash,
        lastLoginAt: new Date(),
      },
    });

    this.setAuthCookies(res, accessToken, refreshToken);

    return {
      accessToken,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        status: staff.status,
      },
    };
  }

  async refreshToken(refreshToken: string | undefined, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const refreshSecret =
      process.env.JWT_REFRESH_SECRET ||
      'travelpilot-refresh-secret-min-32-chars-long';

    let payload: { sub: string };
    try {
      payload = await this.tokenService.verifyAsync(refreshToken, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const staff = await this.prisma.staffUser.findUnique({
      where: { id: payload.sub },
    });

    if (!staff || staff.status !== StaffStatus.ACTIVE || !staff.refreshTokenHash) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    const incomingHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    if (incomingHash !== staff.refreshTokenHash) {
      // Possible token reuse attack detected: revoke all tokens for this staff
      await this.prisma.staffUser.update({
        where: { id: staff.id },
        data: { refreshTokenHash: null },
      });
      throw new UnauthorizedException('Session revoked due to token conflict');
    }

    const newPayload = {
      sub: staff.id,
      email: staff.email,
      role: staff.role,
      name: staff.name,
    };

    const accessSecret =
      process.env.JWT_ACCESS_SECRET ||
      'travelpilot-access-secret-min-32-chars-long';

    const newAccessToken = await this.tokenService.signAsync(newPayload, {
      secret: accessSecret,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    });

    const newRefreshToken = await this.tokenService.signAsync(
      { sub: staff.id },
      {
        secret: refreshSecret,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
      },
    );

    const newHash = crypto
      .createHash('sha256')
      .update(newRefreshToken)
      .digest('hex');

    await this.prisma.staffUser.update({
      where: { id: staff.id },
      data: { refreshTokenHash: newHash },
    });

    this.setAuthCookies(res, newAccessToken, newRefreshToken);

    return {
      accessToken: newAccessToken,
      user: {
        id: staff.id,
        email: staff.email,
        name: staff.name,
        role: staff.role,
        status: staff.status,
      },
    };
  }

  async logout(userId: string, res: Response) {
    if (userId) {
      await this.prisma.staffUser.update({
        where: { id: userId },
        data: { refreshTokenHash: null },
      });
    }

    this.clearAuthCookies(res);
    return { message: 'Logged out successfully' };
  }

  async getMe(userId: string) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });

    if (!staff || staff.status !== StaffStatus.ACTIVE) {
      throw new UnauthorizedException('Staff account not found or inactive');
    }

    return staff;
  }

  private setAuthCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
      path: '/',
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api/v1/auth',
    });
  }

  private clearAuthCookies(res: Response) {
    const isProd = process.env.NODE_ENV === 'production';

    res.clearCookie('access_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/',
    });

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
  }
}
