import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { QuotationsService } from './quotations.service.js';
import { QuotationPdfService } from './quotation-pdf.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { QuotationStatus } from '../../generated/prisma/client.js';

describe('QuotationsService', () => {
  let service: QuotationsService;

  const mockPrismaService = {
    lead: { findUnique: vi.fn() },
    agencySettings: { findFirst: vi.fn() },
    quotation: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    quotationItem: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    auditLog: { create: vi.fn() },
    $transaction: vi.fn((cb) => cb(mockPrismaService)),
  };

  const mockPdfService = {
    generatePdf: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: QuotationPdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<QuotationsService>(QuotationsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculatePricing (Deterministic Server Arithmetic)', () => {
    it('should calculate subtotal, discount, and tax deterministically with Decimal precision', () => {
      const items = [
        { title: 'Item 1', quantity: 3, unitPrice: 199.99, currency: 'BDT' },
        { title: 'Item 2', quantity: 2, unitPrice: 50.0, currency: 'BDT' },
      ];
      // Item 1: 3 * 199.99 = 599.97
      // Item 2: 2 * 50.00 = 100.00
      // Subtotal = 699.97
      // Discount = 50.00 -> Taxable = 649.97
      // Tax Rate = 5% -> 649.97 * 0.05 = 32.50
      // Grand Total = 649.97 + 32.50 = 682.47
      const result = service.calculatePricing(items, 50, 5);

      expect(result.subtotal).toBe(699.97);
      expect(result.discount).toBe(50);
      expect(result.taxAmount).toBe(32.5);
      expect(result.grandTotal).toBe(682.47);
      expect(result.computedItems[0].totalPrice).toBe(599.97);
      expect(result.computedItems[1].totalPrice).toBe(100);
    });
  });

  describe('generatePdf', () => {
    it('should throw BadRequestException if quotation is in DRAFT status', async () => {
      mockPrismaService.quotation.findUnique.mockResolvedValue({
        id: 'quote-1',
        status: QuotationStatus.DRAFT,
        lead: { customerName: 'Test' },
        items: [],
      });

      await expect(service.generatePdf('quote-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
