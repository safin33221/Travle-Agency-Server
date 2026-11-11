import { Test, TestingModule } from '@nestjs/testing';
import { PackagesService } from './packages.service.js';
import { PrismaService } from '../../database/prisma.service.js';

describe('PackagesService', () => {
  let service: PackagesService;

  const mockPrismaService = {
    package: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      count: vi.fn(),
      update: vi.fn(),
    },
    auditLog: {
      create: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PackagesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PackagesService>(PackagesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
