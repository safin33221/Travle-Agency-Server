import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import {
  CreateVisaServiceDto,
  DEFAULT_VISA_DISCLAIMER,
} from './dto/create-visa-service.dto.js';
import { UpdateVisaServiceDto } from './dto/update-visa-service.dto.js';
import {
  VISA_SERVICE_ALLOWED_SORT_FIELDS,
  VISA_SERVICE_SEARCHABLE_FIELDS,
  VisaServiceQueryDto,
} from './dto/visa-service-query.dto.js';
import {
  buildPrismaQuery,
  createPaginatedResponse,
} from '../../common/utils/query-builder.util.js';
import { slugifyText } from '../countries/countries.service.js';
import {
  AgencyServiceStatus,
  CountryCoverageStatus,
  ServiceCategory,
  VisaPublicationStatus,
} from '../../generated/prisma/client.js';

@Injectable()
export class VisaServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async getAdminOverview() {
    const [
      totalCountries,
      countriesWithPublishedServices,
      publishedServicesCount,
      acceptingInquiriesCount,
      pausedServicesCount,
      visaInquiriesCount,
      visaLeadsCount,
    ] = await Promise.all([
      this.prisma.country.count({
        where: { coverageStatus: { not: CountryCoverageStatus.ARCHIVED } },
      }),
      this.prisma.country.count({
        where: {
          coverageStatus: { not: CountryCoverageStatus.ARCHIVED },
          visaServices: {
            some: { publicationStatus: VisaPublicationStatus.PUBLISHED },
          },
        },
      }),
      this.prisma.visaService.count({
        where: { publicationStatus: VisaPublicationStatus.PUBLISHED },
      }),
      this.prisma.visaService.count({
        where: {
          publicationStatus: VisaPublicationStatus.PUBLISHED,
          serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
        },
      }),
      this.prisma.visaService.count({
        where: {
          serviceStatus: AgencyServiceStatus.TEMPORARILY_PAUSED,
          publicationStatus: { not: VisaPublicationStatus.ARCHIVED },
        },
      }),
      this.prisma.visaInquiry.count(),
      this.prisma.lead.count({
        where: {
          OR: [
            {
              category: {
                in: [ServiceCategory.WORK_PERMIT, ServiceCategory.STUDENT_VISA],
              },
            },
            { visaInquiries: { some: {} } },
          ],
        },
      }),
    ]);

