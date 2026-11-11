import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateStaffDto } from './dto/create-staff.dto.js';
import { UpdateStaffDto } from './dto/update-staff.dto.js';
import {
  STAFF_ALLOWED_SORT_FIELDS,
  STAFF_SEARCHABLE_FIELDS,
  StaffQueryDto,
} from './dto/staff-query.dto.js';
import { StaffRole, StaffStatus } from '../../generated/prisma/client.js';
import {
  buildPrismaQuery,
  createPaginatedResponse,
} from '../../common/utils/query-builder.util.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createStaffDto: CreateStaffDto, actorId: string) {
    const existing = await this.prisma.staffUser.findUnique({
      where: { email: createStaffDto.email.toLowerCase().trim() },
    });

    if (existing) {
      throw new ConflictException('A staff account with this email already exists');
    }

    const passwordHash = await bcrypt.hash(createStaffDto.password, 10);

    const staff = await this.prisma.staffUser.create({
      data: {
        email: createStaffDto.email.toLowerCase().trim(),
        name: createStaffDto.name.trim(),
        passwordHash,
        role: createStaffDto.role,
        status: StaffStatus.ACTIVE,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'STAFF_CREATED',
        entityType: 'StaffUser',
        entityId: staff.id,
        metadata: {
          email: staff.email,
          role: staff.role,
          name: staff.name,
        },
      },
    });

    return staff;
  }

  async findAll(query: StaffQueryDto) {
    const { where, skip, take, orderBy, page, limit } = buildPrismaQuery({
      query,
      searchableFields: STAFF_SEARCHABLE_FIELDS,
      exactFilterFields: ['role', 'status'],
      allowedSortFields: STAFF_ALLOWED_SORT_FIELDS,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });

    const [total, data] = await Promise.all([
      this.prisma.staffUser.count({ where }),
      this.prisma.staffUser.findMany({
        where,
        skip,
        take,
        orderBy,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const staff = await this.prisma.staffUser.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!staff) {
      throw new NotFoundException(`Staff user with ID ${id} not found`);
    }

    return staff;
  }

  async update(id: string, updateStaffDto: UpdateStaffDto, actorId: string) {
    const existing = await this.prisma.staffUser.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Staff user with ID ${id} not found`);
    }

    // Invariant: Prevent removing the last active OWNER_ADMIN
    const isDemotingAdmin =
      existing.role === StaffRole.OWNER_ADMIN &&
      updateStaffDto.role &&
      updateStaffDto.role !== StaffRole.OWNER_ADMIN;

    const isDeactivatingAdmin =
      existing.role === StaffRole.OWNER_ADMIN &&
      updateStaffDto.status &&
      updateStaffDto.status === StaffStatus.INACTIVE;

    if (isDemotingAdmin || isDeactivatingAdmin) {
      const activeAdminCount = await this.prisma.staffUser.count({
        where: {
          role: StaffRole.OWNER_ADMIN,
          status: StaffStatus.ACTIVE,
        },
      });

      if (activeAdminCount <= 1) {
        throw new BadRequestException(
          'Cannot deactivate or demote the sole remaining active OWNER_ADMIN',
        );
      }
    }

    const data: Record<string, unknown> = {};
    if (updateStaffDto.name !== undefined) data['name'] = updateStaffDto.name.trim();
    if (updateStaffDto.role !== undefined) data['role'] = updateStaffDto.role;
    if (updateStaffDto.status !== undefined) {
      data['status'] = updateStaffDto.status;
      if (updateStaffDto.status === StaffStatus.INACTIVE) {
        data['refreshTokenHash'] = null; // Revoke session immediately
      }
    }
    if (updateStaffDto.password) {
      data['passwordHash'] = await bcrypt.hash(updateStaffDto.password, 10);
      data['refreshTokenHash'] = null; // Force re-login on password change
    }

    const updated = await this.prisma.staffUser.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'STAFF_UPDATED',
        entityType: 'StaffUser',
        entityId: id,
        metadata: {
          before: { role: existing.role, status: existing.status },
          after: { role: updated.role, status: updated.status },
        },
      },
    });

    return updated;
  }
}
