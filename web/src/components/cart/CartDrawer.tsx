'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiCloseLine,
  RiCheckLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiUploadCloud2Line,
  RiFileTextLine,
  RiArrowRightLine,
  RiShoppingBag3Line,
  RiLoader4Line,
  RiInformationLine,
  RiDeleteBinLine,
  RiShieldCheckLine,
  RiAddLine,
  RiSubtractLine,
  RiPaletteLine,
  RiSparklingFill,
  RiLockLine,
  RiTruckLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui';

export interface CartDrawerArtworkSlot {
  slotKey: string;
  label: string;
  minMegapixels?: number;
  isRequired?: boolean;
  isCustomerSupplied?: boolean;
}

export interface CartDrawerArtworkConfig {
  status: 'REQUIRED' | 'OPTIONAL' | 'DISABLED';
  allowedFormats?: string[];
  maxFileSizeMb?: number;
  minimumMegapixels?: number;
  slots?: CartDrawerArtworkSlot[];
  requireDesignBrief?: boolean;
  showDesignBrief?: boolean;
  requireReferenceImage?: boolean;
  matchedRuleName?: string;
  designServiceRequirement?: 'REQUIRED' | 'OPTIONAL' | 'DISABLED' | string;
  designServiceFee?: number;
  artworkPrice?: number;
}

export interface CartDrawerArtworkFile {
  fileUrl: string;
  originalFileName: string;
  fileSize: number;
  mimeType?: string;
  storageKey?: string;
  slotKey?: string;
  slotLabel?: string;
  uploadedAt?: string;
}

