import { Test, TestingModule } from '@nestjs/testing';
import { QuotationsController } from './quotations.controller.js';
import { QuotationsService } from './quotations.service.js';
import { TokenService } from '../../common/services/token.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('QuotationsController', () => {
  let controller: QuotationsController;

  const mockQuotationsService = {
    create: vi.fn(),
    findByLead: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    approve: vi.fn(),
    generatePdf: vi.fn(),
  };

  const mockTokenService = {
    verifyAsync: vi.fn(),
  };

  const mockPrismaService = {
    staffUser: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuotationsController],
      providers: [
        { provide: QuotationsService, useValue: mockQuotationsService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<QuotationsController>(QuotationsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
