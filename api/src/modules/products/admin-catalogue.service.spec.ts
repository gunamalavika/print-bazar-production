import { Test, TestingModule } from '@nestjs/testing';
import { AdminCatalogueService } from './admin-catalogue.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException } from '@nestjs/common';

describe('AdminCatalogueService - Product Setup Studio', () => {
  let service: AdminCatalogueService;
  let prisma: any;
  let audit: any;

  beforeEach(async () => {
    prisma = {
      product: {
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productOptionGroup: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        deleteMany: jest.fn(),
        update: jest.fn(),
      },
      productOption: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      productConfigurationRule: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      productPricingSource: {
        upsert: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      productPricingSyncLog: {
        create: jest.fn(),
        findMany: jest.fn(),
      },
      pricingMatrix: {
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      productAdditionalPricing: {
        findMany: jest.fn(),
        deleteMany: jest.fn(),
        create: jest.fn(),
      },
      reusableOptionGroup: {
        create: jest.fn(),
        update: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
      $transaction: jest.fn(async (callback) => {
        if (typeof callback === 'function') {
          return callback(prisma);
        }
        return Promise.all(callback);
      }),
    };

    audit = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminCatalogueService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: audit },
      ],
    }).compile();

    service = module.get<AdminCatalogueService>(AdminCatalogueService);
  });

  describe('Configuration Rules Validation', () => {
    it('should reject contradictory rules for the same condition', async () => {
      const contradictoryRules = [
        {
          name: 'Show Finishing on Matt',
          conditionGroupCode: 'paper',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'matt',
          actionType: 'SHOW',
          targetGroupCode: 'finishing',
        },
        {
          name: 'Hide Finishing on Matt',
          conditionGroupCode: 'paper',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'matt',
          actionType: 'HIDE',
          targetGroupCode: 'finishing',
        },
      ];

      jest.spyOn(service, 'getProductById').mockResolvedValue({ id: 'p1' } as any);

      await expect(
        service.saveConfigurationRules('p1', contradictoryRules as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject circular dependencies between option groups', async () => {
      const circularRules = [
        {
          name: 'Paper determines Finish',
          conditionGroupCode: 'paper',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'heavy',
          actionType: 'SHOW',
          targetGroupCode: 'finish',
        },
        {
          name: 'Finish determines Paper',
          conditionGroupCode: 'finish',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'foil',
          actionType: 'SHOW',
          targetGroupCode: 'paper',
        },
      ];

      jest.spyOn(service, 'getProductById').mockResolvedValue({ id: 'p1' } as any);

      await expect(
        service.saveConfigurationRules('p1', circularRules as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow valid non-circular conditional rules', async () => {
      const validRules = [
        {
          name: 'Show Spot UV only for Thermal Matt',
          conditionGroupCode: 'lamination',
          conditionOperator: 'EQUALS',
          conditionOptionValue: 'thermal_matt',
          actionType: 'SHOW',
          targetGroupCode: 'special_finish',
          targetOptionValue: 'spot_uv',
        },
      ];

      jest.spyOn(service, 'getProductById').mockResolvedValue({ id: 'p1' } as any);
      prisma.productConfigurationRule.create.mockResolvedValue({ id: 'r1', ...validRules[0] });

      const result = await service.saveConfigurationRules('p1', validRules as any);
      expect(result).toHaveLength(1);
      expect(prisma.productConfigurationRule.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
    });
  });

  describe('Google Sheets Pricing Synchronization & Tier Validation', () => {
    it('should reject synchronization with duplicate quantity tiers', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        pricingSource: { id: 'ps1' },
      } as any);

      prisma.productPricingSyncLog.create.mockResolvedValue({ id: 'log1' });

      const dto = {
        manualRows: [
          { minQty: 100, maxQty: 500, unitPrice: 2.5, combination: { gsm: '350' } },
          { minQty: 100, maxQty: 500, unitPrice: 2.2, combination: { gsm: '350' } }, // Duplicate!
        ],
      };

      await expect(service.syncPricingSheet('p1', dto)).rejects.toThrow(BadRequestException);
      expect(prisma.productPricingSyncLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
          }),
        }),
      );
    });

    it('should reject synchronization with invalid quantity ranges (minQty > maxQty)', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        pricingSource: { id: 'ps1' },
      } as any);

      prisma.productPricingSyncLog.create.mockResolvedValue({ id: 'log2' });

      const dto = {
        manualRows: [
          { minQty: 500, maxQty: 100, unitPrice: 2.5 }, // Inverted!
        ],
      };

      await expect(service.syncPricingSheet('p1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should reject synchronization with non-positive unitPrice', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        pricingSource: { id: 'ps1' },
      } as any);

      prisma.productPricingSyncLog.create.mockResolvedValue({ id: 'log3' });

      const dto = {
        manualRows: [
          { minQty: 100, maxQty: 500, unitPrice: -5 }, // Negative!
        ],
      };

      await expect(service.syncPricingSheet('p1', dto)).rejects.toThrow(BadRequestException);
    });

    it('should successfully sync valid quantity tiers and update pricingMatrix', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        pricingSource: { id: 'ps1' },
      } as any);

      prisma.productPricingSyncLog.create.mockResolvedValue({ id: 'log4' });
      prisma.pricingMatrix.create.mockResolvedValue({ id: 'pm1' });
      prisma.productPricingSource.update.mockResolvedValue({ id: 'ps1' });

      const dto = {
        manualRows: [
          { minQty: 100, maxQty: 499, unitPrice: 2.5, combination: { gsm: '350' } },
          { minQty: 500, maxQty: 999, unitPrice: 2.0, combination: { gsm: '350' } },
          { minQty: 1000, maxQty: 10000, unitPrice: 1.5, combination: { gsm: '350' } },
        ],
      };

      const result = await service.syncPricingSheet('p1', dto);
      expect(result.status).toBe('SUCCESS');
      expect(result.syncedRows).toBe(3);
      expect(prisma.pricingMatrix.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
      expect(prisma.productPricingSource.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ps1' },
          data: expect.objectContaining({ syncStatus: 'SUCCESS', syncRowCount: 3 }),
        }),
      );
    });
  });

  describe('Bulk Option Builder', () => {
    it('should replace and save bulk options for a group', async () => {
      prisma.productOptionGroup.findUnique.mockResolvedValue({ id: 'g1', name: 'Paper Stock' });
      prisma.productOption.create.mockImplementation((args: any) => Promise.resolve({ id: 'opt-' + Math.random(), ...args.data }));

      const bulkDto = {
        groupId: 'g1',
        options: [
          { label: '300 GSM', value: '300_gsm', priceModifier: 0, sortOrder: 0 },
          { label: '350 GSM', value: '350_gsm', priceModifier: 0.35, sortOrder: 1 },
          { label: '400 GSM Board', value: '400_gsm', priceModifier: 0.75, sortOrder: 2 },
        ],
      };

      const saved = await service.bulkSaveOptions('g1', bulkDto as any);
      expect(saved).toHaveLength(3);
      expect(prisma.productOption.deleteMany).toHaveBeenCalledWith({ where: { groupId: 'g1' } });
    });
  });

  describe('Dynamic Group-Based Additional Pricing', () => {
    it('should create a reusable group with enableAdditionalPricing: true', async () => {
      prisma.reusableOptionGroup.findUnique.mockResolvedValue(null);
      prisma.reusableOptionGroup.create.mockResolvedValue({
        id: 'rg1',
        name: 'Paper Stock',
        code: 'paper_stock',
        enableAdditionalPricing: true,
      });

      const res = await service.createReusableGroup({
        name: 'Paper Stock',
        code: 'paper_stock',
        enableAdditionalPricing: true,
        defaultOptions: [
          { label: '130 GSM', value: '130_gsm' },
          { label: '170 GSM', value: '170_gsm' },
        ],
      });

      expect(res.enableAdditionalPricing).toBe(true);
      expect(prisma.reusableOptionGroup.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            enableAdditionalPricing: true,
          }),
        }),
      );
    });

    it('should reject additional pricing tier with negative unitPrice', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        optionGroups: [
          {
            code: 'paper_stock',
            enableAdditionalPricing: true,
            options: [{ value: '170_gsm' }],
          },
        ],
      } as any);

      const invalidDto = {
        tiers: [
          {
            groupCode: 'paper_stock',
            optionValue: '170_gsm',
            minQty: 100,
            maxQty: 100,
            unitPrice: -0.5,
          },
        ],
      };

      await expect(service.saveAdditionalPricing('p1', invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject additional pricing tier with invalid quantity range (minQty > maxQty)', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        optionGroups: [
          {
            code: 'paper_stock',
            enableAdditionalPricing: true,
            options: [{ value: '170_gsm' }],
          },
        ],
      } as any);

      const invalidDto = {
        tiers: [
          {
            groupCode: 'paper_stock',
            optionValue: '170_gsm',
            minQty: 300,
            maxQty: 200, // Invalid!
            unitPrice: 0.5,
          },
        ],
      };

      await expect(service.saveAdditionalPricing('p1', invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject additional pricing tier with non-existent option group or option value', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        optionGroups: [
          {
            code: 'paper_stock',
            enableAdditionalPricing: true,
            options: [{ value: '170_gsm' }],
          },
        ],
      } as any);

      const invalidDto = {
        tiers: [
          {
            groupCode: 'paper_stock',
            optionValue: 'non_existent_value',
            minQty: 100,
            maxQty: 100,
            unitPrice: 0.5,
          },
        ],
      };

      await expect(service.saveAdditionalPricing('p1', invalidDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject duplicate quantity tiers for the same group and option', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        optionGroups: [
          {
            code: 'paper_stock',
            enableAdditionalPricing: true,
            options: [{ value: '170_gsm' }],
          },
        ],
      } as any);

      const duplicateDto = {
        tiers: [
          { groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 100, maxQty: 100, unitPrice: 0.2 },
          { groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 100, maxQty: 100, unitPrice: 0.3 },
        ],
      };

      await expect(service.saveAdditionalPricing('p1', duplicateDto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully save valid additional pricing tiers and record audit event', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({
        id: 'p1',
        optionGroups: [
          {
            code: 'paper_stock',
            enableAdditionalPricing: true,
            options: [{ value: '130_gsm' }, { value: '170_gsm' }, { value: '350_gsm' }],
          },
        ],
      } as any);

      prisma.productAdditionalPricing.create.mockImplementation((args: any) =>
        Promise.resolve({ id: 'ap-' + Math.random(), ...args.data }),
      );
      prisma.productAdditionalPricing.findMany.mockResolvedValue([
        { id: 'ap-1', productId: 'p1', groupCode: 'paper_stock', optionValue: '130_gsm', minQty: 100, maxQty: 100, unitPrice: 0.0 },
        { id: 'ap-2', productId: 'p1', groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 100, maxQty: 100, unitPrice: 0.2 },
        { id: 'ap-3', productId: 'p1', groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 200, maxQty: 200, unitPrice: 0.35 },
        { id: 'ap-4', productId: 'p1', groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 300, maxQty: 300, unitPrice: 0.5 },
        { id: 'ap-5', productId: 'p1', groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 100, maxQty: 100, unitPrice: 0.8 },
        { id: 'ap-6', productId: 'p1', groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 200, maxQty: 200, unitPrice: 1.2 },
        { id: 'ap-7', productId: 'p1', groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 300, maxQty: 300, unitPrice: 1.5 },
      ]);

      const validDto = {
        tiers: [
          { groupCode: 'paper_stock', optionValue: '130_gsm', minQty: 100, maxQty: 100, unitPrice: 0.0 },
          { groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 100, maxQty: 100, unitPrice: 0.2 },
          { groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 200, maxQty: 200, unitPrice: 0.35 },
          { groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 300, maxQty: 300, unitPrice: 0.5 },
          { groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 100, maxQty: 100, unitPrice: 0.8 },
          { groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 200, maxQty: 200, unitPrice: 1.2 },
          { groupCode: 'paper_stock', optionValue: '350_gsm', minQty: 300, maxQty: 300, unitPrice: 1.5 },
        ],
      };

      const result = await service.saveAdditionalPricing('p1', validDto as any, 'admin-user-1');
      expect(result).toHaveLength(7);
      expect(prisma.productAdditionalPricing.deleteMany).toHaveBeenCalledWith({ where: { productId: 'p1' } });
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actorId: 'admin-user-1',
          action: 'PRODUCT_ADDITIONAL_PRICING_SAVED',
          entity: 'Product',
          entityId: 'p1',
        }),
      );
    });

    it('should retrieve additional pricing tiers for a product', async () => {
      jest.spyOn(service, 'getProductById').mockResolvedValue({ id: 'p1' } as any);
      prisma.productAdditionalPricing.findMany.mockResolvedValue([
        { id: 'ap-1', productId: 'p1', groupCode: 'paper_stock', optionValue: '170_gsm', minQty: 100, maxQty: 100, unitPrice: 0.2 },
      ]);

      const tiers = await service.getAdditionalPricing('p1');
      expect(tiers).toHaveLength(1);
      expect(tiers[0].optionValue).toBe('170_gsm');
    });
  });
});
