import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateFollowUpDto } from './dto/create-follow-up.dto.js';
import { UpdateFollowUpDto } from './dto/update-follow-up.dto.js';
import { FollowUpStatus } from '../../generated/prisma/client.js';

@Injectable()
export class FollowUpsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(leadId: string, dto: CreateFollowUpDto, actorId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    const assignedToId = dto.assignedToId || actorId;

    const task = await this.prisma.followUpTask.create({
      data: {
        leadId,
        assignedToId,
        title: dto.title.trim(),
        note: dto.note?.trim(),
        dueAt: new Date(dto.dueAt),
        status: FollowUpStatus.OPEN,
      },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'FOLLOW_UP_CREATED',
        entityType: 'FollowUpTask',
        entityId: task.id,
        metadata: {
          leadId,
          title: task.title,
          dueAt: task.dueAt,
          assignedToId,
        },
      },
    });

    return task;
  }

  async findByLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    return this.prisma.followUpTask.findMany({
      where: { leadId },
      orderBy: { dueAt: 'asc' },
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async update(id: string, dto: UpdateFollowUpDto, actorId: string) {
    const existing = await this.prisma.followUpTask.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Follow-up task with ID ${id} not found`);
    }

    const data: Record<string, unknown> = {};
    if (dto.status !== undefined) {
      data['status'] = dto.status;
      if (dto.status === FollowUpStatus.DONE) {
        data['completedAt'] = new Date();
      }
    }
    if (dto.note !== undefined) data['note'] = dto.note?.trim();
    if (dto.dueAt !== undefined) data['dueAt'] = new Date(dto.dueAt);

    const updated = await this.prisma.followUpTask.update({
      where: { id },
      data,
      include: {
        assignedTo: { select: { id: true, name: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'FOLLOW_UP_UPDATED',
        entityType: 'FollowUpTask',
        entityId: id,
        metadata: {
          before: { status: existing.status, dueAt: existing.dueAt },
          after: { status: updated.status, dueAt: updated.dueAt },
        },
      },
    });

    return updated;
  }
}

