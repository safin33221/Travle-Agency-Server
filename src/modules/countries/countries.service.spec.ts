import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { CountriesService } from './countries.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { CountryCoverageStatus } from '../../generated/prisma/client.js';

describe('CountriesService', () => {
  let service: CountriesService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      country: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
        findMany: vi.fn(),
      },
      auditLog: {
        create: vi.fn(),
      },
    };
    service = new CountriesService(prismaMock as unknown as PrismaService);
  });

  it('should create and edit a country and log audit entries', async () => {
    prismaMock.country.findFirst.mockResolvedValue(null);
    prismaMock.country.create.mockResolvedValue({
      id: 'c-1',
      name: 'Example Destination A',
      isoCode: 'EXA',
      slug: 'example-destination-a',
      coverageStatus: CountryCoverageStatus.ACTIVE,
    });

    const created = await service.create(
      {
        name: 'Example Destination A',
        isoCode: 'exa',
        shortIntro: 'Example destination for development.',
        coverageStatus: CountryCoverageStatus.ACTIVE,
        isFeatured: true,
        displayOrder: 1,
      },
      'admin-1',
    );

    expect(created.isoCode).toBe('EXA');
    expect(created.slug).toBe('example-destination-a');
    expect(prismaMock.auditLog.create).toHaveBeenCalledTimes(1);

    // Edit country
    prismaMock.country.findUnique.mockResolvedValue({
      id: 'c-1',
      name: 'Example Destination A',
      coverageStatus: CountryCoverageStatus.ACTIVE,
      isFeatured: true,
      visaServices: [],
    });
    prismaMock.country.update.mockResolvedValue({
      id: 'c-1',
      name: 'Example Destination A Updated',
      coverageStatus: CountryCoverageStatus.LIMITED,
      isFeatured: false,
    });

    const updated = await service.update(
      'c-1',
      {
        name: 'Example Destination A Updated',
        coverageStatus: CountryCoverageStatus.LIMITED,
        isFeatured: false,
      },
      'admin-1',
    );

    expect(updated.coverageStatus).toBe(CountryCoverageStatus.LIMITED);
  });

  it('should throw ConflictException when creating duplicate country', async () => {
    prismaMock.country.findFirst.mockResolvedValue({ id: 'existing' });
    await expect(
      service.create(
        {
          name: 'Example Destination A',
          isoCode: 'EXA',
          shortIntro: 'Duplicate',
          coverageStatus: CountryCoverageStatus.ACTIVE,
          isFeatured: false,
          displayOrder: 0,
        },
        'admin-1',
      ),
    ).rejects.toThrow(ConflictException);
  });

  it('should hide archived countries on public slug lookup', async () => {
    prismaMock.country.findFirst.mockResolvedValue(null);
    await expect(service.findPublicBySlug('archived-country')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('should safely soft-archive a country', async () => {
    prismaMock.country.findUnique.mockResolvedValue({
      id: 'c-1',
      name: 'Example Destination A',
      isoCode: 'EXA',
      visaServices: [],
    });
    prismaMock.country.update.mockResolvedValue({
      id: 'c-1',
      coverageStatus: CountryCoverageStatus.ARCHIVED,
    });

    const res = await service.softArchive('c-1', 'admin-1');
    expect(res.coverageStatus).toBe(CountryCoverageStatus.ARCHIVED);
  });
});

