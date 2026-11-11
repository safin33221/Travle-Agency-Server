import { Test, TestingModule } from '@nestjs/testing';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { TokenService } from '../../common/services/token.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('AiController', () => {
  let controller: AiController;

  const mockAiService = {
    generateDraft: vi.fn(),
  };

  const mockTokenService = {
    verifyAsync: vi.fn(),
  };

  const mockPrismaService = {
    staffUser: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AiController],
      providers: [
        { provide: AiService, useValue: mockAiService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<AiController>(AiController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
