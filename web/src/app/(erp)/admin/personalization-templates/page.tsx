'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  api,
  PersonalizationTemplate,
  PersonalizationField,
  PersonalizationInputType,
  PersonalizationScope,
} from '@/lib/api';
import {
  RiFileList3Line,
  RiAddLine,
  RiSearch2Line,
  RiDeleteBin7Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiCheckLine,
  RiCloseLine,
  RiEditLine,
  RiFileCopyLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiRefreshLine,
  RiInputMethodLine,
  RiSettings4Line,
  RiListCheck2,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiCalendarEventLine,
  RiEyeLine,
  RiGroupLine,
  RiUpload2Line,
  RiMagicLine,
  RiHeartLine,
  RiAwardLine,
  RiCakeLine,
  RiImageLine,
  RiMailLine,
  RiTShirtLine,
  RiStarLine,
  RiBox3Line,
} from 'react-icons/ri';

const INPUT_TYPE_OPTIONS: { label: string; value: PersonalizationInputType; desc: string }[] = [
  { label: 'Single Line Text', value: 'TEXT', desc: 'Names, short captions, greetings' },
  { label: 'Multi-line Text Area', value: 'TEXTAREA', desc: 'Personal messages, verses, long inscriptions' },
  { label: 'Numeric Value', value: 'NUMBER', desc: 'Table number, age, years, jersey number' },
  { label: 'Calendar Date', value: 'DATE', desc: 'Wedding date, birthday, anniversary date' },
  { label: 'Email Address', value: 'EMAIL', desc: 'Recipient notifications, e-vouchers' },
  { label: 'Phone Number', value: 'PHONE', desc: 'Contact numbers, SMS delivery alerts' },
  { label: 'Predefined Dropdown', value: 'SELECT', desc: 'Font style, theme accent, orientation choices' },
];

const PRESET_TEMPLATES: Array<{
  name: string;
  category: string;
  description: string;
  fields: Array<Omit<PersonalizationField, 'id' | 'templateId'>>;
}> = [
  {
    name: 'Wedding Keepsake Frame',
    category: 'Wedding & Keepsakes',
    description: 'Shared couple details, wedding date, venue, with personalized recipient names per frame',
    fields: [
      {
        name: 'Bride Name',
        code: 'bride_name',
        inputType: 'TEXT',
        scope: 'PER_ORDER',
        isRequired: true,
        placeholder: 'e.g. Priya Sharma',
        helperText: 'Will appear on the top banner of all frames',
      },
      {
        name: 'Groom Name',
        code: 'groom_name',
        inputType: 'TEXT',
        scope: 'PER_ORDER',
        isRequired: true,
        placeholder: 'e.g. Rahul Verma',
        helperText: 'Will appear on the top banner of all frames',
      },
      {
        name: 'Wedding Date',
        code: 'wedding_date',
        inputType: 'DATE',
        scope: 'PER_ORDER',
        isRequired: true,
        helperText: 'Commemoration date engraved or printed on the frame',
      },
      {
        name: 'Venue / City',
        code: 'venue_city',
        inputType: 'TEXT',
        scope: 'PER_ORDER',
        isRequired: false,
        placeholder: 'e.g. Udaipur Palace',
      },
      {
        name: 'Guest / Recipient Name',
        code: 'recipient_name',
        inputType: 'TEXT',
        scope: 'PER_ITEM',
        isRequired: true,
        placeholder: 'e.g. Uncle David & Family',
        helperText: 'Unique name printed on each individual frame for every quantity ordered',
      },
      {
        name: 'Table / Seating Number',
        code: 'table_number',
        inputType: 'NUMBER',
        scope: 'PER_ITEM',
        isRequired: false,
        placeholder: 'e.g. 12',
      },
    ],
  },
  {
    name: 'Birthday & Milestone Keepsake',
    category: 'Birthday & Milestones',
    description: 'Celebrant details, milestone age, and custom gift notes per recipient',
    fields: [
      {
        name: 'Celebrant Name',
        code: 'celebrant_name',
        inputType: 'TEXT',
        scope: 'PER_ORDER',
        isRequired: true,
        placeholder: 'e.g. Aryan Malhotra',
      },
      {
        name: 'Milestone / Turning Age',
        code: 'milestone_age',
        inputType: 'NUMBER',
        scope: 'PER_ORDER',
        isRequired: true,
        placeholder: 'e.g. 21',
      },
      {
        name: 'Celebration Date',
        code: 'celebration_date',
        inputType: 'DATE',
        scope: 'PER_ORDER',
        isRequired: false,
      },
      {
        name: 'Personal Inscription / Note',
        code: 'personal_note',
        inputType: 'TEXTAREA',
        scope: 'PER_ITEM',
        isRequired: true,
        placeholder: 'Custom memory or message for this specific piece',
        validationRules: { maxLength: 200 },
      },
    ],
  },
  {
    name: 'Corporate Memento & Plaque',
    category: 'Corporate & Awards',
    description: 'Company event branding with individual employee names, titles, and departments',
    fields: [
      {
        name: 'Event / Award Title',
        code: 'award_title',
        inputType: 'TEXT',
        scope: 'PER_ORDER',
        isRequired: true,
        placeholder: 'e.g. Annual Excellence Awards 2026',
      },
      {
        name: 'Corporate Sponsor / Division',
        code: 'corporate_division',
        inputType: 'TEXT',
        scope: 'PER_ORDER',
        isRequired: false,
        placeholder: 'e.g. Engineering & Product Group',
      },
      {
        name: 'Awardee Full Name',
        code: 'awardee_name',
        inputType: 'TEXT',
        scope: 'PER_ITEM',
        isRequired: true,
        placeholder: 'e.g. Sneha Kulkarni',
      },
      {
        name: 'Designation / Department',
        code: 'designation',
        inputType: 'TEXT',
        scope: 'PER_ITEM',
        isRequired: true,
        placeholder: 'e.g. Lead Cloud Architect',
      },
    ],
  },
];

