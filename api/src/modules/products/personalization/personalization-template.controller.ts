import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  Res,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { PersonalizationTemplateService } from './personalization-template.service';
import {
  CreatePersonalizationTemplateDto,
  UpdatePersonalizationTemplateDto,
  PersonalizationPayload,
} from './personalization-template.dto';
import { JwtAuthGuard, RolesGuard } from '../../../common/guards/auth.guard';
import { Roles } from '../../../common/decorators/auth.decorator';
import { UserRole } from '../../../common/types/roles';
import { PrismaService } from '../../prisma/prisma.service';

@Controller()
export class PersonalizationTemplateController {
  constructor(
    private readonly service: PersonalizationTemplateService,
    private readonly prisma: PrismaService,
  ) {}

  // ==========================================
  // ADMIN TEMPLATE LIBRARY CRUD ENDPOINTS
  // ==========================================

  @Get('admin/personalization-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN_MANAGER,
    UserRole.OPERATIONAL_MANAGER,
    UserRole.SALES_OFFICE,
  )
  async listAdminTemplates(
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.service.listTemplates({
      search,
      category,
      isActive: activeBool,
    });
  }

  @Get('admin/personalization-templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN_MANAGER,
    UserRole.OPERATIONAL_MANAGER,
    UserRole.SALES_OFFICE,
  )
  async getAdminTemplate(@Param('id') id: string) {
    return this.service.getTemplateById(id);
  }

  @Post('admin/personalization-templates')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async createTemplate(
    @Body() dto: CreatePersonalizationTemplateDto,
    @Req() req: any,
  ) {
    return this.service.createTemplate(dto, req.user?.sub);
  }

  @Put('admin/personalization-templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async updateTemplate(
    @Param('id') id: string,
    @Body() dto: UpdatePersonalizationTemplateDto,
    @Req() req: any,
  ) {
    return this.service.updateTemplate(id, dto, req.user?.sub);
  }

  @Delete('admin/personalization-templates/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER)
  async deleteTemplate(@Param('id') id: string, @Req() req: any) {
    return this.service.deleteTemplate(id, req.user?.sub);
  }

  @Post('admin/personalization-templates/:id/duplicate')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN_MANAGER, UserRole.OPERATIONAL_MANAGER)
  async duplicateTemplate(
    @Param('id') id: string,
    @Req() req: any,
    @Body('name') newName?: string,
  ) {
    return this.service.duplicateTemplate(id, newName, req.user?.sub);
  }

  // ==========================================
  // STOREFRONT / CATALOGUE CONSUMPTION
  // ==========================================

  @Get('catalogue/personalization-templates/:id')
  async getPublicTemplate(@Param('id') id: string) {
    const template = await this.service.getTemplateById(id);
    if (!template.isActive) {
      throw new NotFoundException(`Personalization template is inactive.`);
    }
    return template;
  }

  @Post('catalogue/personalization-templates/:id/validate')
  async validatePublicPayload(
    @Param('id') id: string,
    @Body()
    body: {
      quantity: number;
      payload: PersonalizationPayload;
      productConfigOverride?: any;
    },
  ) {
    const template = await this.service.getTemplateById(id);
    return this.service.validatePersonalization(
      template,
      Math.max(1, Number(body.quantity) || 1),
      body.payload,
      body.productConfigOverride,
    );
  }

  // ==========================================
  // PRODUCTION & OPERATIONS EXPORT
  // ==========================================

  @Get('admin/orders/:orderId/items/:itemId/personalization/records')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN_MANAGER,
    UserRole.OPERATIONAL_MANAGER,
    UserRole.PRODUCTION_OPERATOR,
    UserRole.SALES_OFFICE,
    UserRole.FINAL_QC_INSPECTOR,
  )
  async getItemPersonalizationRecords(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
  ) {
    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
      include: {
        personalizationRecords: {
          orderBy: { itemIndex: 'asc' },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException(`Order item '${itemId}' not found in order '${orderId}'.`);
    }

    return {
      orderId,
      itemId,
      productName: orderItem.productName,
      sku: orderItem.sku,
      quantity: orderItem.quantity,
      personalizationData: orderItem.personalizationData,
      records: orderItem.personalizationRecords,
    };
  }

  @Get('admin/orders/:orderId/items/:itemId/personalization/export')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.ADMIN_MANAGER,
    UserRole.OPERATIONAL_MANAGER,
    UserRole.PRODUCTION_OPERATOR,
    UserRole.SALES_OFFICE,
  )
  async exportItemPersonalizationCsv(
    @Param('orderId') orderId: string,
    @Param('itemId') itemId: string,
    @Res() res: Response,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { orderNumber: true },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found.`);
    }

    const orderItem = await this.prisma.orderItem.findFirst({
      where: { id: itemId, orderId },
      include: {
        personalizationRecords: {
          orderBy: { itemIndex: 'asc' },
        },
      },
    });

    if (!orderItem) {
      throw new NotFoundException(`Order item '${itemId}' not found.`);
    }

    const csvContent = this.service.generatePersonalizationCsv(
      order,
      orderItem,
      orderItem.personalizationRecords,
    );

    const filename = `personalization-${order.orderNumber}-${orderItem.sku}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`,
    );
    res.status(200).send(csvContent);
  }
}
