import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateLeadDto } from './dto/create-lead.dto.js';
import { UpdateLeadDto } from './dto/update-lead.dto.js';
import { LeadQueryDto } from './dto/lead-query.dto.js';
import { CreateLeadNoteDto } from './dto/create-lead-note.dto.js';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator.js';

@Injectable()
export class LeadsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createLeadDto: CreateLeadDto, actorId: string) {
    const assignedToId = createLeadDto.assignedToId || actorId;

    const lead = await this.prisma.lead.create({
      data: {
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
        actorId,
        action: 'LEAD_CREATED',
        entityType: 'Lead',
        entityId: lead.id,
        metadata: {
          customerName: lead.customerName,
          source: lead.source,
          stage: lead.stage,
          assignedToId: lead.assignedToId,
        },
      },
    });

    return lead;
  }

  async findAll(query: LeadQueryDto, _user: AuthenticatedUser) {
    const { page, limit, stage, source, assignedToId, search } = query;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (stage) where['stage'] = stage;
    if (source) where['source'] = source;
    if (assignedToId) where['assignedToId'] = assignedToId;

    if (search) {
      where['OR'] = [
        { customerName: { contains: search.trim(), mode: 'insensitive' } },
        { customerPhone: { contains: search.trim(), mode: 'insensitive' } },
        { customerEmail: { contains: search.trim(), mode: 'insensitive' } },
        { destination: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
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
