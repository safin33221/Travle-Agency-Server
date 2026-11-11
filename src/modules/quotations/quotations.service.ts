import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from 'decimal.js';
import { PrismaService } from '../../database/prisma.service.js';
import { QuotationPdfService } from './quotation-pdf.service.js';
import { CreateQuotationDto } from './dto/create-quotation.dto.js';
import { UpdateQuotationDto } from './dto/update-quotation.dto.js';
import { CreateQuotationItemDto } from './dto/create-quotation-item.dto.js';
import {
  LeadStage,
  QuotationStatus,
} from '../../generated/prisma/client.js';

@Injectable()
export class QuotationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdfService: QuotationPdfService,
  ) {}

  calculatePricing(
    items: CreateQuotationItemDto[],
    discountInput: number = 0,
    taxRatePercent: number = 0,
  ) {
    let subtotal = new Decimal(0);

    const computedItems = items.map((item, index) => {
      const qty = new Decimal(item.quantity);
      const unit = new Decimal(item.unitPrice);
      const total = qty.times(unit).toDecimalPlaces(2);
      subtotal = subtotal.plus(total);

      return {
        packageId: item.packageId || null,
        title: (item.title || item.label || 'Tour Package Item').trim(),
        description: item.description?.trim() || null,
        quantity: item.quantity,
        unitPrice: unit.toNumber(),
        totalPrice: total.toNumber(),
        currency: item.currency || 'BDT',
        orderIndex: index,
      };
    });

    const discount = new Decimal(discountInput || 0).toDecimalPlaces(2);
    const rawTaxable = subtotal.minus(discount);
    const taxableAmount = rawTaxable.greaterThan(0) ? rawTaxable : new Decimal(0);
    const taxRate = new Decimal(taxRatePercent || 0);
    const taxAmount = taxableAmount
      .times(taxRate.dividedBy(100))
      .toDecimalPlaces(2);
    const grandTotal = taxableAmount.plus(taxAmount).toDecimalPlaces(2);

    return {
      subtotal: subtotal.toNumber(),
      discount: discount.toNumber(),
      taxAmount: taxAmount.toNumber(),
      grandTotal: grandTotal.toNumber(),
      computedItems,
    };
  }

  async create(leadId: string, dto: CreateQuotationDto, creatorId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    const settings = await this.prisma.agencySettings.findFirst();
    const defaultTaxRate = settings?.taxRate ? Number(settings.taxRate) : 0;
    const defaultTerms =
      dto.termsAndConditions ||
      settings?.quotationTerms ||
      'Standard agency quotation terms apply.';
    const currency = dto.currency || settings?.defaultCurrency || 'BDT';

    const validityDays = settings?.quotationValidityDays || 7;
    const validUntil = dto.validUntil
      ? new Date(dto.validUntil)
      : new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000);

    const pricing = this.calculatePricing(dto.items, dto.discount, defaultTaxRate);

    // Generate unique human-readable Quote number: Q-YYYYMM-XXXX
    const datePrefix = new Date().toISOString().slice(0, 7).replace('-', '');
    const count = await this.prisma.quotation.count();
    const quoteNumber = `Q-${datePrefix}-${String(count + 1).padStart(4, '0')}`;

    const quotation = await this.prisma.$transaction(async (tx) => {
      const quote = await tx.quotation.create({
        data: {
          leadId,
          quoteNumber,
          revision: 1,
          status: QuotationStatus.DRAFT,
          currency,
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          taxAmount: pricing.taxAmount,
          grandTotal: pricing.grandTotal,
          validUntil,
          termsAndConditions: defaultTerms,
          notes: dto.notes?.trim() || null,
          createdById: creatorId,
          items: {
            create: pricing.computedItems,
          },
        },
        include: {
          items: true,
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      // Update lead stage to QUOTED if still NEW or QUALIFIED
      if (lead.stage === LeadStage.NEW || lead.stage === LeadStage.QUALIFIED) {
        await tx.lead.update({
          where: { id: leadId },
          data: { stage: LeadStage.QUOTED },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: creatorId,
          action: 'QUOTATION_CREATED',
          entityType: 'Quotation',
          entityId: quote.id,
          metadata: {
            leadId,
            quoteNumber,
            revision: 1,
            grandTotal: quote.grandTotal,
          },
        },
      });

      return quote;
    });

    return quotation;
  }

  async findByLead(leadId: string) {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) {
      throw new NotFoundException(`Lead with ID ${leadId} not found`);
    }

    return this.prisma.quotation.findMany({
      where: { leadId },
      orderBy: [{ quoteNumber: 'desc' }, { revision: 'desc' }],
      include: {
        items: { orderBy: { orderIndex: 'asc' } },
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });
  }

  async findOne(id: string) {
    const quotation = await this.prisma.quotation.findUnique({
      where: { id },
      include: {
        items: { orderBy: { orderIndex: 'asc' } },
        lead: true,
        createdBy: { select: { id: true, name: true, email: true } },
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    if (!quotation) {
      throw new NotFoundException(`Quotation with ID ${id} not found`);
    }

    return quotation;
  }

  async update(id: string, dto: UpdateQuotationDto, actorId: string) {
    const current = await this.findOne(id);

    const settings = await this.prisma.agencySettings.findFirst();
    const defaultTaxRate = settings?.taxRate ? Number(settings.taxRate) : 0;

    // IF CURRENT QUOTE IS DRAFT: In-place edit
    if (current.status === QuotationStatus.DRAFT) {
      const itemsToCalculate =
        dto.items ||
        current.items.map((it) => ({
          packageId: it.packageId || undefined,
          title: it.title,
          description: it.description || undefined,
          quantity: it.quantity,
          unitPrice: Number(it.unitPrice),
          currency: it.currency,
        }));

      const discount = dto.discount !== undefined ? dto.discount : Number(current.discount);
      const pricing = this.calculatePricing(itemsToCalculate, discount, defaultTaxRate);

      return this.prisma.$transaction(async (tx) => {
        if (dto.items) {
          await tx.quotationItem.deleteMany({ where: { quotationId: id } });
          await tx.quotationItem.createMany({
            data: pricing.computedItems.map((item) => ({
              ...item,
              quotationId: id,
            })),
          });
        }

        const updated = await tx.quotation.update({
          where: { id },
          data: {
            currency: dto.currency || current.currency,
            subtotal: pricing.subtotal,
            discount: pricing.discount,
            taxAmount: pricing.taxAmount,
            grandTotal: pricing.grandTotal,
            validUntil: dto.validUntil ? new Date(dto.validUntil) : current.validUntil,
            termsAndConditions: dto.termsAndConditions !== undefined ? dto.termsAndConditions : current.termsAndConditions,
            notes: dto.notes !== undefined ? dto.notes : current.notes,
          },
          include: {
            items: { orderBy: { orderIndex: 'asc' } },
            createdBy: { select: { id: true, name: true, email: true } },
          },
        });

        await tx.auditLog.create({
          data: {
            actorId,
            action: 'QUOTATION_UPDATED',
            entityType: 'Quotation',
            entityId: id,
            metadata: {
              quoteNumber: current.quoteNumber,
              revision: current.revision,
              grandTotal: updated.grandTotal,
            },
          },
        });

        return updated;
      });
    }

    // IF CURRENT QUOTE IS APPROVED: Revision Increment Invariant!
    // Approved quotes are immutable; create revision N+1 in DRAFT status
    const itemsToCalculate =
      dto.items ||
      current.items.map((it) => ({
        packageId: it.packageId || undefined,
        title: it.title,
        description: it.description || undefined,
        quantity: it.quantity,
        unitPrice: Number(it.unitPrice),
        currency: it.currency,
      }));

    const discount = dto.discount !== undefined ? dto.discount : Number(current.discount);
    const pricing = this.calculatePricing(itemsToCalculate, discount, defaultTaxRate);
    const newRevisionNumber = current.revision + 1;

    return this.prisma.$transaction(async (tx) => {
      const newRevision = await tx.quotation.create({
        data: {
          leadId: current.leadId,
          quoteNumber: current.quoteNumber,
          revision: newRevisionNumber,
          status: QuotationStatus.DRAFT,
          currency: dto.currency || current.currency,
          subtotal: pricing.subtotal,
          discount: pricing.discount,
          taxAmount: pricing.taxAmount,
          grandTotal: pricing.grandTotal,
          validUntil: dto.validUntil ? new Date(dto.validUntil) : current.validUntil,
          termsAndConditions: dto.termsAndConditions !== undefined ? dto.termsAndConditions : current.termsAndConditions,
          notes: dto.notes !== undefined ? dto.notes : current.notes,
          createdById: actorId,
          items: {
            create: pricing.computedItems,
          },
        },
        include: {
          items: { orderBy: { orderIndex: 'asc' } },
          createdBy: { select: { id: true, name: true, email: true } },
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: 'QUOTATION_REVISED',
          entityType: 'Quotation',
          entityId: newRevision.id,
          metadata: {
            quoteNumber: current.quoteNumber,
            fromRevision: current.revision,
            toRevision: newRevisionNumber,
          },
        },
      });

      return newRevision;
    });
  }

  async approve(id: string, approverId: string) {
    const quotation = await this.findOne(id);

    // Idempotent: If already approved, return current approved quote
    if (quotation.status === QuotationStatus.APPROVED) {
      return quotation;
    }

    if (quotation.status === QuotationStatus.VOID) {
      throw new BadRequestException('Cannot approve a voided quotation');
    }

    const approved = await this.prisma.quotation.update({
      where: { id },
      data: {
        status: QuotationStatus.APPROVED,
        approvedById: approverId,
        approvedAt: new Date(),
      },
      include: {
        items: true,
        approvedBy: { select: { id: true, name: true, email: true } },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: approverId,
        action: 'QUOTATION_APPROVED',
        entityType: 'Quotation',
        entityId: id,
        metadata: {
          quoteNumber: quotation.quoteNumber,
          revision: quotation.revision,
          grandTotal: quotation.grandTotal,
        },
      },
    });

    return approved;
  }

  async generatePdf(id: string) {
    const quote = await this.findOne(id);

    // Invariant: PDF export is strictly allowed only for approved revision
    if (quote.status !== QuotationStatus.APPROVED) {
      throw new BadRequestException(
        'PDF export is restricted to approved quotations only. Please approve the quotation first.',
      );
    }

    const settings = await this.prisma.agencySettings.findFirst();

    const pdfBuffer = await this.pdfService.generatePdf({
      quoteNumber: quote.quoteNumber,
      revision: quote.revision,
      status: quote.status,
      currency: quote.currency,
      subtotal: quote.subtotal.toString(),
      discount: quote.discount.toString(),
      taxAmount: quote.taxAmount.toString(),
      grandTotal: quote.grandTotal.toString(),
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      termsAndConditions: quote.termsAndConditions,
      notes: quote.notes,
      customerName: quote.lead.customerName,
      customerPhone: quote.lead.customerPhone,
      customerEmail: quote.lead.customerEmail,
      destination: quote.lead.destination,
      agencyName: settings?.agencyName || 'TravelPilot Agency',
      agencyAddress: settings?.address,
      agencyPhone: settings?.phone,
      agencyEmail: settings?.email,
      approvedByName: quote.approvedBy?.name || 'Authorized Agency Officer',
      approvedAt: quote.approvedAt,
      items: quote.items.map((it) => ({
        title: it.title,
        description: it.description,
        quantity: it.quantity,
        unitPrice: it.unitPrice.toString(),
        totalPrice: it.totalPrice.toString(),
      })),
    });

    const filename = `${quote.quoteNumber}-rev${quote.revision}.pdf`;
    return { buffer: pdfBuffer, filename };
  }
}
