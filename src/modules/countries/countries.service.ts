import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateCountryDto } from './dto/create-country.dto.js';
import { UpdateCountryDto } from './dto/update-country.dto.js';
import {
  COUNTRY_ALLOWED_SORT_FIELDS,
  COUNTRY_SEARCHABLE_FIELDS,
  CountryQueryDto,
} from './dto/country-query.dto.js';
import {
  buildPrismaQuery,
  createPaginatedResponse,
} from '../../common/utils/query-builder.util.js';
import {
  CountryCoverageStatus,
  VisaPublicationStatus,
} from '../../generated/prisma/client.js';

export function slugifyText(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Injectable()
export class CountriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCountryDto, actorId: string) {
    const name = dto.name.trim();
    const isoCode = dto.isoCode.trim().toUpperCase();
    const slug = slugifyText(dto.slug || name);

    const existing = await this.prisma.country.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' } },
          { isoCode },
          { slug },
        ],
      },
    });

    if (existing) {
      throw new ConflictException(
        `Country with name '${name}', ISO code '${isoCode}', or slug '${slug}' already exists`,
      );
    }

    const country = await this.prisma.country.create({
      data: {
        name,
        isoCode,
        slug,
        flagEmoji: dto.flagEmoji?.trim() || null,
        flagUrl: dto.flagUrl?.trim() || null,
        coverImageUrl: dto.coverImageUrl?.trim() || null,
        shortIntro: dto.shortIntro.trim(),
        detailedDescription: dto.detailedDescription?.trim() || null,
        coverageStatus: dto.coverageStatus ?? CountryCoverageStatus.ACTIVE,
        isFeatured: dto.isFeatured ?? false,
        displayOrder: dto.displayOrder ?? 0,
        seoTitle: dto.seoTitle?.trim() || null,
        seoDescription: dto.seoDescription?.trim() || null,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'COUNTRY_CREATED',
        entityType: 'Country',
        entityId: country.id,
        metadata: {
          name: country.name,
          isoCode: country.isoCode,
          slug: country.slug,
          coverageStatus: country.coverageStatus,
        },
      },
    });

    return country;
  }

  async findPublicAll(query: CountryQueryDto) {
    const baseWhere: Record<string, unknown> = {
      coverageStatus:
        query.coverageStatus &&
        query.coverageStatus !== CountryCoverageStatus.ARCHIVED
          ? query.coverageStatus
          : { not: CountryCoverageStatus.ARCHIVED },
    };

    if (query.category) {
      baseWhere['visaServices'] = {
        some: {
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          category: query.category,
        },
      };
    }

    const { where, skip, take, orderBy, page, limit } = buildPrismaQuery({
      query,
      searchableFields: COUNTRY_SEARCHABLE_FIELDS,
      exactFilterFields: ['isFeatured'],
      allowedSortFields: COUNTRY_ALLOWED_SORT_FIELDS,
      defaultSortBy: 'displayOrder',
      defaultSortOrder: 'asc',
      baseWhere,
    });

    const [total, data] = await Promise.all([
      this.prisma.country.count({ where }),
      this.prisma.country.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          visaServices: {
            where: {
              publicationStatus: VisaPublicationStatus.PUBLISHED,
            },
            orderBy: { displayOrder: 'asc' },
            select: {
              id: true,
              title: true,
              slug: true,
              category: true,
              customCategoryLabel: true,
              shortDescription: true,
              serviceStatus: true,
              estimatedProcessingTime: true,
              agencyServiceFee: true,
              currency: true,
              isFeatured: true,
            },
          },
          _count: {
            select: {
              visaServices: {
                where: { publicationStatus: VisaPublicationStatus.PUBLISHED },
              },
            },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findPublicBySlug(slug: string) {
    const normalizedSlug = slug.trim().toLowerCase();
    const country = await this.prisma.country.findFirst({
      where: {
        slug: normalizedSlug,
        coverageStatus: { not: CountryCoverageStatus.ARCHIVED },
      },
      include: {
        visaServices: {
          where: {
            publicationStatus: VisaPublicationStatus.PUBLISHED,
          },
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
          include: {
            requirements: {
              orderBy: { displayOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!country) {
      throw new NotFoundException(
        `Destination country '${normalizedSlug}' not found or not available`,
      );
    }

    return country;
  }

  async findAdminAll(query: CountryQueryDto) {
    const { where, skip, take, orderBy, page, limit } = buildPrismaQuery({
      query,
      searchableFields: COUNTRY_SEARCHABLE_FIELDS,
      exactFilterFields: ['coverageStatus', 'isFeatured'],
      allowedSortFields: COUNTRY_ALLOWED_SORT_FIELDS,
      defaultSortBy: 'displayOrder',
      defaultSortOrder: 'asc',
    });

    const [total, data] = await Promise.all([
      this.prisma.country.count({ where }),
      this.prisma.country.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          _count: {
            select: {
              visaServices: true,
              visaInquiries: true,
            },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findAdminOne(id: string) {
    const country = await this.prisma.country.findUnique({
      where: { id },
      include: {
        visaServices: {
          orderBy: [{ displayOrder: 'asc' }, { createdAt: 'desc' }],
          include: {
            _count: { select: { requirements: true, inquiries: true } },
          },
        },
        _count: {
          select: {
            visaServices: true,
            visaInquiries: true,
          },
        },
      },
    });

    if (!country) {
      throw new NotFoundException(`Country with ID ${id} not found`);
    }

    return country;
  }

  async update(id: string, dto: UpdateCountryDto, actorId: string) {
    const current = await this.findAdminOne(id);

    const data: Record<string, unknown> = {};
    if (dto.name !== undefined) data['name'] = dto.name.trim();
    if (dto.isoCode !== undefined)
      data['isoCode'] = dto.isoCode.trim().toUpperCase();
    if (dto.slug !== undefined) data['slug'] = slugifyText(dto.slug);
    if (dto.flagEmoji !== undefined)
      data['flagEmoji'] = dto.flagEmoji?.trim() || null;
    if (dto.flagUrl !== undefined) data['flagUrl'] = dto.flagUrl?.trim() || null;
    if (dto.coverImageUrl !== undefined)
      data['coverImageUrl'] = dto.coverImageUrl?.trim() || null;
    if (dto.shortIntro !== undefined)
      data['shortIntro'] = dto.shortIntro.trim();
    if (dto.detailedDescription !== undefined)
      data['detailedDescription'] = dto.detailedDescription?.trim() || null;
    if (dto.coverageStatus !== undefined)
      data['coverageStatus'] = dto.coverageStatus;
    if (dto.isFeatured !== undefined) data['isFeatured'] = dto.isFeatured;
    if (dto.displayOrder !== undefined) data['displayOrder'] = dto.displayOrder;
    if (dto.seoTitle !== undefined)
      data['seoTitle'] = dto.seoTitle?.trim() || null;
    if (dto.seoDescription !== undefined)
      data['seoDescription'] = dto.seoDescription?.trim() || null;

    const updated = await this.prisma.country.update({
      where: { id },
      data,
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'COUNTRY_UPDATED',
        entityType: 'Country',
        entityId: id,
        metadata: {
          before: {
            name: current.name,
            coverageStatus: current.coverageStatus,
            isFeatured: current.isFeatured,
          },
          after: {
            name: updated.name,
            coverageStatus: updated.coverageStatus,
            isFeatured: updated.isFeatured,
          },
        },
      },
    });

    return updated;
  }

  async softArchive(id: string, actorId: string) {
    const current = await this.findAdminOne(id);

    const updated = await this.prisma.country.update({
      where: { id },
      data: {
        coverageStatus: CountryCoverageStatus.ARCHIVED,
        isFeatured: false,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'COUNTRY_ARCHIVED',
        entityType: 'Country',
        entityId: id,
        metadata: {
          name: current.name,
          isoCode: current.isoCode,
        },
      },
    });

    return {
      message: 'Country soft-archived successfully',
      id: updated.id,
      coverageStatus: updated.coverageStatus,
    };
  }
}

