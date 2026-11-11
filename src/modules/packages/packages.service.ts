import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreatePackageDto } from './dto/create-package.dto.js';
import { UpdatePackageDto } from './dto/update-package.dto.js';
import { PackageQueryDto } from './dto/package-query.dto.js';

@Injectable()
export class PackagesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createPackageDto: CreatePackageDto, actorId: string) {
    const durationNights =
      createPackageDto.durationNights ??
      Math.max(0, createPackageDto.durationDays - 1);

    const pkg = await this.prisma.package.create({
      data: {
        title: createPackageDto.title.trim(),
        destination: createPackageDto.destination.trim(),
        durationDays: createPackageDto.durationDays,
        durationNights,
        description: createPackageDto.description.trim(),
        inclusions: createPackageDto.inclusions,
        exclusions: createPackageDto.exclusions,
        basePrice: createPackageDto.basePrice,
        currency: createPackageDto.currency?.toUpperCase().trim() || 'BDT',
        validFrom: createPackageDto.validFrom
          ? new Date(createPackageDto.validFrom)
          : null,
        validUntil: createPackageDto.validUntil
          ? new Date(createPackageDto.validUntil)
          : null,
        isArchived: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PACKAGE_CREATED',
        entityType: 'Package',
        entityId: pkg.id,
        metadata: {
          title: pkg.title,
          destination: pkg.destination,
          basePrice: pkg.basePrice,
        },
      },
    });

    return pkg;
  }

  async findAll(query: PackageQueryDto) {
    const { page, limit, search, destination, isArchived } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {
      isArchived,
    };

    if (destination) {
      where['destination'] = {
        contains: destination.trim(),
        mode: 'insensitive',
      };
    }

    if (search) {
      where['OR'] = [
        { title: { contains: search.trim(), mode: 'insensitive' } },
        { destination: { contains: search.trim(), mode: 'insensitive' } },
        { description: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.package.count({ where }),
      this.prisma.package.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
    });

    if (!pkg) {
      throw new NotFoundException(`Tour package with ID ${id} not found`);
    }

    return pkg;
  }

  async update(id: string, updatePackageDto: UpdatePackageDto, actorId: string) {
    const current = await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (updatePackageDto.title !== undefined) data['title'] = updatePackageDto.title.trim();
    if (updatePackageDto.destination !== undefined) data['destination'] = updatePackageDto.destination.trim();
    if (updatePackageDto.durationDays !== undefined) data['durationDays'] = updatePackageDto.durationDays;
    if (updatePackageDto.durationNights !== undefined) data['durationNights'] = updatePackageDto.durationNights;
    if (updatePackageDto.description !== undefined) data['description'] = updatePackageDto.description.trim();
    if (updatePackageDto.inclusions !== undefined) data['inclusions'] = updatePackageDto.inclusions;
    if (updatePackageDto.exclusions !== undefined) data['exclusions'] = updatePackageDto.exclusions;
    if (updatePackageDto.basePrice !== undefined) data['basePrice'] = updatePackageDto.basePrice;
    if (updatePackageDto.currency !== undefined) data['currency'] = updatePackageDto.currency.toUpperCase().trim();
    if (updatePackageDto.validFrom !== undefined) {
      data['validFrom'] = updatePackageDto.validFrom ? new Date(updatePackageDto.validFrom) : null;
    }
    if (updatePackageDto.validUntil !== undefined) {
      data['validUntil'] = updatePackageDto.validUntil ? new Date(updatePackageDto.validUntil) : null;
    }
    if (updatePackageDto.isArchived !== undefined) data['isArchived'] = updatePackageDto.isArchived;

    const updated = await this.prisma.package.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PACKAGE_UPDATED',
        entityType: 'Package',
        entityId: id,
        metadata: {
          before: { title: current.title, basePrice: current.basePrice, isArchived: current.isArchived },
          after: { title: updated.title, basePrice: updated.basePrice, isArchived: updated.isArchived },
        },
      },
    });

    return updated;
  }

  async softArchive(id: string, actorId: string) {
    await this.findOne(id);

    const updated = await this.prisma.package.update({
      where: { id },
      data: { isArchived: true },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'PACKAGE_ARCHIVED',
        entityType: 'Package',
        entityId: id,
        metadata: {
          title: updated.title,
        },
      },
    });

    return {
      message: 'Package soft-archived successfully',
      id: updated.id,
      isArchived: true,
    };
  }
}
