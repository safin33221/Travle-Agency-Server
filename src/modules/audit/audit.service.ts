import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AuditQueryDto) {
    const { page, limit, entityType, action, actorId } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (entityType) where['entityType'] = entityType;
    if (action) where['action'] = action;
    if (actorId) where['actorId'] = actorId;

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async log(
    action: string,
    entityType: string,
    entityId: string,
    metadata?: Record<string, unknown>,
    actorId?: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.auditLog.create({
      data: {
        action,
        entityType,
        entityId,
        metadata: metadata as any,
        actorId,
        ipAddress,
        userAgent,
      },
    });
  }
}