    return {
      totalCountries,
      countriesWithPublishedServices,
      publishedServicesCount,
      acceptingInquiriesCount,
      pausedServicesCount,
      visaInquiriesCount,
      visaLeadsCount,
    };
  }

  async create(dto: CreateVisaServiceDto, actorId: string) {
    const country = await this.prisma.country.findUnique({
      where: { id: dto.countryId },
    });
    if (!country) {
      throw new NotFoundException(`Country with ID ${dto.countryId} not found`);
    }

    const title = dto.title.trim();
    const slug = slugifyText(dto.slug || title);

    const existing = await this.prisma.visaService.findUnique({
      where: {
        countryId_slug: {
          countryId: dto.countryId,
          slug,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `A visa service with slug '${slug}' already exists for ${country.name}`,
      );
    }

    const service = await this.prisma.visaService.create({
      data: {
        countryId: dto.countryId,
        category: dto.category,
        customCategoryLabel: dto.customCategoryLabel?.trim() || null,
        title,
        slug,
        shortDescription: dto.shortDescription.trim(),
        fullDescription: dto.fullDescription.trim(),
        eligibilityInfo: dto.eligibilityInfo?.trim() || null,
        applicationProcessSteps: dto.applicationProcessSteps ?? [],
        estimatedProcessingTime: dto.estimatedProcessingTime?.trim() || null,
        agencyServiceFee: dto.agencyServiceFee ?? null,
        governmentFeeInfo: dto.governmentFeeInfo?.trim() || null,
        currency: dto.currency?.toUpperCase().trim() || 'BDT',
        importantNotes: dto.importantNotes?.trim() || null,
        disclaimer: dto.disclaimer?.trim() || DEFAULT_VISA_DISCLAIMER,
        informationSourceUrl: dto.informationSourceUrl?.trim() || null,
        lastVerifiedAt: dto.lastVerifiedAt
          ? new Date(dto.lastVerifiedAt)
          : new Date(),
        displayOrder: dto.displayOrder ?? 0,
        isFeatured: dto.isFeatured ?? false,
        publicationStatus:
          dto.publicationStatus ?? VisaPublicationStatus.DRAFT,
        serviceStatus:
          dto.serviceStatus ?? AgencyServiceStatus.ACCEPTING_INQUIRIES,
        seoTitle: dto.seoTitle?.trim() || null,
        seoDescription: dto.seoDescription?.trim() || null,
        createdById: actorId,
        updatedById: actorId,
        requirements:
          dto.requirements && dto.requirements.length > 0
            ? {
                create: dto.requirements.map((req, idx) => ({
                  title: req.title.trim(),
                  description: req.description?.trim() || null,
                  isMandatory: req.isMandatory ?? true,
                  displayOrder: req.displayOrder ?? idx,
                })),
              }
            : undefined,
      },
      include: {
        country: { select: { id: true, name: true, slug: true, isoCode: true, flagEmoji: true } },
        requirements: { orderBy: { displayOrder: 'asc' } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'VISA_SERVICE_CREATED',
        entityType: 'VisaService',
        entityId: service.id,
        metadata: {
          title: service.title,
          country: country.name,
          category: service.category,
          publicationStatus: service.publicationStatus,
          serviceStatus: service.serviceStatus,
        },
      },
    });

    return service;
  }

  async findPublicAll(query: VisaServiceQueryDto) {
    const baseWhere: Record<string, unknown> = {
      publicationStatus: VisaPublicationStatus.PUBLISHED,
      country: {
        coverageStatus: { not: CountryCoverageStatus.ARCHIVED },
        ...(query.countrySlug
          ? { slug: query.countrySlug.trim().toLowerCase() }
          : {}),
      },
    };

    const { where, skip, take, orderBy, page, limit } = buildPrismaQuery({
      query,
      searchableFields: VISA_SERVICE_SEARCHABLE_FIELDS,
      exactFilterFields: ['countryId', 'category', 'serviceStatus', 'isFeatured'],
      allowedSortFields: VISA_SERVICE_ALLOWED_SORT_FIELDS,
      defaultSortBy: 'displayOrder',
      defaultSortOrder: 'asc',
      baseWhere,
    });

    const [total, data] = await Promise.all([
      this.prisma.visaService.count({ where }),
      this.prisma.visaService.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          country: {
            select: {
              id: true,
              name: true,
              slug: true,
              isoCode: true,
              flagEmoji: true,
              flagUrl: true,
              coverageStatus: true,
            },
          },
          requirements: {
            orderBy: { displayOrder: 'asc' },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findPublicByCountryAndServiceSlug(
    countrySlug: string,
    serviceSlug: string,
  ) {
    const normalizedCountrySlug = countrySlug.trim().toLowerCase();
    const normalizedServiceSlug = serviceSlug.trim().toLowerCase();

    const service = await this.prisma.visaService.findFirst({
      where: {
        slug: normalizedServiceSlug,
        publicationStatus: VisaPublicationStatus.PUBLISHED,
        country: {
          slug: normalizedCountrySlug,
          coverageStatus: { not: CountryCoverageStatus.ARCHIVED },
        },
      },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            slug: true,
            isoCode: true,
            flagEmoji: true,
            flagUrl: true,
            shortIntro: true,
            coverageStatus: true,
          },
        },
        requirements: {
          orderBy: { displayOrder: 'asc' },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(
        `Published visa service '${normalizedServiceSlug}' for '${normalizedCountrySlug}' not found`,
      );
    }

    const relatedServices = await this.prisma.visaService.findMany({
      where: {
        countryId: service.countryId,
        id: { not: service.id },
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
      },
    });

    return {
      ...service,
      relatedServices,
    };
  }

  async findAdminAll(query: VisaServiceQueryDto) {
    const { where, skip, take, orderBy, page, limit } = buildPrismaQuery({
      query,
      searchableFields: VISA_SERVICE_SEARCHABLE_FIELDS,
      exactFilterFields: [
        'countryId',
        'category',
        'serviceStatus',
        'publicationStatus',
        'isFeatured',
      ],
      allowedSortFields: VISA_SERVICE_ALLOWED_SORT_FIELDS,
      defaultSortBy: 'displayOrder',
      defaultSortOrder: 'asc',
    });

    const [total, data] = await Promise.all([
      this.prisma.visaService.count({ where }),
      this.prisma.visaService.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          country: {
            select: {
              id: true,
              name: true,
              slug: true,
              isoCode: true,
              flagEmoji: true,
              coverageStatus: true,
            },
          },
          _count: {
            select: {
              requirements: true,
              inquiries: true,
            },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findAdminOne(id: string) {
    const service = await this.prisma.visaService.findUnique({
      where: { id },
      include: {
        country: {
          select: {
            id: true,
            name: true,
            slug: true,
            isoCode: true,
            flagEmoji: true,
            coverageStatus: true,
          },
        },
        requirements: {
          orderBy: { displayOrder: 'asc' },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        updatedBy: { select: { id: true, name: true, email: true } },
        _count: {
          select: { inquiries: true },
        },
      },
    });

    if (!service) {
      throw new NotFoundException(`Visa service with ID ${id} not found`);
    }

    return service;
  }

  async update(id: string, dto: UpdateVisaServiceDto, actorId: string) {
    const current = await this.findAdminOne(id);

    const data: Record<string, unknown> = {
      updatedById: actorId,
    };

    if (dto.countryId !== undefined) data['countryId'] = dto.countryId;
    if (dto.category !== undefined) data['category'] = dto.category;
    if (dto.customCategoryLabel !== undefined)
      data['customCategoryLabel'] = dto.customCategoryLabel?.trim() || null;
    if (dto.title !== undefined) data['title'] = dto.title.trim();
    if (dto.slug !== undefined) data['slug'] = slugifyText(dto.slug);
    if (dto.shortDescription !== undefined)
      data['shortDescription'] = dto.shortDescription.trim();
    if (dto.fullDescription !== undefined)
      data['fullDescription'] = dto.fullDescription.trim();
    if (dto.eligibilityInfo !== undefined)
      data['eligibilityInfo'] = dto.eligibilityInfo?.trim() || null;
    if (dto.applicationProcessSteps !== undefined)
      data['applicationProcessSteps'] = dto.applicationProcessSteps;
    if (dto.estimatedProcessingTime !== undefined)
      data['estimatedProcessingTime'] =
        dto.estimatedProcessingTime?.trim() || null;
    if (dto.agencyServiceFee !== undefined)
      data['agencyServiceFee'] = dto.agencyServiceFee;
    if (dto.governmentFeeInfo !== undefined)
      data['governmentFeeInfo'] = dto.governmentFeeInfo?.trim() || null;
    if (dto.currency !== undefined)
      data['currency'] = dto.currency.toUpperCase().trim();
    if (dto.importantNotes !== undefined)
      data['importantNotes'] = dto.importantNotes?.trim() || null;
    if (dto.disclaimer !== undefined)
      data['disclaimer'] = dto.disclaimer?.trim() || DEFAULT_VISA_DISCLAIMER;
    if (dto.informationSourceUrl !== undefined)
      data['informationSourceUrl'] = dto.informationSourceUrl?.trim() || null;
    if (dto.lastVerifiedAt !== undefined) {
      data['lastVerifiedAt'] = dto.lastVerifiedAt
        ? new Date(dto.lastVerifiedAt)
        : null;
    }
    if (dto.displayOrder !== undefined) data['displayOrder'] = dto.displayOrder;
    if (dto.isFeatured !== undefined) data['isFeatured'] = dto.isFeatured;
    if (dto.publicationStatus !== undefined)
      data['publicationStatus'] = dto.publicationStatus;
    if (dto.serviceStatus !== undefined)
      data['serviceStatus'] = dto.serviceStatus;
    if (dto.seoTitle !== undefined)
      data['seoTitle'] = dto.seoTitle?.trim() || null;
    if (dto.seoDescription !== undefined)
      data['seoDescription'] = dto.seoDescription?.trim() || null;

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.requirements !== undefined) {
        await tx.visaServiceRequirement.deleteMany({
          where: { visaServiceId: id },
        });
        if (dto.requirements.length > 0) {
          await tx.visaServiceRequirement.createMany({
            data: dto.requirements.map((req, idx) => ({
              visaServiceId: id,
              title: req.title.trim(),
              description: req.description?.trim() || null,
              isMandatory: req.isMandatory ?? true,
              displayOrder: req.displayOrder ?? idx,
            })),
          });
        }
      }

      return tx.visaService.update({
        where: { id },
        data,
        include: {
          country: {
            select: {
              id: true,
              name: true,
              slug: true,
              isoCode: true,
              flagEmoji: true,
            },
          },
          requirements: { orderBy: { displayOrder: 'asc' } },
        },
      });
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'VISA_SERVICE_UPDATED',
        entityType: 'VisaService',
        entityId: id,
        metadata: {
          before: {
            title: current.title,
            publicationStatus: current.publicationStatus,
            serviceStatus: current.serviceStatus,
          },
          after: {
            title: updated.title,
            publicationStatus: updated.publicationStatus,
            serviceStatus: updated.serviceStatus,
          },
        },
      },
    });

    return updated;
  }

  async softArchive(id: string, actorId: string) {
    const current = await this.findAdminOne(id);

    const updated = await this.prisma.visaService.update({
      where: { id },
      data: {
        publicationStatus: VisaPublicationStatus.ARCHIVED,
        serviceStatus: AgencyServiceStatus.NOT_OFFERED,
        isFeatured: false,
        updatedById: actorId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'VISA_SERVICE_ARCHIVED',
        entityType: 'VisaService',
        entityId: id,
        metadata: {
          title: current.title,
          country: current.country.name,
        },
      },
    });

    return {
      message: 'Visa service soft-archived successfully',
      id: updated.id,
      publicationStatus: updated.publicationStatus,
      serviceStatus: updated.serviceStatus,
    };
  }
}

