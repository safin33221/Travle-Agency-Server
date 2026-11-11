import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('LeadsService', () => {
  let service: LeadsService;

  const mockPrismaService = {
    lead: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    leadNote: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should support reusable search, filtering, sorting, and pagination in findAll', async () => {
    mockPrismaService.lead.count.mockResolvedValue(25);
    mockPrismaService.lead.findMany.mockResolvedValue([
      { id: 'lead-1', customerName: 'Tanvir Ahmed', stage: 'QUALIFIED' },
    ]);

    const result = await service.findAll(
      {
        page: 2,
        limit: 10,
        search: 'Cox',
        stage: 'QUALIFIED' as any,
        source: 'WHATSAPP' as any,
        minBudget: 10000,
        maxBudget: 50000,
        sortBy: 'budget',
        sortOrder: 'asc',
      },
      {
        id: 'staff-1',
        email: 'admin@travelpilot.internal',
        name: 'Admin',
        role: 'OWNER_ADMIN' as any,
        status: 'ACTIVE' as any,
      },
    );

    expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 10,
        take: 10,
        orderBy: { budget: 'asc' },
        where: expect.objectContaining({
          stage: 'QUALIFIED',
          source: 'WHATSAPP',
          budget: { gte: 10000, lte: 50000 },
          OR: expect.arrayContaining([
            { customerName: { contains: 'Cox', mode: 'insensitive' } },
            { destination: { contains: 'Cox', mode: 'insensitive' } },
          ]),
        }),
      }),
    );

    expect(result.meta).toEqual({
      total: 25,
      page: 2,
      limit: 10,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
  });
});
