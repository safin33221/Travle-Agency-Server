import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException } from '@nestjs/common';
import { VisaInquiriesService } from './visa-inquiries.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AgencyServiceStatus,
  CountryCoverageStatus,
  LeadSource,
  VisaCategory,
  VisaPublicationStatus,
} from '../../generated/prisma/client.js';

describe('VisaInquiriesService', () => {
  let service: VisaInquiriesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      country: {
        findUnique: vi.fn(),
      },
      visaService: {
        findFirst: vi.fn(),
      },
      lead: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      visaInquiry: {
        create: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb: any) => cb(prismaMock)),
    };
    service = new VisaInquiriesService(prismaMock as unknown as PrismaService);
  });

  it('should submit a valid visa inquiry and associate it with a CRM Lead', async () => {
    prismaMock.country.findUnique.mockResolvedValue({
      id: 'country-a',
      name: 'Example Destination A',
      coverageStatus: CountryCoverageStatus.ACTIVE,
    });
    prismaMock.visaService.findFirst.mockResolvedValue({
      id: 'vs-1',
      title: 'Student Visa Assistance',
      category: VisaCategory.STUDENT_VISA,
      publicationStatus: VisaPublicationStatus.PUBLISHED,
      serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
      requirements: [{ title: 'Valid Passport', isMandatory: true }],
    });
    prismaMock.lead.findFirst.mockResolvedValue(null);
    prismaMock.lead.create.mockResolvedValue({
      id: 'lead-101',
      trackingCode: 'SV-123456',
      customerName: 'Applicant One',
    });
    prismaMock.visaInquiry.create.mockResolvedValue({
      id: 'inq-101',
      leadId: 'lead-101',
      createdAt: new Date(),
    });

    const res = await service.submitPublicInquiry({
      fullName: 'Applicant One',
      phone: '+8801711000000',
      email: 'applicant@example.com',
      countryId: 'country-a',
      visaServiceId: 'vs-1',
      message: 'Please advise on intake checklist.',
      consentGiven: true,
      source: LeadSource.WEBSITE,
    });

    expect(res.leadId).toBe('lead-101');
    expect(res.trackingCode).toBe('SV-123456');
    expect(prismaMock.lead.create).toHaveBeenCalledTimes(1);
    expect(prismaMock.visaInquiry.create).toHaveBeenCalledTimes(1);
  });

  it('should reject inquiry submission when visa service is TEMPORARILY_PAUSED', async () => {
    prismaMock.country.findUnique.mockResolvedValue({
      id: 'country-a',
      name: 'Example Destination A',
      coverageStatus: CountryCoverageStatus.ACTIVE,
    });
    prismaMock.visaService.findFirst.mockResolvedValue({
      id: 'vs-2',
      title: 'Work Permit Assistance',
      category: VisaCategory.WORK_PERMIT,
      publicationStatus: VisaPublicationStatus.PUBLISHED,
      serviceStatus: AgencyServiceStatus.TEMPORARILY_PAUSED,
      requirements: [],
    });

    await expect(
      service.submitPublicInquiry({
        fullName: 'Applicant Two',
        phone: '+8801711999999',
        countryId: 'country-a',
        visaServiceId: 'vs-2',
        consentGiven: true,
        source: LeadSource.WEBSITE,
      }),
    ).rejects.toThrow(ConflictException);
  });
});

