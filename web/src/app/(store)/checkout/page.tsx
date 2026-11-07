'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  CreditCard,
  Building,
  Truck,
  Store,
  ShieldCheck,
  CheckCircle2,
  Lock,
  ArrowRight,
  Printer,
  ChevronRight,
  ShoppingBag,
} from 'lucide-react';
import {
  RiLoader4Line,
  RiLock2Line,
  RiShieldCheckLine,
  RiAlertLine,
  RiUser3Line,
  RiShoppingBag3Line,
  RiSparklingFill,
  RiCheckboxCircleLine,
  RiPaletteLine,
  RiMagicLine,
  RiFileList3Line,
  RiInformationLine,
  RiCheckLine,
} from 'react-icons/ri';
import { formatCurrency, getEstimatedDeliveryText } from '@/lib/utils';
import { api, ShippingTaxCalculationResult } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { CustomerAuthModal } from '@/components/auth/CustomerAuthModal';
import { Button, Input, Badge } from '@/components/ui';

export interface CheckoutCartItem {
  productId?: string;
  productName: string;
  sku: string;
  quantity: number;
  paymentMode?: 'FULL' | 'SPLIT_50';
  advanceAmount?: number;
  balanceAmount?: number;
  fieldValues?: Record<string, any>;
  specificationsSnapshot?: Record<string, any>;
  specifications?: Record<string, any>;
  options?: any[];
  selectedOptionsSummary?: Array<{
    fieldLabel?: string;
    optionLabel?: string;
    value?: string;
    optionName?: string;
    valueName?: string;
    priceModifier?: number;
  }>;
  variantLines?: Array<{
    combination: Record<string, string>;
    quantity: number;
    unitPrice?: number;
    lineSubtotal?: number;
  }>;
  quote?: {
    subtotal?: number;
    totalTax?: number;
    estimatedShipping?: number;
    grandTotal?: number;
    unitPrice?: number;
    variantLines?: any[];
    productionDays?: number;
  };
  artworkFile?: any;
  artworkFiles?: any;
  artworkUrl?: string;
  artworkStorageKey?: string;
  artworkConfig?: any;
  artworkRequired?: boolean;
  referenceImage?: any;
  referenceImageUrl?: string;
  selectedDesignService?: boolean;
  hasDesignService?: boolean;
  designNotes?: string;
  customerNotes?: string;
  totalPrice?: number;
  subtotal?: number;
  unitPrice?: number;
  designServiceFee?: number;
  artworkFee?: number;
  personalization?: any;
  productionDays?: number;
  shippingPincode?: string;
  shippingFee?: number;
  shippingSnapshot?: any;
}

/**
 * Extracts human-readable specifications and choices from a cart item
 */
