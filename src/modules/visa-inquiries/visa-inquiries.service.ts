import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateVisaInquiryDto } from './dto/create-visa-inquiry.dto.js';
import {
  VISA_INQUIRY_ALLOWED_SORT_FIELDS,
  VISA_INQUIRY_SEARCHABLE_FIELDS,
  VisaInquiryQueryDto,
} from './dto/visa-inquiry-query.dto.js';
import {
  buildPrismaQuery,
  createPaginatedResponse,
} from '../../common/utils/query-builder.util.js';
import {
  buildDefaultDocumentChecklist,
  buildDefaultMilestoneChecklist,
  generateTrackingCode,
  type SectorCategoryKey,
} from '../../common/utils/sector-templates.util.js';
import {
  AgencyServiceStatus,
  CountryCoverageStatus,
  LeadSource,
  LeadStage,
  ServiceCategory,
  VisaCategory,
  VisaPublicationStatus,
} from '../../generated/prisma/client.js';

export function mapVisaCategoryToLeadSector(
  visaCategory: VisaCategory,
): ServiceCategory {
  switch (visaCategory) {
    case VisaCategory.WORK_VISA:
    case VisaCategory.WORK_PERMIT:
      return ServiceCategory.WORK_PERMIT;
    case VisaCategory.STUDENT_VISA:
      return ServiceCategory.STUDENT_VISA;
    case VisaCategory.TOURIST_VISA:
    case VisaCategory.BUSINESS_VISA:
    case VisaCategory.OTHER:
    default:
      return ServiceCategory.TOUR;
  }
}

@Injectable()
export class VisaInquiriesService {
  constructor(private readonly prisma: PrismaService) {}

