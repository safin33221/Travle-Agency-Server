import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcrypt';
import { AuthService } from './auth.service.js';
import { TokenService } from '../../common/services/token.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { StaffRole, StaffStatus } from '../../generated/prisma/client.js';

describe('AuthService', () => {
  let service: AuthService;

  const mockStaff = {
    id: 'user-uuid-1',
    email: 'agent@travelpilot.internal',
    name: 'Test Agent',
    passwordHash: '$2b$10$hashedpassword',
    role: StaffRole.SALES_AGENT,
    status: StaffStatus.ACTIVE,
    refreshTokenHash: 'mock-hash',
  };

  const mockPrismaService = {
    staffUser: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  };

  const mockTokenService = {
    signAsync: vi.fn(),
    verifyAsync: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TokenService, useValue: mockTokenService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should throw UnauthorizedException if staff not found', async () => {
      mockPrismaService.staffUser.findUnique.mockResolvedValue(null);
      const res = { cookie: vi.fn() } as any;

      await expect(
        service.login({ email: 'notfound@test.com', password: 'password' }, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if account is INACTIVE', async () => {
      mockPrismaService.staffUser.findUnique.mockResolvedValue({
        ...mockStaff,
        status: StaffStatus.INACTIVE,
      });
      const res = { cookie: vi.fn() } as any;

      await expect(
        service.login({ email: mockStaff.email, password: 'password' }, res),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should login successfully with valid credentials', async () => {
      vi.spyOn(bcrypt, 'compare').mockImplementation(async () => true);
      mockPrismaService.staffUser.findUnique.mockResolvedValue(mockStaff);
      mockPrismaService.staffUser.update.mockResolvedValue(mockStaff);
      mockTokenService.signAsync
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const res = { cookie: vi.fn() } as any;
      const result = await service.login(
        { email: mockStaff.email, password: 'validPassword' },
        res,
      );

      expect(result.accessToken).toBe('access-token');
      expect(result.user.email).toBe(mockStaff.email);
      expect(res.cookie).toHaveBeenCalledTimes(2);
    });
  });

  describe('logout', () => {
    it('should clear refreshTokenHash and clear cookies', async () => {
      mockPrismaService.staffUser.update.mockResolvedValue(mockStaff);
      const res = { clearCookie: vi.fn() } as any;

      const result = await service.logout('user-uuid-1', res);
      expect(result.message).toBe('Logged out successfully');
      expect(res.clearCookie).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.staffUser.update).toHaveBeenCalledWith({
        where: { id: 'user-uuid-1' },
        data: { refreshTokenHash: null },
      });
    });
  });
});
