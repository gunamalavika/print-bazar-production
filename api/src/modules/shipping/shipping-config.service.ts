import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { UpdateShippingConfigurationDto } from './dto/shipping.dto';

@Injectable()
export class ShippingConfigService {
  private readonly logger = new Logger(ShippingConfigService.name);
  private static readonly CONFIG_ID = 'default';

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getConfiguration() {
    let config = await this.prisma.shippingConfiguration.findUnique({
      where: { id: ShippingConfigService.CONFIG_ID },
    });

    if (!config) {
      config = await this.prisma.shippingConfiguration.create({
        data: {
          id: ShippingConfigService.CONFIG_ID,
          businessName: 'PRINT BAZAAR 2.0',
          originAddress: '10/24 Industrial Estate, Peelamedu',
          originCity: 'Coimbatore',
          originState: 'Tamil Nadu',
          originCountry: 'India',
          originPincode: '641004',
          isWeightBasedEnabled: true,
          isPincodeZoneEnabled: true,
          minShippingCharge: 40.0,
          freeShippingThreshold: 2000.0,
          isFreeShippingEnabled: true,
          defaultPackagingWeightGrams: 200.0,
          gstRate: 18.0,
        },
      });
    }

    return config;
  }

  async updateConfiguration(dto: UpdateShippingConfigurationDto, actorId?: string) {
    const prev = await this.getConfiguration();

    const updated = await this.prisma.shippingConfiguration.upsert({
      where: { id: ShippingConfigService.CONFIG_ID },
      create: {
        id: ShippingConfigService.CONFIG_ID,
        ...dto,
      },
      update: {
        ...dto,
      },
    });

    await this.auditService.log({
      actorId,
      action: 'SHIPPING_CONFIG_UPDATED',
      entity: 'ShippingConfiguration',
      entityId: ShippingConfigService.CONFIG_ID,
      previousState: prev,
      newState: updated,
    });

    return updated;
  }
}