  async submitPublicInquiry(dto: CreateVisaInquiryDto) {
    if (dto.consentGiven !== true) {
      throw new BadRequestException(
        'Explicit consent acknowledgement is required to submit a visa inquiry.',
      );
    }

    const country = await this.prisma.country.findUnique({
      where: { id: dto.countryId },
    });

    if (!country || country.coverageStatus === CountryCoverageStatus.ARCHIVED) {
      throw new NotFoundException('Selected destination country was not found');
    }

    if (country.coverageStatus === CountryCoverageStatus.PAUSED) {
      throw new ConflictException(
        `Inquiries for ${country.name} are currently paused by the agency`,
      );
    }

    let visaService: {
      id: string;
      title: string;
      category: VisaCategory;
      serviceStatus: AgencyServiceStatus;
      publicationStatus: VisaPublicationStatus;
      requirements: Array<{ title: string; isMandatory: boolean }>;
    } | null = null;

    if (dto.visaServiceId) {
      const foundService = await this.prisma.visaService.findFirst({
        where: {
          id: dto.visaServiceId,
          countryId: country.id,
        },
        include: {
          requirements: { orderBy: { displayOrder: 'asc' } },
        },
      });

      if (
        !foundService ||
        foundService.publicationStatus !== VisaPublicationStatus.PUBLISHED
      ) {
        throw new NotFoundException(
          'Selected visa service offering is not available publicly',
        );
      }

      if (
        foundService.serviceStatus === AgencyServiceStatus.TEMPORARILY_PAUSED ||
        foundService.serviceStatus === AgencyServiceStatus.NOT_OFFERED
      ) {
        throw new ConflictException(
          `The agency is not currently accepting new inquiries for '${foundService.title}'`,
        );
      }

      visaService = foundService;
    }

    const resolvedCategory =
      visaService?.category ?? dto.category ?? VisaCategory.TOURIST_VISA;
    const leadSector = mapVisaCategoryToLeadSector(resolvedCategory);
    const sectorKey = leadSector as SectorCategoryKey;

    const fullName = dto.fullName.trim();
    const phone = dto.phone.trim();
    const email = dto.email?.toLowerCase().trim() || null;
    const message = dto.message?.trim() || null;

    const customReqTitles =
      visaService?.requirements && visaService.requirements.length > 0
        ? visaService.requirements.map((r) => r.title)
        : undefined;

    const result = await this.prisma.$transaction(async (tx) => {
      // Check if an active NEW/QUALIFIED lead already exists for this phone + country
      const existingLead = await tx.lead.findFirst({
        where: {
          customerPhone: phone,
          destination: { equals: country.name, mode: 'insensitive' },
          stage: { in: [LeadStage.NEW, LeadStage.QUALIFIED] },
        },
        orderBy: { createdAt: 'desc' },
      });

      const inquiryContextSummary = [
        `[Visa Inquiry: ${country.name} — ${visaService?.title || resolvedCategory}]`,
        message ? `Customer Message: ${message}` : null,
      ]
        .filter(Boolean)
        .join('\n');

      const lead = existingLead
        ? await tx.lead.update({
            where: { id: existingLead.id },
            data: {
              requirements: existingLead.requirements
                ? `${existingLead.requirements}\n\n${inquiryContextSummary}`
                : inquiryContextSummary,
            },
          })
        : await tx.lead.create({
            data: {
              trackingCode: generateTrackingCode(sectorKey),
              category: leadSector,
              customerName: fullName,
              customerPhone: phone,
              customerEmail: email,
              source: dto.source ?? LeadSource.WEBSITE,
              destination: country.name,
              requirements: inquiryContextSummary,
              stage: LeadStage.NEW,
              eligibilityStatus: 'CONDITIONAL_MATCH',
              documentChecklist: buildDefaultDocumentChecklist(
                sectorKey,
                customReqTitles,
              ) as any,
              milestoneChecklist: buildDefaultMilestoneChecklist(
                sectorKey,
              ) as any,
              metadata: {
                countryId: country.id,
                countryName: country.name,
                visaServiceId: visaService?.id ?? null,
                visaServiceTitle: visaService?.title ?? null,
                visaCategory: resolvedCategory,
              } as any,
            },
          });

      const inquiry = await tx.visaInquiry.create({
        data: {
          leadId: lead.id,
          countryId: country.id,
          visaServiceId: visaService?.id ?? null,
          category: resolvedCategory,
          fullName,
          phone,
          email,
          message,
          consentGiven: true,
          source: dto.source ?? LeadSource.WEBSITE,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'VISA_INQUIRY_SUBMITTED',
          entityType: 'VisaInquiry',
          entityId: inquiry.id,
          metadata: {
            leadId: lead.id,
            trackingCode: lead.trackingCode,
            country: country.name,
            visaService: visaService?.title ?? null,
            category: resolvedCategory,
          },
        },
      });

      return { inquiry, lead };
    });

    return {
      id: result.inquiry.id,
      leadId: result.lead.id,
      trackingCode: result.lead.trackingCode,
      countryName: country.name,
      serviceTitle: visaService?.title ?? resolvedCategory,
      category: resolvedCategory,
      createdAt: result.inquiry.createdAt,
      message:
        'Your visa consultation inquiry has been received. A counselor will review your request shortly.',
    };
  }

  async findAdminAll(query: VisaInquiryQueryDto) {
    const { where, skip, take, orderBy, page, limit } = buildPrismaQuery({
      query,
      searchableFields: VISA_INQUIRY_SEARCHABLE_FIELDS,
      exactFilterFields: ['countryId', 'visaServiceId', 'category'],
      allowedSortFields: VISA_INQUIRY_ALLOWED_SORT_FIELDS,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });

    const [total, data] = await Promise.all([
      this.prisma.visaInquiry.count({ where }),
      this.prisma.visaInquiry.findMany({
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
            },
          },
          visaService: {
            select: {
              id: true,
              title: true,
              slug: true,
              category: true,
              serviceStatus: true,
            },
          },
          lead: {
            select: {
              id: true,
              trackingCode: true,
              stage: true,
              assignedTo: { select: { id: true, name: true, email: true } },
            },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findAdminOne(id: string) {
    const inquiry = await this.prisma.visaInquiry.findUnique({
      where: { id },
      include: {
        country: true,
        visaService: {
          include: {
            requirements: { orderBy: { displayOrder: 'asc' } },
          },
        },
        lead: {
          include: {
            assignedTo: { select: { id: true, name: true, email: true } },
            notes: { orderBy: { createdAt: 'desc' }, take: 5 },
          },
        },
      },
    });

    if (!inquiry) {
      throw new NotFoundException(`Visa inquiry with ID ${id} not found`);
    }

    return inquiry;
  }
}

