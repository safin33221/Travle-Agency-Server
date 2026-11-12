import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { FollowUpStatus, LeadStage, QuotationStatus } from '../../generated/prisma/client.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();

    const [
      newLeads,
      qualifiedLeads,
      quotedLeads,
      followUpLeads,
      wonLeads,
      lostLeads,
      totalLeads,
      draftQuotes,
      approvedQuotes,
      activePackages,
      openFollowUps,
      overdueFollowUps,
      wonRevenueRaw,
      upcomingTasks,
    ] = await Promise.all([
      this.prisma.lead.count({ where: { stage: LeadStage.NEW } }),
      this.prisma.lead.count({ where: { stage: LeadStage.QUALIFIED } }),
      this.prisma.lead.count({ where: { stage: LeadStage.QUOTED } }),
      this.prisma.lead.count({ where: { stage: LeadStage.FOLLOW_UP } }),
      this.prisma.lead.count({ where: { stage: LeadStage.WON } }),
      this.prisma.lead.count({ where: { stage: LeadStage.LOST } }),
      this.prisma.lead.count(),
      this.prisma.quotation.count({ where: { status: QuotationStatus.DRAFT } }),
      this.prisma.quotation.count({ where: { status: QuotationStatus.APPROVED } }),
      this.prisma.package.count({ where: { isArchived: false } }),
      this.prisma.followUpTask.count({ where: { status: FollowUpStatus.OPEN } }),
      this.prisma.followUpTask.count({
        where: {
          status: FollowUpStatus.OPEN,
          dueAt: { lt: now },
        },
      }),
      this.prisma.quotation.aggregate({
        where: {
          status: QuotationStatus.APPROVED,
          lead: { stage: LeadStage.WON },
        },
        _sum: {
          grandTotal: true,
        },
      }),
      this.prisma.followUpTask.findMany({
        where: { status: FollowUpStatus.OPEN },
        orderBy: { dueAt: 'asc' },
        take: 5,
        include: {
          lead: {
            select: {
              id: true,
              customerName: true,
              customerPhone: true,
              stage: true,
            },
          },
          assignedTo: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      leads: {
        total: totalLeads,
        byStage: {
          NEW: newLeads,
          QUALIFIED: qualifiedLeads,
          QUOTED: quotedLeads,
          FOLLOW_UP: followUpLeads,
          WON: wonLeads,
          LOST: lostLeads,
        },
      },
      quotations: {
        total: draftQuotes + approvedQuotes,
        draft: draftQuotes,
        approved: approvedQuotes,
        draftCount: draftQuotes,
        approvedCount: approvedQuotes,
        wonRevenue: Number(wonRevenueRaw._sum.grandTotal || 0),
      },
      followUps: {
        openCount: openFollowUps,
        overdueCount: overdueFollowUps,
        upcomingTasks: upcomingTasks ?? [],
      },
      packages: {
        activeCount: activePackages,
      },
      generatedAt: now.toISOString(),
    };
  }
}

