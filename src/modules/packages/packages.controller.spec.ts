import { Test, TestingModule } from '@nestjs/testing';
import { PackagesController } from './packages.controller.js';
import { PackagesService } from './packages.service.js';
import { TokenService } from '../../common/services/token.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('PackagesController', () => {
  let controller: PackagesController;

  const mockPackagesService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
    update: vi.fn(),
    softArchive: vi.fn(),
  };

  const mockTokenService = {
    verifyAsync: vi.fn(),
  };

  const mockPrismaService = {
    staffUser: { findUnique: vi.fn() },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PackagesController],
      providers: [
        { provide: PackagesService, useValue: mockPackagesService },
        { provide: TokenService, useValue: mockTokenService },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get<PackagesController>(PackagesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
