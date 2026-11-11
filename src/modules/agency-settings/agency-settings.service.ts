import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { UpdateAgencySettingsDto } from './dto/update-agency-settings.dto.js';

@Injectable()
export class AgencySettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings() {
    let settings = await this.prisma.agencySettings.findFirst();

    if (!settings) {
      settings = await this.prisma.agencySettings.create({
        data: {
          agencyName: 'TravelPilot Agency',
          defaultCurrency: 'BDT',
          taxRate: 0.0,
          quotationTerms:
            '1. Valid for 7 days.\n2. Prices subject to final booking confirmation.\n3. Standard agency cancellation policies apply.',
          quotationValidityDays: 7,
        },
      });
    }

    return settings;
  }

  async updateSettings(dto: UpdateAgencySettingsDto, actorId: string) {
    const current = await this.getSettings();

    const updated = await this.prisma.agencySettings.update({
      where: { id: current.id },
      data: {
        ...(dto.agencyName !== undefined ? { agencyName: dto.agencyName.trim() } : {}),
        ...(dto.legalName !== undefined ? { legalName: dto.legalName?.trim() } : {}),
        ...(dto.logoUrl !== undefined ? { logoUrl: dto.logoUrl } : {}),
        ...(dto.address !== undefined ? { address: dto.address?.trim() } : {}),
        ...(dto.phone !== undefined ? { phone: dto.phone?.trim() } : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() } : {}),
        ...(dto.website !== undefined ? { website: dto.website?.trim() } : {}),
        ...(dto.defaultCurrency !== undefined ? { defaultCurrency: dto.defaultCurrency.toUpperCase().trim() } : {}),
        ...(dto.taxRate !== undefined ? { taxRate: dto.taxRate } : {}),
        ...(dto.quotationTerms !== undefined ? { quotationTerms: dto.quotationTerms.trim() } : {}),
        ...(dto.quotationValidityDays !== undefined ? { quotationValidityDays: dto.quotationValidityDays } : {}),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'AGENCY_SETTINGS_UPDATED',
        entityType: 'AgencySettings',
        entityId: updated.id,
        metadata: {
          before: current,
          after: updated,
        },
      },
    });

    return updated;
  }
}

