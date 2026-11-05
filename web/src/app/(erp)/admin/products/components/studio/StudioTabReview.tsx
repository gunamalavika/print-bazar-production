'use client';

import React, { useMemo, useState } from 'react';
import {
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiAlertFill,
  RiArrowRightLine,
  RiSparklingFill,
  RiSaveLine,
  RiFileTextLine,
  RiPlayCircleLine,
  RiCheckLine,
  RiCloseLine,
  RiPriceTag3Line,
  RiRefreshLine,
} from 'react-icons/ri';
import { ProductOptionGroup, ProductConfigurationRule, ProductCategoryItem, ProductAdditionalPricingTier } from '@/lib/api';
import { MatrixRowItem } from './StudioTabPricing';
import { formatCurrency } from '@/lib/utils';
import { validateArtworkConditions } from '@/lib/artwork-rule-resolver';

export type StudioTab = 'BASICS' | 'OPTIONS' | 'RULES' | 'ARTWORK' | 'PRICING' | 'REVIEW';

export interface PrePublishIssue {
  tab: StudioTab;
  field: string;
  message: string;
  severity: 'ERROR' | 'WARNING';
}

export interface StudioTabReviewProps {
  name: string;
  sku: string;
  slug: string;
  categoryId: string;
  categories: ProductCategoryItem[];
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  basePrice: number | string;
  pricingModel: string;
  minQuantity: number;
  maxQuantity: number;
  productionDays: number;
  imagesCount: number;
  optionGroups: ProductOptionGroup[];
  rules: ProductConfigurationRule[];
  artworkRequirement: string;
  artworkFileFormats: string[];
  designServiceRequirement: string;
  designServiceFee: number | string;
  matrixRows: MatrixRowItem[];
  additionalPricingRows?: ProductAdditionalPricingTier[];
  onNavigateToTab: (tab: StudioTab) => void;
  onSaveDraft: () => void;
  onPublish: () => void;
  isSaving: boolean;
}