export interface CartDrawerItem {
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  subtotal: number;
  taxAmount?: number;
  grandTotal?: number;
  hasDesignService?: boolean;
  designServiceFee?: number;
  artworkFee?: number;
  specificationsSnapshot: Record<string, any>;
  selectedOptionsSummary?: Array<{
    fieldLabel?: string;
    optionLabel?: string;
    value?: string;
  }>;
  artworkConfig?: CartDrawerArtworkConfig;
  artworkFile?: CartDrawerArtworkFile | null;
  artworkFiles?: Record<string, CartDrawerArtworkFile>;
  artworkUrl?: string | null;
  artworkStorageKey?: string | null;
  designNotes?: string;
  personalization?: any;
  paymentMode?: 'FULL' | 'SPLIT_50';
  advanceAmount?: number;
  balanceAmount?: number;
  shippingFee?: number;
  shippingSnapshot?: any;
  variantLines?: any[];
  quote?: any;
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeItem?: CartDrawerItem | null;
  onUpdateItem?: (updated: CartDrawerItem) => void;
  onProceedToCheckout?: (item?: CartDrawerItem) => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  activeItem,
  onUpdateItem,
  onProceedToCheckout,
}: CartDrawerProps) {
  const router = useRouter();
  const drawerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [uploadingSlotKey, setUploadingSlotKey] = useState<string | null>(null);
  const [activeUploadSlotKey, setActiveUploadSlotKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState(activeItem?.designNotes || '');
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);

  // Sync customer notes when activeItem changes
  useEffect(() => {
    if (activeItem?.designNotes) {
      setCustomerNotes(activeItem.designNotes);
    }
  }, [activeItem?.designNotes]);

  // Lock body scroll and handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Fallback to locally stored active cart item if activeItem is not directly supplied
  const [storedItem, setStoredItem] = useState<CartDrawerItem | null>(null);

  useEffect(() => {
    if (!activeItem && isOpen) {
      try {
        const raw = sessionStorage.getItem('pb2_active_cart') || localStorage.getItem('pb2_cart');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setStoredItem(parsed[parsed.length - 1]);
          } else if (parsed && typeof parsed === 'object') {
            setStoredItem(parsed);
          }
        }
      } catch (e) {
        console.warn('Storage read warning', e);
      }
    }
  }, [activeItem, isOpen]);

  const item = activeItem || storedItem;
  const specs = item?.specificationsSnapshot || {};
  const qty = Number(item?.quantity) || 1;
  const rawTotalPrice = Number(item?.totalPrice ?? 0);
  const rawSubtotal = Number(item?.subtotal ?? 0);

  const artworkConfig = item?.artworkConfig;
  const artworkStatus = artworkConfig?.status || 'DISABLED';
  const designServiceRequirement = artworkConfig?.designServiceRequirement || 'DISABLED';
  const artworkFee = Number(item?.artworkFee ?? artworkConfig?.artworkPrice ?? 0);

  // Logically determine if customer made a specification choice regarding design service
  const { specDesignChoice, specDesignFieldLabel, specDesignValueLabel } = useMemo(() => {
    // 1. Check selectedOptionsSummary (has user-visible fieldLabel and option label/value)
    const summary = item?.selectedOptionsSummary || [];
    for (const s of summary) {
      const normLbl = String(s.fieldLabel || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const rawVal = s.optionLabel || s.value || '';
      const strVal = String(rawVal).toLowerCase().trim();
      if (
        normLbl.includes('design') ||
        normLbl.includes('artworkservice') ||
        normLbl.includes('hireservice') ||
        normLbl.includes('designer') ||
        (normLbl.includes('artwork') && (strVal.includes('hire') || strVal.includes('assist') || strVal.includes('upload') || strVal.includes('own')))
      ) {
        if (
          strVal === 'yes' ||
          strVal === 'true' ||
          strVal === 'required' ||
          strVal.includes('hire') ||
          strVal.includes('assist') ||
          strVal.includes('need') ||
          strVal.includes('yes_please')
        ) {
          return {
            specDesignChoice: 'YES' as const,
            specDesignFieldLabel: s.fieldLabel,
            specDesignValueLabel: String(rawVal),
          };
        }
        if (
          strVal === 'no' ||
          strVal === 'false' ||
          strVal === 'none' ||
          strVal.includes('upload') ||
          strVal.includes('own_file') ||
          strVal.includes('self') ||
          strVal.includes('provide_own') ||
          strVal.includes('skip')
        ) {
          return {
            specDesignChoice: 'NO' as const,
            specDesignFieldLabel: s.fieldLabel,
            specDesignValueLabel: String(rawVal),
          };
        }
      }
    }

    // 2. Check specificationsSnapshot
    const snap = item?.specificationsSnapshot || {};
    for (const [k, v] of Object.entries(snap)) {
      if (v === undefined || v === null) continue;
      const normK = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      const strV = String(v).toLowerCase().trim();
      if (
        normK.includes('design') ||
        normK.includes('artworkservice') ||
        normK.includes('hireservice') ||
        normK.includes('designer') ||
        (normK.includes('artwork') && (strV.includes('hire') || strV.includes('assist') || strV.includes('upload') || strV.includes('own')))
      ) {
        if (
          strV === 'yes' ||
          strV === 'true' ||
          strV === 'required' ||
          strV.includes('hire') ||
          strV.includes('assist') ||
          strV.includes('need') ||
          strV.includes('yes_please')
        ) {
          return {
            specDesignChoice: 'YES' as const,
            specDesignFieldLabel: k,
            specDesignValueLabel: String(v),
          };
        }
        if (
          strV === 'no' ||
          strV === 'false' ||
          strV === 'none' ||
          strV.includes('upload') ||
          strV.includes('own_file') ||
          strV.includes('self') ||
          strV.includes('provide_own') ||
          strV.includes('skip')
        ) {
          return {
            specDesignChoice: 'NO' as const,
            specDesignFieldLabel: k,
            specDesignValueLabel: String(v),
          };
        }
      }
    }

    return {
      specDesignChoice: 'NONE' as const,
      specDesignFieldLabel: null,
      specDesignValueLabel: null,
    };
  }, [item?.specificationsSnapshot, item?.selectedOptionsSummary]);

  const rawDesignFeeUnit = Number(item?.designServiceFee ?? artworkConfig?.designServiceFee ?? 0);
  const designFeeUnit =
    rawDesignFeeUnit > 0
      ? rawDesignFeeUnit
      : specDesignChoice === 'YES' || item?.hasDesignService || designServiceRequirement === 'REQUIRED'
      ? 150
      : 0;

  // Logical calculation: Is "Upload My Own Files" disabled?
  // 1. Customer selected "YES" to design service in specifications
  // 2. OR product/rule configuration mandates design service (designServiceRequirement === 'REQUIRED')
  const { isUploadDisabled, uploadDisabledReason } = useMemo(() => {
    if (specDesignChoice === 'YES') {
      return {
        isUploadDisabled: true,
        uploadDisabledReason: `Locked by specifications: "${specDesignFieldLabel || 'Design required'}: ${specDesignValueLabel || 'yes'}" was selected`,
      };
    }
    if (designServiceRequirement === 'REQUIRED') {
      return {
        isUploadDisabled: true,
        uploadDisabledReason: 'Design assistance is required for this product configuration',
      };
    }
    return {
      isUploadDisabled: false,
      uploadDisabledReason: null,
    };
  }, [specDesignChoice, specDesignFieldLabel, specDesignValueLabel, designServiceRequirement]);

  // Logical calculation: Is "Hire Design Assistance" disabled?
  // 1. Customer selected "NO" to design service in specifications
  // 2. OR product/rule configuration disabled design service (designServiceRequirement === 'DISABLED')
  // 3. OR no design service fee configured (designFeeUnit <= 0)
  const { isHireDesignerDisabled, hireDesignerDisabledReason } = useMemo(() => {
    if (specDesignChoice === 'NO') {
      return {
        isHireDesignerDisabled: true,
        hireDesignerDisabledReason: `Locked by specifications: "${specDesignFieldLabel || 'Design required'}: ${specDesignValueLabel || 'no'}" was selected`,
      };
    }
    if (designServiceRequirement === 'DISABLED' && specDesignChoice !== 'YES') {
      return {
        isHireDesignerDisabled: true,
        hireDesignerDisabledReason: 'Design assistance is disabled by product configuration',
      };
    }
    if (designFeeUnit <= 0 && specDesignChoice !== 'YES') {
      return {
        isHireDesignerDisabled: true,
        hireDesignerDisabledReason: 'No design assistance fee configured for this item',
      };
    }
    return {
      isHireDesignerDisabled: false,
      hireDesignerDisabledReason: null,
    };
  }, [specDesignChoice, specDesignFieldLabel, specDesignValueLabel, designServiceRequirement, designFeeUnit]);

  // Derive initial wantsDesignService:
  const detectedDesignInItem = useMemo(() => {
    if (specDesignChoice === 'YES') return true;
    if (specDesignChoice === 'NO') return false;
    if (designServiceRequirement === 'REQUIRED') return true;
    if (designServiceRequirement === 'DISABLED') return false;
    if (item?.hasDesignService !== undefined) return Boolean(item.hasDesignService);
    return false;
  }, [specDesignChoice, designServiceRequirement, item?.hasDesignService]);

  const [wantsDesignService, setWantsDesignService] = useState<boolean>(detectedDesignInItem);

  // Sync state if item or lock conditions change
  useEffect(() => {
    if (specDesignChoice === 'YES' || designServiceRequirement === 'REQUIRED') {
      setWantsDesignService(true);
    } else if (specDesignChoice === 'NO' || designServiceRequirement === 'DISABLED' || isHireDesignerDisabled) {
      setWantsDesignService(false);
    } else if (item?.hasDesignService !== undefined) {
      setWantsDesignService(Boolean(item.hasDesignService));
    } else {
      setWantsDesignService(detectedDesignInItem);
    }
  }, [specDesignChoice, designServiceRequirement, isHireDesignerDisabled, item?.hasDesignService, detectedDesignInItem]);

  const activeDesignFee = wantsDesignService ? designFeeUnit : 0;

  // Clean production base subtotal (clean of design fee and artwork fee)
  const baseSubtotal = useMemo(() => {
    if (rawTotalPrice > 0) return rawTotalPrice;
    if (item?.hasDesignService && rawSubtotal > designFeeUnit) {
      return Math.round((rawSubtotal - designFeeUnit - artworkFee) * 100) / 100;
    }
    if (rawSubtotal > 0) return rawSubtotal;
    const uP = Number(item?.unitPrice) || 0;
    if (uP > 0 && qty > 0) return Math.round(uP * qty * 100) / 100;
    return 0;
  }, [rawTotalPrice, rawSubtotal, item?.hasDesignService, designFeeUnit, artworkFee, item?.unitPrice, qty]);

  const unitPrice =
    item?.unitPrice !== undefined && item?.unitPrice !== null && Number(item.unitPrice) > 0
      ? Number(item.unitPrice)
      : qty > 0 && baseSubtotal > 0
      ? Math.round((baseSubtotal / qty) * 10000) / 10000
      : 0;

  const subtotal = Math.round((baseSubtotal + activeDesignFee + artworkFee) * 100) / 100;
  const tax = Math.round(subtotal * 0.18 * 100) / 100;
  const shippingTotal = Number(item?.shippingFee ?? (item?.shippingSnapshot?.finalShippingAmount ?? 0)) || 0;
  const grandTotal = Math.round((subtotal + tax + shippingTotal) * 100) / 100;

  const handleToggleDesignService = (selected: boolean) => {
    // Guard against toggling to disabled states
    if (!selected && isUploadDisabled) return;
    if (selected && isHireDesignerDisabled) return;

    setWantsDesignService(selected);
    if (!item) return;

    const newDesignFee = selected ? designFeeUnit : 0;
    const newSubtotal = Math.round((baseSubtotal + newDesignFee + artworkFee) * 100) / 100;
    const newTax = Math.round(newSubtotal * 0.18 * 100) / 100;
    const newGrandTotal = Math.round((newSubtotal + newTax) * 100) / 100;

    const updatedItem: CartDrawerItem = {
      ...item,
      hasDesignService: selected,
      totalPrice: baseSubtotal,
      designServiceFee: designFeeUnit,
      subtotal: newSubtotal,
      taxAmount: newTax,
      grandTotal: newGrandTotal,
    };

    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
    updateCartStorage(updatedItem);
  };

  // Ensure item data in storage & parent stays synchronized with locked specifications
  useEffect(() => {
    if (!item) return;

    // Mutually exclusive specification locks
    if ((specDesignChoice === 'YES' || designServiceRequirement === 'REQUIRED') && item.hasDesignService !== true) {
      const newDesignFee = designFeeUnit > 0 ? designFeeUnit : 150;
      const newSubtotal = Math.round((baseSubtotal + newDesignFee + artworkFee) * 100) / 100;
      const newTax = Math.round(newSubtotal * 0.18 * 100) / 100;
      const newGrandTotal = Math.round((newSubtotal + newTax) * 100) / 100;

      const updatedItem: CartDrawerItem = {
        ...item,
        hasDesignService: true,
        totalPrice: baseSubtotal,
        designServiceFee: newDesignFee,
        subtotal: newSubtotal,
        taxAmount: newTax,
        grandTotal: newGrandTotal,
      };

      if (onUpdateItem) onUpdateItem(updatedItem);
      updateCartStorage(updatedItem);
    } else if ((specDesignChoice === 'NO' || designServiceRequirement === 'DISABLED') && item.hasDesignService === true) {
      const newSubtotal = Math.round((baseSubtotal + artworkFee) * 100) / 100;
      const newTax = Math.round(newSubtotal * 0.18 * 100) / 100;
      const newGrandTotal = Math.round((newSubtotal + newTax) * 100) / 100;

      const updatedItem: CartDrawerItem = {
        ...item,
        hasDesignService: false,
        totalPrice: baseSubtotal,
        designServiceFee: 0,
        subtotal: newSubtotal,
        taxAmount: newTax,
        grandTotal: newGrandTotal,
      };

      if (onUpdateItem) onUpdateItem(updatedItem);
      updateCartStorage(updatedItem);
    }
  }, [specDesignChoice, designServiceRequirement, item?.hasDesignService, baseSubtotal, designFeeUnit, artworkFee]);

  const maxFileSizeMb = Number(artworkConfig?.maxFileSizeMb) || 50;
  const allowedFormats =
    artworkConfig?.allowedFormats && artworkConfig.allowedFormats.length > 0
      ? artworkConfig.allowedFormats
      : ['PDF', 'AI', 'PSD', 'EPS', 'TIFF', 'PNG', 'JPG', 'ZIP'];
  const acceptPattern = allowedFormats
    .map((fmt) => (fmt.startsWith('.') ? fmt.toLowerCase() : `.${fmt.toLowerCase()}`))
    .join(',');
  const formatsDisplayText = allowedFormats.join(', ');

  // Deterministically resolve slots: if 1 slot -> 1 slot, if 2 slots -> 2 slots
  const effectiveSlots: CartDrawerArtworkSlot[] = useMemo(() => {
    if (artworkConfig?.slots && artworkConfig.slots.length > 0) {
      return artworkConfig.slots;
    }
    if (artworkStatus !== 'DISABLED') {
      return [
        {
          slotKey: 'slot_1_front_side',
          label: 'Front Side',
          isRequired: artworkStatus === 'REQUIRED',
        },
      ];
    }
    return [];
  }, [artworkConfig?.slots, artworkStatus]);

  // Map of uploaded files per slotKey with fallback to legacy artworkFile
  const slotFilesMap: Record<string, CartDrawerArtworkFile> = useMemo(() => {
    const map: Record<string, CartDrawerArtworkFile> = { ...(item?.artworkFiles || {}) };
    if (item?.artworkFile && Object.keys(map).length === 0 && effectiveSlots.length > 0) {
      map[effectiveSlots[0].slotKey] = item.artworkFile;
    }
    return map;
  }, [item?.artworkFiles, item?.artworkFile, effectiveSlots]);

  const uploadedCount = useMemo(() => {
    return effectiveSlots.filter((slot) => Boolean(slotFilesMap[slot.slotKey]?.fileUrl)).length;
  }, [effectiveSlots, slotFilesMap]);

  const allRequiredUploaded = useMemo(() => {
    const requiredSlots = effectiveSlots.filter((s) => s.isRequired);
    if (requiredSlots.length === 0) {
      return uploadedCount > 0;
    }
    return requiredSlots.every((s) => Boolean(slotFilesMap[s.slotKey]?.fileUrl));
  }, [effectiveSlots, slotFilesMap, uploadedCount]);

  // Strict condition to decide if the Artwork & Design section should be rendered at all:
  const hasArtworkOrDesignSection = useMemo(() => {
    if (artworkStatus === 'DISABLED' && designServiceRequirement === 'DISABLED') {
      return false;
    }
    if (specDesignChoice === 'YES' || specDesignChoice === 'NO') return true;
    if (item?.hasDesignService || designServiceRequirement === 'REQUIRED') return true;
    if (artworkStatus === 'REQUIRED') return true;
    if (
      artworkStatus === 'OPTIONAL' &&
      (effectiveSlots.length > 0 || item?.artworkFile?.fileUrl || Object.keys(slotFilesMap).length > 0)
    ) {
      return true;
    }
    return false;
  }, [
    artworkStatus,
    designServiceRequirement,
    specDesignChoice,
    item?.hasDesignService,
    effectiveSlots.length,
    item?.artworkFile?.fileUrl,
    slotFilesMap,
  ]);

  const isArtworkRequired = useMemo(() => {
    if (artworkStatus === 'DISABLED' && designServiceRequirement === 'DISABLED') {
      return false;
    }
    // If customer selected "Hire Design Assistance", no upload is required
    if (wantsDesignService && activeDesignFee > 0) {
      return false;
    }
    if (wantsDesignService) {
      return false;
    }
    // If artwork status is REQUIRED or any slots are marked required
    if (artworkStatus === 'REQUIRED') {
      return true;
    }
    if (effectiveSlots.some((s) => s.isRequired)) {
      return true;
    }
    return false;
  }, [artworkStatus, designServiceRequirement, wantsDesignService, activeDesignFee, effectiveSlots]);

  const isArtworkMissing = useMemo(() => {
    if (!item) return false;
    if (!isArtworkRequired) return false;

    if (effectiveSlots.length > 0) {
      const requiredSlots = effectiveSlots.filter((s) => s.isRequired);
      if (requiredSlots.length > 0) {
        return !requiredSlots.every((s) => Boolean(slotFilesMap[s.slotKey]?.fileUrl));
      }
      return uploadedCount === 0;
    }

    return !item.artworkFile?.fileUrl && Object.keys(slotFilesMap).length === 0;
  }, [item, isArtworkRequired, effectiveSlots, slotFilesMap, uploadedCount]);

  // Trigger file selection for a specific upload slot
  const triggerUploadForSlot = (slotKey: string) => {
    setActiveUploadSlotKey(slotKey);
    setUploadError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  // File Upload Handler (Per-Slot)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const targetSlotKey = activeUploadSlotKey || effectiveSlots[0]?.slotKey;
    if (!file || !item || !targetSlotKey) return;

    // Validate size and extensions dynamically from artworkConfig
    const validExtensions = allowedFormats.map((f) =>
      f.startsWith('.') ? f.toLowerCase() : `.${f.toLowerCase()}`
    );
    if (validExtensions.includes('.jpg') && !validExtensions.includes('.jpeg')) {
      validExtensions.push('.jpeg');
    }

    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setUploadError(`Please select a valid print-ready file (${formatsDisplayText})`);
      return;
    }

    const maxBytes = maxFileSizeMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setUploadError(`Artwork exceeds the maximum allowable size of ${maxFileSizeMb} MB.`);
      return;
    }

    setUploadingSlotKey(targetSlotKey);
    setUploadError(null);

    try {
      const res = await api.uploadArtwork(file, item.productId);
      const targetSlot = effectiveSlots.find((s) => s.slotKey === targetSlotKey);

      const newArtworkFile: CartDrawerArtworkFile = {
        fileUrl: res.fileUrl,
        originalFileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        storageKey: res.storageKey,
        slotKey: targetSlotKey,
        slotLabel: targetSlot?.label || 'Artwork File',
        uploadedAt: new Date().toISOString(),
      };

      const updatedArtworkFiles: Record<string, CartDrawerArtworkFile> = {
        ...slotFilesMap,
        [targetSlotKey]: newArtworkFile,
      };

      // Keep primary artworkFile synchronized for backward compatibility
      const primaryFile = updatedArtworkFiles[effectiveSlots[0]?.slotKey] || newArtworkFile;

      const updatedItem: CartDrawerItem = {
        ...item,
        artworkFiles: updatedArtworkFiles,
        artworkFile: primaryFile,
        artworkUrl: primaryFile?.fileUrl || (item as any).artworkUrl,
        artworkStorageKey: primaryFile?.storageKey || (item as any).artworkStorageKey,
      };

      if (onUpdateItem) {
        onUpdateItem(updatedItem);
      }

      // Update storage
      updateCartStorage(updatedItem);
    } catch (err: any) {
      setUploadError(err?.message || 'Failed to upload artwork. Please try again.');
    } finally {
      setUploadingSlotKey(null);
      setActiveUploadSlotKey(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveSlotArtwork = (slotKey: string) => {
    if (!item) return;
    const updatedArtworkFiles: Record<string, CartDrawerArtworkFile> = {
      ...slotFilesMap,
    };
    delete updatedArtworkFiles[slotKey];

    const remainingFiles = Object.values(updatedArtworkFiles);
    const primaryFile = remainingFiles.length > 0 ? remainingFiles[0] : null;

    const updatedItem: CartDrawerItem = {
      ...item,
      artworkFiles: updatedArtworkFiles,
      artworkFile: primaryFile,
      artworkUrl: primaryFile?.fileUrl || null,
      artworkStorageKey: primaryFile?.storageKey || null,
    };

    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
    updateCartStorage(updatedItem);
  };

  const handleNotesBlur = () => {
    if (!item) return;
    const updatedItem: CartDrawerItem = {
      ...item,
      designNotes: customerNotes,
    };
    if (onUpdateItem) {
      onUpdateItem(updatedItem);
    }
    updateCartStorage(updatedItem);
  };

  const updateCartStorage = (updatedItem: CartDrawerItem) => {
    try {
      const raw = localStorage.getItem('pb2_cart');
      let cart = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(cart)) cart = [];

      // Update or replace existing item matching sku or productId
      const idx = cart.findIndex(
        (it: any) => it.sku === updatedItem.sku || it.productId === updatedItem.productId
      );
      if (idx >= 0) {
        cart[idx] = updatedItem;
      } else {
        cart.push(updatedItem);
      }
      localStorage.setItem('pb2_cart', JSON.stringify(cart));
      sessionStorage.setItem('pb2_active_cart', JSON.stringify(updatedItem));
      window.dispatchEvent(new Event('cart-updated'));
    } catch (e) {
      console.warn('Storage sync warning', e);
    }
  };

  const handleCheckoutClick = () => {
    if (!item) return;

    if (isArtworkMissing) {
      setUploadError('Please upload all required artwork files before proceeding to checkout.');
      return;
    }

    // Always ensure latest item is stored in both sessionStorage and localStorage
    updateCartStorage(item);

    if (onProceedToCheckout) {
      onProceedToCheckout(item);
    } else {
      sessionStorage.setItem('pb2_active_cart', JSON.stringify(item));
      router.push('/checkout');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer Panel */}
      <div
        ref={drawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
        className="relative w-full max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* ======================================================== */}
        {/* A. DRAWER HEADER                                         */}
        {/* ======================================================== */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <RiCheckboxCircleLine className="w-5 h-5" />
            </div>
            <div>
              <h2 id="drawer-title" className="text-base font-bold text-slate-900 leading-tight">
                Added to Cart
              </h2>
              <p className="text-[11px] text-slate-500">
                Item successfully added to your order queue.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close drawer"
          >
            <RiCloseLine className="w-5 h-5" />
          </button>
        </div>

        {/* ======================================================== */}
        {/* SCROLLABLE BODY                                          */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6 divide-y divide-slate-100">
          {item ? (
            <>
              {/* ======================================================== */}
              {/* B. PRODUCT DETAILS SPECIFICATION LIST                    */}
              {/* ======================================================== */}
              <div className="space-y-4 pt-1">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      SKU: {item.sku || 'PRD-PKG-002'}
                    </span>
                    <h3 className="text-base font-black text-slate-950 mt-1 font-display">
                      {item.productName || 'Custom Luxury Rigid Box'}
                    </h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-500 block font-mono">
                      ₹{unitPrice.toFixed(2)} / unit
                    </span>
                    <span className="text-base font-black text-slate-950 font-mono">
                      {formatCurrency(subtotal)}
                    </span>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      (Excl. GST)
                    </span>
                  </div>
                </div>

                {/* Specifications Grid */}
                <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2 text-xs">
                  {item.selectedOptionsSummary && item.selectedOptionsSummary.length > 0 ? (
                    item.selectedOptionsSummary.map((opt, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-1 border-b border-slate-200/60 last:border-0"
                      >
                        <span className="text-slate-500 font-medium">
                          {opt.fieldLabel || 'Option'}:
                        </span>
                        <span className="font-semibold text-slate-900 text-right truncate max-w-[60%]">
                          {opt.optionLabel || opt.value}
                        </span>
                      </div>
                    ))
                  ) : (
                    <>
                      {specs.boxStyle && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Box Style:</span>
                          <span className="font-semibold text-slate-900">{specs.boxStyle}</span>
                        </div>
                      )}
                      {specs.dimensions && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Dimensions:</span>
                          <span className="font-mono font-semibold text-slate-900">{specs.dimensions}</span>
                        </div>
                      )}
                      {specs.boardThickness && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Board Thickness:</span>
                          <span className="font-semibold text-slate-900">{specs.boardThickness}</span>
                        </div>
                      )}
                      {specs.outerWrap && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Outer Wrap:</span>
                          <span className="font-semibold text-slate-900">{specs.outerWrap}</span>
                        </div>
                      )}
                      {specs.finishing && (
                        <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                          <span className="text-slate-500 font-medium">Finishing:</span>
                          <span className="font-semibold text-slate-900">{specs.finishing}</span>
                        </div>
                      )}
                    </>
                  )}

                  {(!item.selectedOptionsSummary || !item.selectedOptionsSummary.some((s) => s.fieldLabel?.toLowerCase().includes('quantity'))) && (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-slate-500 font-medium">Quantity:</span>
                      <span className="font-mono font-bold text-slate-950">
                        {qty.toLocaleString()} units
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* ======================================================== */}
              {/* C. ARTWORK UPLOAD & DESIGN MATRIX                        */}
              {/* ======================================================== */}
              {!hasArtworkOrDesignSection ? null : (
                <div className="space-y-3.5 pt-5 border-t border-slate-100">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 font-mono">
                        <RiFileTextLine className="w-4 h-4 text-[#E3A008]" />
                        <span>Artwork Upload & Design Matrix</span>
                      </h4>
                    </div>

                    {wantsDesignService && activeDesignFee > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full font-mono">
                        <RiSparklingFill className="w-3.5 h-3.5 text-amber-600" />
                        Design Assistance (+₹{activeDesignFee.toFixed(2)})
                      </span>
                    ) : allRequiredUploaded && uploadedCount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <RiCheckLine className="w-3.5 h-3.5" />
                        {uploadedCount === effectiveSlots.length
                          ? 'All Uploaded'
                          : `${uploadedCount}/${effectiveSlots.length} Uploaded`}
                      </span>
                    ) : artworkStatus === 'REQUIRED' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        <RiAlertLine className="w-3.5 h-3.5" />
                        {effectiveSlots.length > 1
                          ? `${effectiveSlots.length} Uploads Required`
                          : 'Artwork Required'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                        <RiInformationLine className="w-3.5 h-3.5" />
                        Artwork Optional
                      </span>
                    )}
                  </div>

                  {/* Design Assistance Matrix Selector (With Direct Amount Setting) */}
                  {((designServiceRequirement !== 'DISABLED' && designFeeUnit > 0) || specDesignChoice === 'YES' || item?.hasDesignService) && designFeeUnit > 0 && (
                    <div className="p-3.5 bg-amber-50/70 border border-amber-200/90 rounded-2xl space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <RiPaletteLine className="w-4 h-4 text-amber-600" />
                          <span className="text-xs font-bold text-slate-900 uppercase font-mono">
                            Design Service Selection
                          </span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          Fee: +₹{designFeeUnit.toFixed(2)}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {/* Option 1: Upload My Own Files */}
                        <button
                          type="button"
                          onClick={() => handleToggleDesignService(false)}
                          disabled={isUploadDisabled}
                          title={uploadDisabledReason || 'Customer supplied print files'}
                          className={`p-3 rounded-xl border text-left transition relative ${
                            isUploadDisabled
                              ? 'opacity-40 cursor-not-allowed bg-slate-100/90 border-slate-200 select-none'
                              : !wantsDesignService
                              ? 'bg-white border-2 border-slate-950 shadow-xs cursor-pointer'
                              : 'bg-white/70 border-slate-200 hover:border-slate-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black ${isUploadDisabled ? 'text-slate-400' : 'text-slate-900'}`}>
                              Upload My Own Files
                            </span>
                            {!wantsDesignService && !isUploadDisabled && (
                              <div className="w-4 h-4 rounded-full bg-slate-950 text-white flex items-center justify-center">
                                <RiCheckLine className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                            {isUploadDisabled && (
                              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center" title="Disabled">
                                <RiLockLine className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-medium block mt-0.5">
                            Customer supplied print files
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                              Free (₹0.00)
                            </span>
                            {isUploadDisabled && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold text-slate-500 bg-slate-200/90 px-1.5 py-0.2 rounded border border-slate-300">
                                <RiLockLine className="w-2.5 h-2.5" />
                                {specDesignChoice === 'YES' ? 'Locked by specs' : 'Disabled'}
                              </span>
                            )}
                          </div>
                        </button>

                        {/* Option 2: Hire Design Assistance */}
                        <button
                          type="button"
                          onClick={() => handleToggleDesignService(true)}
                          disabled={isHireDesignerDisabled}
                          title={hireDesignerDisabledReason || 'Prepress layout & expert design'}
                          className={`p-3 rounded-xl border text-left transition relative ${
                            isHireDesignerDisabled
                              ? 'opacity-40 cursor-not-allowed bg-slate-100/90 border-slate-200 select-none'
                              : wantsDesignService
                              ? 'bg-amber-100/90 border-2 border-amber-500 shadow-xs ring-1 ring-amber-400 cursor-pointer'
                              : 'bg-white/70 border-slate-200 hover:border-amber-300 cursor-pointer'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className={`text-xs font-black ${isHireDesignerDisabled ? 'text-slate-400' : 'text-slate-900'}`}>
                              Hire Design Assistance
                            </span>
                            {wantsDesignService && !isHireDesignerDisabled && (
                              <div className="w-4 h-4 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center">
                                <RiCheckLine className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                            {isHireDesignerDisabled && (
                              <div className="w-4 h-4 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center" title="Disabled">
                                <RiLockLine className="w-2.5 h-2.5" />
                              </div>
                            )}
                          </div>
                          <span className="text-[10px] text-amber-900 font-medium block mt-0.5">
                            Prepress layout & expert design
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <span className="inline-block text-[10px] font-mono font-bold text-amber-950 bg-amber-200/90 px-1.5 py-0.2 rounded border border-amber-400">
                              +₹{designFeeUnit.toFixed(2)}
                            </span>
                            {isHireDesignerDisabled && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] font-mono font-semibold text-slate-500 bg-slate-200/90 px-1.5 py-0.2 rounded border border-slate-300">
                                <RiLockLine className="w-2.5 h-2.5" />
                                {specDesignChoice === 'NO' ? 'Locked by specs' : 'Disabled'}
                              </span>
                            )}
                          </div>
                        </button>
                      </div>

                      {/* Informational Guidance based on state & specification selection */}
                      {isUploadDisabled && specDesignChoice === 'YES' && (
                        <div className="p-2.5 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <RiSparklingFill className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Design Service Fee (+₹{designFeeUnit.toFixed(2)}) is included based on your specifications</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            You selected "{specDesignFieldLabel || 'Design required'}: {specDesignValueLabel || 'yes'}". Upload option is locked because our designers will prepare your artwork. Upload any reference assets or brief below.
                          </p>
                        </div>
                      )}

                      {isHireDesignerDisabled && specDesignChoice === 'NO' && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900">
                            <RiInformationLine className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                            <span>Customer Artwork Supplied (No Design Fee)</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            You selected "{specDesignFieldLabel || 'Design required'}: {specDesignValueLabel || 'no'}". Hire designer option is locked. Please upload your production-ready print files in the slots below.
                          </p>
                        </div>
                      )}

                      {!isUploadDisabled && !isHireDesignerDisabled && wantsDesignService && (
                        <div className="p-2.5 bg-white/90 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                          <div className="flex items-center gap-1.5 font-bold">
                            <RiSparklingFill className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Design Service Fee (+₹{designFeeUnit.toFixed(2)}) is added to your order</span>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">
                            Upload any reference assets, logos, or copy in the slots below. Our designers will prepare high-resolution prepress artwork and share a proof for approval.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Format & Size Specs */}
                  <div className="flex items-center justify-between text-[11px] text-slate-500 bg-slate-50 border border-slate-200/80 px-3 py-1.5 rounded-lg font-mono">
                    <span className="truncate max-w-[65%]">Formats: {formatsDisplayText}</span>
                    <span className="shrink-0">Max {maxFileSizeMb} MB/slot</span>
                  </div>

                  {/* Configured Upload Slots (Dynamic based on selected options / matrix) */}
                  <div className="space-y-2.5">
                    {effectiveSlots.map((slot, index) => {
                      const file = slotFilesMap[slot.slotKey];
                      const hasFile = Boolean(file?.fileUrl);
                      const isThisSlotUploading = uploadingSlotKey === slot.slotKey;

                      return (
                        <div
                          key={slot.slotKey || index}
                          className={`p-3.5 rounded-xl border transition-all ${
                            hasFile
                              ? 'bg-emerald-50/40 border-emerald-200'
                              : slot.isRequired
                              ? 'bg-amber-50/40 border-amber-200/90'
                              : 'bg-slate-50/80 border-slate-200'
                          }`}
                        >
                          {/* Slot Header */}
                          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-200/60">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-200/80 text-slate-700 font-mono text-[10px] font-bold flex items-center justify-center">
                                {index + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-900 font-display">
                                {slot.label}
                              </span>
                            </div>
                            <div>
                              {slot.isRequired ? (
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-300 px-2 py-0.5 rounded-full">
                                  Required
                                </span>
                              ) : (
                                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
                                  Optional
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Slot Body: Uploaded Card or Upload Trigger */}
                          <div className="pt-2.5">
                            {hasFile ? (
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0">
                                    <RiCheckboxCircleLine className="w-4 h-4 text-emerald-700" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-slate-900 truncate">
                                      {file.originalFileName}
                                    </p>
                                    <p className="text-[10px] text-slate-500 font-mono">
                                      {file.fileSize
                                        ? `${(file.fileSize / (1024 * 1024)).toFixed(2)} MB • Ready for Prepress`
                                        : 'Validated'}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => triggerUploadForSlot(slot.slotKey)}
                                    disabled={Boolean(uploadingSlotKey)}
                                    className="text-xs font-semibold text-slate-700 hover:text-black hover:underline px-2 py-1 cursor-pointer disabled:opacity-50"
                                  >
                                    Replace
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveSlotArtwork(slot.slotKey)}
                                    disabled={Boolean(uploadingSlotKey)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer disabled:opacity-50"
                                    title="Remove file"
                                  >
                                    <RiDeleteBinLine className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2 min-w-0 text-slate-500">
                                  <RiUploadCloud2Line className="w-4 h-4 text-amber-600 shrink-0" />
                                  <span className="text-[11px] truncate">
                                    {isThisSlotUploading
                                      ? `Uploading ${slot.label}...`
                                      : `Attach ${slot.label} design`}
                                  </span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => triggerUploadForSlot(slot.slotKey)}
                                  disabled={Boolean(uploadingSlotKey)}
                                  className="h-8 px-3.5 bg-white hover:bg-amber-100/70 text-slate-900 text-xs font-bold rounded-lg border border-amber-300 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
                                >
                                  {isThisSlotUploading ? (
                                    <>
                                      <RiLoader4Line className="w-3.5 h-3.5 animate-spin" />
                                      <span>Uploading...</span>
                                    </>
                                  ) : (
                                    <>
                                      <RiAddLine className="w-3.5 h-3.5 text-amber-700" />
                                      <span>Upload {slot.label}</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {uploadError && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                      <RiAlertLine className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>{uploadError}</span>
                    </div>
                  )}

                  <div className="pt-1 text-[11px] leading-relaxed">
                    {isArtworkMissing ? (
                      <p className="text-amber-800 font-semibold flex items-center gap-1.5 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <RiAlertLine className="w-4 h-4 text-amber-600 shrink-0" />
                        <span>Artwork upload is required. Please upload files in all required slots above to enable checkout.</span>
                      </p>
                    ) : allRequiredUploaded && uploadedCount > 0 ? (
                      <p className="text-emerald-800 font-semibold flex items-center gap-1.5 bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                        <RiCheckLine className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>All required artwork uploaded successfully. You can now proceed to checkout.</span>
                      </p>
                    ) : (
                      <p className="text-slate-500">
                        Production begins upon digital proof sign-off.
                      </p>
                    )}
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={acceptPattern}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              )}

              {/* ======================================================== */}
              {/* D. ADDITIONAL DETAILS / PRODUCTION NOTES                 */}
              {/* ======================================================== */}
              <div className="space-y-2 pt-5">
                <button
                  type="button"
                  onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                  className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-slate-700 hover:text-slate-900 cursor-pointer"
                >
                  <span>Special Fabrication Notes (Optional)</span>
                  <span className="text-slate-400 text-xs">
                    {isNotesExpanded ? 'Collapse ▲' : 'Add Notes ▼'}
                  </span>
                </button>

                {isNotesExpanded && (
                  <div className="pt-1 space-y-1">
                    <textarea
                      rows={2}
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      onBlur={handleNotesBlur}
                      placeholder="e.g. Include black satin ribbon puller on matchbox drawer; add thumb cutouts..."
                      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-black focus:bg-white transition-colors"
                    />
                    <p className="text-[10px] text-slate-400">
                      Saved notes will be appended to the master Job Card for shop-floor production.
                    </p>
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* E. PRICING BREAKDOWN                                     */}
              {/* ======================================================== */}
              <div className="space-y-3 pt-5 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-900 font-mono">
                    Price Breakdown
                  </span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-mono">
                    Stage 5 Verified
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>
                      Production ({qty.toLocaleString()} units × ₹{unitPrice.toFixed(2)}/unit)
                    </span>
                    <span className="font-mono font-semibold text-slate-900">
                      {formatCurrency(baseSubtotal)}
                    </span>
                  </div>

                  {wantsDesignService && activeDesignFee > 0 && (
                    <div className="flex items-center justify-between text-amber-950 font-medium bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200">
                      <span className="flex items-center gap-1.5 font-bold">
                        <RiPaletteLine className="w-3.5 h-3.5 text-amber-600" />
                        Design Service Assistance Fee
                      </span>
                      <span className="font-mono font-black text-amber-900">
                        +{formatCurrency(activeDesignFee)}
                      </span>
                    </div>
                  )}

                  {artworkFee > 0 && (
                    <div className="flex items-center justify-between text-slate-700 font-medium">
                      <span>Prepress Artwork Processing Fee</span>
                      <span className="font-mono font-semibold text-slate-900">
                        +{formatCurrency(artworkFee)}
                      </span>
                    </div>
                  )}

                  <div className="flex items-center justify-between text-slate-600">
                    <span>GST (18% Commercial Print)</span>
                    <span className="font-mono font-semibold text-slate-900">
                      +{formatCurrency(tax)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-slate-600">
                    <span>Shipping & Logistics</span>
                    {shippingTotal > 0 ? (
                      <span className="font-mono font-bold text-slate-900">
                        +{formatCurrency(shippingTotal)}
                      </span>
                    ) : item?.shippingSnapshot?.isFreeShippingApplied ? (
                      <span className="text-emerald-700 font-bold font-mono">
                        FREE Standard Delivery
                      </span>
                    ) : item?.shippingSnapshot?.deliveryMethod === 'STORE_PICKUP' ? (
                      <span className="text-slate-700 font-bold font-mono">
                        Store Pickup (₹0)
                      </span>
                    ) : item?.shippingSnapshot?.status === 'CALCULATED' && item?.shippingSnapshot?.finalShippingAmount === 0 ? (
                      <span className="text-emerald-700 font-bold font-mono">
                        FREE Standard Delivery
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium font-mono text-[11px] bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                        Calculated at checkout
                      </span>
                    )}
                  </div>

                  {/* Authoritative Shipping & Weight Details */}
                  {item?.shippingSnapshot && (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5 text-[11px] font-mono">
                      <div className="flex items-center justify-between text-slate-600 font-sans font-bold text-xs pb-1 border-b border-slate-200">
                        <span className="flex items-center gap-1.5 text-sky-700">
                          <RiTruckLine className="w-3.5 h-3.5" />
                          Logistics & Weight Breakdown
                        </span>
                        <span className="font-mono text-slate-900">
                          {item.shippingSnapshot.zoneCode ? `${item.shippingSnapshot.zoneCode} Zone` : 'Standard Delivery'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-sans">Product Quantity:</span>
                        <span className="font-bold text-slate-800">{qty} pcs</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="font-sans">Product Net Weight:</span>
                        <span className="text-slate-800">
                          {Number(item.shippingSnapshot.productWeightGrams) >= 1000
                            ? `${(Number(item.shippingSnapshot.productWeightGrams) / 1000).toFixed(2)} kg`
                            : `${Number(item.shippingSnapshot.productWeightGrams || 0)} g`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-500">
                        <span className="font-sans">Packaging Box (Tare):</span>
                        <span>
                          +{Number(item.shippingSnapshot.packaging?.weightGrams ?? item.shippingSnapshot.packagingWeightGrams ?? 200)} g
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-slate-700 font-semibold pt-1 border-t border-slate-200">
                        <span className="font-sans">Actual Shipment Weight:</span>
                        <span>
                          {Number(item.shippingSnapshot.actualWeightGrams) >= 1000
                            ? `${(Number(item.shippingSnapshot.actualWeightGrams) / 1000).toFixed(2)} kg`
                            : `${Number(item.shippingSnapshot.actualWeightGrams || 0)} g`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sky-900 font-bold">
                        <span className="font-sans">Billable Weight:</span>
                        <span>
                          {Number(item.shippingSnapshot.billableWeightGrams) >= 1000
                            ? `${(Number(item.shippingSnapshot.billableWeightGrams) / 1000).toFixed(2)} kg`
                            : `${Number(item.shippingSnapshot.billableWeightGrams || 0)} g`}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="pt-2.5 border-t border-slate-200 flex items-center justify-between text-sm">
                    <div>
                      <span className="font-black text-slate-950 font-display block">
                        Total Amount
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Inclusive of all taxes & shipping
                      </span>
                    </div>
                    <span className="text-lg font-black text-slate-950 font-mono">
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="py-12 text-center space-y-3">
              <RiShoppingBag3Line className="w-12 h-12 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Your cart is empty</p>
              <p className="text-xs text-slate-400">Configure a product to add it to your order queue.</p>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* F. DRAWER ACTIONS (STICKY FOOTER)                        */}
        {/* ======================================================== */}
        <div className="p-5 border-t border-slate-200 bg-white space-y-3 flex-shrink-0 shadow-lg">
          {item && (
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-bold text-slate-500 block font-mono">
                  Order Total (Incl. GST)
                </span>
                <span className="text-lg font-black text-slate-950 font-mono">
                  {formatCurrency(grandTotal)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-mono font-bold text-slate-800 block">
                  {qty.toLocaleString()} units
                </span>
                <span className="text-[10px] text-emerald-700 font-medium">
                  {wantsDesignService && activeDesignFee > 0 ? '+ Design Fee Incl.' : 'Free Delivery'}
                </span>
              </div>
            </div>
          )}

          {isArtworkMissing && (
            <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-300 text-[11px] text-amber-950 font-semibold flex items-center gap-2">
              <RiAlertLine className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Please upload required artwork above to proceed to checkout.</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleCheckoutClick}
            disabled={!item || isArtworkMissing}
            className={`w-full h-12 font-bold text-sm rounded-xl border shadow-xs flex items-center justify-center gap-2 transition-all ${
              !item || isArtworkMissing
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300 opacity-60'
                : 'bg-[#FFED00] hover:bg-[#F2E100] text-black cursor-pointer border-black/10 active:scale-[0.99]'
            }`}
          >
            {isArtworkMissing ? (
              <>
                <RiLockLine className="w-4 h-4 stroke-[2]" />
                <span>Upload Artwork to Proceed</span>
              </>
            ) : (
              <>
                <span>Proceed to Checkout</span>
                <RiArrowRightLine className="w-4 h-4 stroke-[2.2]" />
              </>
            )}
          </button>

          <div className="flex items-center justify-between gap-2 pt-1 text-xs">
            <button
              type="button"
              onClick={onClose}
              className="text-slate-600 hover:text-black font-medium py-1 px-2 rounded hover:bg-slate-100 transition-colors cursor-pointer"
            >
              &larr; Continue Shopping
            </button>

            <Link
              href="/cart"
              onClick={onClose}
              className="text-slate-600 hover:text-black font-semibold py-1 px-2 rounded hover:bg-slate-100 transition-colors inline-flex items-center gap-1"
            >
              <span>View Full Cart &rarr;</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
