import { Test, TestingModule } from '@nestjs/testing';
import { LeadsController } from './leads.controller.js';
import { LeadsService } from './leads.service.js';
import { TokenService } from '../../common/services/token.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('LeadsController', () => {
  let controller: LeadsController;

  const mockLeadsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    getNotes: vi.fn(),
    addNote: vi.fn(),
  };

  const mockTokenService = {
    verifyAsync: vi.fn(),
  };

  const mockPrismaService = {
    staffUser: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeadsController],
      providers: [
        { provide: LeadsService, useValue: mockLeadsService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<LeadsController>(LeadsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
