import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import {
  LEAD_ALLOWED_SORT_FIELDS,
  LEAD_SEARCHABLE_FIELDS,
  LeadQueryDto,
} from './dto/lead-query.dto.js';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto.js';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';
import {
  buildPrismaQuery,
  createPaginatedResponse,
} from '../../common/utils/query-builder.util.js';
import {
  buildDefaultDocumentChecklist,
  buildDefaultMilestoneChecklist,
  evaluateLeadEligibility,
  generateTrackingCode,
  type SectorCategoryKey,
} from '../../common/utils/sector-templates.util.js';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createLeadDto: CreateLeadDto, actorId?: string) {
    const assignedToId = createLeadDto.assignedToId || actorId || null;
    const category = (createLeadDto.category ?? 'TOUR') as SectorCategoryKey;
    const trackingCode = generateTrackingCode(category);
    const eligibility = evaluateLeadEligibility(
      category,
      createLeadDto.metadata,
      createLeadDto.budget,
    );
    const documentChecklist =
      createLeadDto.documentChecklist &&
      createLeadDto.documentChecklist.length > 0
        ? createLeadDto.documentChecklist
        : buildDefaultDocumentChecklist(category);
    const milestoneChecklist = buildDefaultMilestoneChecklist(category);

    const lead = await this.prisma.lead.create({
      data: {
        trackingCode,
        category: createLeadDto.category ?? 'TOUR',
        customerName: createLeadDto.customerName.trim(),
        customerPhone: createLeadDto.customerPhone?.trim(),
        customerEmail: createLeadDto.customerEmail?.toLowerCase().trim(),
        source: createLeadDto.source,
        destination: createLeadDto.destination?.trim(),
        travelStartDate: createLeadDto.travelStartDate
          ? new Date(createLeadDto.travelStartDate)
          : null,
        travelEndDate: createLeadDto.travelEndDate
          ? new Date(createLeadDto.travelEndDate)
          : null,
        travelerCount: createLeadDto.travelerCount,
        budget: createLeadDto.budget,
        requirements: createLeadDto.requirements?.trim(),
        stage: createLeadDto.stage,
        eligibilityStatus: eligibility.status,
        documentChecklist: documentChecklist as any,
        milestoneChecklist: milestoneChecklist as any,
        metadata: (createLeadDto.metadata ?? {
          eligibilitySummary: eligibility.summary,
          eligibilityReasons: eligibility.reasons,
          eligibilityScore: eligibility.score,
        }) as any,
        assignedToId,
      },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: actorId ?? null,
        action: 'LEAD_CREATED',
        entityType: 'Lead',
        entityId: lead.id,
        metadata: {
          trackingCode: lead.trackingCode,
          category: lead.category,
          customerName: lead.customerName,
          source: lead.source,
          stage: lead.stage,
          eligibilityStatus: lead.eligibilityStatus,
          assignedToId: lead.assignedToId,
        },
      },
    });

    return lead;
  }

  async createPublicInquiry(createLeadDto: CreateLeadDto) {
    const category = (createLeadDto.category ?? 'TOUR') as SectorCategoryKey;
    const eligibility = evaluateLeadEligibility(
      category,
      createLeadDto.metadata,
      createLeadDto.budget,
    );

    createLeadDto.source = createLeadDto.source ?? 'WEBSITE';
    createLeadDto.metadata = {
      ...createLeadDto.metadata,
      eligibilitySummary: eligibility.summary,
      eligibilityReasons: eligibility.reasons,
      eligibilityScore: eligibility.score,
    };

    const lead = await this.create(createLeadDto);

    return {
      trackingCode: lead.trackingCode,
      category: lead.category,
      customerName: lead.customerName,
      destination: lead.destination,
      stage: lead.stage,
      eligibility,
      milestoneChecklist: lead.milestoneChecklist,
      documentChecklist: lead.documentChecklist,
      createdAt: lead.createdAt,
    };
  }

  async trackPublicStatus(trackingCode: string) {
    const normalizedCode = trackingCode.trim().toUpperCase();
    const lead = await this.prisma.lead.findFirst({
      where: { trackingCode: normalizedCode },
    });

    if (!lead) {
      throw new NotFoundException(
        `No application or file found with tracking code ${normalizedCode}`,
      );
    }

    return {
      trackingCode: lead.trackingCode,
      category: lead.category,
      customerName: lead.customerName,
      destination: lead.destination,
      stage: lead.stage,
      eligibilityStatus: lead.eligibilityStatus,
      milestoneChecklist: lead.milestoneChecklist ?? [],
      documentChecklist: lead.documentChecklist ?? [],
      updatedAt: lead.updatedAt,
      createdAt: lead.createdAt,
    };
  }

  async findAll(query: LeadQueryDto, _user: AuthenticatedUser) {
    const { where, skip, take, orderBy, page, limit } = buildPrismaQuery({
      query,
      searchableFields: LEAD_SEARCHABLE_FIELDS,
      exactFilterFields: [
        'category',
        'eligibilityStatus',
        'stage',
        'source',
        'assignedToId',
      ],
      partialFilterFields: ['destination'],
      numericRanges: [
        {
          field: 'budget',
          min: query.minBudget,
          max: query.maxBudget,
        },
      ],
      dateRanges: [
        {
          field: 'travelStartDate',
          from: query.travelFrom,
          to: query.travelTo,
        },
        {
          field: 'createdAt',
          from: query.createdFrom,
          to: query.createdTo,
        },
      ],
      allowedSortFields: LEAD_ALLOWED_SORT_FIELDS,
      defaultSortBy: 'createdAt',
      defaultSortOrder: 'desc',
    });

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy,
        include: {
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: {
              notes: true,
              quotations: true,
              followUpTasks: true,
            },
          },
        },
      }),
    ]);

    return createPaginatedResponse(data, total, page, limit);
  }

  async findOne(id: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id },
      include: {
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        notes: {
          orderBy: { createdAt: 'desc' },
          include: {
            author: { select: { id: true, name: true } },
          },
        },
        followUpTasks: {
          orderBy: { dueAt: 'asc' },
          include: {
            assignedTo: { select: { id: true, name: true } },
          },
        },
        quotations: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            quoteNumber: true,
            revision: true,
            status: true,
            grandTotal: true,
            currency: true,
            validUntil: true,
            createdAt: true,
          },
        },
      },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${id} not found`);
    }

    return lead;
  }

  async update(id: string, updateLeadDto: UpdateLeadDto, actorId: string) {
    const current = await this.findOne(id);

    const data: Record<string, unknown> = {};
    if (updateLeadDto.category !== undefined) data['category'] = updateLeadDto.category;
    if (updateLeadDto.customerName !== undefined) data['customerName'] = updateLeadDto.customerName.trim();
    if (updateLeadDto.customerPhone !== undefined) data['customerPhone'] = updateLeadDto.customerPhone?.trim();
    if (updateLeadDto.customerEmail !== undefined) data['customerEmail'] = updateLeadDto.customerEmail?.toLowerCase().trim();
    if (updateLeadDto.source !== undefined) data['source'] = updateLeadDto.source;
    if (updateLeadDto.destination !== undefined) data['destination'] = updateLeadDto.destination?.trim();
    if (updateLeadDto.travelStartDate !== undefined) {
      data['travelStartDate'] = updateLeadDto.travelStartDate ? new Date(updateLeadDto.travelStartDate) : null;
    }
    if (updateLeadDto.travelEndDate !== undefined) {
      data['travelEndDate'] = updateLeadDto.travelEndDate ? new Date(updateLeadDto.travelEndDate) : null;
    }
    if (updateLeadDto.travelerCount !== undefined) data['travelerCount'] = updateLeadDto.travelerCount;
    if (updateLeadDto.budget !== undefined) data['budget'] = updateLeadDto.budget;
    if (updateLeadDto.requirements !== undefined) data['requirements'] = updateLeadDto.requirements?.trim();
    if (updateLeadDto.stage !== undefined) data['stage'] = updateLeadDto.stage;
    if (updateLeadDto.assignedToId !== undefined) data['assignedToId'] = updateLeadDto.assignedToId;
    if (updateLeadDto.eligibilityStatus !== undefined) data['eligibilityStatus'] = updateLeadDto.eligibilityStatus;
    if (updateLeadDto.documentChecklist !== undefined) data['documentChecklist'] = updateLeadDto.documentChecklist;
    if (updateLeadDto.milestoneChecklist !== undefined) data['milestoneChecklist'] = updateLeadDto.milestoneChecklist;
    if (updateLeadDto.metadata !== undefined) data['metadata'] = updateLeadDto.metadata;

    const updated = await this.prisma.lead.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'LEAD_UPDATED',
        entityType: 'Lead',
        entityId: id,
        metadata: {
          before: { stage: current.stage, assignedToId: current.assignedToId },
          after: { stage: updated.stage, assignedToId: updated.assignedToId },
        },
      },
    });

    return updated;
  }

  async addNote(leadId: string, createNoteDto: CreateLeadNoteDto, authorId: string) {
    await this.findOne(leadId);

    const note = await this.prisma.leadNote.create({
      data: {
        leadId,
        authorId,
        content: createNoteDto.content.trim(),
      },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return note;
  }

  async getNotes(leadId: string) {
    await this.findOne(leadId);

    return this.prisma.leadNote.findMany({
      where: { leadId },
      orderBy: { createdAt: 'desc' },
      include: {
        author: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }
}