function getItemSpecifications(item: CheckoutCartItem): Array<{ label: string; value: string }> {
  const specs: Array<{ label: string; value: string }> = [];

  // 1. Try selectedOptionsSummary (clean user-visible summary from product configurator)
  if (item.selectedOptionsSummary && Array.isArray(item.selectedOptionsSummary)) {
    for (const opt of item.selectedOptionsSummary) {
      const lbl = opt.fieldLabel || opt.optionName || '';
      const rawVal = opt.optionLabel || opt.value || opt.valueName || '';
      if (lbl && rawVal) {
        specs.push({
          label: lbl,
          value: String(rawVal),
        });
      }
    }
  }

  // 2. If empty, fallback to specificationsSnapshot or specifications
  if (specs.length === 0) {
    const rawObj = item.specificationsSnapshot || item.specifications || item.fieldValues || {};
    for (const [k, v] of Object.entries(rawObj)) {
      if (v === undefined || v === null || v === '') continue;
      if (['productId', 'id', '_id', 'quote', 'artworkFiles', 'artworkFile', 'artworkConfig', 'personalization'].includes(k)) continue;
      if (typeof v === 'object') continue;
      specs.push({
        label: k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        value: String(v),
      });
    }
  }

  return specs;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();

  const [cartItems, setCartItems] = useState<CheckoutCartItem[]>([]);
  // Backward-compatible reference to primary item
  const cart = cartItems[0] || null;

  const [paymentMode, setPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');

  const [customerDetails, setCustomerDetails] = useState({
    fullName: '',
    email: '',
    phone: '',
    companyName: '',
    gstin: '',
  });

  const [deliveryMethod, setDeliveryMethod] = useState<'COURIER' | 'STORE_PICKUP'>('COURIER');

  const [shippingAddress, setShippingAddress] = useState({
    contactName: '',
    phone: '',
    street: '',
    city: '',
    state: '',
    postalCode: '',
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Authoritative Server Shipping & Tax Quote State
  const [shippingTaxQuote, setShippingTaxQuote] = useState<ShippingTaxCalculationResult | null>(null);
  const [enterpriseShippingQuote, setEnterpriseShippingQuote] = useState<any | null>(null);
  const [isCalculatingQuote, setIsCalculatingQuote] = useState(false);

  // Load complete cart from sessionStorage or fallback to localStorage
  useEffect(() => {
    let itemsList: CheckoutCartItem[] = [];
    let initialMode: 'FULL' | 'SPLIT_50' | null = null;
    let initialPincode = '';

    const rawActive = sessionStorage.getItem('pb2_active_cart');
    if (rawActive) {
      try {
        const parsed = JSON.parse(rawActive);
        if (parsed) {
          if (Array.isArray(parsed.items) && parsed.items.length > 0) {
            itemsList = parsed.items;
          } else if (Array.isArray(parsed) && parsed.length > 0) {
            itemsList = parsed;
          } else if (parsed.productId || parsed.productName) {
            itemsList = [parsed];
          }
          if (parsed.paymentMode === 'SPLIT_50' || parsed.paymentMode === 'FULL') {
            initialMode = parsed.paymentMode;
          }
          if (parsed.shippingPincode) {
            initialPincode = parsed.shippingPincode;
          }
        }
      } catch (e) {
        console.error('Error parsing pb2_active_cart:', e);
      }
    }

    if (itemsList.length === 0) {
      const rawStored = localStorage.getItem('pb2_cart');
      if (rawStored) {
        try {
          const storedList = JSON.parse(rawStored);
          if (Array.isArray(storedList) && storedList.length > 0) {
            itemsList = storedList;
          }
        } catch (e) {
          console.error('Error parsing pb2_cart:', e);
        }
      }
    }

    if (itemsList.length > 0) {
      setCartItems(itemsList);
      const initialDeliv = itemsList[0]?.shippingSnapshot?.deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER';
      setDeliveryMethod(initialDeliv);
      if (initialDeliv === 'STORE_PICKUP' && (initialMode === 'SPLIT_50' || itemsList.some((it) => it.paymentMode === 'SPLIT_50'))) {
        setPaymentMode('SPLIT_50');
      } else {
        setPaymentMode('FULL');
      }
      if (!initialPincode) {
        initialPincode = itemsList[0]?.shippingPincode || (typeof window !== 'undefined' ? localStorage.getItem('pb2_user_pincode') || '' : '') || '';
      }
      if (initialPincode) {
        setShippingAddress((prev) => ({ ...prev, postalCode: prev.postalCode || initialPincode }));
      }
    }
  }, []);

  // When Doorstep Courier Delivery is selected, only 100% Full Settlement is allowed
  useEffect(() => {
    if (deliveryMethod === 'COURIER' && paymentMode !== 'FULL') {
      setPaymentMode('FULL');
    }
  }, [deliveryMethod, paymentMode]);

  // Pre-fill user data
  useEffect(() => {
    if (user) {
      setCustomerDetails((prev) => ({
        ...prev,
        fullName: user.fullName || prev.fullName,
        email: user.email || prev.email,
        phone: user.phone || prev.phone,
      }));
      setShippingAddress((prev) => ({
        ...prev,
        contactName: user.fullName || prev.contactName,
        phone: user.phone || prev.phone,
      }));
    }
  }, [user]);

  // Aggregate detailed price components across all cart items
  const totalPrintBase = useMemo(() => {
    return cartItems.reduce((acc, it) => {
      if (it.totalPrice && Number(it.totalPrice) > 0) {
        return acc + Number(it.totalPrice);
      }
      const uP = Number(it.unitPrice || it.quote?.unitPrice || 0);
      const q = Number(it.quantity) || 1;
      if (uP > 0) return acc + Math.round(uP * q * 100) / 100;
      const sub = Number(it.subtotal ?? it.quote?.subtotal ?? 0);
      const dFee = it.hasDesignService ? Number(it.designServiceFee || it.artworkConfig?.designServiceFee || 0) : 0;
      const aFee = Number(it.artworkFee || it.artworkConfig?.artworkPrice || 0);
      return acc + Math.max(0, sub - dFee - aFee);
    }, 0);
  }, [cartItems]);

  const totalDesignFees = useMemo(() => {
    return cartItems.reduce((acc, it) => {
      if (it.hasDesignService) {
        return acc + Number(it.designServiceFee || it.artworkConfig?.designServiceFee || 0);
      }
      return acc;
    }, 0);
  }, [cartItems]);

  const totalArtworkFees = useMemo(() => {
    return cartItems.reduce((acc, it) => {
      return acc + Number(it.artworkFee || it.artworkConfig?.artworkPrice || 0);
    }, 0);
  }, [cartItems]);

  // Aggregate authoritative subtotal across all cart items
  const subtotal = useMemo(() => {
    return cartItems.reduce(
      (acc, it) => acc + Number(it.subtotal ?? it.quote?.subtotal ?? it.totalPrice ?? 0),
      0
    );
  }, [cartItems]);

  const totalQuantity = cartItems.reduce((acc, it) => acc + Number(it.quantity || 1), 0);
  const maxProductionDays = cartItems.length > 0
    ? Math.max(...cartItems.map((it) => Number(it.productionDays || it.quote?.productionDays || 2)))
    : 2;

  // Recalculate shipping (Rate Cards & Slabs) & GST authoritatively on delivery pincode or delivery method change
  useEffect(() => {
    let isCancelled = false;
    const fetchQuote = async () => {
      if (subtotal <= 0) return;
      setIsCalculatingQuote(true);
      const cleanPin = (shippingAddress.postalCode || '').trim().replace(/[^0-9]/g, '');
      try {
        const [entRes, gstRes] = await Promise.all([
          api.calculateEnterpriseShipping({
            productId: cartItems[0]?.productId,
            quantity: totalQuantity || 1,
            destinationPincode: cleanPin,
            orderSubtotal: subtotal,
            deliveryMethod,
            items: cartItems.map((it) => ({
              productId: it.productId,
              quantity: Number(it.quantity) || 1,
              subtotal: Number(it.quote?.subtotal || it.totalPrice || it.subtotal || 0),
            })),
          }).catch(() => null),
          api.calculateShippingAndTax({
            subtotal,
            postalCode: cleanPin,
            deliveryMethod,
            items: cartItems.map((it) => ({
              productId: it.productId || 'custom-item',
              productName: it.productName || 'Print Product',
              quantity: Number(it.quantity) || 1,
              unitPrice: Number(it.quote?.unitPrice || (it.totalPrice ? it.totalPrice / (it.quantity || 1) : 0)),
              totalPrice: Number(it.quote?.subtotal || it.totalPrice || it.subtotal || 0),
            })),
            totalQuantity: totalQuantity || 1,
          }).catch(() => null),
        ]);

        if (!isCancelled) {
          if (entRes) {
            setEnterpriseShippingQuote(entRes);
            // Auto-fill City & State when 6-digit PIN matches a configured Pincode record
            if (cleanPin.length === 6 && entRes.pincodeLocation?.city && entRes.pincodeLocation?.state) {
              setShippingAddress((prev) => ({
                ...prev,
                city: entRes.pincodeLocation.city || prev.city,
                state: entRes.pincodeLocation.state || prev.state,
              }));
            }
            if (cleanPin.length === 6 && typeof window !== 'undefined') {
              localStorage.setItem('pb2_user_pincode', cleanPin);
            }
          }
          if (gstRes) {
            setShippingTaxQuote(gstRes);
          }
        }
      } catch (err) {
        console.warn('Failed to calculate shipping/tax quote from server:', err);
      } finally {
        if (!isCancelled) setIsCalculatingQuote(false);
      }
    };

    fetchQuote();

    return () => {
      isCancelled = true;
    };
  }, [subtotal, totalQuantity, shippingAddress.postalCode, deliveryMethod, cartItems.length]);

  const hasValidEnterpriseQuote =
    enterpriseShippingQuote &&
    enterpriseShippingQuote.status !== 'PENDING' &&
    enterpriseShippingQuote.status !== 'NON_SERVICEABLE';
  const isNonServiceablePincode =
    deliveryMethod === 'COURIER' && enterpriseShippingQuote?.status === 'NON_SERVICEABLE';

  const shipping =
    deliveryMethod === 'STORE_PICKUP'
      ? 0
      : hasValidEnterpriseQuote
      ? Number(enterpriseShippingQuote.finalShippingAmount ?? 0)
      : Number(cart?.shippingFee ?? cart?.shippingSnapshot?.finalShippingAmount ?? cart?.quote?.estimatedShipping ?? 0);

  const isFreeShippingApplied = hasValidEnterpriseQuote
    ? Boolean(enterpriseShippingQuote.isFreeShippingApplied)
    : Boolean(shippingTaxQuote?.isFreeShippingApplied);
  const freeShippingThreshold =
    enterpriseShippingQuote?.freeShippingThreshold ?? shippingTaxQuote?.freeShippingThreshold ?? 2000;
  const isFreeShippingEnabled = shippingTaxQuote?.isFreeShippingEnabled ?? true;
  const matchedZoneName =
    enterpriseShippingQuote?.zone?.name || shippingTaxQuote?.matchedZone?.zoneName;
  const matchedZoneCode = enterpriseShippingQuote?.zone?.code;

  const gstRatePercent = shippingTaxQuote?.gstRatePercent ?? 18;
  const tax = shippingTaxQuote?.gstAmount ?? Math.round((subtotal + shipping) * (gstRatePercent / 100) * 100) / 100;
  const grandTotal = Math.round((subtotal + tax + shipping) * 100) / 100;

  const isSplit = paymentMode === 'SPLIT_50';
  const advanceAmount = isSplit ? Math.round(grandTotal * 0.5 * 100) / 100 : grandTotal;
  const balanceAmount = isSplit ? Math.round((grandTotal - advanceAmount) * 100) / 100 : 0;
  const amountToCharge = isSplit ? advanceAmount : grandTotal;

  // Globally check if any item is missing required artwork
  const isItemMissingArtwork = (item: CheckoutCartItem): boolean => {
    if (!item) return false;

    // 1. If the customer hired a designer or design assistance is required, customer file uploads are NOT required
    if (
      item.hasDesignService ||
      item.selectedDesignService ||
      item.artworkConfig?.designServiceRequirement === 'REQUIRED'
    ) {
      return false;
    }

    // 2. If artwork config explicitly disables artwork upload
    const status = item.artworkConfig?.status || (item as any).artworkStatus || 'DISABLED';
    if (status === 'DISABLED') {
      return false;
    }

    const filesMap = (item.artworkFiles as Record<string, any>) || {};
    const hasLegacySingleFile = Boolean(
      item.artworkFile?.fileUrl ||
      item.artworkFile?.storageKey ||
      item.artworkUrl ||
      item.artworkStorageKey ||
      (typeof item.artworkFile === 'string' && item.artworkFile.trim().length > 0)
    );

    // 3. Check slot-based artwork
    const rawSlots: any[] = item.artworkConfig?.slots && Array.isArray(item.artworkConfig.slots)
      ? item.artworkConfig.slots
      : [];

    if (rawSlots.length > 0) {
      const requiredSlots = rawSlots.filter((s: any) => {
        if (s.isRequired !== undefined) return Boolean(s.isRequired);
        if (s.required !== undefined) return Boolean(s.required);
        return status === 'REQUIRED';
      });

      if (requiredSlots.length > 0) {
        const allRequiredPresent = requiredSlots.every((slot: any, idx: number) => {
          const candidateKeys = [
            slot.slotKey,
            slot.id,
            slot.key,
            slot.label,
            String(idx),
            String(idx + 1),
          ].filter(Boolean);

          for (const k of candidateKeys) {
            const f = filesMap[k];
            if (f) {
              const hasUrl = Boolean(
                f.fileUrl ||
                f.storageKey ||
                (typeof f === 'string' && f.trim().length > 0)
              );
              if (hasUrl) return true;
            }
          }
          return false;
        });

        if (!allRequiredPresent) {
          // If only 1 slot is required and a single legacy artworkFile was provided, consider it fulfilled
          if (requiredSlots.length === 1 && hasLegacySingleFile) {
            return false;
          }
          return true;
        }
        return false;
      }

      // Slots exist but none are explicitly marked isRequired
      if (status === 'REQUIRED') {
        const hasAnySlotFile = Object.values(filesMap).some((f: any) =>
          Boolean(f?.fileUrl || f?.storageKey || (typeof f === 'string' && f.trim().length > 0))
        );
        return !hasAnySlotFile && !hasLegacySingleFile;
      }

      return false;
    }

    // 4. Single artwork requirement (no slots configured)
    if (status === 'REQUIRED' || item.artworkRequired) {
      const hasAnySlotFile = Object.values(filesMap).some((f: any) =>
        Boolean(f?.fileUrl || f?.storageKey || (typeof f === 'string' && f.trim().length > 0))
      );
      return !hasLegacySingleFile && !hasAnySlotFile;
    }

    return false;
  };

  const hasMissingArtwork = useMemo(() => {
    return cartItems.some(isItemMissingArtwork);
  }, [cartItems]);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (hasMissingArtwork) {
      setErrorMessage('Please upload required artwork for all items before completing checkout.');
      return;
    }

    if (!customerDetails.fullName || !customerDetails.email || !customerDetails.phone) {
      setErrorMessage('Please fill in all required customer contact details.');
      return;
    }

    if (deliveryMethod === 'COURIER') {
      if (!shippingAddress.street?.trim()) {
        setErrorMessage('Please enter your Street Address / Building / Plot / Floor.');
        return;
      }
      if (!shippingAddress.city?.trim() || !shippingAddress.state?.trim() || !shippingAddress.postalCode?.trim()) {
        setErrorMessage('Please complete your City, State, and Postal Code (PIN).');
        return;
      }
      const cleanPin = shippingAddress.postalCode.trim().replace(/[^0-9]/g, '');
      if (cleanPin.length !== 6) {
        setErrorMessage('Please enter a valid 6-digit Indian Postal Code (PIN).');
        return;
      }
      if (isNonServiceablePincode) {
        setErrorMessage(
          enterpriseShippingQuote?.serviceabilityMessage ||
            `PIN code ${cleanPin} is currently non-serviceable for courier delivery.`
        );
        return;
      }
    }

    setIsProcessing(true);

    try {
      // Generate client idempotency key to prevent accidental duplicate submission
      const idempotencyKey = `chk_${customerDetails.email.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

      // 1. Create Master Order Record via Authoritative API preserving EVERY cart item
      const orderPayload = {
        customerId: user?.customerId || undefined,
        customerDetails: {
          fullName: customerDetails.fullName,
          email: customerDetails.email,
          phone: customerDetails.phone,
          companyName: customerDetails.companyName || undefined,
          gstin: customerDetails.gstin || undefined,
        },
        deliveryMethod,
        shippingAddress:
          deliveryMethod === 'COURIER'
            ? {
                contactName: shippingAddress.contactName || customerDetails.fullName,
                phone: shippingAddress.phone || customerDetails.phone,
                street: shippingAddress.street,
                city: shippingAddress.city,
                state: shippingAddress.state,
                postalCode: shippingAddress.postalCode,
                country: 'India',
              }
            : null,
        items: cartItems.map((item) => ({
          productId: item.productId,
          productName: item.productName || 'Premium Commercial Print Job',
          sku: item.sku || 'PB-COMM-01',
          quantity: item.quantity || 100,
          unitPrice: item.quote?.unitPrice || (item.totalPrice ? item.totalPrice / (item.quantity || 1) : 0),
          totalPrice: item.totalPrice || item.subtotal || 0,
          specifications: item.specificationsSnapshot || item.fieldValues || item.specifications || {},
          options: item.options || [],
          fieldValues: item.fieldValues || {},
          variantLines: item.variantLines || item.quote?.variantLines || null,
          artworkFile: item.artworkFile || null,
          artworkFiles: item.artworkFiles || null,
          referenceImage: item.referenceImage || null,
          artworkUrl: item.artworkFile?.fileUrl || item.artworkUrl || null,
          artworkStorageKey: item.artworkFile?.storageKey || item.artworkStorageKey || null,
          referenceImageUrl: item.referenceImage?.fileUrl || item.referenceImageUrl || null,
          selectedDesignService: Boolean(item.selectedDesignService),
          hasDesignService: Boolean(item.selectedDesignService || item.hasDesignService),
          designNotes: item.designNotes || null,
          personalization: item.personalization || null,
        })),
        subtotal,
        taxAmount: tax,
        shippingAmount: shipping,
        totalAmount: grandTotal,
        paymentMode,
        paidAmount: amountToCharge,
        advanceAmount,
        balanceAmount,
        customerNotes: cartItems.map((it) => it.designNotes).filter(Boolean).join(' | ') || null,
        paymentMethod: 'ONLINE_PREPAID',
        idempotencyKey,
      };

      const res: any = await api.createOrder(orderPayload);
      const finalOrderNumber = res?.orderNumber || res?.data?.orderNumber;

      if (!finalOrderNumber) {
        throw new Error('Order creation was not acknowledged by the server. Your selections have been saved.');
      }

      // Establish durable order: clear cart ONLY on confirmed success
      localStorage.removeItem('pb2_cart');
      sessionStorage.removeItem('pb2_active_cart');
      window.dispatchEvent(new Event('cart-updated'));

      // Redirect to Confirmation
      router.push(
        `/checkout/confirmation?orderNumber=${finalOrderNumber}&paymentMode=${paymentMode}&paid=${amountToCharge}&balance=${balanceAmount}`
      );
    } catch (err: any) {
      console.error('Order placement failed:', err);
      // Cart is strictly PRESERVED on failure so customer can retry safely
      setErrorMessage(err?.message || 'Failed to place order. Your cart and selections have been preserved.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28 md:pb-24 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] py-5 sm:py-7 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#854D0E] bg-[#FEFCE8] px-2.5 py-0.5 rounded-[6px] border border-yellow-200 uppercase tracking-wider mb-1.5">
              <Lock className="h-3.5 w-3.5 text-[#854D0E]" />
              <span>SECURE 256-BIT ENCRYPTED CHECKOUT</span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-black tracking-tight font-sans">
              Commercial Order Checkout
            </h1>
          </div>

          <Link href="/cart" className="self-start sm:self-auto">
            <Button variant="outline" size="sm" className="min-h-[40px]">
              <ShoppingBag className="h-3.5 w-3.5 mr-1" />
              <span>Return to Cart</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        <form onSubmit={handlePlaceOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Checkout Stages */}
          <div className="lg:col-span-8 space-y-6">
            {/* Step 1: Customer Identification */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#FFED00] border border-[#E3A008]" />
                  1. Customer & Billing Entity
                </h2>
                {!user && (
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(true)}
                    className="text-xs font-bold text-amber-900 hover:underline"
                  >
                    Already have an account? Sign In ➔
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name / Authorized Contact"
                  required
                  value={customerDetails.fullName}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, fullName: e.target.value })}
                  placeholder="e.g. Vikram Sharma"
                />
                <Input
                  label="Business Email"
                  type="email"
                  required
                  value={customerDetails.email}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, email: e.target.value })}
                  placeholder="name@company.com"
                />
                <Input
                  label="Mobile Phone (SMS Tracking)"
                  type="tel"
                  required
                  value={customerDetails.phone}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, phone: e.target.value })}
                  placeholder="+91 98765 43210"
                />
                <Input
                  label="Company Name (Optional)"
                  value={customerDetails.companyName}
                  onChange={(e) => setCustomerDetails({ ...customerDetails, companyName: e.target.value })}
                  placeholder="e.g. Acme Tech India Pvt Ltd"
                />
                <div className="sm:col-span-2">
                  <Input
                    label="GSTIN Number (For 18% Input Tax Credit)"
                    value={customerDetails.gstin}
                    onChange={(e) => setCustomerDetails({ ...customerDetails, gstin: e.target.value.toUpperCase() })}
                    placeholder="27AAACA1234A1Z5 (Optional)"
                    hint="GST invoice will be generated upon order dispatch"
                  />
                </div>
              </div>
            </div>

            {/* Step 2: Fulfillment & Delivery Method */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#FFED00] border border-[#E3A008]" />
                  2. Delivery & Fulfillment Option
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDeliveryMethod('COURIER');
                    setPaymentMode('FULL');
                  }}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    deliveryMethod === 'COURIER'
                      ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-900 text-[#FFED00] flex-shrink-0 mt-0.5">
                    <Truck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Doorstep Courier Delivery</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Pan-India express logistics with door-to-door tracking.
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="font-mono text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        {isFreeShippingApplied || shipping === 0 ? 'FREE SHIPPING' : formatCurrency(shipping)}
                      </span>
                      <span className="font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        ARRIVAL: {getEstimatedDeliveryText((cart as any)?.productionDays || 2).deliveryRange}
                      </span>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeliveryMethod('STORE_PICKUP')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    deliveryMethod === 'STORE_PICKUP'
                      ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-400'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-700 flex-shrink-0 mt-0.5">
                    <Store className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-900">Factory Plant Pickup</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Collect directly from Lower Parel, Mumbai press facility.
                    </div>
                    <span className="inline-block mt-2 font-mono text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                      SAME-DAY READY
                    </span>
                  </div>
                </button>
              </div>

              {/* Delivery Address Form */}
              {deliveryMethod === 'COURIER' ? (
                <div className="pt-2 space-y-3">
                  <Input
                    label="Street Address / Building / Plot / Floor"
                    required
                    value={shippingAddress.street}
                    onChange={(e) => setShippingAddress({ ...shippingAddress, street: e.target.value })}
                    placeholder="Plot 42, Industrial Area, Main Road"
                  />
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <Input
                      label="Postal Code (PIN)"
                      required
                      maxLength={6}
                      value={shippingAddress.postalCode}
                      onChange={(e) => {
                        const cleanVal = e.target.value.replace(/[^0-9]/g, '').slice(0, 6);
                        setShippingAddress({ ...shippingAddress, postalCode: cleanVal });
                      }}
                      placeholder="e.g. 600122"
                      hint={
                        isCalculatingQuote
                          ? 'Calculating rate card...'
                          : isNonServiceablePincode
                          ? 'Non-serviceable PIN code'
                          : matchedZoneName
                          ? `Matched: ${matchedZoneName} (${shipping === 0 ? 'FREE' : formatCurrency(shipping)})`
                          : 'Enter 6-digit PIN for rate slab'
                      }
                    />
                    <Input
                      label="City"
                      required
                      value={shippingAddress.city}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, city: e.target.value })}
                      placeholder="e.g. Chennai, Mumbai"
                    />
                    <Input
                      label="State"
                      required
                      value={shippingAddress.state}
                      onChange={(e) => setShippingAddress({ ...shippingAddress, state: e.target.value })}
                      placeholder="e.g. Tamil Nadu, Maharashtra"
                    />
                  </div>

                  {/* Non-Serviceable Pincode Warning */}
                  {isNonServiceablePincode && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
                      <RiAlertLine className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">PIN Code Not Serviceable</p>
                        <p className="text-[11px] text-rose-700 mt-0.5">
                          {enterpriseShippingQuote?.serviceabilityMessage ||
                            `Courier delivery is not currently available for PIN ${shippingAddress.postalCode}.`}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Replicated Rate Card & Weight Slabs Box from /admin/shipping/rates */}
                  {hasValidEnterpriseQuote && enterpriseShippingQuote?.rateCard && (
                    <div className="mt-3 bg-slate-50/90 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/80">
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {enterpriseShippingQuote.rateCard.name}
                            </span>
                            {matchedZoneCode && (
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-800 border border-sky-200">
                                {matchedZoneCode}
                              </span>
                            )}
                            <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                              PIN: {enterpriseShippingQuote.destinationPincode}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            Zone: <strong>{matchedZoneName || 'Assigned Zone'}</strong>
                            {enterpriseShippingQuote.pincodeLocation?.city
                              ? ` • ${enterpriseShippingQuote.pincodeLocation.city}, ${enterpriseShippingQuote.pincodeLocation.state}`
                              : ''}
                            {enterpriseShippingQuote.zone?.estimatedDeliveryDays
                              ? ` • Est. ${enterpriseShippingQuote.zone.estimatedDeliveryDays}`
                              : ''}
                          </p>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block">
                            Applied Courier Rate
                          </span>
                          <span className="font-mono text-sm font-black text-slate-950">
                            {isFreeShippingApplied || shipping === 0 ? 'FREE (₹0.00)' : formatCurrency(shipping)}
                          </span>
                        </div>
                      </div>

                      {/* Shipment Weight Calculation Strip */}
                      <div className="grid grid-cols-3 gap-2 text-[11px] font-mono bg-white p-2.5 rounded-lg border border-slate-200/80">
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block">Product Net Weight</span>
                          <span className="font-bold text-slate-800">
                            {Number(enterpriseShippingQuote.productWeightGrams) >= 1000
                              ? `${(Number(enterpriseShippingQuote.productWeightGrams) / 1000).toFixed(2)} kg`
                              : `${Number(enterpriseShippingQuote.productWeightGrams || 0)} g`}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 font-sans block">Packaging Box (Tare)</span>
                          <span className="font-bold text-slate-800">
                            +{Number(enterpriseShippingQuote.packaging?.weightGrams || 0)} g
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-sky-700 font-sans font-bold block">Billable Weight</span>
                          <span className="font-black text-sky-800">
                            {Number(enterpriseShippingQuote.billableWeightGrams) >= 1000
                              ? `${(Number(enterpriseShippingQuote.billableWeightGrams) / 1000).toFixed(2)} kg (${enterpriseShippingQuote.billableWeightGrams} g)`
                              : `${Number(enterpriseShippingQuote.billableWeightGrams || 0)} g`}
                          </span>
                        </div>
                      </div>

                      {/* Rate Card Weight Slabs Table (replicated from /admin/shipping/rates) */}
                      {Array.isArray(enterpriseShippingQuote.rateCard.slabs) &&
                        enterpriseShippingQuote.rateCard.slabs.length > 0 && (
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="w-full text-xs text-left">
                              <thead className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase tracking-wider border-b border-slate-200">
                                <tr>
                                  <th className="py-1.5 px-3">From Weight</th>
                                  <th className="py-1.5 px-3">To Weight</th>
                                  <th className="py-1.5 px-3 text-right">Base Shipping Fee</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                                {enterpriseShippingQuote.rateCard.slabs.map((slab: any, sIdx: number) => {
                                  const minW = Number(slab.minWeightGrams ?? 0);
                                  const maxW = Number(slab.maxWeightGrams ?? 0);
                                  const rate = Number(slab.rate ?? 0);
                                  const isMatchedSlab =
                                    enterpriseShippingQuote.matchedSlab &&
                                    (enterpriseShippingQuote.matchedSlab.id === slab.id ||
                                      (enterpriseShippingQuote.matchedSlab.minWeightGrams === minW &&
                                        enterpriseShippingQuote.matchedSlab.maxWeightGrams === maxW));

                                  return (
                                    <tr
                                      key={slab.id || sIdx}
                                      className={
                                        isMatchedSlab
                                          ? 'bg-amber-50/90 font-bold text-slate-950'
                                          : 'text-slate-600 hover:bg-slate-50'
                                      }
                                    >
                                      <td className="py-1.5 px-3">
                                        {minW >= 1000 ? `${(minW / 1000).toFixed(1)} kg` : `${minW} g`}
                                      </td>
                                      <td className="py-1.5 px-3">
                                        <span>
                                          {maxW >= 1000 ? `${(maxW / 1000).toFixed(1)} kg` : `${maxW} g`}
                                        </span>
                                        {isMatchedSlab && (
                                          <span className="ml-2 inline-block text-[9px] font-sans font-black uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                                            Active Slab
                                          </span>
                                        )}
                                      </td>
                                      <td className="py-1.5 px-3 text-right font-bold text-slate-900">
                                        {formatCurrency(rate)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}

                      {/* Excess Weight & Surcharges Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600 pt-1">
                        <span>
                          Excess Weight Beyond Last Slab:{' '}
                          <strong className="font-mono text-slate-900">
                            +{formatCurrency(Number(enterpriseShippingQuote.rateCard.additionalWeightPerKg || 0))} / kg
                          </strong>
                        </span>
                        {Number(enterpriseShippingQuote.additionalWeightCharge) > 0 && (
                          <span className="font-mono font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Extra Weight Charge: +{formatCurrency(Number(enterpriseShippingQuote.additionalWeightCharge))}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1">
                  <p className="font-bold text-slate-900">Press Plant Collection Address:</p>
                  <p className="text-slate-600">
                    PRINT BAZZAR Press Operations, Plot 42-C, Lower Parel Industrial Estate, Mumbai 400013
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">Operating Hours: Mon-Sat 08:00 AM - 09:00 PM</p>
                </div>
              )}
            </div>

            {/* Step 3: Payment Method & Terms */}
            <div className="bg-white rounded-xl border border-slate-200/90 p-6 shadow-card space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#FFED00] border border-[#E3A008]" />
                  3. Payment Terms & Gateway Settlement
                </h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  <span>256-Bit SSL</span>
                </div>
              </div>

              {/* Payment Mode Selection Tiles */}
              <div className={`grid gap-3 ${deliveryMethod === 'STORE_PICKUP' ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
                <button
                  type="button"
                  onClick={() => setPaymentMode('FULL')}
                  className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    paymentMode === 'FULL'
                      ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="p-2 rounded-lg bg-slate-900 text-[#FFED00] flex-shrink-0 mt-0.5">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">100% Full Settlement</span>
                      <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">
                        1-CLICK
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Pay <strong>{formatCurrency(grandTotal)}</strong> now. Single seamless checkout transaction.
                    </div>
                  </div>
                </button>

                {deliveryMethod === 'STORE_PICKUP' && (
                  <button
                    type="button"
                    onClick={() => setPaymentMode('SPLIT_50')}
                    className={`p-4 rounded-xl border text-left flex items-start gap-3 transition-all ${
                      paymentMode === 'SPLIT_50'
                        ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="p-2 rounded-lg bg-[#FFED00] text-slate-950 flex-shrink-0 mt-0.5 border border-[#E3A008]/40">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">50% Split Milestone</span>
                        <span className="text-[10px] font-mono font-black bg-[#FFED00] text-slate-950 px-1.5 py-0.5 rounded border border-[#E3A008]/40">
                          ADVANCE
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1">
                        Pay <strong>{formatCurrency(advanceAmount)}</strong> (50%) today to initiate prepress. Balance <strong>{formatCurrency(balanceAmount)}</strong> on pickup.
                      </div>
                    </div>
                  </button>
                )}
              </div>

              {deliveryMethod === 'COURIER' && (
                <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2 text-xs text-slate-600">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Doorstep Courier Delivery requires <strong>100% Full Settlement</strong> online prepaid.</span>
                </div>
              )}

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-900 shadow-xs">
                    <CreditCard className="h-5 w-5 text-slate-700" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      UPI, NetBanking, Cards & Corporate Credit
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">
                      Instant reconciliation with automated Job Card generation.
                    </span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                  VERIFIED
                </span>
              </div>
            </div>
          </div>

          {/* Right Column: Order Snapshot & Confirmation Button */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-elevated space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display border-b border-slate-100 pb-3">
                Order Review
              </h3>

              {/* Multi-Item Detailed Snapshot */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-500 uppercase pb-1 border-b border-slate-100">
                  <span>Configured Items</span>
                  <span>{cartItems.length} {cartItems.length === 1 ? 'Product' : 'Products'}</span>
                </div>
                {cartItems.map((item, idx) => {
                  const missingArtwork = isItemMissingArtwork(item);
                  const artworkStatus = item.artworkConfig?.status || (item as any).artworkStatus || 'DISABLED';
                  const uploadedFilesCount = Object.keys(item.artworkFiles || {}).length || (item.artworkFile ? 1 : 0);
                  const specItems = getItemSpecifications(item);

                  const itemQty = Number(item.quantity) || 1;
                  const itemTotal = Number(item.subtotal ?? item.quote?.subtotal ?? item.totalPrice ?? 0);
                  const itemDesignFee = item.hasDesignService ? Number(item.designServiceFee || item.artworkConfig?.designServiceFee || 0) : 0;
                  const itemArtworkFee = Number(item.artworkFee || item.artworkConfig?.artworkPrice || 0);

                  let itemBasePrintPrice = 0;
                  if (item.totalPrice && Number(item.totalPrice) > 0) {
                    itemBasePrintPrice = Number(item.totalPrice);
                  } else if (itemTotal > 0) {
                    itemBasePrintPrice = Math.max(0, itemTotal - itemDesignFee - itemArtworkFee);
                  }
                  const itemUnitPrice = Number(item.unitPrice || item.quote?.unitPrice || (itemQty > 0 ? itemBasePrintPrice / itemQty : 0));
                  if (itemBasePrintPrice <= 0 && itemUnitPrice > 0) {
                    itemBasePrintPrice = Math.round(itemUnitPrice * itemQty * 100) / 100;
                  }

                  return (
                    <div key={idx} className="p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/90 space-y-2.5 text-xs">
                      {/* Header: Product Name & Line Total */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="font-bold text-slate-950 font-display text-sm leading-snug">
                            {item.productName || 'Custom Print Order'}
                          </h4>
                          <div className="flex items-center flex-wrap gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                            <span>SKU: {item.sku || 'PB-COMM-01'}</span>
                            <span>•</span>
                            <span className="font-bold text-slate-800">{itemQty} {itemQty === 1 ? 'unit' : 'units'}</span>
                            {itemUnitPrice > 0 && (
                              <>
                                <span>•</span>
                                <span>₹{itemUnitPrice.toFixed(2)}/unit</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-slate-950 text-sm block">
                            {formatCurrency(itemTotal)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono block">Excl. GST</span>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex items-center justify-between pt-0.5">
                        {item.hasDesignService ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-mono font-bold">
                            <RiSparklingFill className="w-3 h-3 text-amber-600" />
                            Design Assistance (+₹{itemDesignFee.toFixed(2)})
                          </span>
                        ) : missingArtwork ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-rose-50 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-sans font-bold">
                            <Lock className="w-3 h-3 text-rose-600" />
                            Artwork Required
                          </span>
                        ) : artworkStatus === 'DISABLED' ? (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-full font-sans font-bold">
                            <RiShieldCheckLine className="w-3.5 h-3.5 text-emerald-600" />
                            Ready for Production
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-sans font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {uploadedFilesCount > 0 ? `Artwork Uploaded (${uploadedFilesCount})` : 'Artwork Ready'}
                          </span>
                        )}

                        {missingArtwork && (
                          <Link href="/cart" className="text-[11px] font-bold text-amber-900 underline hover:text-black flex items-center gap-1">
                            <span>Upload files in Cart</span>
                            <ChevronRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>

                      {/* Configured Specifications Matrix */}
                      {specItems.length > 0 && (
                        <div className="bg-white rounded-lg p-2.5 border border-slate-200/90 space-y-1.5 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-slate-100 pb-1">
                            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider">
                              Specifications
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {specItems.length} choices
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                            {specItems.map((spec, sIdx) => (
                              <div key={sIdx} className="flex items-baseline justify-between gap-1 py-0.5 border-b border-slate-50 last:border-0">
                                <span className="text-slate-500 font-medium truncate">{spec.label}:</span>
                                <span className="font-bold text-slate-900 font-mono text-right shrink-0">{spec.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Custom Personalization Details */}
                      {item.personalization && (
                        <div className="bg-purple-50/70 rounded-lg p-2.5 border border-purple-200 space-y-1.5 text-[11px]">
                          <div className="flex items-center justify-between border-b border-purple-100 pb-1">
                            <span className="text-[10px] font-mono font-bold text-purple-900 uppercase flex items-center gap-1">
                              <RiMagicLine className="w-3 h-3 text-purple-700" />
                              <span>Personalization: {item.personalization.templateName || 'Custom'}</span>
                            </span>
                            <span className="text-[10px] font-mono font-bold text-purple-800 bg-purple-100/90 px-1.5 py-0.2 rounded border border-purple-200">
                              {item.personalization.perItemEntries?.length || itemQty} units personalized
                            </span>
                          </div>

                          {/* Shared Personalization Values */}
                          {item.personalization.sharedValues && Object.keys(item.personalization.sharedValues).length > 0 && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-2 gap-y-0.5 text-[10px]">
                              {Object.entries(item.personalization.sharedValues).map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-1">
                                  <span className="text-purple-900/70 font-medium">{k}:</span>
                                  <span className="font-bold text-purple-950 font-mono text-right truncate">{String(v)}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Per-Item Personalization Entries Preview */}
                          {Array.isArray(item.personalization.perItemEntries) && item.personalization.perItemEntries.length > 0 && (
                            <div className="space-y-0.5 pt-0.5">
                              <span className="text-[9px] font-mono font-bold text-purple-700 uppercase tracking-wider block">
                                Individual Item Names:
                              </span>
                              <div className="max-h-20 overflow-y-auto space-y-0.5 pr-1 no-scrollbar text-[10px] font-mono text-slate-700">
                                {item.personalization.perItemEntries.slice(0, 3).map((entry: any, eIdx: number) => {
                                  const vals = Object.values(entry.values || entry).join(' • ');
                                  return (
                                    <div key={eIdx} className="flex items-center justify-between bg-white/70 px-2 py-0.5 rounded border border-purple-100">
                                      <span className="text-purple-600 font-bold">#{entry.itemIndex || eIdx + 1}</span>
                                      <span className="truncate max-w-[80%] font-semibold">{vals || 'Item Personalized'}</span>
                                    </div>
                                  );
                                })}
                                {item.personalization.perItemEntries.length > 3 && (
                                  <span className="text-[9px] text-purple-600 italic block text-right">
                                    +{item.personalization.perItemEntries.length - 3} more items configured
                                  </span>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Multi-Variant Lines if present */}
                      {item.variantLines && item.variantLines.length > 0 && (
                        <div className="bg-white rounded-lg p-2.5 border border-slate-200/90 space-y-1 text-[11px]">
                          <span className="text-[10px] font-mono font-bold text-amber-900 uppercase block">
                            Multi-Variant Breakdown ({item.quantity} pcs total):
                          </span>
                          {item.variantLines.map((vl: any, vIdx: number) => {
                            const desc = Object.entries(vl.combination || {})
                              .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                              .join(' • ');
                            return (
                              <div key={vIdx} className="flex justify-between text-[11px] text-slate-700">
                                <span>{desc}</span>
                                <span className="font-mono font-bold text-slate-900">{vl.quantity} pcs</span>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Special Notes if entered */}
                      {(item.customerNotes || item.designNotes) && (
                        <div className="bg-slate-100/90 rounded-lg p-2 border border-slate-200 text-[10px] text-slate-700 flex items-start gap-1.5 font-mono">
                          <span className="font-bold text-slate-900 uppercase shrink-0">Notes:</span>
                          <span className="italic truncate">{item.customerNotes || item.designNotes}</span>
                        </div>
                      )}

                      {/* Detailed Line Pricing Breakdown */}
                      <div className="pt-2 border-t border-slate-200/80 space-y-1 text-[11px] font-mono">
                        <div className="flex justify-between text-slate-600">
                          <span>
                            Fabrication Rate ({itemQty} pcs × ₹{itemUnitPrice.toFixed(2)})
                          </span>
                          <span className="font-bold text-slate-900">{formatCurrency(itemBasePrintPrice)}</span>
                        </div>

                        {item.hasDesignService && itemDesignFee > 0 && (
                          <div className="flex justify-between text-amber-900 font-medium bg-amber-50/70 px-1.5 py-0.5 rounded border border-amber-200/80">
                            <span className="flex items-center gap-1 font-bold">
                              <RiSparklingFill className="w-3 h-3 text-amber-600" />
                              <span>Design Assistance Fee</span>
                            </span>
                            <span className="font-black">+{formatCurrency(itemDesignFee)}</span>
                          </div>
                        )}

                        {itemArtworkFee > 0 && (
                          <div className="flex justify-between text-slate-700">
                            <span>Artwork Prepress Fee</span>
                            <span className="font-bold">+{formatCurrency(itemArtworkFee)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Price Calculation */}
              <div className="space-y-2 text-xs">
                {/* Print & Fabrication Subtotal */}
                <div className="flex justify-between text-slate-600 font-mono">
                  <span>Print & Fabrication ({totalQuantity} units)</span>
                  <span className="font-bold text-slate-900">{formatCurrency(totalPrintBase)}</span>
                </div>

                {/* Design Service Assistance Fees (if any) */}
                {totalDesignFees > 0 && (
                  <div className="flex justify-between text-amber-900 font-mono font-medium bg-amber-50/80 p-1.5 rounded-lg border border-amber-200">
                    <span className="flex items-center gap-1.5 font-bold">
                      <RiSparklingFill className="w-3.5 h-3.5 text-amber-600" />
                      <span>Design Assistance Services</span>
                    </span>
                    <span className="font-black">+{formatCurrency(totalDesignFees)}</span>
                  </div>
                )}

                {/* Artwork Prepress Fees (if any) */}
                {totalArtworkFees > 0 && (
                  <div className="flex justify-between text-slate-700 font-mono">
                    <span>Prepress Processing Fees</span>
                    <span className="font-bold">+{formatCurrency(totalArtworkFees)}</span>
                  </div>
                )}

                {/* Order Subtotal (Excl. Tax) */}
                <div className="flex justify-between text-slate-800 font-mono font-bold pt-1.5 border-t border-slate-100">
                  <span>Subtotal (Excl. Tax)</span>
                  <span className="font-black text-slate-950">{formatCurrency(subtotal)}</span>
                </div>

                <div className="flex justify-between text-slate-600">
                  <div>
                    <span className="block font-medium">Commercial GST ({gstRatePercent}%)</span>
                    <span className="text-[10px] text-slate-400 font-mono">18% Input Tax Credit Eligible</span>
                  </div>
                  <span className="font-mono font-bold text-slate-900">{formatCurrency(tax)}</span>
                </div>

                {/* Delivery Charges - Prominently Displayed Separately */}
                <div className="flex justify-between text-slate-600 items-start p-2.5 bg-slate-50/80 rounded-lg border border-slate-100">
                  <div className="pr-2">
                    <div className="flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-slate-700" />
                      <span className="font-bold text-slate-900 text-xs">Courier & Delivery Charges</span>
                    </div>
                    {deliveryMethod === 'COURIER' && (
                      <div className="space-y-0.5 mt-1">
                        {matchedZoneName && (
                          <span className="text-[10px] text-indigo-700 font-semibold block">
                            Region / Zone: {matchedZoneCode ? `${matchedZoneCode} — ` : ''}{matchedZoneName}
                          </span>
                        )}
                        {enterpriseShippingQuote?.rateCard?.name && (
                          <span className="text-[10px] text-sky-700 font-mono font-bold block">
                            Rate Card: {enterpriseShippingQuote.rateCard.name}
                          </span>
                        )}
                        {(enterpriseShippingQuote?.calculationBasis || shippingTaxQuote?.calculationBasis) && (
                          <span className="text-[10px] text-slate-500 font-mono block">
                            {enterpriseShippingQuote?.calculationBasis || shippingTaxQuote?.calculationBasis}
                          </span>
                        )}
                        {enterpriseShippingQuote?.billableWeightGrams ? (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Billable Weight:{' '}
                            {Number(enterpriseShippingQuote.billableWeightGrams) >= 1000
                              ? `${(Number(enterpriseShippingQuote.billableWeightGrams) / 1000).toFixed(2)} kg (${enterpriseShippingQuote.billableWeightGrams} g)`
                              : `${enterpriseShippingQuote.billableWeightGrams} g`}
                          </span>
                        ) : shippingTaxQuote?.totalWeightKg ? (
                          <span className="text-[10px] text-slate-400 font-mono block">
                            Shipment Weight: {shippingTaxQuote.totalWeightKg} kg
                          </span>
                        ) : null}
                      </div>
                    )}
                    {deliveryMethod === 'STORE_PICKUP' && (
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        Direct Plant Pickup (₹0.00)
                      </span>
                    )}
                  </div>
                  <span className={`font-mono font-bold text-sm shrink-0 ${shipping === 0 ? 'text-emerald-700' : 'text-slate-900'}`}>
                    {shipping === 0 ? 'FREE (₹0)' : formatCurrency(shipping)}
                  </span>
                </div>

                {/* Free Shipping Alert or Progress Hint */}
                {deliveryMethod === 'COURIER' && isFreeShippingApplied && (
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-[11px] text-emerald-800 font-medium">
                    ✓ Free delivery threshold unlocked on this order!
                  </div>
                )}
                {deliveryMethod === 'COURIER' && isFreeShippingEnabled && freeShippingThreshold > 0 && subtotal < freeShippingThreshold && (
                  <div className="p-2 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                    Add <strong>{formatCurrency(freeShippingThreshold - subtotal)}</strong> more for free delivery!
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                  <div>
                    <span className="text-xs font-bold text-slate-600 block">Total Order Value</span>
                    <span className="text-[10px] text-slate-400 font-mono">Inclusive of GST</span>
                  </div>
                  <span className="text-lg font-black text-slate-900 font-display">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>

                {/* Milestone Split Block */}
                {isSplit ? (
                  <div className="p-3.5 bg-amber-50/80 rounded-xl border border-amber-200 space-y-2 text-xs">
                    <div className="flex items-center justify-between text-amber-950 font-bold">
                      <span className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-[#E3A008]" />
                        50% Advance Due Today:
                      </span>
                      <span className="font-mono font-black text-base text-slate-950">
                        {formatCurrency(advanceAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1.5 border-t border-amber-200/60">
                      <span>50% Balance on Dispatch:</span>
                      <span className="font-mono font-bold text-slate-800">
                        {formatCurrency(balanceAmount)}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">Payment Term:</span>
                    <span className="font-bold text-slate-900">100% Full Settlement</span>
                  </div>
                )}
              </div>

              {hasMissingArtwork && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-semibold text-amber-900 flex items-start gap-2">
                  <RiAlertLine className="h-4 w-4 text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Required Artwork Files Missing</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Production requires print-ready artwork files for each item before you can place the order.
                    </p>
                    <Link href="/cart" className="inline-block mt-1 text-[11px] font-bold text-amber-950 underline hover:text-black">
                      ← Return to Cart to Upload Artwork
                    </Link>
                  </div>
                </div>
              )}

              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-bold text-rose-800 flex items-center gap-1.5">
                  <RiAlertLine className="h-4 w-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Submit CTA */}
              <Button
                type="submit"
                variant={hasMissingArtwork || isNonServiceablePincode ? 'secondary' : 'primary'}
                size="lg"
                className={`w-full ${hasMissingArtwork || isNonServiceablePincode ? 'opacity-60 cursor-not-allowed bg-slate-200 text-slate-500 hover:bg-slate-200' : 'shadow-brand'}`}
                disabled={isProcessing || hasMissingArtwork || isNonServiceablePincode}
                isLoading={isProcessing}
              >
                {hasMissingArtwork ? (
                  <span className="flex items-center justify-center gap-2">
                    <Lock className="h-4 w-4" />
                    <span>Upload Artwork to Authorize</span>
                  </span>
                ) : (
                  <>
                    <span>
                      {isSplit
                        ? `Pay ${formatCurrency(advanceAmount)} (50% Advance) & Authorize`
                        : `Pay ${formatCurrency(grandTotal)} & Authorize Order`}
                    </span>
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </Button>

              <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] text-slate-500 text-center font-medium">
                <p>Upon payment authorization, an automated Job Card will route to our shop-floor work centers.</p>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Customer Auth Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
        }}
      />
    </div>
  );
}
