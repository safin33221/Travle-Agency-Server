import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { VisaServicesService } from './visa-services.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  AgencyServiceStatus,
  VisaCategory,
  VisaPublicationStatus,
} from '../../generated/prisma/client.js';

describe('VisaServicesService', () => {
  let service: VisaServicesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      country: {
        findUnique: vi.fn(),
        count: vi.fn(),
      },
      visaService: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      },
      visaServiceRequirement: {
        deleteMany: vi.fn(),
        createMany: vi.fn(),
      },
      visaInquiry: {
        count: vi.fn(),
      },
      lead: {
        count: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn((cb: any) => cb(prismaMock)),
    };
    service = new VisaServicesService(prismaMock as unknown as PrismaService);
  });

  it('should create multiple visa services for one country', async () => {
    prismaMock.country.findUnique.mockResolvedValue({
      id: 'country-a',
      name: 'Example Destination A',
    });
    prismaMock.visaService.findUnique.mockResolvedValue(null);

    prismaMock.visaService.create.mockResolvedValueOnce({
      id: 'vs-1',
      countryId: 'country-a',
      title: 'Student Visa Assistance',
      slug: 'student-visa-assistance',
      category: VisaCategory.STUDENT_VISA,
      publicationStatus: VisaPublicationStatus.PUBLISHED,
      serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
    });

    const s1 = await service.create(
      {
        countryId: 'country-a',
        category: VisaCategory.STUDENT_VISA,
        title: 'Student Visa Assistance',
        shortDescription: 'Example content for development only',
        fullDescription: 'Full example description for development only.',
        currency: 'BDT',
        displayOrder: 1,
        isFeatured: true,
        publicationStatus: VisaPublicationStatus.PUBLISHED,
        serviceStatus: AgencyServiceStatus.ACCEPTING_INQUIRIES,
        requirements: [
          {
            title: 'Valid Passport',
            isMandatory: true,
            displayOrder: 1,
          },
        ],
      },
      'admin-1',
    );

    expect(s1.slug).toBe('student-visa-assistance');

    prismaMock.visaService.create.mockResolvedValueOnce({
      id: 'vs-2',
      countryId: 'country-a',
      title: 'Work Permit Assistance',
      slug: 'work-permit-assistance',
      category: VisaCategory.WORK_PERMIT,
      publicationStatus: VisaPublicationStatus.PUBLISHED,
      serviceStatus: AgencyServiceStatus.TEMPORARILY_PAUSED,
    });

    const s2 = await service.create(
      {
        countryId: 'country-a',
        category: VisaCategory.WORK_PERMIT,
        title: 'Work Permit Assistance',
        shortDescription: 'Example content for development only',
        fullDescription: 'Full example description for development only.',
        currency: 'BDT',
        displayOrder: 2,
        isFeatured: false,
        publicationStatus: VisaPublicationStatus.PUBLISHED,
        serviceStatus: AgencyServiceStatus.TEMPORARILY_PAUSED,
      },
      'admin-1',
    );

    expect(s2.serviceStatus).toBe(AgencyServiceStatus.TEMPORARILY_PAUSED);
  });

  it('should strictly filter for PUBLISHED status on public listing and detail', async () => {
    prismaMock.visaService.count.mockResolvedValue(1);
    prismaMock.visaService.findMany.mockResolvedValue([
      {
        id: 'vs-1',
        title: 'Student Visa Assistance',
        publicationStatus: VisaPublicationStatus.PUBLISHED,
      },
    ]);

    const publicList = await service.findPublicAll({
      page: 1,
      limit: 20,
      sortOrder: 'asc',
    });

    expect(publicList.data).toHaveLength(1);
    expect(prismaMock.visaService.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          publicationStatus: VisaPublicationStatus.PUBLISHED,
        }),
      }),
    );

    // Unpublished service should throw NotFoundException on public detail
    prismaMock.visaService.findFirst.mockResolvedValue(null);
    await expect(
      service.findPublicByCountryAndServiceSlug(
        'example-destination-a',
        'draft-service',
      ),
    ).rejects.toThrow(NotFoundException);
  });

  it('should safely soft-archive a referenced visa service', async () => {
    prismaMock.visaService.findUnique.mockResolvedValue({
      id: 'vs-1',
      title: 'Student Visa Assistance',
      country: { name: 'Example Destination A' },
    });
    prismaMock.visaService.update.mockResolvedValue({
      id: 'vs-1',
      publicationStatus: VisaPublicationStatus.ARCHIVED,
      serviceStatus: AgencyServiceStatus.NOT_OFFERED,
    });

    const res = await service.softArchive('vs-1', 'admin-1');
    expect(res.publicationStatus).toBe(VisaPublicationStatus.ARCHIVED);
    expect(res.serviceStatus).toBe(AgencyServiceStatus.NOT_OFFERED);
  });
});

