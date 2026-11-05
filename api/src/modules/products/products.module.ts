import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { AdminCatalogueService } from './admin-catalogue.service';
import { AdminCatalogueController } from './admin-catalogue.controller';
import { AuditModule } from '../audit/audit.module';

import { PersonalizationTemplateService } from './personalization/personalization-template.service';
import { PersonalizationTemplateController } from './personalization/personalization-template.controller';

@Module({
  imports: [AuditModule],
  controllers: [
    ProductsController,
    AdminCatalogueController,
    PersonalizationTemplateController,
  ],
  providers: [
    ProductsService,
    AdminCatalogueService,
    PersonalizationTemplateService,
  ],
  exports: [
    ProductsService,
    AdminCatalogueService,
    PersonalizationTemplateService,
  ],
})
export class ProductsModule {}
