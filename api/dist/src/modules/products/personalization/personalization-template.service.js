"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PersonalizationTemplateService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PersonalizationTemplateService = class PersonalizationTemplateService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async listTemplates(filters) {
        const where = {
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
    async getTemplateById(id) {
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
            throw new common_1.NotFoundException(`Personalization template '${id}' not found.`);
        }
        return template;
    }
    async getTemplateByCode(code) {
        const template = await this.prisma.personalizationTemplate.findUnique({
            where: { code },
            include: {
                fields: {
                    orderBy: { sortOrder: 'asc' },
                },
            },
        });
        if (!template) {
            throw new common_1.NotFoundException(`Personalization template with code '${code}' not found.`);
        }
        return template;
    }
    async createTemplate(dto, actorId) {
        const cleanCode = (dto.code || dto.name)
            .toLowerCase()
            .replace(/[^a-z0-9_]+/g, '_')
            .replace(/^_+|_+$/g, '');
        const existing = await this.prisma.personalizationTemplate.findUnique({
            where: { code: cleanCode },
        });
        if (existing) {
            throw new common_1.ConflictException(`Personalization template with code '${cleanCode}' already exists.`);
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
                            validationRules: f.validationRules || null,
                            options: f.options || null,
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
    async updateTemplate(id, dto, actorId) {
        const existing = await this.prisma.personalizationTemplate.findUnique({
            where: { id },
            include: { fields: true },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Personalization template '${id}' not found.`);
        }
        if (dto.code && dto.code !== existing.code) {
            const cleanCode = dto.code.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
            const conflict = await this.prisma.personalizationTemplate.findUnique({
                where: { code: cleanCode },
            });
            if (conflict && conflict.id !== id) {
                throw new common_1.ConflictException(`Personalization template with code '${cleanCode}' already exists.`);
            }
        }
        return this.prisma.$transaction(async (tx) => {
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
            if (dto.fields) {
                const incomingFieldIds = dto.fields
                    .map((f) => f.id)
                    .filter((fId) => Boolean(fId));
                await tx.personalizationField.deleteMany({
                    where: {
                        templateId: id,
                        id: { notIn: incomingFieldIds },
                    },
                });
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
                                validationRules: f.validationRules || null,
                                options: f.options || null,
                                sortOrder: f.sortOrder ?? idx,
                            },
                        });
                    }
                    else {
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
                                validationRules: f.validationRules || null,
                                options: f.options || null,
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
    async deleteTemplate(id, actorId) {
        const existing = await this.prisma.personalizationTemplate.findUnique({
            where: { id },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Personalization template '${id}' not found.`);
        }
        return this.prisma.personalizationTemplate.delete({
            where: { id },
        });
    }
    async duplicateTemplate(id, newName, actorId) {
        const source = await this.getTemplateById(id);
        const baseName = newName || `${source.name} (Copy)`;
        let candidateCode = `${source.code}_copy`;
        let count = 1;
        while (count < 100 &&
            (await this.prisma.personalizationTemplate.findUnique({
                where: { code: candidateCode },
            }))) {
            count++;
            candidateCode = `${source.code}_copy_${count}`;
        }
        return this.createTemplate({
            name: baseName,
            code: candidateCode,
            description: source.description || undefined,
            category: source.category || undefined,
            isActive: source.isActive,
            fields: source.fields.map((f, idx) => ({
                name: f.name,
                code: f.code,
                inputType: f.inputType,
                scope: f.scope,
                isRequired: f.isRequired,
                placeholder: f.placeholder || undefined,
                helperText: f.helperText || undefined,
                defaultValue: f.defaultValue || undefined,
                validationRules: f.validationRules || undefined,
                options: f.options || undefined,
                sortOrder: idx,
            })),
        }, actorId);
    }
    validatePersonalization(template, quantity, payload, productOverrideConfig) {
        const errors = [];
        const fields = template.fields || [];
        const sharedFields = fields.filter((f) => f.scope === 'PER_ORDER');
        const perItemFields = fields.filter((f) => f.scope === 'PER_ITEM');
        const sanitizedShared = {};
        const sanitizedPerItem = [];
        const rawShared = payload?.sharedValues || {};
        for (const field of sharedFields) {
            const isReq = productOverrideConfig?.fieldOverrides?.[field.code]?.isRequired !== undefined
                ? Boolean(productOverrideConfig.fieldOverrides[field.code].isRequired)
                : productOverrideConfig?.requiredOverrides?.[field.code] !== undefined
                    ? Boolean(productOverrideConfig.requiredOverrides[field.code])
                    : field.isRequired;
            const rawVal = rawShared[field.code];
            const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
            if (isReq && !valStr) {
                errors.push(`Field '${field.name}' is required for this order.`);
            }
            else if (valStr) {
                this.validateFieldValue(field, rawVal, `Shared field '${field.name}'`, errors);
                sanitizedShared[field.code] = rawVal;
            }
            else {
                sanitizedShared[field.code] = '';
            }
        }
        if (perItemFields.length > 0) {
            const rawEntries = Array.isArray(payload?.perItemEntries) ? payload.perItemEntries : [];
            if (rawEntries.length !== quantity) {
                errors.push(`Per-item personalization requires exactly ${quantity} entries to match product quantity (received ${rawEntries.length}).`);
            }
            for (let idx = 0; idx < quantity; idx++) {
                const itemNumber = idx + 1;
                const entry = rawEntries[idx];
                const entryValues = entry?.values || {};
                const sanitizedItemValues = {};
                for (const field of perItemFields) {
                    const isReq = productOverrideConfig?.fieldOverrides?.[field.code]?.isRequired !== undefined
                        ? Boolean(productOverrideConfig.fieldOverrides[field.code].isRequired)
                        : productOverrideConfig?.requiredOverrides?.[field.code] !== undefined
                            ? Boolean(productOverrideConfig.requiredOverrides[field.code])
                            : field.isRequired;
                    const rawVal = entryValues[field.code];
                    const valStr = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
                    if (isReq && !valStr) {
                        errors.push(`Item #${itemNumber}: '${field.name}' is required.`);
                    }
                    else if (valStr) {
                        this.validateFieldValue(field, rawVal, `Item #${itemNumber} '${field.name}'`, errors);
                        sanitizedItemValues[field.code] = rawVal;
                    }
                    else {
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
    validateFieldValue(field, value, fieldLabel, errors) {
        const rules = field.validationRules || {};
        const strVal = String(value ?? '').trim();
        if (rules.minLength && strVal.length < Number(rules.minLength)) {
            errors.push(`${fieldLabel} must be at least ${rules.minLength} characters (current length: ${strVal.length}).`);
        }
        if (rules.maxLength && strVal.length > Number(rules.maxLength)) {
            errors.push(`${fieldLabel} must not exceed ${rules.maxLength} characters (current length: ${strVal.length}).`);
        }
        if (field.inputType === 'NUMBER') {
            const num = Number(value);
            if (isNaN(num)) {
                errors.push(`${fieldLabel} must be a valid number.`);
            }
            else {
                if (rules.minValue !== undefined && num < Number(rules.minValue)) {
                    errors.push(`${fieldLabel} must be at least ${rules.minValue}.`);
                }
                if (rules.maxValue !== undefined && num > Number(rules.maxValue)) {
                    errors.push(`${fieldLabel} must not exceed ${rules.maxValue}.`);
                }
            }
        }
        if (field.inputType === 'EMAIL' && strVal) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(strVal)) {
                errors.push(`${fieldLabel} must be a valid email address.`);
            }
        }
        if (field.inputType === 'PHONE' && strVal) {
            const phoneDigits = strVal.replace(/\D/g, '');
            if (phoneDigits.length < 7 || phoneDigits.length > 15) {
                errors.push(`${fieldLabel} must be a valid phone number (7-15 digits).`);
            }
        }
        if (rules.pattern && strVal) {
            try {
                const regex = new RegExp(rules.pattern);
                if (!regex.test(strVal)) {
                    errors.push(`${fieldLabel} does not match required format pattern.`);
                }
            }
            catch {
            }
        }
        if (field.inputType === 'SELECT' && Array.isArray(field.options) && field.options.length > 0 && strVal) {
            const allowed = field.options.map((o) => String(o.value ?? o.label));
            if (!allowed.includes(strVal)) {
                errors.push(`${fieldLabel} value '${strVal}' is not one of the allowed choices.`);
            }
        }
    }
    generatePersonalizationCsv(order, orderItem, records) {
        const pData = orderItem.personalizationData || {};
        const sharedValues = pData.sharedValues || records[0]?.sharedValues || {};
        const sharedKeys = Object.keys(sharedValues);
        const itemKeys = records.length > 0
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
        const escapeCsv = (val) => {
            if (val === undefined || val === null)
                return '""';
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
};
exports.PersonalizationTemplateService = PersonalizationTemplateService;
exports.PersonalizationTemplateService = PersonalizationTemplateService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PersonalizationTemplateService);
//# sourceMappingURL=personalization-template.service.js.map