import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreatePersonalizationTemplateDto,
  UpdatePersonalizationTemplateDto,
  PersonalizationPayload,
  PersonalizationItemEntry,
} from './personalization-template.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PersonalizationTemplateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * List all personalization templates with field counts and attached product counts
   */
  async listTemplates(filters?: {
    search?: string;
    category?: string;
    isActive?: boolean;
  }) {
    const where: Prisma.PersonalizationTemplateWhereInput = {
      ...(filters?.isActive !== undefined ? { isActive: filters.isActive } : {}),
      ...(filters?.category ? { category: filters.category } : {}),
      ...(filters?.search
        ? {
            OR: [
              { name: { contains: filters.search, mode: 'insensitive' } },
              { code: { contains: filters.search, mode: 'insensitive' } },
              { description: { contains: filters.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const templates = await this.prisma.personalizationTemplate.findMany({
      where,
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return templates.map((t) => ({
      ...t,
      productCount: t._count.products,
      sharedFieldsCount: t.fields.filter((f) => f.scope === 'PER_ORDER').length,
      perItemFieldsCount: t.fields.filter((f) => f.scope === 'PER_ITEM').length,
    }));
  }

  /**
   * Get template by ID with fields
   */
  async getTemplateById(id: string) {
    const template = await this.prisma.personalizationTemplate.findUnique({
      where: { id },
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
        products: {
          select: { id: true, name: true, sku: true, slug: true, isActive: true },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Personalization template '${id}' not found.`);
    }

    return template;
  }

  /**
   * Get template by stable code
   */
  async getTemplateByCode(code: string) {
    const template = await this.prisma.personalizationTemplate.findUnique({
      where: { code },
      include: {
        fields: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!template) {
      throw new NotFoundException(`Personalization template with code '${code}' not found.`);
    }

    return template;
  }

  /**
   * Create a new personalization template with fields
   */
  async createTemplate(dto: CreatePersonalizationTemplateDto, actorId?: string) {
    const cleanCode = (dto.code || dto.name)
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    const existing = await this.prisma.personalizationTemplate.findUnique({
      where: { code: cleanCode },
    });

    if (existing) {
      throw new ConflictException(
        `Personalization template with code '${cleanCode}' already exists.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const template = await tx.personalizationTemplate.create({
        data: {
          name: dto.name.trim(),
          code: cleanCode,
          description: dto.description?.trim() || null,
          category: dto.category?.trim() || 'GENERAL',
          isActive: dto.isActive !== false,
          fields: {
            create: (dto.fields || []).map((f, idx) => ({
              name: f.name.trim(),
              code: (f.code || f.name).toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
              inputType: f.inputType || 'TEXT',
              scope: f.scope || 'PER_ORDER',
              isRequired: f.isRequired !== false,
              placeholder: f.placeholder?.trim() || null,
              helperText: f.helperText?.trim() || null,
              defaultValue: f.defaultValue?.trim() || null,
              validationRules: (f.validationRules as any) || null,
              options: (f.options as any) || null,
              sortOrder: f.sortOrder ?? idx,
            })),
          },
        },
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });

      return template;
    });
  }

  /**
   * Update personalization template and synchronize fields
   */
  async updateTemplate(
    id: string,
    dto: UpdatePersonalizationTemplateDto,
    actorId?: string,
  ) {
    const existing = await this.prisma.personalizationTemplate.findUnique({
      where: { id },
      include: { fields: true },
    });

    if (!existing) {
      throw new NotFoundException(`Personalization template '${id}' not found.`);
    }

    if (dto.code && dto.code !== existing.code) {
      const cleanCode = dto.code.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const conflict = await this.prisma.personalizationTemplate.findUnique({
        where: { code: cleanCode },
      });
      if (conflict && conflict.id !== id) {
        throw new ConflictException(
          `Personalization template with code '${cleanCode}' already exists.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update core template info
      const updated = await tx.personalizationTemplate.update({
        where: { id },
        data: {
          ...(dto.name ? { name: dto.name.trim() } : {}),
          ...(dto.code ? { code: dto.code.toLowerCase().replace(/[^a-z0-9_]+/g, '_') } : {}),
          ...(dto.description !== undefined ? { description: dto.description?.trim() || null } : {}),
          ...(dto.category ? { category: dto.category.trim() } : {}),
          ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        },
      });

      // 2. Synchronize fields if supplied
      if (dto.fields) {
        // Delete omitted fields
        const incomingFieldIds = dto.fields
          .map((f) => f.id)
          .filter((fId): fId is string => Boolean(fId));

        await tx.personalizationField.deleteMany({
          where: {
            templateId: id,
            id: { notIn: incomingFieldIds },
          },
        });

        // Upsert fields
        for (let idx = 0; idx < dto.fields.length; idx++) {
          const f = dto.fields[idx];
          const fieldCode = (f.code || f.name || `field_${idx}`)
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, '_');

          if (f.id && existing.fields.some((ef) => ef.id === f.id)) {
            await tx.personalizationField.update({
              where: { id: f.id },
              data: {
                name: f.name?.trim(),
                code: fieldCode,
                inputType: f.inputType || 'TEXT',
                scope: f.scope || 'PER_ORDER',
                isRequired: f.isRequired !== false,
                placeholder: f.placeholder?.trim() || null,
                helperText: f.helperText?.trim() || null,
                defaultValue: f.defaultValue?.trim() || null,
                validationRules: (f.validationRules as any) || null,
                options: (f.options as any) || null,
                sortOrder: f.sortOrder ?? idx,
              },
            });
          } else {
            await tx.personalizationField.create({
              data: {
                templateId: id,
                name: f.name?.trim() || 'Custom Field',
                code: fieldCode,
                inputType: f.inputType || 'TEXT',
                scope: f.scope || 'PER_ORDER',
                isRequired: f.isRequired !== false,
                placeholder: f.placeholder?.trim() || null,
                helperText: f.helperText?.trim() || null,
                defaultValue: f.defaultValue?.trim() || null,
                validationRules: (f.validationRules as any) || null,
                options: (f.options as any) || null,
                sortOrder: f.sortOrder ?? idx,
              },
            });
          }
        }
      }

      return tx.personalizationTemplate.findUnique({
        where: { id },
        include: {
          fields: {
            orderBy: { sortOrder: 'asc' },
          },
        },
      });
    });
  }

  /**
   * Delete a template
   */
  async deleteTemplate(id: string, actorId?: string) {
    const existing = await this.prisma.personalizationTemplate.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException(`Personalization template '${id}' not found.`);
    }

    return this.prisma.personalizationTemplate.delete({
      where: { id },
    });
  }

  /**
   * Duplicate a template
   */
  async duplicateTemplate(id: string, newName?: string, actorId?: string) {
    const source = await this.getTemplateById(id);

    const baseName = newName || `${source.name} (Copy)`;
    let candidateCode = `${source.code}_copy`;
    let count = 1;

    while (
      count < 100 &&
      (await this.prisma.personalizationTemplate.findUnique({
        where: { code: candidateCode },
      }))
    ) {
      count++;
      candidateCode = `${source.code}_copy_${count}`;
    }

    return this.createTemplate(
      {
        name: baseName,
        code: candidateCode,
        description: source.description || undefined,
        category: source.category || undefined,
        isActive: source.isActive,
        fields: source.fields.map((f, idx) => ({
          name: f.name,
          code: f.code,
          inputType: f.inputType as any,
          scope: f.scope as any,
          isRequired: f.isRequired,
          placeholder: f.placeholder || undefined,
          helperText: f.helperText || undefined,
          defaultValue: f.defaultValue || undefined,
          validationRules: (f.validationRules as any) || undefined,
          options: (f.options as any) || undefined,
          sortOrder: idx,
        })),
      },
      actorId,
    );
  }

  /**
   * Authoritative validation for personalization payload against template requirements
   */
  validatePersonalization(
    template: {
      id: string;
      name: string;
      code: string;
      fields: Array<{
        id: string;
        name: string;
        code: string;
        inputType: string;
        scope: string;
        isRequired: boolean;
        validationRules?: any;
        options?: any;
      }>;
    },
    quantity: number,
    payload: PersonalizationPayload | null | undefined,
    productOverrideConfig?: any,
  ): {
    isValid: boolean;
    errors: string[];
    sanitized: PersonalizationPayload;
  } {
    const errors: string[] = [];
    const fields = template.fields || [];

    const sharedFields = fields.filter((f) => f.scope === 'PER_ORDER');
    const perItemFields = fields.filter((f) => f.scope === 'PER_ITEM');

    const sanitizedShared: Record<string, any> = {};
    const sanitizedPerItem: PersonalizationItemEntry[] = [];

    const rawShared = payload?.sharedValues || {};

    // 1. Validate Shared (PER_ORDER) Fields
    for (const field of sharedFields) {
      const isReq =
        productOverrideConfig?.fieldOverrides?.[field.code]?.isRequired !== undefined
          ? Boolean(productOverrideConfig.fieldOverrides[field.code].isRequired)
          : productOverrideConfig?.requiredOverrides?.[field.code] !== undefined
          ? Boolean(productOverrideConfig.requiredOverrides[field.code])
          : field.isRequired;

      const rawVal = rawShared[field.code];
      const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

      if (isReq && !valStr) {
        errors.push(`Field '${field.name}' is required for this order.`);
      } else if (valStr) {
        // Validate rules
        this.validateFieldValue(field, rawVal, `Shared field '${field.name}'`, errors);
        sanitizedShared[field.code] = rawVal;
      } else {
        sanitizedShared[field.code] = '';
      }
    }

    // 2. Validate Per-Item (PER_ITEM) Fields if template has per-item fields
    if (perItemFields.length > 0) {
      const rawEntries = Array.isArray(payload?.perItemEntries) ? payload!.perItemEntries : [];

      if (rawEntries.length !== quantity) {
        errors.push(
          `Per-item personalization requires exactly ${quantity} entries to match product quantity (received ${rawEntries.length}).`,
        );
      }

      for (let idx = 0; idx < quantity; idx++) {
        const itemNumber = idx + 1;
        const entry = rawEntries[idx];
        const entryValues = entry?.values || {};
        const sanitizedItemValues: Record<string, any> = {};

        for (const field of perItemFields) {
          const isReq =
            productOverrideConfig?.fieldOverrides?.[field.code]?.isRequired !== undefined
              ? Boolean(productOverrideConfig.fieldOverrides[field.code].isRequired)
              : productOverrideConfig?.requiredOverrides?.[field.code] !== undefined
              ? Boolean(productOverrideConfig.requiredOverrides[field.code])
              : field.isRequired;

          const rawVal = entryValues[field.code];
          const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';

          if (isReq && !valStr) {
            errors.push(
              `Item #${itemNumber}: '${field.name}' is required.`,
            );
          } else if (valStr) {
            this.validateFieldValue(field, rawVal, `Item #${itemNumber} '${field.name}'`, errors);
            sanitizedItemValues[field.code] = rawVal;
          } else {
            sanitizedItemValues[field.code] = '';
          }
        }

        sanitizedPerItem.push({
          itemIndex: itemNumber,
          variantCombination: entry?.variantCombination || undefined,
          values: sanitizedItemValues,
        });
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      sanitized: {
        templateId: template.id,
        templateCode: template.code,
        sharedValues: sanitizedShared,
        perItemEntries: sanitizedPerItem,
      },
    };
  }

  /**
   * Helper to validate field constraints
   */
  private validateFieldValue(
    field: {
      name: string;
      code: string;
      inputType: string;
      validationRules?: any;
      options?: any;
    },
    value: any,
    fieldLabel: string,
    errors: string[],
  ) {
    const rules = field.validationRules || {};
    const strVal = String(value ?? '').trim();

    // String length checks
    if (rules.minLength && strVal.length < Number(rules.minLength)) {
      errors.push(
        `${fieldLabel} must be at least ${rules.minLength} characters (current length: ${strVal.length}).`,
      );
    }
    if (rules.maxLength && strVal.length > Number(rules.maxLength)) {
      errors.push(
        `${fieldLabel} must not exceed ${rules.maxLength} characters (current length: ${strVal.length}).`,
      );
    }

    // Number checks
    if (field.inputType === 'NUMBER') {
      const num = Number(value);
      if (isNaN(num)) {
        errors.push(`${fieldLabel} must be a valid number.`);
      } else {
        if (rules.minValue !== undefined && num < Number(rules.minValue)) {
          errors.push(`${fieldLabel} must be at least ${rules.minValue}.`);
        }
        if (rules.maxValue !== undefined && num > Number(rules.maxValue)) {
          errors.push(`${fieldLabel} must not exceed ${rules.maxValue}.`);
        }
      }
    }

    // Email check
    if (field.inputType === 'EMAIL' && strVal) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(strVal)) {
        errors.push(`${fieldLabel} must be a valid email address.`);
      }
    }

    // Phone check
    if (field.inputType === 'PHONE' && strVal) {
      const phoneDigits = strVal.replace(/\D/g, '');
      if (phoneDigits.length < 7 || phoneDigits.length > 15) {
        errors.push(`${fieldLabel} must be a valid phone number (7-15 digits).`);
      }
    }

    // Regex pattern check
    if (rules.pattern && strVal) {
      try {
        const regex = new RegExp(rules.pattern);
        if (!regex.test(strVal)) {
          errors.push(`${fieldLabel} does not match required format pattern.`);
        }
      } catch {
        // Ignore invalid regex in config safely
      }
    }

    // Select options check
    if (field.inputType === 'SELECT' && Array.isArray(field.options) && field.options.length > 0 && strVal) {
      const allowed = field.options.map((o: any) => String(o.value ?? o.label));
      if (!allowed.includes(strVal)) {
        errors.push(`${fieldLabel} value '${strVal}' is not one of the allowed choices.`);
      }
    }
  }

  /**
   * Generate CSV format for production floor export
   */
  generatePersonalizationCsv(
    order: { orderNumber: string },
    orderItem: {
      productName: string;
      sku: string;
      quantity: number;
      specifications?: any;
      personalizationData?: any;
    },
    records: Array<{
      itemIndex: number;
      variantCombination?: any;
      fieldValues: any;
      sharedValues?: any;
      status: string;
    }>,
  ): string {
    const pData = orderItem.personalizationData || {};
    const sharedValues = pData.sharedValues || records[0]?.sharedValues || {};

    const sharedKeys = Object.keys(sharedValues);
    const itemKeys =
      records.length > 0
        ? Object.keys(records[0].fieldValues || {})
        : [];

    const headers = [
      'Order Number',
      'Item #',
      'Product Name',
      'SKU',
      'Variant',
      ...sharedKeys.map((k) => `Shared: ${k}`),
      ...itemKeys.map((k) => `Per-Item: ${k}`),
      'Production Status',
    ];

    const escapeCsv = (val: any) => {
      if (val === undefined || val === null) return '""';
      const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    };

    const rows = records.map((rec) => {
      const variantStr = rec.variantCombination
        ? Object.entries(rec.variantCombination)
            .map(([k, v]) => `${k}:${v}`)
            .join(' | ')
        : 'Standard';

      const rowValues = [
        escapeCsv(order.orderNumber),
        escapeCsv(rec.itemIndex),
        escapeCsv(orderItem.productName),
        escapeCsv(orderItem.sku),
        escapeCsv(variantStr),
        ...sharedKeys.map((k) => escapeCsv(rec.sharedValues?.[k] ?? sharedValues[k] ?? '')),
        ...itemKeys.map((k) => escapeCsv(rec.fieldValues?.[k] ?? '')),
        escapeCsv(rec.status),
      ];

      return rowValues.join(',');
    });

    return [headers.join(','), ...rows].join('\r\n');
  }
}
