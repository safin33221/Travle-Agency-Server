import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { AuditQueryDto } from './dto/audit-query.dto.js';
import {
  buildPrismaQuery,
  createPaginatedResponse,
} from '../../common/utils/query-builder.util.js';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: AuditQueryDto) {
    const { where, orderBy, skip, take, page, limit } = buildPrismaQuery({
      query,
      searchableFields: ['action', 'entityType', 'entityId'],
      exactFilterFields: ['entityType', 'action', 'actorId'],
      allowedSortFields: ['createdAt', 'action', 'entityType'],
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          actor: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
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