export function StudioTabReview({
  name,
  sku,
  slug,
  categoryId,
  categories,
  status,
  basePrice,
  pricingModel,
  minQuantity,
  maxQuantity,
  productionDays,
  imagesCount,
  optionGroups,
  rules,
  artworkRequirement,
  artworkFileFormats,
  designServiceRequirement,
  designServiceFee,
  matrixRows,
  additionalPricingRows = [],
  onNavigateToTab,
  onSaveDraft,
  onPublish,
  isSaving,
}: StudioTabReviewProps) {
  // Comprehensive Pre-Publish Audit
  const auditIssues = useMemo(() => {
    const list: PrePublishIssue[] = [];

    // 1. Basics
    if (!name.trim()) {
      list.push({ tab: 'BASICS', field: 'name', message: 'Product title is required.', severity: 'ERROR' });
    }
    if (!sku.trim()) {
      list.push({ tab: 'BASICS', field: 'sku', message: 'SKU identifier is required.', severity: 'ERROR' });
    }
    if (!slug.trim()) {
      list.push({ tab: 'BASICS', field: 'slug', message: 'URL slug is required.', severity: 'ERROR' });
    }
    if (!categoryId) {
      list.push({ tab: 'BASICS', field: 'categoryId', message: 'Category must be assigned.', severity: 'ERROR' });
    }
    if (Number(basePrice) <= 0) {
      list.push({
        tab: 'BASICS',
        field: 'basePrice',
        message: 'Base price must be greater than ₹0.00.',
        severity: 'WARNING',
      });
    }
    if (imagesCount === 0) {
      list.push({
        tab: 'BASICS',
        field: 'images',
        message: 'No product images uploaded. Storefront listing will lack visual preview.',
        severity: 'WARNING',
      });
    }

    // 2. Options
    if (optionGroups.length === 0) {
      list.push({
        tab: 'OPTIONS',
        field: 'optionGroups',
        message: 'At least one option group should be configured for a printing product.',
        severity: 'WARNING',
      });
    }

    for (const group of optionGroups) {
      const activeChoices = group.options.filter((o) => o.isActive !== false);
      if (activeChoices.length === 0) {
        list.push({
          tab: 'OPTIONS',
          field: `group_${group.code}`,
          message: `Option group "${group.name}" has zero selected choices for this product.`,
          severity: 'ERROR',
        });
      }
      if (group.isRequired && !activeChoices.some((o) => o.isDefault)) {
        list.push({
          tab: 'OPTIONS',
          field: `group_default_${group.code}`,
          message: `Required option group "${group.name}" has no default choice set among selected choices.`,
          severity: 'ERROR',
        });
      }
      // Check duplicate values among active choices
      const valSet = new Set<string>();
      for (const opt of activeChoices) {
        if (valSet.has(opt.value)) {
          list.push({
            tab: 'OPTIONS',
            field: `group_dup_${group.code}`,
            message: `Duplicate choice code "${opt.value}" detected in group "${group.name}".`,
            severity: 'ERROR',
          });
        }
        valSet.add(opt.value);
      }
    }

    // 3. Step 3 — Option Dependencies & Rules Validation
    const groupCodes = new Set(optionGroups.map((g) => g.code));
    for (const r of rules) {
      if (
        r.actionType === 'ARTWORK_CONDITIONS' ||
        r.actionType === 'REQUIRE_ARTWORK_FILES' ||
        r.actionType === 'CONFIGURE_ARTWORK'
      ) {
        continue;
      }
      if (!groupCodes.has(r.conditionGroupCode)) {
        list.push({
          tab: 'RULES',
          field: `rule_orphan_${r.name}`,
          message: `Rule "${r.name}" references non-existent condition group "${r.conditionGroupCode}".`,
          severity: 'ERROR',
        });
      }
      if (r.targetGroupCode && !groupCodes.has(r.targetGroupCode)) {
        list.push({
          tab: 'RULES',
          field: `rule_target_${r.name}`,
          message: `Rule "${r.name}" targets non-existent option group "${r.targetGroupCode}".`,
          severity: 'ERROR',
        });
      }
    }

    // 4. Step 4 — Artwork Conditions & Design Matrix Validation
    const { errors: artworkErrors, warnings: artworkWarnings } = validateArtworkConditions(rules, optionGroups);
    for (const err of artworkErrors) {
      list.push({
        tab: 'ARTWORK',
        field: `artwork_conflict_${err.ruleName}`,
        message: err.message,
        severity: 'ERROR',
      });
    }
    for (const w of artworkWarnings) {
      list.push({
        tab: 'ARTWORK',
        field: `artwork_warning_${w.ruleName}`,
        message: w.message,
        severity: 'WARNING',
      });
    }

    // Design Pricing & Scope Validation
    for (const r of rules) {
      const p = (r.actionPayload as any) || {};
      if (p.designFee !== undefined && p.designFee !== null) {
        const feeNum = Number(p.designFee);
        if (isNaN(feeNum) || feeNum < 0) {
          list.push({
            tab: 'ARTWORK',
            field: `design_fee_negative_${r.name}`,
            message: `Rule "${r.name}" configures a negative design fee (₹${p.designFee}). All design fees must be non-negative.`,
            severity: 'ERROR',
          });
        }
      }
    }

    if (designServiceRequirement === 'REQUIRED') {
      const hasConfiguredFee = Number(designServiceFee) > 0 || rules.some((r) => {
        const p = (r.actionPayload as any) || {};
        return p.designFeeEnabled && Number(p.designFee) > 0;
      });
      if (!hasConfiguredFee) {
        list.push({
          tab: 'ARTWORK',
          field: 'missing_required_design_price',
          message: 'Product marks Design Service as REQUIRED, but no positive design fee is configured.',
          severity: 'ERROR',
        });
      }
    }

    // 5. Pricing Validation (Group-Driven & Combination Pricing)
    for (const group of optionGroups) {
      for (const opt of group.options) {
        if (Number(opt.priceModifier) < 0) {
          list.push({
            tab: 'PRICING',
            field: `opt_price_${opt.id}`,
            message: `Option "${opt.label}" in group "${group.name}" has a negative price modifier (₹${opt.priceModifier}). Additional charges must be non-negative.`,
            severity: 'ERROR',
          });
        }
      }
    }

    // Dynamic Additional Pricing Verification
    const eligibleAddonGroups = optionGroups.filter((g) => Boolean(g.enableAdditionalPricing));
    for (const group of eligibleAddonGroups) {
      const groupTiers = (additionalPricingRows || []).filter((t) => t.groupCode === group.code);
      if (groupTiers.length === 0) {
        list.push({
          tab: 'PRICING',
          field: `addon_missing_${group.code}`,
          message: `Option group "${group.name}" has Additional Pricing enabled, but no quantity tiers have been configured in Step 4 Pricing.`,
          severity: 'ERROR',
        });
      } else {
        const activeChoices = group.options.filter((o) => o.isActive !== false);
        for (const opt of activeChoices) {
          const optTiers = groupTiers.filter((t) => t.optionValue === opt.value);
          const isExplicitlyExcluded = optTiers.some((t) => t.isExcluded);
          if (!isExplicitlyExcluded) {
            for (const t of optTiers) {
              if (Number(t.unitPrice) < 0) {
                list.push({
                  tab: 'PRICING',
                  field: `addon_neg_${group.code}_${opt.value}`,
                  message: `Option "${opt.label}" in additional pricing group "${group.name}" has a negative tier rate (₹${t.unitPrice}). Charges must be non-negative.`,
                  severity: 'ERROR',
                });
              }
            }
          }
        }
      }
    }

    if (matrixRows.length === 0) {
      const needsMatrix = Number(basePrice) <= 0;
      if (needsMatrix) {
        list.push({
          tab: 'PRICING',
          field: 'matrixRows',
          message: 'Product has no base price and no pricing matrix entries. Configure combination rates in Step 4 — Pricing before publishing.',
          severity: 'ERROR',
        });
      }
    } else {
        // Group matrixRows by combinationKey
        const comboGroups = new Map<string, MatrixRowItem[]>();
        for (const row of matrixRows) {
          const c = (row.attributeCombination as any) || {};
          const keys = Object.keys(c)
            .filter(
              (k) =>
                ![
                  'discountPercent',
                  'label',
                  'offerName',
                  'isExcluded',
                  'status',
                  'exclusionReason',
                  'type',
                  'isBasePrice',
                  'price',
                  'totalPrice',
                  'quantity',
                ].includes(k),
            )
            .sort();
          const key = keys.map((k) => `${k}=${c[k]}`).join('|') || 'default';
          const existing = comboGroups.get(key) || [];
          existing.push(row);
          comboGroups.set(key, existing);
        }

        let unpricedCombos = 0;
        let invalidEntries = 0;
        let duplicateQtyCombos = 0;

        for (const [key, rows] of comboGroups.entries()) {
          const isExcluded = rows.some((r) => {
            const c = (r.attributeCombination as any) || {};
            return r.isExcluded || r.status === 'EXCLUDED' || c.isExcluded === true || c.status === 'EXCLUDED';
          });
          if (isExcluded) continue;

          // Valid priced rows
          const validRows = rows.filter((r) => {
            const c = (r.attributeCombination as any) || {};
            const qty = Number(r.minQty || c.quantity || 0);
            const price = Number(c.price ?? c.totalPrice ?? (Number(r.unitPrice || 0) * qty));
            return qty > 0 && price > 0;
          });

          if (validRows.length === 0) {
            unpricedCombos++;
          }

          // Check duplicate quantities and valid entries
          const qtySet = new Set<number>();
          for (const r of rows) {
            const c = (r.attributeCombination as any) || {};
            const qty = Number(r.minQty || c.quantity || 0);
            const price = Number(c.price ?? c.totalPrice ?? (Number(r.unitPrice || 0) * qty));
            if (qty <= 0 || price <= 0) {
              invalidEntries++;
            }
            if (qtySet.has(qty)) {
              duplicateQtyCombos++;
            }
            qtySet.add(qty);
          }
        }

        if (unpricedCombos > 0) {
          list.push({
            tab: 'PRICING',
            field: 'unpricedCombinations',
            message: `${unpricedCombos} active combination(s) have no configured quantity-price entries. Each purchasable combination must have at least one valid price in Step 4 — Pricing.`,
            severity: 'ERROR',
          });
        }

        if (invalidEntries > 0) {
          list.push({
            tab: 'PRICING',
            field: 'invalidPricingEntries',
            message: `${invalidEntries} pricing entries have non-positive quantities or prices (must be > 0).`,
            severity: 'ERROR',
          });
        }

        if (duplicateQtyCombos > 0) {
          list.push({
            tab: 'PRICING',
            field: 'duplicateQuantities',
            message: `Duplicate quantity entries detected within the same combination. Each quantity under a combination must be unique.`,
            severity: 'ERROR',
          });
        }
      }

    return list;
  }, [
    name,
    sku,
    slug,
    categoryId,
    basePrice,
    imagesCount,
    optionGroups,
    rules,
    artworkRequirement,
    artworkFileFormats,
    pricingModel,
    matrixRows,
  ]);

  const errorCount = auditIssues.filter((i) => i.severity === 'ERROR').length;
  const warningCount = auditIssues.filter((i) => i.severity === 'WARNING').length;
  const isValidToPublish = errorCount === 0;

  const currentCategory = categories.find((c) => c.id === categoryId);

  // Interactive Live Draft Simulator
  const [simulatorSelections, setSimulatorSelections] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const g of optionGroups) {
      const def = g.options.find((o) => o.isDefault && o.isActive) || g.options[0];
      if (def) init[g.code] = def.value;
    }
    return init;
  });

  const simEvaluation = useMemo(() => {
    const grpStatus: Record<string, { isHidden: boolean; isDisabled: boolean; isRequired: boolean; disabledReason?: string }> = {};
    const optStatus: Record<string, { isVisible: boolean; isDisabled: boolean }> = {};
    const artworkOverrides: any[] = [];
    const activeCharges = new Map<string, { chargeId: string; name: string; amount: number; calculationType: string; description?: string }>();

    for (const g of optionGroups) {
      grpStatus[g.code] = {
        isHidden: g.isCustomerVisible === false,
        isDisabled: false,
        isRequired: g.isRequired,
      };
    }

    for (const rule of rules) {
      if (!rule.isActive) continue;
      const currentVal = simulatorSelections[rule.conditionGroupCode];
      let conditionMet = false;

      if (currentVal !== undefined && currentVal !== null) {
        const strVal = String(currentVal).toLowerCase().trim();
        const ruleVal = String(rule.conditionOptionValue).toLowerCase().trim();

        if (rule.conditionOperator === 'EQUALS') {
          conditionMet = strVal === ruleVal;
        } else if (rule.conditionOperator === 'NOT_EQUALS') {
          conditionMet = strVal !== ruleVal;
        } else if (rule.conditionOperator === 'IN') {
          const arr = Array.isArray(rule.conditionOptionValue)
            ? rule.conditionOptionValue.map((v) => String(v).toLowerCase().trim())
            : String(rule.conditionOptionValue).split(',').map((s) => s.trim().toLowerCase());
          conditionMet = arr.includes(strVal);
        } else if (rule.conditionOperator === 'GREATER_THAN') {
          conditionMet = Number(strVal) > Number(ruleVal);
        } else if (rule.conditionOperator === 'LESS_THAN') {
          conditionMet = Number(strVal) < Number(ruleVal);
        }
      }

      if (rule.targetGroupCode && grpStatus[rule.targetGroupCode]) {
        switch (rule.actionType) {
          case 'HIDE':
            if (conditionMet) {
              if (rule.targetOptionValue) {
                optStatus[`${rule.targetGroupCode}:${rule.targetOptionValue}`] = { isVisible: false, isDisabled: false };
              } else {
                grpStatus[rule.targetGroupCode].isHidden = true;
              }
            }
            break;
          case 'SHOW':
            if (!conditionMet) {
              if (rule.targetOptionValue) {
                optStatus[`${rule.targetGroupCode}:${rule.targetOptionValue}`] = { isVisible: false, isDisabled: false };
              } else {
                grpStatus[rule.targetGroupCode].isHidden = true;
              }
            }
            break;
          case 'REQUIRE':
            if (conditionMet) grpStatus[rule.targetGroupCode].isRequired = true;
            break;
          case 'DISABLE':
            if (conditionMet) {
              if (rule.targetOptionValue) {
                optStatus[`${rule.targetGroupCode}:${rule.targetOptionValue}`] = { isVisible: true, isDisabled: true };
              } else {
                grpStatus[rule.targetGroupCode].isDisabled = true;
                grpStatus[rule.targetGroupCode].disabledReason = `Conditional on ${rule.conditionGroupCode}`;
              }
            }
            break;
        }
      }

      if (conditionMet) {
        if (rule.actionType === 'REQUIRE_ARTWORK_FILES') {
          artworkOverrides.push({ ...(rule.actionPayload || {}), artworkStatus: 'REQUIRED' });
        } else if (rule.actionType === 'CONFIGURE_ARTWORK') {
          if (rule.actionPayload && typeof rule.actionPayload === 'object') {
            artworkOverrides.push(rule.actionPayload);
          }
        } else if (rule.actionType === 'APPLY_CHARGE') {
          const payload = (rule.actionPayload as any) || {};
          const chargeId = payload.chargeId || `charge-${rule.id}`;
          activeCharges.set(chargeId, {
            chargeId,
            name: payload.name || rule.name,
            amount: Number(payload.amount || 0),
            calculationType: payload.calculationType || 'FIXED',
            description: payload.description,
          });
        } else if (rule.actionType === 'REMOVE_CHARGE') {
          const payload = (rule.actionPayload as any) || {};
          const chargeId = payload.chargeId || `charge-${rule.id}`;
          activeCharges.delete(chargeId);
        }
      }
    }

    // Combination matching
    const sortedKeys = Object.keys(simulatorSelections).sort();
    const matchingRows = matrixRows.filter((r) => {
      const c = (r.attributeCombination as any) || {};
      return sortedKeys.every((k) => String(c[k]) === String(simulatorSelections[k]));
    });

    const isComboExcluded = matchingRows.some((r) => {
      const c = (r.attributeCombination as any) || {};
      return r.isExcluded || r.status === 'EXCLUDED' || c.isExcluded === true || c.status === 'EXCLUDED';
    });

    const exclusionReason = matchingRows.find((r) => {
      const c = (r.attributeCombination as any) || {};
      return r.exclusionReason || c.exclusionReason;
    })?.exclusionReason;

    const availableQuantities = matchingRows
      .filter((r) => !isComboExcluded)
      .map((r) => {
        const c = (r.attributeCombination as any) || {};
        const qty = Number(r.minQty || c.quantity || 1);
        const price = Number(c.price ?? c.totalPrice ?? Number(r.unitPrice || 0) * qty);
        return { qty, price, unitPrice: price / Math.max(1, qty) };
      })
      .sort((a, b) => a.qty - b.qty);

    return {
      grpStatus,
      optStatus,
      artworkOverrides,
      appliedCharges: Array.from(activeCharges.values()),
      isComboExcluded,
      exclusionReason,
      availableQuantities,
    };
  }, [optionGroups, rules, matrixRows, simulatorSelections]);

  return (
    <div className="w-full space-y-6">
      {/* 1. Readiness Banner */}
      <div
        className={`p-6 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
          isValidToPublish
            ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
            : 'bg-rose-50 border-rose-200 text-rose-950'
        }`}
      >
        <div className="flex items-start gap-3">
          {isValidToPublish ? (
            <RiCheckboxCircleLine className="w-7 h-7 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <RiAlertFill className="w-7 h-7 text-rose-600 shrink-0 mt-0.5" />
          )}

          <div>
            <h3 className="text-base font-bold">
              {isValidToPublish
                ? 'Product is Ready for Storefront Publishing'
                : `Publishing Blocked: ${errorCount} Critical Error${errorCount > 1 ? 's' : ''}`}
            </h3>
            <p className="text-xs mt-1 text-slate-600">
              {isValidToPublish
                ? 'All mandatory identity, option, rule, artwork, and native pricing matrix validations have passed.'
                : 'Please resolve the critical errors below before making this product public on the customer storefront. (Draft saving is still available).'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-300 shadow-2xs transition disabled:opacity-50"
          >
            <RiSaveLine className="w-4 h-4 text-slate-600" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={onPublish}
            disabled={!isValidToPublish || isSaving}
            className={`flex items-center gap-1.5 font-bold text-xs px-5 py-2.5 rounded-lg border shadow-xs transition active:scale-95 cursor-pointer ${
              isValidToPublish
                ? 'bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] border-[#E3A008]/40'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            <RiSparklingFill className="w-4 h-4 text-amber-700" />
            <span>Publish Product Now</span>
          </button>
        </div>
      </div>

      {/* 2. Audit Issues List */}
      {auditIssues.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Validation Diagnostics ({auditIssues.length})
            </span>
            <div className="flex items-center gap-3 text-xs">
              <span className="text-rose-600 font-bold">{errorCount} Errors</span>
              <span>•</span>
              <span className="text-amber-600 font-bold">{warningCount} Warnings</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {auditIssues.map((issue, idx) => (
              <div
                key={idx}
                className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
              >
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      issue.severity === 'ERROR'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-900 border border-amber-200'
                    }`}
                  >
                    {issue.severity}
                  </span>
                  <span className="text-slate-800 font-medium">{issue.message}</span>
                </div>

                <button
                  type="button"
                  onClick={() => onNavigateToTab(issue.tab)}
                  className="text-xs font-semibold text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 shrink-0"
                >
                  <span>
                    Fix in{' '}
                    {issue.tab === 'BASICS'
                      ? 'Step 1: Basic Details'
                      : issue.tab === 'OPTIONS'
                      ? 'Step 2: Groups & Choices'
                      : issue.tab === 'RULES'
                      ? 'Step 3: Option Dependencies & Rules'
                      : issue.tab === 'ARTWORK'
                      ? 'Step 4: Artwork Upload & Design Matrix'
                      : issue.tab === 'PRICING'
                      ? 'Step 5: Pricing'
                      : issue.tab === 'REVIEW'
                      ? 'Step 6: Review & Publish'
                      : issue.tab}
                  </span>
                  <RiArrowRightLine className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2.5 Live Draft Configuration Simulator */}
      {optionGroups.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="p-5 bg-gradient-to-r from-amber-50/70 via-indigo-50/40 to-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <RiPlayCircleLine className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-display">
                  Live Draft Configuration Simulator
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Test conditional rules, effective visibility, triggered charges, and combination quantity pricing live using the actual rule evaluator.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                const init: Record<string, string> = {};
                for (const g of optionGroups) {
                  const def = g.options.find((o) => o.isDefault && o.isActive) || g.options[0];
                  if (def) init[g.code] = def.value;
                }
                setSimulatorSelections(init);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 rounded-lg text-xs font-bold transition shadow-2xs self-start sm:self-auto cursor-pointer"
            >
              <RiRefreshLine className="w-3.5 h-3.5 text-slate-500" />
              <span>Reset Selections</span>
            </button>
          </div>

          <div className="p-5 space-y-5">
            {/* Sample Option Pickers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {optionGroups.map((group) => {
                const grpMeta = simEvaluation.grpStatus[group.code];
                const isHidden = grpMeta?.isHidden;
                const isDisabled = grpMeta?.isDisabled;

                return (
                  <div
                    key={group.id}
                    className={`p-3 rounded-xl border transition-all ${
                      isHidden
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : isDisabled
                        ? 'bg-slate-50 border-slate-200'
                        : 'bg-white border-slate-200 shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] font-bold text-slate-700 truncate">{group.name}</span>
                      <div className="flex items-center gap-1">
                        {grpMeta?.isRequired && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Required
                          </span>
                        )}
                        {isHidden && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-200 text-slate-700">
                            Hidden
                          </span>
                        )}
                        {isDisabled && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                            Disabled
                          </span>
                        )}
                      </div>
                    </div>

                    <select
                      value={simulatorSelections[group.code] || ''}
                      onChange={(e) =>
                        setSimulatorSelections((prev) => ({ ...prev, [group.code]: e.target.value }))
                      }
                      disabled={isDisabled}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold focus:outline-none focus:border-indigo-600 disabled:opacity-60 cursor-pointer"
                    >
                      {group.options
                        .filter((opt) => opt.isActive !== false)
                        .map((opt) => {
                        const optKey = `${group.code}:${opt.value}`;
                        const optMeta = simEvaluation.optStatus[optKey];
                        const optHidden = optMeta?.isVisible === false;
                        const optDisabled = optMeta?.isDisabled;

                        return (
                          <option key={opt.id} value={opt.value} disabled={optDisabled || optHidden}>
                            {opt.label} {optHidden ? '(Hidden)' : optDisabled ? '(Disabled)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                );
              })}
            </div>

            {/* Evaluator Output Display */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-slate-100">
              {/* Combination Status & Available Quantities */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  Combination & Quantity Pricing
                </span>
                {simEvaluation.isComboExcluded ? (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-xs space-y-1">
                    <div className="font-bold flex items-center gap-1.5">
                      <RiCloseLine className="w-4 h-4 text-rose-600 stroke-[3]" />
                      <span>Incompatible Combination</span>
                    </div>
                    {simEvaluation.exclusionReason && (
                      <p className="text-[11px] text-rose-700">{simEvaluation.exclusionReason}</p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
                      <RiCheckLine className="w-4 h-4 stroke-[3]" />
                      <span>Valid Purchasable Combination</span>
                    </div>
                    {simEvaluation.availableQuantities.length > 0 ? (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-500 block">Configured Quantities:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {simEvaluation.availableQuantities.map((q) => (
                            <span
                              key={q.qty}
                              className="px-2 py-1 bg-white border border-slate-200 rounded text-[11px] font-mono text-slate-900 font-bold shadow-2xs"
                            >
                              {q.qty} pcs: ₹{q.price.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-2 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 font-medium">
                        ⚠️ No prices configured for this combination yet.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Triggered Conditional Additional Charges */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  Applicable Conditional Charges
                </span>
                {simEvaluation.appliedCharges.length > 0 ? (
                  <div className="space-y-1.5">
                    {simEvaluation.appliedCharges.map((ch) => (
                      <div
                        key={ch.chargeId}
                        className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-bold text-emerald-950 block truncate">{ch.name}</span>
                          <span className="text-[10px] text-emerald-800 font-mono">{ch.calculationType}</span>
                        </div>
                        <span className="font-mono font-bold text-emerald-900 shrink-0">
                          +₹{ch.amount}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic block">
                    No conditional charges triggered by current sample choices.
                  </span>
                )}
              </div>

              {/* Dynamic Artwork & Prepress Constraints */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/90 space-y-2">
                <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 block">
                  Active Artwork Constraints
                </span>
                {simEvaluation.artworkOverrides.length > 0 ? (
                  <div className="space-y-1.5 text-xs">
                    {simEvaluation.artworkOverrides.map((ovr, idx) => (
                      <div key={idx} className="p-2 bg-indigo-50 border border-indigo-200 rounded-lg text-indigo-950">
                        <span className="font-bold block">
                          Upload: {ovr.artworkStatus || 'CONFIGURED'} ({ovr.slotCount || 1} slots)
                        </span>
                        {ovr.slotLabels && (
                          <span className="text-[10px] text-indigo-800 block">
                            Slots: {ovr.slotLabels.join(', ')}
                          </span>
                        )}
                        {ovr.minMegapixels && (
                          <span className="text-[10px] text-indigo-800 font-mono block">
                            Min Resolution: {ovr.minMegapixels} MP
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-slate-600 space-y-1">
                    <div>
                      <span className="text-slate-400">Baseline Requirement:</span>{' '}
                      <strong className="font-semibold">{artworkRequirement}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400">Formats:</span>{' '}
                      <span className="font-mono text-[11px]">{artworkFileFormats.join(', ') || 'Default'}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Product Configuration Snapshot */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Core Specs */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            1. Core Specifications
          </span>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Name:</span>
              <span className="font-bold text-slate-900">{name || '—'}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">SKU:</span>
              <span className="text-slate-800">{sku || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Category:</span>
              <span className="text-slate-800">{currentCategory?.name || 'Unassigned'}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">Base Price:</span>
              <span className="font-bold text-slate-900">{formatCurrency(Number(basePrice))}</span>
            </div>
            <div className="flex justify-between font-mono">
              <span className="text-slate-500">SLA:</span>
              <span className="text-slate-800">{productionDays} days</span>
            </div>
          </div>
        </div>

        {/* Options & Rules */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            2. Options & Compatibility
          </span>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Option Groups:</span>
              <span className="font-bold text-slate-900">{optionGroups.length} attached</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Selected Choices:</span>
              <span className="text-slate-800 font-bold">
                {optionGroups.reduce((acc, g) => acc + g.options.filter((o) => o.isActive !== false).length, 0)} active
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Active Rules:</span>
              <span className="text-slate-800">{rules.filter((r) => r.isActive).length} rules</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Pricing Model:</span>
              <span className="font-mono font-bold text-slate-800 text-[11px] bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {pricingModel === 'SINGLE_FIXED_QUANTITY'
                  ? 'Single Fixed Quantity (Range Brackets: 1–10, 11–20, 21–50, 51–100 pcs)'
                  : 'Bulk Quantity Range (Discrete Fixed Tiers: 100, 1,000, 25,000 pcs)'}
              </span>
            </div>
          </div>
        </div>

        {/* Prepress & Artwork */}
        <div className="bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs space-y-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono block">
            3. Prepress & Design Service
          </span>
          <div className="space-y-1.5 pt-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Artwork Requirement:</span>
              <span className="font-bold text-slate-900">{artworkRequirement}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Allowed Formats:</span>
              <span className="font-mono text-slate-800">{artworkFileFormats.join(', ') || 'None'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Design Assistance:</span>
              <span className="text-slate-800">{designServiceRequirement}</span>
            </div>
            {Number(designServiceFee) > 0 && (
              <div className="flex justify-between font-mono">
                <span className="text-slate-500">Design Service Fee:</span>
                <span className="font-bold text-amber-700">+{formatCurrency(Number(designServiceFee))}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Step 6 Bottom Navigation & Publishing Action Bar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
        <div className="flex items-center gap-2">
          {onNavigateToTab && (
            <button
              type="button"
              onClick={() => {
                onNavigateToTab('PRICING');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition cursor-pointer"
            >
              ← Back to Step 5: Pricing
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs px-4 py-2.5 rounded-lg border border-slate-300 shadow-2xs transition disabled:opacity-50 cursor-pointer"
          >
            <RiSaveLine className="w-4 h-4 text-slate-600" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={onPublish}
            disabled={!isValidToPublish || isSaving}
            className={`flex items-center gap-1.5 font-bold text-xs px-5 py-2.5 rounded-lg border shadow-xs transition active:scale-95 cursor-pointer ${
              isValidToPublish
                ? 'bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] border-[#E3A008]/40'
                : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            <RiSparklingFill className="w-4 h-4 text-amber-700" />
            <span>Publish Product Now</span>
          </button>
        </div>
      </div>
    </div>
  );
}
