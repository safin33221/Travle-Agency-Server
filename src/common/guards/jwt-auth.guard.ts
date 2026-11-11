import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';
import { PrismaService } from '../../database/prisma.service.js';
import { StaffStatus } from '../../generated/prisma/client.js';
import { TokenService } from '../services/token.service.js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokenService: TokenService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const token = this.extractTokenFromRequest(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is required');
    }

    try {
      const secret =
        process.env.JWT_ACCESS_SECRET ||
        'travelpilot-access-secret-min-32-chars-long';
      const payload = await this.tokenService.verifyAsync<{ sub: string }>(
        token,
        { secret },
      );

      const staff = await this.prisma.staffUser.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
        },
      });

      if (!staff || staff.status !== StaffStatus.ACTIVE) {
        throw new UnauthorizedException(
          'Staff account is deactivated or no longer exists',
        );
      }

      request.user = staff;
      return true;
    } catch (err: unknown) {
      if (err instanceof UnauthorizedException) {
        throw err;
      }
      throw new UnauthorizedException('Invalid or expired authentication session');
    }
  }

  private extractTokenFromRequest(request: Request): string | undefined {
    // 1. Check HttpOnly cookie
    if (request.cookies && request.cookies['access_token']) {
      return request.cookies['access_token'];
    }

    // 2. Check Bearer Authorization header
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
}