// Icon resolver for horizontal selector cards and editor header
const getTemplateIcon = (name: string, category?: string | null) => {
  const n = (name + ' ' + (category || '')).toLowerCase();
  if (n.includes('wedding') || n.includes('couple') || n.includes('bride') || n.includes('groom')) return RiHeartLine;
  if (n.includes('award') || n.includes('memento') || n.includes('trophy') || n.includes('plaque') || n.includes('corporate')) return RiAwardLine;
  if (n.includes('birth') || n.includes('baby') || n.includes('party')) return RiCakeLine;
  if (n.includes('photo') || n.includes('frame') || n.includes('canvas')) return RiImageLine;
  if (n.includes('card') || n.includes('invite') || n.includes('greeting')) return RiMailLine;
  if (n.includes('apparel') || n.includes('tshirt') || n.includes('shirt') || n.includes('jersey')) return RiTShirtLine;
  if (n.includes('calendar') || n.includes('date')) return RiCalendarEventLine;
  if (n.includes('box') || n.includes('pack')) return RiBox3Line;
  if (n.includes('star') || n.includes('gold')) return RiStarLine;
  return RiFileList3Line;
};

type EditorTab = 'settings' | 'fields' | 'simulator';

export default function PersonalizationTemplatesPage() {
  const [templates, setTemplates] = useState<PersonalizationTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<EditorTab>('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form State for Selected / New Template
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formFields, setFormFields] = useState<PersonalizationField[]>([]);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Field Edit Modal
  const [editingFieldIdx, setEditingFieldIdx] = useState<number | null>(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [fName, setFName] = useState('');
  const [fCode, setFCode] = useState('');
  const [fInputType, setFInputType] = useState<PersonalizationInputType>('TEXT');
  const [fScope, setFScope] = useState<PersonalizationScope>('PER_ORDER');
  const [fIsRequired, setFIsRequired] = useState(true);
  const [fPlaceholder, setFPlaceholder] = useState('');
  const [fHelperText, setFHelperText] = useState('');
  const [fDefaultValue, setFDefaultValue] = useState('');
  const [fMinLength, setFMinLength] = useState<string>('');
  const [fMaxLength, setFMaxLength] = useState<string>('');
  const [fMinValue, setFMinValue] = useState<string>('');
  const [fMaxValue, setFMaxValue] = useState<string>('');
  const [fPattern, setFPattern] = useState<string>('');
  const [fOptionsRaw, setFOptionsRaw] = useState<string>('');

  // Simulator State
  const [simQty, setSimQty] = useState<number>(3);
  const [simShared, setSimShared] = useState<Record<string, string>>({});
  const [simPerItem, setSimPerItem] = useState<Array<Record<string, string>>>([{}, {}, {}]);
  const [simValidationErrors, setSimValidationErrors] = useState<string[]>([]);
  const [simBulkText, setSimBulkText] = useState('');
  const [isSimBulkOpen, setIsSimBulkOpen] = useState(false);

  // Delete modal
  const [deleteConfirmTemplate, setDeleteConfirmTemplate] = useState<PersonalizationTemplate | null>(null);

  // Horizontal Scroll Ref
  const selectorRef = useRef<HTMLDivElement>(null);

  // Fetch templates on mount
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async (selectId?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const data = await api.adminListPersonalizationTemplates();
      setTemplates(data);

      if (data.length > 0) {
        const target = selectId ? data.find((t) => t.id === selectId) : data[0];
        selectTemplate(target || data[0]);
      } else {
        setSelectedTemplateId(null);
        resetForm();
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to fetch personalization templates.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectTemplate = (tmpl: PersonalizationTemplate) => {
    setIsCreatingNew(false);
    setSelectedTemplateId(tmpl.id);
    setFormName(tmpl.name);
    setFormCode(tmpl.code);
    setFormCategory(tmpl.category || '');
    setFormDescription(tmpl.description || '');
    setFormIsActive(tmpl.isActive);
    setFormFields(tmpl.fields || []);
    setErrorMsg(null);
    setSuccessMsg(null);
    resetSimulator(tmpl.fields || [], 3);
  };

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormCategory('General');
    setFormDescription('');
    setFormIsActive(true);
    setFormFields([]);
  };

  const handleStartCreateNew = () => {
    setIsCreatingNew(true);
    setSelectedTemplateId(null);
    resetForm();
    setErrorMsg(null);
    setSuccessMsg(null);
    setActiveTab('settings');
    resetSimulator([], 3);
  };

  const handleApplyPreset = (preset: (typeof PRESET_TEMPLATES)[0]) => {
    setFormName(preset.name);
    setFormCode(preset.name.toLowerCase().replace(/[^a-z0-9_]+/g, '_'));
    setFormCategory(preset.category);
    setFormDescription(preset.description);
    const mapped = preset.fields.map((f, idx) => ({
      ...f,
      sortOrder: idx,
    }));
    setFormFields(mapped);
    resetSimulator(mapped as any, 3);
    setSuccessMsg(`Preset '${preset.name}' loaded successfully into editor!`);
  };

  const resetSimulator = (fields: PersonalizationField[], qty: number) => {
    setSimQty(qty);
    const shared: Record<string, string> = {};
    fields.filter((f) => f.scope === 'PER_ORDER').forEach((f) => {
      shared[f.code] = f.defaultValue || '';
    });
    setSimShared(shared);

    const items: Array<Record<string, string>> = [];
    for (let i = 0; i < qty; i++) {
      const row: Record<string, string> = {};
      fields.filter((f) => f.scope === 'PER_ITEM').forEach((f) => {
        row[f.code] = '';
      });
      items.push(row);
    }
    setSimPerItem(items);
    setSimValidationErrors([]);
  };

  const handleSimQtyChange = (newQty: number) => {
    const q = Math.max(1, Math.min(200, newQty));
    setSimQty(q);
    const perItemFields = formFields.filter((f) => f.scope === 'PER_ITEM');

    const nextItems: Array<Record<string, string>> = [];
    for (let i = 0; i < q; i++) {
      if (simPerItem[i]) {
        nextItems.push(simPerItem[i]);
      } else {
        const row: Record<string, string> = {};
        perItemFields.forEach((f) => {
          row[f.code] = '';
        });
        nextItems.push(row);
      }
    }
    setSimPerItem(nextItems);
  };

  const handleSimBulkApply = () => {
    const lines = simBulkText
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    const perItemFields = formFields.filter((f) => f.scope === 'PER_ITEM');
    if (perItemFields.length === 0) {
      setErrorMsg('Template does not have any PER_ITEM fields to populate.');
      return;
    }

    if (lines.length === 0) {
      setErrorMsg('Please enter at least one line of text or CSV.');
      return;
    }

    setSimQty(lines.length);
    const newItems: Array<Record<string, string>> = [];

    lines.forEach((line) => {
      const parts = line.includes('\t') ? line.split('\t') : line.split(',');
      const row: Record<string, string> = {};
      perItemFields.forEach((f, idx) => {
        row[f.code] = (parts[idx] || '').trim();
      });
      newItems.push(row);
    });

    setSimPerItem(newItems);
    setIsSimBulkOpen(false);
    setSimBulkText('');
    setSuccessMsg(`Imported ${lines.length} roster items successfully!`);
  };

  const handleRunSimulatorValidation = () => {
    const errors: string[] = [];
    const sharedFields = formFields.filter((f) => f.scope === 'PER_ORDER');
    const perItemFields = formFields.filter((f) => f.scope === 'PER_ITEM');

    sharedFields.forEach((f) => {
      const val = (simShared[f.code] || '').trim();
      if (f.isRequired && !val) {
        errors.push(`Shared field '${f.name}' is required.`);
      }
      if (val && f.validationRules?.minLength && val.length < f.validationRules.minLength) {
        errors.push(`'${f.name}' must be at least ${f.validationRules.minLength} characters.`);
      }
    });

    if (perItemFields.length > 0) {
      if (simPerItem.length !== simQty) {
        errors.push(`Per-item entries count (${simPerItem.length}) must match product quantity (${simQty}).`);
      }
      simPerItem.forEach((item, idx) => {
        const itemNum = idx + 1;
        perItemFields.forEach((f) => {
          const val = (item[f.code] || '').trim();
          if (f.isRequired && !val) {
            errors.push(`Item #${itemNum}: '${f.name}' is required.`);
          }
        });
      });
    }

    setSimValidationErrors(errors);
  };

  // Filtered templates by search query
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q)
    );
  }, [templates, searchQuery]);

  // Currently selected template object
  const currentTemplate = useMemo(() => {
    if (isCreatingNew) return null;
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId, isCreatingNew]);

  // Horizontal scroll helpers
  const handleScrollLeft = () => {
    if (selectorRef.current) {
      selectorRef.current.scrollBy({ left: -240, behavior: 'smooth' });
    }
  };

  const handleScrollRight = () => {
    if (selectorRef.current) {
      selectorRef.current.scrollBy({ left: 240, behavior: 'smooth' });
    }
  };

  // Auto-slugify code when creating new
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setFormName(val);
    if (isCreatingNew) {
      const autoCode = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
      setFormCode(autoCode);
    }
  };

  // Save Template (Create or Update)
  const handleSaveTemplate = async () => {
    if (!formName.trim()) {
      setErrorMsg('Template name is required.');
      return;
    }
    if (!formCode.trim()) {
      setErrorMsg('Template unique code identifier is required.');
      return;
    }
    if (formFields.length === 0) {
      setErrorMsg('Please configure at least one personalization field.');
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const payload = {
      name: formName.trim(),
      code: formCode.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_'),
      category: formCategory.trim() || 'General',
      description: formDescription.trim() || null,
      isActive: formIsActive,
      fields: formFields.map((f, idx) => ({
        ...f,
        sortOrder: idx,
      })),
    };

    try {
      if (isCreatingNew || !selectedTemplateId) {
        const created = await api.adminCreatePersonalizationTemplate(payload);
        setSuccessMsg(`Template '${created.name}' created successfully!`);
        await loadTemplates(created.id);
      } else {
        const updated = await api.adminUpdatePersonalizationTemplate(selectedTemplateId, payload);
        setSuccessMsg(`Template '${updated.name}' updated successfully!`);
        await loadTemplates(updated.id);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to save personalization template.');
    } finally {
      setIsSaving(false);
    }
  };

  // Duplicate Template
  const handleDuplicate = async (tmpl: PersonalizationTemplate) => {
    setIsSaving(true);
    setErrorMsg(null);
    try {
      const copy = await api.adminDuplicatePersonalizationTemplate(tmpl.id, `${tmpl.name} (Copy)`);
      setSuccessMsg(`Duplicated template '${copy.name}' successfully!`);
      await loadTemplates(copy.id);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to duplicate template.');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Template
  const handleDeleteConfirm = async () => {
    if (!deleteConfirmTemplate) return;
    setIsSaving(true);
    setErrorMsg(null);
    try {
      await api.adminDeletePersonalizationTemplate(deleteConfirmTemplate.id);
      setSuccessMsg(`Template '${deleteConfirmTemplate.name}' removed from library.`);
      setDeleteConfirmTemplate(null);
      await loadTemplates();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to delete template.');
    } finally {
      setIsSaving(false);
    }
  };

  // Field Edit Handlers
  const handleOpenAddField = () => {
    setEditingFieldIdx(null);
    setFName('');
    setFCode('');
    setFInputType('TEXT');
    setFScope('PER_ORDER');
    setFIsRequired(true);
    setFPlaceholder('');
    setFHelperText('');
    setFDefaultValue('');
    setFMinLength('');
    setFMaxLength('');
    setFMinValue('');
    setFMaxValue('');
    setFPattern('');
    setFOptionsRaw('');
    setIsFieldModalOpen(true);
  };

  const handleOpenEditField = (idx: number) => {
    const f = formFields[idx];
    setEditingFieldIdx(idx);
    setFName(f.name);
    setFCode(f.code);
    setFInputType(f.inputType);
    setFScope(f.scope);
    setFIsRequired(f.isRequired);
    setFPlaceholder(f.placeholder || '');
    setFHelperText(f.helperText || '');
    setFDefaultValue(f.defaultValue || '');
    setFMinLength(f.validationRules?.minLength ? String(f.validationRules.minLength) : '');
    setFMaxLength(f.validationRules?.maxLength ? String(f.validationRules.maxLength) : '');
    setFMinValue(f.validationRules?.minValue !== undefined ? String(f.validationRules.minValue) : '');
    setFMaxValue(f.validationRules?.maxValue !== undefined ? String(f.validationRules.maxValue) : '');
    setFPattern(f.validationRules?.pattern || '');
    setFOptionsRaw(
      f.options && f.options.length > 0
        ? f.options.map((o) => `${o.label}:${o.value}`).join('\n')
        : ''
    );
    setIsFieldModalOpen(true);
  };

  const handleSaveField = () => {
    if (!fName.trim()) {
      setErrorMsg('Field Label is required.');
      return;
    }
    const cleanCode = (fCode || fName)
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, '_')
      .replace(/^_+|_+$/g, '');

    let optionsParsed: Array<{ label: string; value: string }> | null = null;
    if (fInputType === 'SELECT' && fOptionsRaw.trim()) {
      optionsParsed = fOptionsRaw
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => {
          if (line.includes(':')) {
            const [l, v] = line.split(':');
            return { label: l.trim(), value: v.trim() };
          }
          return { label: line, value: line };
        });
    }

    const fieldObj: PersonalizationField = {
      ...(editingFieldIdx !== null && formFields[editingFieldIdx]?.id
        ? { id: formFields[editingFieldIdx].id }
        : {}),
      name: fName.trim(),
      code: cleanCode,
      inputType: fInputType,
      scope: fScope,
      isRequired: fIsRequired,
      placeholder: fPlaceholder.trim() || null,
      helperText: fHelperText.trim() || null,
      defaultValue: fDefaultValue.trim() || null,
      validationRules: {
        ...(fMinLength ? { minLength: Number(fMinLength) } : {}),
        ...(fMaxLength ? { maxLength: Number(fMaxLength) } : {}),
        ...(fMinValue ? { minValue: Number(fMinValue) } : {}),
        ...(fMaxValue ? { maxValue: Number(fMaxValue) } : {}),
        ...(fPattern ? { pattern: fPattern } : {}),
      },
      options: optionsParsed,
      sortOrder: editingFieldIdx !== null ? editingFieldIdx : formFields.length,
    };

    if (editingFieldIdx !== null) {
      const next = [...formFields];
      next[editingFieldIdx] = fieldObj;
      setFormFields(next);
    } else {
      setFormFields([...formFields, fieldObj]);
    }

    setIsFieldModalOpen(false);
  };

  const handleDeleteField = (idx: number) => {
    setFormFields((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMoveField = (idx: number, direction: 'UP' | 'DOWN') => {
    if (direction === 'UP' && idx === 0) return;
    if (direction === 'DOWN' && idx === formFields.length - 1) return;
    const targetIdx = direction === 'UP' ? idx - 1 : idx + 1;
    setFormFields((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[targetIdx];
      copy[targetIdx] = temp;
      return copy;
    });
  };

  // Active representative icon for the editor
  const RepresentativeIcon = getTemplateIcon(formName, formCategory);

  return (
    <div className="space-y-6">
      {/* ======================================================== */}
      {/* 1. COMPACT PAGE HEADER                                   */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-transparent pt-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-300/80 flex items-center justify-center text-amber-600 shadow-2xs flex-shrink-0">
            <RiFileList3Line className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-tight">
              Personalization Templates
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage reusable personalization templates for custom product orders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="relative w-64">
            <RiSearch2Line className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search templates..."
              className="w-full h-9 pl-9 pr-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs transition-all"
            />
          </div>

          {/* Create Template Button */}
          <button
            type="button"
            onClick={handleStartCreateNew}
            className="h-9 px-4 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs border border-[#E3A008]/40 transition-all active:scale-95 cursor-pointer whitespace-nowrap"
          >
            <RiAddLine className="w-4 h-4 stroke-[1.5]" />
            <span>Create Template</span>
          </button>
        </div>
      </div>

      {/* Global Alert Messages */}
      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-300 text-rose-800 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <RiErrorWarningLine className="w-4 h-4 flex-shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-800 cursor-pointer">
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <RiCheckboxCircleLine className="w-4 h-4 flex-shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 hover:text-emerald-800 cursor-pointer">
            <RiCloseLine className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. HORIZONTAL TEMPLATE SELECTOR                          */}
      {/* ======================================================== */}
      <div className="relative flex items-center gap-2">
        {/* Left Scroll Navigation Arrow */}
        <button
          type="button"
          onClick={handleScrollLeft}
          className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer flex-shrink-0"
          title="Scroll left"
        >
          <RiArrowLeftSLine className="w-4 h-4" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={selectorRef}
          className="flex-1 flex items-center gap-3 overflow-x-auto no-scrollbar scroll-smooth py-1 px-0.5"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {isLoading ? (
            <div className="py-6 px-4 text-xs text-slate-400 flex items-center gap-2">
              <RiRefreshLine className="w-4 h-4 animate-spin text-amber-500" />
              <span>Loading templates...</span>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="py-6 px-4 text-xs text-slate-400">
              No personalization templates found matching &ldquo;{searchQuery}&rdquo;.
            </div>
          ) : (
            filteredTemplates.map((template) => {
              const isSelected = selectedTemplateId === template.id && !isCreatingNew;
              const TemplateCardIcon = getTemplateIcon(template.name, template.category);

              return (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => selectTemplate(template)}
                  className={`flex-shrink-0 w-[128px] h-[106px] p-3.5 rounded-2xl text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#FFFDE6] border-2 border-[#FFED00] shadow-xs ring-1 ring-amber-300/40'
                      : 'bg-white border border-slate-200/90 hover:border-slate-300 hover:bg-slate-50/60 shadow-2xs'
                  }`}
                >
                  {/* Top: Representative Icon */}
                  <div className="text-slate-800">
                    <TemplateCardIcon className="w-5 h-5 text-slate-800" />
                  </div>

                  {/* Middle: Template Name */}
                  <div className="font-bold text-slate-900 text-xs leading-snug line-clamp-2 pr-1">
                    {template.name}
                  </div>

                  {/* Bottom: Small Status Indicator Dot & Count */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`w-2 h-2 rounded-full inline-block ${
                        template.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      }`}
                      title={template.isActive ? 'Active' : 'Inactive'}
                    />
                    <span className="text-[10px] text-slate-400 font-mono">
                      {template.fields?.length || 0} fields
                    </span>
                  </div>
                </button>
              );
            })
          )}

          {/* Special "New Template" card if currently creating */}
          {isCreatingNew && (
            <div className="flex-shrink-0 w-[128px] h-[106px] p-3.5 rounded-2xl bg-[#FFFDE6] border-2 border-[#FFED00] shadow-xs flex flex-col justify-between">
              <div className="text-amber-600">
                <RiAddLine className="w-5 h-5" />
              </div>
              <div className="font-bold text-slate-900 text-xs leading-snug">
                {formName || 'New Template'}
              </div>
              <div className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
            </div>
          )}
        </div>

        {/* Right Scroll Navigation Arrow */}
        <button
          type="button"
          onClick={handleScrollRight}
          className="w-8 h-8 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center shadow-2xs transition-colors cursor-pointer flex-shrink-0"
          title="Scroll right"
        >
          <RiArrowRightSLine className="w-4 h-4" />
        </button>
      </div>

      {/* ======================================================== */}
      {/* 3. SELECTED TEMPLATE EDITOR                              */}
      {/* ======================================================== */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-xs space-y-6">
        {/* Editor Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="flex items-center gap-3.5">
            {/* Template Icon in Yellow Box */}
            <div className="w-12 h-12 bg-[#FFED00] text-black rounded-xl flex items-center justify-center border border-amber-300/80 shadow-2xs flex-shrink-0">
              <RepresentativeIcon className="w-6 h-6 text-black" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  {isCreatingNew ? (formName || 'New Personalization Template') : (formName || 'Personalization Template')}
                </h2>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1 ${
                    formIsActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {formIsActive && <RiCheckLine className="w-3.5 h-3.5 stroke-[2]" />}
                  {formIsActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Code: {formCode || '—'} {formCategory ? `• Category: ${formCategory}` : ''}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 self-end sm:self-auto">
            {!isCreatingNew && currentTemplate && (
              <button
                type="button"
                onClick={() => handleDuplicate(currentTemplate)}
                disabled={isSaving}
                className="h-9 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                title="Duplicate template"
              >
                <RiFileCopyLine className="w-4 h-4" />
                <span>Duplicate</span>
              </button>
            )}

            {!isCreatingNew && currentTemplate && (
              <button
                type="button"
                onClick={() => setDeleteConfirmTemplate(currentTemplate)}
                disabled={isSaving}
                className="h-9 px-3.5 bg-rose-50/80 hover:bg-rose-100 text-rose-600 text-xs font-bold rounded-lg flex items-center gap-1.5 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
                title="Delete this template"
              >
                <RiDeleteBin7Line className="w-4 h-4" />
                <span>Delete Template</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleSaveTemplate}
              disabled={isSaving}
              className="h-9 px-4 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg flex items-center gap-1.5 border border-[#E3A008]/40 shadow-2xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
            >
              <RiCheckLine className="w-4 h-4 stroke-[2]" />
              <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. EDITOR TABS                                           */}
        {/* ======================================================== */}
        <div className="flex items-center gap-1 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('settings')}
            className={`pb-3 px-3 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors relative ${
              activeTab === 'settings'
                ? 'font-bold text-slate-900 border-b-2 border-[#FFED00]'
                : 'font-medium text-slate-500 hover:text-slate-800'
            }`}
          >
            <RiSettings4Line className={`w-4 h-4 ${activeTab === 'settings' ? 'text-slate-900' : 'text-slate-400'}`} />
            <span>Settings</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('fields')}
            className={`pb-3 px-3 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors relative ${
              activeTab === 'fields'
                ? 'font-bold text-slate-900 border-b-2 border-[#FFED00]'
                : 'font-medium text-slate-500 hover:text-slate-800'
            }`}
          >
            <RiListCheck2 className={`w-4 h-4 ${activeTab === 'fields' ? 'text-slate-900' : 'text-slate-400'}`} />
            <span>Personalization Fields</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600 font-mono">
              {formFields.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('simulator');
              handleRunSimulatorValidation();
            }}
            className={`pb-3 px-3 sm:px-4 text-xs flex items-center gap-2 cursor-pointer transition-colors relative ${
              activeTab === 'simulator'
                ? 'font-bold text-slate-900 border-b-2 border-[#FFED00]'
                : 'font-medium text-slate-500 hover:text-slate-800'
            }`}
          >
            <RiEyeLine className={`w-4 h-4 ${activeTab === 'simulator' ? 'text-slate-900' : 'text-slate-400'}`} />
            <span>Live Simulator</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* TAB 1: SETTINGS (Two-Column Layout)                     */}
        {/* ======================================================== */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-2">
            {/* Left Column: Basic Information (8 Cols) */}
            <div className="lg:col-span-8 space-y-5">
              <h3 className="text-sm font-bold text-slate-900">Basic Information</h3>

              {/* Template Name & Unique Code Identifier */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Template Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formName}
                    onChange={handleNameChange}
                    placeholder="e.g. Wedding Keepsake Frame, Birthday Milestone"
                    className="w-full h-10 px-3.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-800">
                    Unique Code Identifier <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))}
                    placeholder="e.g. wedding_keepsake_frame"
                    className="w-full h-10 px-3.5 text-xs font-mono bg-slate-50/70 text-slate-900 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Category</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="e.g. Wedding & Keepsakes, Corporate & Awards, Milestones"
                  className="w-full h-10 px-3.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800">Description & Production Guidelines</label>
                <textarea
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Production guidelines, shared couple details, and instructions for catalog managers..."
                  className="w-full p-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl placeholder:text-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs resize-none"
                />
              </div>
            </div>

            {/* Right Column: Status & Visibility + Presets (4 Cols) */}
            <div className="lg:col-span-4 space-y-6 pt-1 lg:pl-4 lg:border-l lg:border-slate-100">
              {/* Status Section */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold text-slate-900">Status & Visibility</h3>

                <div className="flex items-center gap-3">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formIsActive}
                      onChange={(e) => setFormIsActive(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Active</div>
                    <div className="text-[11px] text-slate-500">Template can be attached to products</div>
                  </div>
                </div>
              </div>

              {/* Quick Starter Presets */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                    <RiMagicLine className="w-4 h-4 text-amber-500" />
                    <span>Starter Presets</span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    One-click scaffold for popular customizable items.
                  </p>
                </div>

                <div className="space-y-2">
                  {PRESET_TEMPLATES.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="w-full text-left p-3 rounded-xl border border-slate-200/90 hover:border-amber-300 hover:bg-[#FFFDE6]/60 transition-all group cursor-pointer shadow-2xs"
                    >
                      <div className="text-xs font-bold text-slate-900 group-hover:text-amber-950">
                        {preset.name}
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {preset.description}
                      </div>
                      <div className="text-[10px] text-amber-700 font-medium mt-1">
                        {preset.fields.length} fields • {preset.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: PERSONALIZATION FIELDS                            */}
        {/* ======================================================== */}
        {activeTab === 'fields' && (
          <div className="space-y-5 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Personalization Fields ({formFields.length})
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure shared order-level fields (PER_ORDER) and quantity-based item fields (PER_ITEM).
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddField}
                className="h-8 px-3.5 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg flex items-center gap-1.5 border border-[#E3A008]/40 shadow-2xs transition-colors cursor-pointer"
              >
                <RiAddLine className="w-4 h-4 stroke-[2]" />
                <span>Add Field</span>
              </button>
            </div>

            {/* Scope Legend Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
                <span>
                  <strong className="text-slate-900 font-semibold">PER_ORDER (Shared):</strong> Entered once per line item (e.g. Bride/Groom Name, Date).
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shrink-0" />
                <span>
                  <strong className="text-slate-900 font-semibold">PER_ITEM (Per-Item):</strong> Repeated for every unit in quantity (e.g. Recipient Names).
                </span>
              </div>
            </div>

            {/* Fields Table */}
            {formFields.length === 0 ? (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-3 bg-slate-50/50">
                <RiFileList3Line className="w-8 h-8 mx-auto text-slate-400" />
                <div>
                  <p className="text-xs font-bold text-slate-800">No personalization fields configured yet</p>
                  <p className="text-xs text-slate-500 mt-0.5 max-w-md mx-auto">
                    Click Add Field to define shared order fields or per-item fields for this template.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddField}
                  className="h-8 px-3.5 bg-[#FFED00] text-black text-xs font-bold rounded-lg border border-amber-300 shadow-2xs inline-flex items-center gap-1 cursor-pointer"
                >
                  <RiAddLine className="w-3.5 h-3.5 stroke-[2]" /> Add First Field
                </button>
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3 w-12 text-center">Order</th>
                      <th className="py-2.5 px-3">Field Name</th>
                      <th className="py-2.5 px-3">Code</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Scope</th>
                      <th className="py-2.5 px-3 text-center">Required</th>
                      <th className="py-2.5 px-3">Validation Rules</th>
                      <th className="py-2.5 px-3 text-right w-24">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {formFields.map((f, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                        {/* Order Buttons */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 'UP')}
                              disabled={idx === 0}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                              title="Move Up"
                            >
                              <RiArrowUpLine className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveField(idx, 'DOWN')}
                              disabled={idx === formFields.length - 1}
                              className="p-1 hover:bg-slate-200 rounded text-slate-500 disabled:opacity-20 cursor-pointer"
                              title="Move Down"
                            >
                              <RiArrowDownLine className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        {/* Field Name */}
                        <td className="py-2.5 px-3">
                          <div className="font-semibold text-slate-900">{f.name}</div>
                          {f.helperText && (
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">{f.helperText}</div>
                          )}
                        </td>

                        {/* Code */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {f.code}
                        </td>

                        {/* Type */}
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-mono border border-slate-200">
                            {f.inputType}
                          </span>
                        </td>

                        {/* Scope */}
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              f.scope === 'PER_ORDER'
                                ? 'bg-blue-50 text-blue-700 border-blue-200'
                                : 'bg-purple-50 text-purple-700 border-purple-200'
                            }`}
                          >
                            {f.scope === 'PER_ORDER' ? 'Shared' : 'Per-Item'}
                          </span>
                        </td>

                        {/* Required */}
                        <td className="py-2.5 px-3 text-center">
                          {f.isRequired ? (
                            <span className="text-rose-600 font-semibold">Yes</span>
                          ) : (
                            <span className="text-slate-400">Optional</span>
                          )}
                        </td>

                        {/* Validation Rules */}
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {f.validationRules && (f.validationRules.minLength || f.validationRules.maxLength || f.validationRules.minValue !== undefined || f.validationRules.maxValue !== undefined || f.validationRules.pattern) ? (
                            <div className="flex flex-wrap gap-1">
                              {f.validationRules.minLength && (
                                <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                  min: {f.validationRules.minLength}
                                </span>
                              )}
                              {f.validationRules.maxLength && (
                                <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                  max: {f.validationRules.maxLength}
                                </span>
                              )}
                              {f.validationRules.minValue !== undefined && (
                                <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                  &gt;={f.validationRules.minValue}
                                </span>
                              )}
                              {f.validationRules.maxValue !== undefined && (
                                <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                  &lt;={f.validationRules.maxValue}
                                </span>
                              )}
                              {f.validationRules.pattern && (
                                <span className="bg-slate-100 border border-slate-200 px-1.5 py-0.2 rounded text-[10px] font-mono">
                                  regex
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditField(idx)}
                              className="p-1.5 hover:bg-slate-200 text-slate-600 rounded transition-colors cursor-pointer"
                              title="Edit Field"
                            >
                              <RiEditLine className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteField(idx)}
                              className="p-1.5 hover:bg-rose-100 text-rose-600 rounded transition-colors cursor-pointer"
                              title="Delete Field"
                            >
                              <RiDeleteBin7Line className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: LIVE SIMULATOR                                    */}
        {/* ======================================================== */}
        {activeTab === 'simulator' && (
          <div className="space-y-6 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Storefront & Bulk Paste Simulator
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Simulate how customers enter data and verify bulk roster input validation.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                  <label className="text-xs font-semibold text-slate-700">Quantity:</label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    value={simQty}
                    onChange={(e) => handleSimQtyChange(Number(e.target.value))}
                    className="w-14 h-7 px-2 text-center font-bold text-xs bg-white text-slate-900 border border-slate-300 rounded focus:outline-none focus:border-amber-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsSimBulkOpen(true)}
                  className="h-8 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 border border-slate-300 transition-colors cursor-pointer"
                >
                  <RiUpload2Line className="w-3.5 h-3.5" />
                  <span>Bulk Paste / CSV</span>
                </button>

                <button
                  type="button"
                  onClick={handleRunSimulatorValidation}
                  className="h-8 px-3.5 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg flex items-center gap-1.5 border border-[#E3A008]/40 shadow-2xs transition-colors cursor-pointer"
                >
                  <RiCheckLine className="w-4 h-4 stroke-[2]" />
                  <span>Validate Inputs</span>
                </button>
              </div>
            </div>

            {/* Validation Result Box */}
            {simValidationErrors.length === 0 ? (
              <div className="p-3 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-xs flex items-center gap-2 shadow-2xs">
                <RiCheckboxCircleLine className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span className="font-medium">All personalization inputs are valid and ready for order!</span>
              </div>
            ) : (
              <div className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs space-y-1 shadow-2xs">
                <div className="font-bold flex items-center gap-1.5 text-rose-800">
                  <RiErrorWarningLine className="w-4 h-4 text-rose-600 flex-shrink-0" />
                  Validation Errors ({simValidationErrors.length}):
                </div>
                <ul className="list-disc pl-5 space-y-0.5 text-rose-700">
                  {simValidationErrors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Shared Fields (PER_ORDER) */}
            {formFields.filter((f) => f.scope === 'PER_ORDER').length > 0 && (
              <div className="space-y-3 p-4 bg-slate-50/70 border border-slate-200 rounded-2xl">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                  <RiCalendarEventLine className="w-4 h-4 text-blue-600" />
                  <span>Shared Order Details (PER_ORDER) — Entered once for all items</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {formFields
                    .filter((f) => f.scope === 'PER_ORDER')
                    .map((f) => (
                      <div key={f.code} className="space-y-1">
                        <label className="block text-xs font-bold text-slate-800">
                          {f.name} {f.isRequired && <span className="text-rose-500">*</span>}
                        </label>
                        {f.inputType === 'TEXTAREA' ? (
                          <textarea
                            rows={2}
                            placeholder={f.placeholder || ''}
                            value={simShared[f.code] || ''}
                            onChange={(e) => setSimShared({ ...simShared, [f.code]: e.target.value })}
                            className="w-full p-2.5 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs resize-none"
                          />
                        ) : (
                          <input
                            type={
                              f.inputType === 'NUMBER'
                                ? 'number'
                                : f.inputType === 'DATE'
                                ? 'date'
                                : 'text'
                            }
                            placeholder={f.placeholder || ''}
                            value={simShared[f.code] || ''}
                            onChange={(e) => setSimShared({ ...simShared, [f.code]: e.target.value })}
                            className="w-full h-9 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
                          />
                        )}
                        {f.helperText && <p className="text-[11px] text-slate-500">{f.helperText}</p>}
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Per-Item Fields (PER_ITEM) */}
            {formFields.filter((f) => f.scope === 'PER_ITEM').length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <RiGroupLine className="w-4 h-4 text-purple-600" />
                    <span>Per-Item Personalization (PER_ITEM) — {simQty} items</span>
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Row count must match quantity {simQty}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[11px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-16">Item #</th>
                        {formFields
                          .filter((f) => f.scope === 'PER_ITEM')
                          .map((f) => (
                            <th key={f.code} className="py-2.5 px-3">
                              {f.name} {f.isRequired && <span className="text-rose-500">*</span>}
                            </th>
                          ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {simPerItem.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-3 font-mono font-bold text-slate-500">
                            #{idx + 1}
                          </td>
                          {formFields
                            .filter((f) => f.scope === 'PER_ITEM')
                            .map((f) => (
                              <td key={f.code} className="py-2 px-3">
                                <input
                                  type={f.inputType === 'NUMBER' ? 'number' : 'text'}
                                  placeholder={f.placeholder || `Enter ${f.name}`}
                                  value={row[f.code] || ''}
                                  onChange={(e) => {
                                    const next = [...simPerItem];
                                    next[idx] = { ...next[idx], [f.code]: e.target.value };
                                    setSimPerItem(next);
                                  }}
                                  className="w-full h-8 px-2.5 text-xs bg-white text-slate-900 border border-slate-200 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                                />
                              </td>
                            ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {formFields.length === 0 && (
              <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50/50">
                <RiFileList3Line className="w-8 h-8 mx-auto text-slate-400" />
                <p className="text-xs font-bold text-slate-800">No fields to simulate</p>
                <p className="text-xs text-slate-500">Add fields in the Personalization Fields tab to test the simulator.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: ADD / EDIT SINGLE PERSONALIZATION FIELD          */}
      {/* ======================================================== */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingFieldIdx !== null ? 'Edit Personalization Field' : 'Add Personalization Field'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFieldModalOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Field Label <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fName}
                    onChange={(e) => {
                      const l = e.target.value;
                      setFName(l);
                      if (editingFieldIdx === null) {
                        setFCode(l.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''));
                      }
                    }}
                    placeholder="e.g. Recipient Name, Wedding Date"
                    className="w-full h-9 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Stable Code <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={fCode}
                    onChange={(e) => setFCode(e.target.value.toLowerCase().replace(/[^a-z0-9_]+/g, '_'))}
                    placeholder="e.g. recipient_name"
                    className="w-full h-9 px-3 text-xs font-mono bg-slate-50 text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Input Type</label>
                  <select
                    value={fInputType}
                    onChange={(e: any) => setFInputType(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    {INPUT_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label} ({opt.value})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">
                    Scope & Application <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={fScope}
                    onChange={(e: any) => setFScope(e.target.value)}
                    className="w-full h-9 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="PER_ORDER">PER_ORDER (Shared value for whole item)</option>
                    <option value="PER_ITEM">PER_ITEM (Repeated for every quantity unit)</option>
                  </select>
                </div>
              </div>

              <div className="pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fIsRequired}
                    onChange={(e) => setFIsRequired(e.target.checked)}
                    className="w-4 h-4 text-black rounded focus:ring-black accent-amber-500"
                  />
                  <span className="text-xs font-semibold text-slate-800">
                    Mandatory field (Customer must fill this before ordering)
                  </span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Placeholder</label>
                  <input
                    type="text"
                    value={fPlaceholder}
                    onChange={(e) => setFPlaceholder(e.target.value)}
                    placeholder="e.g. Enter name..."
                    className="w-full h-9 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-800">Helper Text</label>
                  <input
                    type="text"
                    value={fHelperText}
                    onChange={(e) => setFHelperText(e.target.value)}
                    placeholder="e.g. Max 30 chars, English only"
                    className="w-full h-9 px-3 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* Validation Rules Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">Validation Rules (Optional)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Min Length</label>
                    <input
                      type="number"
                      value={fMinLength}
                      onChange={(e) => setFMinLength(e.target.value)}
                      placeholder="0"
                      className="w-full h-8 px-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Max Length</label>
                    <input
                      type="number"
                      value={fMaxLength}
                      onChange={(e) => setFMaxLength(e.target.value)}
                      placeholder="100"
                      className="w-full h-8 px-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Min Value</label>
                    <input
                      type="number"
                      value={fMinValue}
                      onChange={(e) => setFMinValue(e.target.value)}
                      placeholder="0"
                      className="w-full h-8 px-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-500 mb-0.5">Max Value</label>
                    <input
                      type="number"
                      value={fMaxValue}
                      onChange={(e) => setFMaxValue(e.target.value)}
                      placeholder="1000"
                      className="w-full h-8 px-2 text-xs bg-white text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>
              </div>

              {fInputType === 'SELECT' && (
                <div className="space-y-1 pt-1">
                  <label className="text-xs font-bold text-slate-800">
                    Dropdown Options (One per line, e.g. Gold Foil:gold)
                  </label>
                  <textarea
                    rows={3}
                    placeholder={`Gold Foil:gold\nSilver Foil:silver\nRose Gold:rose_gold`}
                    value={fOptionsRaw}
                    onChange={(e) => setFOptionsRaw(e.target.value)}
                    className="w-full p-2.5 text-xs font-mono bg-slate-50 text-slate-900 border border-slate-300 rounded-lg focus:outline-none focus:border-amber-500 resize-none"
                  />
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFieldModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveField}
                className="px-4 py-2 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg border border-amber-300 cursor-pointer shadow-2xs"
              >
                {editingFieldIdx !== null ? 'Update Field' : 'Add to Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: BULK PASTE FOR SIMULATOR                        */}
      {/* ======================================================== */}
      {isSimBulkOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Bulk Paste / CSV Roster</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Paste names or values from Excel or CSV. Each line represents one item.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSimBulkOpen(false)}
                className="text-slate-400 hover:text-slate-800 cursor-pointer"
              >
                <RiCloseLine className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="p-3 bg-amber-50/80 border border-amber-200 text-amber-900 rounded-xl text-xs space-y-1">
                <span className="font-bold">Format:</span>
                <span className="text-[11px] text-amber-800 block">
                  One line per item. If multiple PER_ITEM fields exist, separate values by commas or tabs.
                </span>
              </div>

              <textarea
                rows={7}
                placeholder={`Uncle David & Family\nAunt Sarah\nGrandpa Arthur\nCousin Michael`}
                value={simBulkText}
                onChange={(e) => setSimBulkText(e.target.value)}
                className="w-full p-3 text-xs font-mono bg-slate-50 text-slate-900 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none"
              />
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <span className="text-xs text-slate-500 font-mono">
                {simBulkText.trim()
                  ? `${simBulkText.trim().split('\n').filter((l) => l.trim()).length} lines detected`
                  : '0 lines'}
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSimBulkOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSimBulkApply}
                  disabled={!simBulkText.trim()}
                  className="px-4 py-2 bg-[#FFED00] hover:bg-[#F2E100] text-black text-xs font-bold rounded-lg border border-amber-300 disabled:opacity-50 cursor-pointer shadow-2xs"
                >
                  Apply to Roster
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: DELETE CONFIRMATION                             */}
      {/* ======================================================== */}
      {deleteConfirmTemplate && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-sm w-full p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <RiDeleteBin7Line className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Delete Template</h3>
                <p className="text-xs text-slate-500">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 space-y-1">
              <span className="font-bold block">Notice:</span>
              <span>
                Deleting <strong className="font-bold">{deleteConfirmTemplate.name}</strong> will remove it from the template library. Products attached to this template will no longer prompt for these customization fields.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmTemplate(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                disabled={isSaving}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
              >
                {isSaving ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
