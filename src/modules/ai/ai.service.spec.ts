import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { AiDraftType } from '../../generated/prisma/client.js';

describe('AiService', () => {
  let service: AiService;

  const mockLead = {
    id: 'lead-uuid-1',
    customerName: 'Shakib Al Hasan',
    customerPhone: '+8801711111111',
    customerEmail: 'shakib@example.com',
    destination: 'Cox\'s Bazar',
    travelStartDate: null,
    travelEndDate: null,
    travelerCount: null,
    budget: null,
    requirements: 'Looking for a relaxing weekend trip.',
  };

  const mockPackages = [
    {
      id: 'pkg-uuid-1',
      title: 'Cox\'s Bazar Luxury',
      destination: 'Cox\'s Bazar',
      durationDays: 3,
      durationNights: 2,
      basePrice: 25000,
      currency: 'BDT',
      inclusions: ['Breakfast', 'Transfers'],
      isArchived: false,
    },
  ];

  const mockPrismaService = {
    lead: {
      findUnique: vi.fn(),
    },
    package: {
      findMany: vi.fn(),
    },
    aiDraft: {
      create: vi.fn((args) => Promise.resolve({ id: 'draft-uuid-1', ...args.data })),
    },
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateDraft', () => {
    it('should generate draft and flag it for human review', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.package.findMany.mockResolvedValue(mockPackages);

      const result = await service.generateDraft(
        {
          leadId: 'lead-uuid-1',
          language: 'en',
          type: AiDraftType.CUSTOMER_REPLY,
        },
        'staff-uuid-1',
      );

      expect(result.needsHumanReview).toBe(true);
      expect(result.status).toBe('DRAFT');
      expect(result.missingInformation).toContain('Travel dates');
      expect(result.missingInformation).toContain('Number of travelers');
      expect(result.suggestedText).toContain('Cox\'s Bazar Luxury');
      expect(result.sourcePackageIds).toContain('pkg-uuid-1');
    });

    it('should generate Bangla response when requested', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);
      mockPrismaService.package.findMany.mockResolvedValue(mockPackages);

      const result = await service.generateDraft(
        {
          leadId: 'lead-uuid-1',
          language: 'bn',
          type: AiDraftType.CUSTOMER_REPLY,
        },
        'staff-uuid-1',
      );

      expect(result.needsHumanReview).toBe(true);
      expect(result.suggestedText).toContain('যোগাযোগ করার জন্য ধন্যবাদ');
      expect(result.suggestedText).toContain('রিভিউ সাপেক্ষ');
    });
  });
});
