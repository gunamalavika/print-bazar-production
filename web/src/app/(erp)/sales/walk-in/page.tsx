'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiShoppingBag3Line,
  RiUser3Line,
  RiEqualizerLine,
  RiMoneyDollarCircleLine,
  RiCheckLine,
  RiArrowRightLine,
  RiArrowLeftLine,
  RiSearchLine,
  RiStore2Line,
  RiTruckLine,
  RiPrinterLine,
  RiFileList3Line,
  RiAlertFill,
  RiFlashlightLine,
  RiPaletteLine,
  RiUploadCloud2Line,
  RiQrCodeLine,
  RiBankCardLine,
  RiHandCoinLine,
  RiBankLine,
  RiBuilding4Line,
  RiShieldCheckLine,
  RiCheckboxCircleLine,
  RiEyeLine,
  RiRefreshLine,
  RiAddLine,
  RiSubtractLine,
  RiDeleteBinLine,
  RiInformationLine,
  RiCameraLine,
  RiCloseLine,
  RiLoader4Line,
} from 'react-icons/ri';
import {
  api,
  DynamicProduct,
  ProductCategoryItem,
  ProductOptionGroup,
  resolveImageUrl,
} from '@/lib/api';
import {
  FlowArtworkState,
  FlowReferenceImageState,
} from '@/components/configurator/ProductConfigurationFlow';
import { formatCurrency } from '@/lib/utils';
import { Button, Badge, Modal } from '@/components/ui';
import { DynamicFieldRenderer } from '@/components/configurator/DynamicFieldRenderer';

const STANDARD_PRESETS = [50, 100, 250, 500, 1000, 2500, 5000];

export default function WalkInOrdersPage() {
  const router = useRouter();

  // -------------------------------------------------------------
  // 1. NAVIGATION & STEP MANAGEMENT (Front-End Aligned Order)
  // Stage 1: Select Product
  // Stage 2: Configure & Specs (Specs, Options, Quantity, Artwork)
  // Stage 3: Customer Intake & Delivery (Contact, Address, SLA)
  // Stage 4: Payment & Review (POS Settlement, Receipt)
  // -------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<number>(1);

  // -------------------------------------------------------------
  // 2. PRODUCT CATALOGUE STATE
  // -------------------------------------------------------------
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [productSearch, setProductSearch] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<DynamicProduct | null>(null);
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  useEffect(() => {
    async function loadCatalog() {
      setIsLoadingProducts(true);
      try {
        const [prods, cats] = await Promise.all([
          api.getProducts().catch(() => []),
          api.getCategories().catch(() => []),
        ]);
        setProducts(prods || []);
        setCategories(cats || []);
        if (prods && prods.length > 0 && !selectedProduct) {
          setSelectedProduct(prods[0]);
        }
      } catch (err) {
        console.error('Failed to load catalogue:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    }
    loadCatalog();
  }, []);

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat = selectedCategoryId === 'ALL' || p.categoryId === selectedCategoryId;
      const matchSearch =
        !productSearch ||
        p.name.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.sku.toLowerCase().includes(productSearch.toLowerCase()) ||
        p.tags?.some((t) => t.toLowerCase().includes(productSearch.toLowerCase()));
      return matchCat && matchSearch;
    });
  }, [products, selectedCategoryId, productSearch]);

  // -------------------------------------------------------------
  // 3. PRODUCT CONFIGURATION & SPECIFICATIONS STATE (Front-End Style)
  // -------------------------------------------------------------
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [quantity, setQuantity] = useState<number>(500);

  // Extract option groups identically to front-end ProductConfigurationFlow
  const effectiveGroups: ProductOptionGroup[] = useMemo(() => {
    if (!selectedProduct) return [];
    if (selectedProduct.optionGroups && selectedProduct.optionGroups.length > 0) {
      return [...selectedProduct.optionGroups].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    // Backward compatibility for legacy product structure
    if (selectedProduct.fields && selectedProduct.fields.length > 0) {
      return selectedProduct.fields.map((f: any) => ({
        id: f.id,
        productId: selectedProduct.id,
        name: f.label || f.name,
        code: f.key || f.code,
        inputType: f.type || 'SELECT',
        description: f.description,
        isRequired: Boolean(f.isRequired),
        isCustomerVisible: f.isCustomerVisible !== false,
        sortOrder: f.sortOrder || 0,
        isActive: true,
        options: (f.options || []).map((o: any) => ({
          id: o.id,
          groupId: f.id,
          label: o.label || o.name,
          value: o.value || o.code,
          priceModifierType: o.priceModifierType || 'FIXED',
          priceModifier: o.priceModifier || 0,
          sortOrder: o.sortOrder || 0,
          isDefault: Boolean(o.isDefault),
          isActive: o.isActive !== false,
          fileCount: o.fileCount,
          fileSlotLabels: o.fileSlotLabels,
          minMegapixels: o.minMegapixels,
        })),
      }));
    }
    return [];
  }, [selectedProduct]);

  // Artwork & Preflight State
  const [artworkFile, setArtworkFile] = useState<FlowArtworkState | null>(null);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState<boolean>(false);
  const [artworkChoice, setArtworkChoice] = useState<'UPLOAD' | 'DESIGN' | 'SKIP'>('UPLOAD');
  const [designNotes, setDesignNotes] = useState<string>('');
  const [referenceImage, setReferenceImage] = useState<FlowReferenceImageState | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState<boolean>(false);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Initialize fields & defaults when product changes
  useEffect(() => {
    if (selectedProduct) {
      const initial: Record<string, any> = {};
      for (const group of effectiveGroups) {
        if (group.options && group.options.length > 0) {
          const def = group.options.find((o) => o.isDefault && o.isActive) || group.options[0];
          if (def) initial[group.code] = def.value;
        }
      }
      setFieldValues(initial);

      // Default quantity to first valid standard preset >= minQuantity
      const minQ = selectedProduct.minQuantity || 1;
      const validPreset = STANDARD_PRESETS.find((p) => p >= minQ) || minQ;
      setQuantity(validPreset);

      // Artwork choice defaults
      if (selectedProduct.designServiceRequirement === 'REQUIRED') {
        setArtworkChoice('DESIGN');
      } else if (selectedProduct.artworkRequirement === 'REQUIRED') {
        setArtworkChoice('UPLOAD');
      } else {
        setArtworkChoice('UPLOAD');
      }
    }
  }, [selectedProduct, effectiveGroups]);

  // Handle Dynamic Field Change
  const handleFieldValueChange = (key: string, val: any) => {
    setFieldValues((prev) => ({ ...prev, [key]: val }));
  };

  // Upload Artwork handler
  const handleArtworkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProduct) return;
    setIsUploadingArtwork(true);
    try {
      const res = await api.uploadArtwork(
        file,
        selectedProduct.id,
        Number(selectedProduct.minimumArtworkMegapixels) || 1.0
      );
      setArtworkFile({
        fileUrl: res.fileUrl,
        storageKey: res.storageKey,
        originalFileName: res.originalFileName,
        fileSize: res.fileSize,
        mimeType: res.mimeType,
        width: res.width,
        height: res.height,
        actualMegapixels: res.actualMegapixels,
        requiredMegapixels: res.requiredMegapixels,
        qualityStatus: res.qualityStatus,
        warningMessage: res.warningMessage,
        warningAccepted: true,
      });
      setArtworkChoice('UPLOAD');
    } catch (err: any) {
      alert(`Artwork Upload Error: ${err?.message || 'Failed to process file'}`);
    } finally {
      setIsUploadingArtwork(false);
      if (artworkInputRef.current) artworkInputRef.current.value = '';
    }
  };

  // Upload Reference Image handler
  const handleReferenceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingRef(true);
    try {
      const res = await api.uploadReferenceImage(file);
      setReferenceImage({
        fileUrl: res.fileUrl,
        storageKey: res.storageKey,
        originalFileName: res.originalFileName,
        fileSize: res.fileSize,
      });
    } catch (err: any) {
      alert(`Reference Upload Error: ${err?.message || 'Failed to process reference image'}`);
    } finally {
      setIsUploadingRef(false);
      if (refInputRef.current) refInputRef.current.value = '';
    }
  };

  // Effective Flags
  const effectiveHasArtwork = useMemo(() => {
    if (!selectedProduct) return false;
    if (selectedProduct.artworkRequirement === 'DISABLED') return false;
    return Boolean(artworkFile && artworkChoice === 'UPLOAD');
  }, [selectedProduct, artworkFile, artworkChoice]);

  const effectiveHasDesign = useMemo(() => {
    if (!selectedProduct) return false;
    if (selectedProduct.designServiceRequirement === 'REQUIRED') return true;
    return artworkChoice === 'DESIGN';
  }, [selectedProduct, artworkChoice]);

  const designPrice = Number(selectedProduct?.designServicePrice) || 0;

  // -------------------------------------------------------------
  // 4. WALK-IN CUSTOMER & DELIVERY STATE
  // -------------------------------------------------------------
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [customerCompany, setCustomerCompany] = useState<string>('');
  const [customerGstin, setCustomerGstin] = useState<string>('');
  const [deliveryMethod, setDeliveryMethod] = useState<'STORE_PICKUP' | 'COURIER'>('STORE_PICKUP');

  // Shipping address (for courier)
  const [shippingStreet, setShippingStreet] = useState<string>('');
  const [shippingCity, setShippingCity] = useState<string>('Mumbai');
  const [shippingState, setShippingState] = useState<string>('Maharashtra');
  const [shippingPincode, setShippingPincode] = useState<string>('');
  const [orderPriority, setOrderPriority] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [counterNotes, setCounterNotes] = useState<string>('');

  // -------------------------------------------------------------
  // 5. AUTHORITATIVE LIVE PRICING CALCULATION
  // -------------------------------------------------------------
  const [quote, setQuote] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedProduct) return;
    let isCurrent = true;
    const fetchQuote = async () => {
      setIsCalculating(true);
      try {
        const optionsPayload = Object.entries(fieldValues).map(([optionCode, valueCode]) => ({
          optionCode,
          valueCode: String(valueCode),
        }));

        const q = await api.calculateQuote({
          productId: selectedProduct.id,
          quantity: Number(quantity) || selectedProduct.minQuantity || 1,
          fieldValues,
          options: optionsPayload,
          hasArtwork: effectiveHasArtwork,
          hasDesignService: effectiveHasDesign,
          hasReferenceImage: Boolean(referenceImage),
          deliveryMethod,
          shippingPincode: deliveryMethod === 'COURIER' && shippingPincode ? shippingPincode : undefined,
          isInterState: false,
        });
        if (isCurrent) setQuote(q);
      } catch (err) {
        console.warn('Quote calculation fallback', err);
      } finally {
        if (isCurrent) setIsCalculating(false);
      }
    };
    const timer = setTimeout(fetchQuote, 120);
    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [
    selectedProduct,
    quantity,
    fieldValues,
    effectiveHasArtwork,
    effectiveHasDesign,
    referenceImage,
    deliveryMethod,
    shippingPincode,
  ]);

  const subtotalAmount = Number(
    quote?.subtotal || (Number(selectedProduct?.basePrice || 100) * quantity)
  );
  const designFeeAmount = effectiveHasDesign ? designPrice : 0;
  const taxAmount = Number(
    quote?.totalTax || Math.round((subtotalAmount + designFeeAmount) * 0.18 * 100) / 100
  );
  const grandTotalAmount = Number(
    quote?.grandTotal || Math.round((subtotalAmount + designFeeAmount + taxAmount) * 100) / 100
  );
  const unitPriceAmount = quantity > 0 ? subtotalAmount / quantity : Number(selectedProduct?.basePrice || 0);

  // -------------------------------------------------------------
  // 6. PAYMENT METHOD & SETTLEMENT STATE
  // -------------------------------------------------------------
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');
  const [paymentMethod, setPaymentMethod] = useState<
    'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CORPORATE_CREDIT'
  >('CASH');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(true);
  const [isTermsModalOpen, setIsTermsModalOpen] = useState<boolean>(false);

  const amountToCollectNow = useMemo(() => {
    if (paymentMode === 'SPLIT_50') {
      return Math.round(grandTotalAmount * 0.5 * 100) / 100;
    }
    return grandTotalAmount;
  }, [paymentMode, grandTotalAmount]);

  const balanceAmountDue = useMemo(() => {
    if (paymentMode === 'SPLIT_50') {
      return Math.round((grandTotalAmount - amountToCollectNow) * 100) / 100;
    }
    return 0;
  }, [paymentMode, grandTotalAmount, amountToCollectNow]);

  const cashChangeReturn = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    return Math.max(0, Math.round((tendered - amountToCollectNow) * 100) / 100);
  }, [cashTendered, amountToCollectNow]);

  // -------------------------------------------------------------
  // 7. ORDER CREATION SUBMISSION & RESULT
  // -------------------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [createdOrderResult, setCreatedOrderResult] = useState<any | null>(null);

  // Validation
  const validationErrors = useMemo(() => {
    const errors: string[] = [];
    if (!selectedProduct) errors.push('Please select a product.');
    if (quantity < (selectedProduct?.minQuantity || 1)) {
      errors.push(`Minimum quantity is ${selectedProduct?.minQuantity || 1} units.`);
    }
    if (!customerName.trim()) errors.push('Walk-in Customer Name is required.');
    if (!customerPhone.trim()) errors.push('Customer Phone number is required for SMS/WhatsApp receipts.');
    if (deliveryMethod === 'COURIER' && (!shippingStreet.trim() || !shippingPincode.trim())) {
      errors.push('Please enter complete Street Address & Pincode for Courier Dispatch.');
    }
    if (!termsAccepted) {
      errors.push('Please confirm Terms & Conditions / Proofing policy.');
    }
    return errors;
  }, [
    selectedProduct,
    quantity,
    customerName,
    customerPhone,
    deliveryMethod,
    shippingStreet,
    shippingPincode,
    termsAccepted,
  ]);

  const isFormValid = validationErrors.length === 0;

  const handleCreateWalkInOrder = async () => {
    if (!isFormValid || !selectedProduct) return;
    setIsSubmitting(true);

    try {
      const payload = {
        sourceChannel: 'WALK_IN',
        deliveryMethod: deliveryMethod === 'STORE_PICKUP' ? 'STORE_PICKUP' : 'COURIER',
        priority: orderPriority,
        customerDetails: {
          fullName: customerName.trim(),
          email: customerEmail.trim() || `counter-${Date.now()}@printbazzar.local`,
          phone: customerPhone.trim(),
          companyName: customerCompany.trim() || undefined,
          gstin: customerGstin.trim() || undefined,
        },
        shippingAddress:
          deliveryMethod === 'COURIER'
            ? {
                contactName: customerName.trim(),
                phone: customerPhone.trim(),
                street: shippingStreet.trim(),
                city: shippingCity.trim(),
                state: shippingState.trim(),
                postalCode: shippingPincode.trim(),
                country: 'India',
              }
            : undefined,
        paymentMode,
        paymentMethod,
        paidAmount: amountToCollectNow,
        advanceAmount: amountToCollectNow,
        balanceAmount: balanceAmountDue,
        customerNotes: counterNotes.trim() || undefined,
        items: [
          {
            productId: selectedProduct.id,
            productName: selectedProduct.name,
            sku: selectedProduct.sku,
            quantity,
            fieldValues,
            specifications: {
              ...fieldValues,
              quantity,
              deliveryMethod,
              workflowRoute: effectiveHasDesign ? 'DESIGN_SERVICE' : 'CUSTOMER_ARTWORK',
              hasArtwork: effectiveHasArtwork,
              hasDesignService: effectiveHasDesign,
            },
            designNotes: effectiveHasDesign ? designNotes : undefined,
            artworkFile: effectiveHasArtwork ? artworkFile : undefined,
            referenceImage: referenceImage || undefined,
            hasDesignService: effectiveHasDesign,
          },
        ],
      };

      const res = await api.createOrder(payload);
      setCreatedOrderResult(res);
    } catch (err: any) {
      alert(`Order Creation Failed: ${err?.message || 'Please verify form inputs.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetOrder = () => {
    setCreatedOrderResult(null);
    setCurrentStep(1);
    setCustomerName('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerCompany('');
    setCustomerGstin('');
    setArtworkFile(null);
    setReferenceImage(null);
    setDesignNotes('');
    setCashTendered('');
    setCounterNotes('');
  };

  const stepList = [
    { num: 1, label: 'Select Product', icon: RiShoppingBag3Line },
    { num: 2, label: 'Configure & Specs', icon: RiEqualizerLine },
    { num: 3, label: 'Customer & Delivery', icon: RiUser3Line },
    { num: 4, label: 'Payment & Confirm', icon: RiMoneyDollarCircleLine },
  ];

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* HEADER & CONTEXT BAR                                          */}
      {/* ------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase font-bold text-amber-600 tracking-wider">
            <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded font-black">
              POS COUNTER DESK
            </span>
            <span>•</span>
            <span className="text-slate-600">OVER-THE-COUNTER & DIRECT ORDERS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display mt-1">
            Walk-in & Direct Counter Order Creation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Instant point-of-sale intake, live specifications configurator, media preflight, and receipt generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/sales/orders">
            <Button variant="outline" size="md" className="flex items-center gap-1.5 font-bold">
              <RiShoppingBag3Line className="h-4 w-4" />
              <span>Orders Master</span>
            </Button>
          </Link>
          <Button
            variant="dark"
            size="md"
            onClick={handleResetOrder}
            className="flex items-center gap-1.5 bg-slate-900 text-white font-bold"
          >
            <RiAddLine className="h-4 w-4" />
            <span>New Order</span>
          </Button>
        </div>
      </div>

      {/* ------------------------------------------------------------- */}
      {/* SUCCESS CONFIRMATION MODAL / SCREEN                           */}
      {/* ------------------------------------------------------------- */}
      {createdOrderResult ? (
        <div className="bg-white border-2 border-emerald-500/80 rounded-2xl p-6 sm:p-10 shadow-elevated space-y-8 animate-in zoom-in-95 duration-200">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <RiCheckboxCircleLine className="h-10 w-10 stroke-[1.5]" />
            </div>
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              Walk-in Order Successfully Generated
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display">
              Order #{createdOrderResult.orderNumber}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Customer record created, payment recorded in ledger, and Job Card released to workflow.
            </p>
          </div>

          {/* Receipt Snapshot Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                CUSTOMER & CONTACT
              </span>
              <div className="font-bold text-slate-900 text-sm">{customerName}</div>
              <div className="text-slate-600">{customerPhone}</div>
              {customerEmail && <div className="text-slate-500 font-mono text-[11px]">{customerEmail}</div>}
              {customerCompany && <div className="text-slate-700 font-semibold">{customerCompany}</div>}
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                PRODUCT & RUN SIZE
              </span>
              <div className="font-bold text-slate-900 text-sm">{selectedProduct?.name}</div>
              <div className="font-mono text-slate-700 font-bold">{quantity.toLocaleString()} Units</div>
              <div className="text-slate-500 capitalize">
                Fulfillment: {deliveryMethod === 'STORE_PICKUP' ? 'Store Counter Pickup' : 'Courier Dispatch'}
              </div>
            </div>

            <div className="p-4 bg-amber-50/60 rounded-xl border border-amber-200/80 space-y-1.5">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-900 block">
                PAYMENT SETTLEMENT
              </span>
              <div className="flex justify-between font-mono">
                <span className="text-slate-600">Total Bill:</span>
                <span className="font-bold text-slate-950">{formatCurrency(grandTotalAmount)}</span>
              </div>
              <div className="flex justify-between font-mono text-emerald-700 font-bold">
                <span>Paid ({paymentMethod}):</span>
                <span>{formatCurrency(amountToCollectNow)}</span>
              </div>
              <div className="flex justify-between font-mono text-slate-600 pt-1 border-t border-amber-200/60">
                <span>Balance Due:</span>
                <span className="font-bold text-rose-700">{formatCurrency(balanceAmountDue)}</span>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => window.print()}
              className="flex items-center gap-2"
            >
              <RiPrinterLine className="h-4 w-4" />
              <span>Print Thermal / POS Receipt</span>
            </Button>

            <Link href={`/sales/orders/${createdOrderResult.orderNumber}`}>
              <Button type="button" variant="primary" size="lg" className="flex items-center gap-2 font-bold">
                <RiEyeLine className="h-4 w-4" />
                <span>View in Orders Master</span>
              </Button>
            </Link>

            <Button
              type="button"
              variant="dark"
              size="lg"
              onClick={handleResetOrder}
              className="flex items-center gap-2 bg-slate-900 text-white font-bold"
            >
              <RiAddLine className="h-4 w-4" />
              <span>Create Another Walk-in Order</span>
            </Button>
          </div>
        </div>
      ) : (
        /* ------------------------------------------------------------- */
        /* MULTI-STAGE POS ORDER ENTRY FLOW (FRONT-END ALIGNED)          */
        /* ------------------------------------------------------------- */
        <div className="space-y-6">
          {/* Stepper Progress Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {stepList.map((step) => {
                const isActive = currentStep === step.num;
                const isPassed = currentStep > step.num;
                const Icon = step.icon;

                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => {
                      if (step.num === 1) setCurrentStep(1);
                      else if (step.num === 2 && selectedProduct) setCurrentStep(2);
                      else if (step.num === 3 && selectedProduct) setCurrentStep(3);
                      else if (step.num === 4 && selectedProduct && customerName && customerPhone) setCurrentStep(4);
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs font-bold'
                        : isPassed
                        ? 'border-emerald-200 bg-emerald-50/70 text-slate-900 font-bold hover:bg-emerald-100/60'
                        : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold transition-colors ${
                        isActive
                          ? 'bg-[#FFED00] text-slate-950 font-black'
                          : isPassed
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {isPassed ? <RiCheckLine className="h-4 w-4 stroke-[3]" /> : `0${step.num}`}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] font-mono uppercase tracking-wider opacity-70">
                        Stage 0{step.num}
                      </div>
                      <div className="text-xs font-bold truncate">{step.label}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ============================================================= */}
          {/* STAGE 1: PRODUCT SELECTION (Clean Grid + Visual Cards)        */}
          {/* ============================================================= */}
          {currentStep === 1 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
              {/* Header & Search */}
              <div className="border-b border-slate-100 pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-[11px] font-mono font-black uppercase text-amber-600 tracking-wider">
                    <span>Stage 01</span>
                    <span>•</span>
                    <span>Product Catalogue</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                    Select Product for Walk-in Order
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Browse factory catalogue or search by product name, SKU, or category.
                  </p>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-80">
                  <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name, SKU, tags..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-9 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white transition"
                  />
                  {productSearch && (
                    <button
                      type="button"
                      onClick={() => setProductSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                    >
                      <RiCloseLine className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('ALL')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer flex items-center gap-1.5 ${
                    selectedCategoryId === 'ALL'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                  }`}
                >
                  <span>All Categories</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      selectedCategoryId === 'ALL' ? 'bg-slate-700 text-slate-200' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {products.length}
                  </span>
                </button>
                {categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition flex-shrink-0 cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-white text-slate-600 border border-slate-200/90 hover:bg-slate-50 hover:border-slate-300'
                      }`}
                    >
                      <span>{cat.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Products Grid: Responsive Visual Cards */}
              {isLoadingProducts ? (
                <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center space-y-3">
                  <RiLoader4Line className="h-9 w-9 animate-spin text-amber-500" />
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600">
                    Loading Product Catalogue...
                  </span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="p-12 text-center text-slate-500 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                  <p className="text-sm font-bold text-slate-800">No products match your search or filter.</p>
                  <p className="text-xs text-slate-500">Try searching with a different SKU or category filter.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedCategoryId('ALL');
                      setProductSearch('');
                    }}
                    className="mt-2"
                  >
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
                  {filteredProducts.map((p) => {
                    const isSelected = selectedProduct?.id === p.id;
                    const primaryImg = p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url;

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedProduct(p)}
                        className={`group relative bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col justify-between ${
                          isSelected
                            ? 'border-amber-400 ring-2 ring-amber-400/90 shadow-md bg-amber-50/15'
                            : 'border-slate-200/90 hover:border-slate-300 hover:shadow-card'
                        }`}
                      >
                        <div>
                          {/* Product Image Canvas */}
                          <div className="relative w-full aspect-[4/3] bg-slate-100 overflow-hidden">
                            <img
                              src={resolveImageUrl(primaryImg)}
                              alt={p.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />

                            {/* Top Left SKU badge */}
                            <span className="absolute top-2.5 left-2.5 z-10 font-mono text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 backdrop-blur-xs text-white px-2 py-0.5 rounded-md shadow-xs">
                              {p.sku}
                            </span>

                            {/* Top Right Selected indicator */}
                            {isSelected && (
                              <span className="absolute top-2.5 right-2.5 z-10 bg-amber-400 text-slate-950 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                                <RiCheckLine className="h-3.5 w-3.5 stroke-[3]" />
                                <span>Selected</span>
                              </span>
                            )}
                          </div>

                          {/* Card Details */}
                          <div className="p-3.5 sm:p-4 space-y-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-1">
                              {p.name}
                            </h4>
                            <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                              {p.description || 'Custom print specifications available.'}
                            </p>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-3.5 sm:px-4 pb-3.5 sm:pb-4 pt-2 border-t border-slate-100 flex items-center justify-between">
                          <div>
                            <span className="text-[9px] font-mono uppercase font-bold text-slate-400 block">
                              Starting At
                            </span>
                            <span className="font-mono font-black text-slate-950 text-xs sm:text-sm">
                              {formatCurrency(Number(p.basePrice || 100))}
                            </span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                            MOQ {p.minQuantity || 1}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Step 1 Footer: Balanced Selection Summary Bar */}
              <div className="pt-5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                {selectedProduct ? (
                  <div className="flex items-center gap-3">
                    <img
                      src={resolveImageUrl(selectedProduct.images?.[0]?.url)}
                      alt={selectedProduct.name}
                      className="h-11 w-11 rounded-xl object-cover border border-slate-200 flex-shrink-0"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-slate-900">
                          {selectedProduct.name}
                        </span>
                        <Badge variant="brand">{selectedProduct.sku}</Badge>
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        Starting from {formatCurrency(Number(selectedProduct.basePrice || 100))} • MOQ{' '}
                        {selectedProduct.minQuantity || 1} units
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">
                    Please select a product from the catalogue above to proceed
                  </div>
                )}

                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={!selectedProduct}
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center justify-center gap-2 font-bold px-6 py-3 shadow-sm text-sm"
                >
                  <span>Configure Specifications & Artwork</span>
                  <RiArrowRightLine className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STAGE 2: CONFIGURE & SPECS (FRONT-END PRODUCT CONFIGURATOR)    */}
          {/* ============================================================= */}
          {currentStep === 2 && selectedProduct && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Specifications & Artwork (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
                  {/* Step Header */}
                  <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                        Stage 02 • Specifications & Artwork
                      </span>
                      <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                        Customize {selectedProduct.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Select materials, finishes, dimensions, production quantity, and artwork options.
                      </p>
                    </div>
                    <Badge variant="brand">{selectedProduct.sku}</Badge>
                  </div>

                  {/* Section A: Dynamic Option Groups & Fields */}
                  {effectiveGroups.length > 0 ? (
                    <div className="space-y-5">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                          Product Specifications & Finishes
                        </h3>
                        <span className="text-[11px] font-mono text-slate-500">
                          {effectiveGroups.length} option group(s)
                        </span>
                      </div>

                      <div className="space-y-4">
                        {effectiveGroups.map((group) => (
                          <div
                            key={group.id || group.code}
                            className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/80"
                          >
                            <DynamicFieldRenderer
                              field={group}
                              value={fieldValues[group.code]}
                              onChange={(val) => handleFieldValueChange(group.code, val)}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {/* Section B: Quantity Selection (Presets + Stepper + Quick Add) */}
                  <div className="space-y-3 pt-5 border-t border-slate-100">
                    <div className="flex items-baseline justify-between flex-wrap gap-2">
                      <div>
                        <label className="text-xs font-bold text-slate-900 uppercase">
                          Production Run Quantity
                        </label>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Standard factory presets or enter a custom volume.
                        </p>
                      </div>
                      <div className="text-xs font-mono font-bold text-slate-700">
                        Selected: <strong className="text-slate-950 font-black">{quantity.toLocaleString()} Units</strong>
                      </div>
                    </div>

                    {/* Standard Volume Presets */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                      {STANDARD_PRESETS.map((preset) => {
                        if (preset < (selectedProduct.minQuantity || 1)) return null;
                        const isSel = quantity === preset;
                        return (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setQuantity(preset)}
                            className={`p-2.5 rounded-xl text-center border transition-all cursor-pointer ${
                              isSel
                                ? 'border-slate-900 bg-slate-900 text-[#FFED00] font-black shadow-xs ring-1 ring-slate-900'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold'
                            }`}
                          >
                            <div className="text-sm font-mono">{preset.toLocaleString()}</div>
                            <div className="text-[9px] uppercase font-mono opacity-80">Units</div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Custom Quantity Stepper & Quick Add */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="text-xs text-slate-600">
                        <span className="font-bold text-slate-900">Custom Run Volume:</span>
                        <span className="text-[11px] text-slate-500 block">
                          Min: {selectedProduct.minQuantity || 1} units
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const step = selectedProduct.quantityStep || 50;
                            const minQ = selectedProduct.minQuantity || 1;
                            setQuantity((prev) => Math.max(minQ, prev - step));
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer shadow-2xs"
                        >
                          <RiSubtractLine className="w-4 h-4" />
                        </button>

                        <input
                          type="number"
                          min={selectedProduct.minQuantity || 1}
                          value={quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) {
                              setQuantity(Math.max(selectedProduct.minQuantity || 1, val));
                            }
                          }}
                          className="w-24 h-8 px-2 text-center text-xs font-bold font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:border-slate-900"
                        />

                        <button
                          type="button"
                          onClick={() => {
                            const step = selectedProduct.quantityStep || 50;
                            setQuantity((prev) => prev + step);
                          }}
                          className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer shadow-2xs"
                        >
                          <RiAddLine className="w-4 h-4" />
                        </button>

                        <div className="flex items-center gap-1 pl-2 border-l border-slate-200">
                          {[100, 500, 1000].map((s) => (
                            <button
                              key={s}
                              type="button"
                              onClick={() => setQuantity((prev) => prev + s)}
                              className="px-2 py-1 text-[10px] font-mono font-medium rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-amber-50 hover:border-amber-300 transition cursor-pointer"
                            >
                              +{s}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Section C: Artwork & Prepress Gate (Option A, B, C matching front-end) */}
                  <div className="pt-5 border-t border-slate-100 space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                        Artwork & Prepress Route
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        Preflight resolution: {Number(selectedProduct.minimumArtworkMegapixels || 1.0)} MP
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {/* Option A: Customer Ready File */}
                      <button
                        type="button"
                        onClick={() => setArtworkChoice('UPLOAD')}
                        className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                          artworkChoice === 'UPLOAD'
                            ? 'border-slate-900 bg-amber-50/50 ring-1.5 ring-slate-900 font-bold'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                            OPTION A
                          </span>
                          {artworkChoice === 'UPLOAD' && (
                            <RiCheckLine className="h-4 w-4 text-emerald-600 stroke-[3]" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <RiUploadCloud2Line className="h-5 w-5 text-blue-600" />
                          <span className="text-xs font-bold text-slate-900">Upload Ready File</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal">
                          Customer has PDF / AI / TIFF / JPEG
                        </p>
                      </button>

                      {/* Option B: Design Studio Assistance */}
                      <button
                        type="button"
                        onClick={() => setArtworkChoice('DESIGN')}
                        className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                          artworkChoice === 'DESIGN'
                            ? 'border-slate-900 bg-amber-50/50 ring-1.5 ring-slate-900 font-bold'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                            OPTION B
                          </span>
                          {artworkChoice === 'DESIGN' && (
                            <RiCheckLine className="h-4 w-4 text-emerald-600 stroke-[3]" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <RiPaletteLine className="h-5 w-5 text-[#E3A008]" />
                          <span className="text-xs font-bold text-slate-900">Request Design Studio</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal">
                          In-house prepress design (+{formatCurrency(designPrice)})
                        </p>
                      </button>

                      {/* Option C: Send Later */}
                      <button
                        type="button"
                        onClick={() => setArtworkChoice('SKIP')}
                        className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                          artworkChoice === 'SKIP'
                            ? 'border-slate-900 bg-amber-50/50 ring-1.5 ring-slate-900 font-bold'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] font-mono uppercase font-bold text-slate-500">
                            OPTION C
                          </span>
                          {artworkChoice === 'SKIP' && (
                            <RiCheckLine className="h-4 w-4 text-emerald-600 stroke-[3]" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <RiFileList3Line className="h-5 w-5 text-slate-600" />
                          <span className="text-xs font-bold text-slate-900">Send Artwork Later</span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-normal">
                          Customer provides via email / WhatsApp
                        </p>
                      </button>
                    </div>

                    {/* Option A Sub-panel: File Dropzone */}
                    {artworkChoice === 'UPLOAD' && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-300 space-y-3">
                        <input
                          ref={artworkInputRef}
                          type="file"
                          accept=".pdf,.ai,.psd,.eps,.tiff,.png,.jpg,.jpeg"
                          onChange={handleArtworkUpload}
                          className="hidden"
                          id="pos-artwork-file"
                        />
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                              <RiUploadCloud2Line className="h-4 w-4 text-amber-600" />
                              <span>
                                {artworkFile ? `Attached: ${artworkFile.originalFileName}` : 'Select Prepress Artwork File'}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                              {artworkFile
                                ? `${(artworkFile.fileSize / (1024 * 1024)).toFixed(2)} MB • Quality: ${artworkFile.qualityStatus}`
                                : 'Accepts PDF, AI, PSD, EPS, TIFF, JPEG, PNG (Min 300 DPI)'}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {artworkFile && (
                              <button
                                type="button"
                                onClick={() => setArtworkFile(null)}
                                className="p-2 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-bold transition flex items-center gap-1"
                              >
                                <RiDeleteBinLine className="h-4 w-4" />
                                <span>Remove</span>
                              </button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUploadingArtwork}
                              onClick={() => artworkInputRef.current?.click()}
                            >
                              <RiUploadCloud2Line className="h-4 w-4 mr-1.5" />
                              <span>{isUploadingArtwork ? 'Analyzing...' : artworkFile ? 'Replace File' : 'Choose File'}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Option B Sub-panel: Design Brief & Reference Image */}
                    {artworkChoice === 'DESIGN' && (
                      <div className="p-4 bg-amber-50/50 rounded-xl border border-amber-200/80 space-y-3">
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            Design Studio Brief & Instructions
                          </label>
                          <textarea
                            value={designNotes}
                            onChange={(e) => setDesignNotes(e.target.value)}
                            placeholder="Enter text to print, color scheme, company branding guidelines, or layout instructions..."
                            rows={3}
                            className="w-full bg-white border border-amber-300/80 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-sans"
                          />
                        </div>

                        {/* Reference Image Upload */}
                        <div>
                          <input
                            ref={refInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleReferenceUpload}
                            className="hidden"
                          />
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[11px] text-slate-600">
                              {referenceImage ? `Reference image: ${referenceImage.originalFileName}` : 'Attach logo or reference image (optional):'}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={isUploadingRef}
                              onClick={() => refInputRef.current?.click()}
                              className="text-xs"
                            >
                              <RiCameraLine className="h-3.5 w-3.5 mr-1" />
                              <span>{isUploadingRef ? 'Uploading...' : referenceImage ? 'Change Image' : 'Attach Reference'}</span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 2 Footer Navigation */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Button type="button" variant="outline" size="md" onClick={() => setCurrentStep(1)}>
                      <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                      <span>Back to Catalogue</span>
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      onClick={() => setCurrentStep(3)}
                      className="flex items-center gap-2 font-bold"
                    >
                      <span>Continue to Customer Details</span>
                      <RiArrowRightLine className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Sticky Live Pricing & Order Summary (4 Cols) */}
              <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-elevated space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <RiFlashlightLine className="h-4 w-4 text-[#E3A008]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-display">
                        Live Matrix Pricing
                      </h3>
                    </div>
                    {isCalculating && (
                      <span className="text-[10px] font-mono text-slate-400 animate-pulse">Calculating...</span>
                    )}
                  </div>

                  {/* Product Snapshot */}
                  <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <img
                      src={resolveImageUrl(selectedProduct.images?.[0]?.url)}
                      alt={selectedProduct.name}
                      className="h-12 w-12 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-[9px] font-mono font-bold text-slate-400 block uppercase truncate">
                        {selectedProduct.sku}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 truncate">{selectedProduct.name}</h4>
                      <span className="text-[11px] font-mono font-bold text-slate-700">
                        {quantity.toLocaleString()} pcs
                      </span>
                    </div>
                  </div>

                  {/* Active Selected Options Badges */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase font-bold text-slate-400 block">
                      Active Specifications:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(fieldValues).map(([key, val]) => {
                        if (!val) return null;
                        return (
                          <span
                            key={key}
                            className="text-[10px] font-mono bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-slate-700 font-medium truncate max-w-[150px]"
                          >
                            {String(val)}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
                    <div className="flex justify-between text-slate-600">
                      <span>Rate per piece:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(unitPriceAmount)} / pc
                      </span>
                    </div>

                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal ({quantity} pcs):</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(subtotalAmount)}
                      </span>
                    </div>

                    {effectiveHasDesign && designPrice > 0 && (
                      <div className="flex justify-between text-amber-900 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <span>Design Studio Fee:</span>
                        <span className="font-mono">+{formatCurrency(designPrice)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                      <span>GST (18% Tariff):</span>
                      <span className="font-mono font-bold text-slate-900">+{formatCurrency(taxAmount)}</span>
                    </div>

                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Estimated Total:
                      </span>
                      <span className="text-xl font-black text-slate-950 font-display">
                        {formatCurrency(grandTotalAmount)}
                      </span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    onClick={() => setCurrentStep(3)}
                    className="w-full font-bold flex items-center justify-center gap-1.5 shadow-sm mt-2"
                  >
                    <span>Proceed to Customer Details</span>
                    <RiArrowRightLine className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STAGE 3: CUSTOMER INTAKE & DELIVERY DETAILS                   */}
          {/* ============================================================= */}
          {currentStep === 3 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Customer Form (8 Cols) */}
              <div className="lg:col-span-8 space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
                  <div className="border-b border-slate-100 pb-4">
                    <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                      Stage 03 • Customer Information & Handover
                    </span>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                      Walk-in & Direct Contact Details
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Capture customer name, mobile for automated order notifications, and invoice information.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Customer Full Name <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Ramesh Patel"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-medium"
                      />
                    </div>

                    {/* Mobile Phone */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Mobile / WhatsApp Number <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="e.g. +91 98765 43210"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono font-bold"
                      />
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Email Address (Optional)
                      </label>
                      <input
                        type="email"
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        placeholder="e.g. customer@example.com"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                      />
                    </div>

                    {/* Company Name */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Company / Business Name (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerCompany}
                        onChange={(e) => setCustomerCompany(e.target.value)}
                        placeholder="e.g. Acme Enterprises Ltd"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                      />
                    </div>

                    {/* GSTIN */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        GSTIN Tax ID (Optional)
                      </label>
                      <input
                        type="text"
                        value={customerGstin}
                        onChange={(e) => setCustomerGstin(e.target.value.toUpperCase())}
                        placeholder="e.g. 27AADCB2230M1ZT"
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
                      />
                    </div>

                    {/* Order Priority */}
                    <div>
                      <label className="block text-xs font-bold text-slate-900 mb-1">
                        Production Dispatch Priority
                      </label>
                      <select
                        value={orderPriority}
                        onChange={(e: any) => setOrderPriority(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-bold cursor-pointer"
                      >
                        <option value="NORMAL">Standard SLA (Normal Production)</option>
                        <option value="HIGH">High Priority (Priority Scheduling)</option>
                        <option value="URGENT">Rush Production (Immediate Job Release)</option>
                      </select>
                    </div>
                  </div>

                  {/* Delivery / Handover Preference */}
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <label className="block text-xs font-bold text-slate-900">
                      Fulfillment & Handover Mode
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('STORE_PICKUP')}
                        className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                          deliveryMethod === 'STORE_PICKUP'
                            ? 'border-slate-900 bg-amber-50/50 ring-1.5 ring-slate-900 font-bold'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <RiStore2Line className="h-6 w-6 text-amber-600 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Store / Counter Pickup</div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            Customer collects finished parcel from factory counter
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeliveryMethod('COURIER')}
                        className={`p-3.5 rounded-xl border text-left flex items-center gap-3 transition cursor-pointer ${
                          deliveryMethod === 'COURIER'
                            ? 'border-slate-900 bg-amber-50/50 ring-1.5 ring-slate-900 font-bold'
                            : 'border-slate-200 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <RiTruckLine className="h-6 w-6 text-blue-600 flex-shrink-0" />
                        <div>
                          <div className="text-xs font-bold text-slate-900">Courier Dispatch</div>
                          <div className="text-[11px] text-slate-500 font-normal">
                            Ship via express courier to customer delivery address
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Shipping address fields if Courier selected */}
                    {deliveryMethod === 'COURIER' && (
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3 animate-in fade-in">
                        <div className="sm:col-span-3">
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            Street Address <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={shippingStreet}
                            onChange={(e) => setShippingStreet(e.target.value)}
                            placeholder="Building, Plot, Street name..."
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">City</label>
                          <input
                            type="text"
                            value={shippingCity}
                            onChange={(e) => setShippingCity(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">State</label>
                          <input
                            type="text"
                            value={shippingState}
                            onChange={(e) => setShippingState(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-900 mb-1">
                            Pincode <span className="text-rose-600">*</span>
                          </label>
                          <input
                            type="text"
                            value={shippingPincode}
                            onChange={(e) => setShippingPincode(e.target.value)}
                            placeholder="400001"
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-900"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Step 3 Footer */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Button type="button" variant="outline" size="md" onClick={() => setCurrentStep(2)}>
                      <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                      <span>Back to Specifications</span>
                    </Button>
                    <Button
                      type="button"
                      variant="primary"
                      size="lg"
                      disabled={!customerName.trim() || !customerPhone.trim()}
                      onClick={() => setCurrentStep(4)}
                      className="flex items-center gap-2 font-bold"
                    >
                      <span>Continue to Payment & Review</span>
                      <RiArrowRightLine className="h-4 w-4 ml-1.5" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column: Order Snapshot Summary (4 Cols) */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-card space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                      Item Summary
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 mt-0.5">{selectedProduct?.name}</h4>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Quantity:</span>
                      <span className="font-mono font-bold text-slate-900">{quantity.toLocaleString()} Units</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Rate:</span>
                      <span className="font-mono font-bold text-slate-900">{formatCurrency(unitPriceAmount)}/pc</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Artwork Route:</span>
                      <span className="font-bold text-slate-900">
                        {effectiveHasDesign ? 'Design Studio' : artworkFile ? 'Customer Artwork' : 'Send Later'}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600 pt-2 border-t border-slate-100">
                      <span>Total Amount:</span>
                      <span className="font-mono font-black text-slate-950 text-base">
                        {formatCurrency(grandTotalAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ============================================================= */}
          {/* STAGE 4: PAYMENT, REVIEW & POS CONFIRMATION                   */}
          {/* ============================================================= */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column: Order Snapshot & Agreement (7 Cols) */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                        Stage 04 • Final Order Review
                      </span>
                      <h3 className="text-base font-black text-slate-900 font-display">
                        Configuration & Customer Snapshot
                      </h3>
                    </div>
                    <Badge variant="brand">{quantity.toLocaleString()} Pcs</Badge>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Product</span>
                      <span className="font-bold text-slate-900">{selectedProduct?.name}</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Customer</span>
                      <span className="font-bold text-slate-900">{customerName} ({customerPhone})</span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Handover</span>
                      <span className="font-bold text-slate-900">
                        {deliveryMethod === 'STORE_PICKUP' ? 'Counter Pickup' : `Courier to ${shippingCity}`}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">Artwork Route</span>
                      <span className="font-bold text-slate-900">
                        {effectiveHasDesign
                          ? 'Design Studio'
                          : artworkFile
                          ? 'Customer Upload'
                          : 'Send Later'}
                      </span>
                    </div>
                  </div>

                  {/* Counter Notes */}
                  <div className="pt-2">
                    <label className="block text-xs font-bold text-slate-900 mb-1">
                      Internal Counter Notes / Special Requests
                    </label>
                    <input
                      type="text"
                      value={counterNotes}
                      onChange={(e) => setCounterNotes(e.target.value)}
                      placeholder="e.g. Needs sample approved before full printing run..."
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
                    />
                  </div>
                </div>

                {/* Terms and Conditions Acceptance Checkbox */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="pos-terms-check"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900 cursor-pointer mt-0.5"
                  />
                  <div className="text-xs flex-1">
                    <label htmlFor="pos-terms-check" className="font-semibold text-slate-900 cursor-pointer">
                      Customer has reviewed and agreed to the{' '}
                      <button
                        type="button"
                        onClick={() => setIsTermsModalOpen(true)}
                        className="text-blue-600 hover:text-blue-800 underline font-bold"
                      >
                        Proofing Terms & Conditions
                      </button>
                    </label>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Confirms layout proof is approved and post-print errors remain customer responsibility.
                    </p>
                  </div>
                </div>

                <div className="flex justify-start">
                  <Button type="button" variant="outline" size="md" onClick={() => setCurrentStep(3)}>
                    <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                    <span>Back to Customer Details</span>
                  </Button>
                </div>
              </div>

              {/* Right Column: Authoritative Bill & Payment Collector (5 Cols) */}
              <div className="lg:col-span-5 space-y-5">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-elevated space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <RiFlashlightLine className="h-4 w-4 text-[#E3A008]" />
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-display">
                        Authoritative Bill
                      </h3>
                    </div>
                    {isCalculating && (
                      <span className="text-[10px] font-mono text-slate-400 animate-pulse">Calculating...</span>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Base Subtotal ({quantity} pcs)</span>
                      <span className="font-mono font-bold text-slate-900">
                        {formatCurrency(subtotalAmount)}
                      </span>
                    </div>

                    {effectiveHasDesign && designPrice > 0 && (
                      <div className="flex justify-between text-amber-900 font-bold bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <span>Design Studio Fee</span>
                        <span className="font-mono">+{formatCurrency(designPrice)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-slate-600 pt-1 border-t border-slate-100">
                      <span>GST (18% Tariff)</span>
                      <span className="font-mono font-bold text-slate-900">+{formatCurrency(taxAmount)}</span>
                    </div>

                    <div className="flex justify-between items-baseline pt-2 border-t border-slate-200">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Total Amount
                      </span>
                      <span className="text-2xl font-black text-slate-950 font-display">
                        {formatCurrency(grandTotalAmount)}
                      </span>
                    </div>
                  </div>

                  {/* Payment Mode */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">Payment Settlement Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setPaymentMode('FULL')}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          paymentMode === 'FULL'
                            ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">100% Full Settle</div>
                        <div className="text-[10px] font-mono opacity-80">{formatCurrency(grandTotalAmount)}</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMode('SPLIT_50')}
                        className={`p-2.5 rounded-xl border text-center transition cursor-pointer ${
                          paymentMode === 'SPLIT_50'
                            ? 'border-slate-900 bg-slate-900 text-white font-bold shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div className="text-xs font-bold">50% Advance</div>
                        <div className="text-[10px] font-mono opacity-80">{formatCurrency(amountToCollectNow)}</div>
                      </button>
                    </div>
                  </div>

                  {/* Payment Method Selector */}
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <label className="text-xs font-bold text-slate-900 block">Collection Payment Method</label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                      {[
                        { id: 'CASH', label: 'Cash', icon: RiHandCoinLine },
                        { id: 'UPI', label: 'UPI / QR', icon: RiQrCodeLine },
                        { id: 'CARD', label: 'Card POS', icon: RiBankCardLine },
                        { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: RiBankLine },
                        { id: 'CORPORATE_CREDIT', label: 'B2B Credit', icon: RiBuilding4Line },
                      ].map((pm) => {
                        const Icon = pm.icon;
                        const isSel = paymentMethod === pm.id;
                        return (
                          <button
                            key={pm.id}
                            type="button"
                            onClick={() => setPaymentMethod(pm.id as any)}
                            className={`p-2.5 rounded-xl border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                              isSel
                                ? 'border-slate-900 bg-amber-50/60 ring-1.5 ring-slate-900 font-bold text-slate-900'
                                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <Icon className="h-4 w-4 text-slate-800" />
                            <span className="text-[11px]">{pm.label}</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Cash Tendered Calculator if Cash selected */}
                    {paymentMethod === 'CASH' && (
                      <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-200/70 space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-amber-950">Cash Tendered by Customer:</span>
                          <input
                            type="number"
                            value={cashTendered}
                            onChange={(e) => setCashTendered(e.target.value)}
                            placeholder={`₹${amountToCollectNow}`}
                            className="w-28 bg-white border border-amber-300 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-right"
                          />
                        </div>
                        {parseFloat(cashTendered) > 0 && (
                          <div className="flex items-center justify-between text-xs pt-1 border-t border-amber-200">
                            <span className="font-bold text-slate-700">Change to Return:</span>
                            <span className="font-mono font-black text-emerald-700 text-sm">
                              {formatCurrency(cashChangeReturn)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Validation Error Notices */}
                  {!isFormValid && (
                    <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1 text-rose-800">
                      <div className="font-bold flex items-center gap-1">
                        <RiAlertFill className="h-4 w-4 flex-shrink-0 text-rose-600" />
                        <span>Please complete all required fields:</span>
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-rose-700 space-y-0.5">
                        {validationErrors.map((err, i) => (
                          <li key={i}>{err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Submission CTA */}
                  <Button
                    type="button"
                    variant="primary"
                    size="lg"
                    disabled={!isFormValid || isSubmitting}
                    onClick={handleCreateWalkInOrder}
                    className="w-full font-black text-sm py-3.5 shadow-md flex items-center justify-center gap-2"
                  >
                    <RiPrinterLine className="h-5 w-5" />
                    <span>
                      {isSubmitting
                        ? 'Creating Order & Job Card...'
                        : `Collect ${formatCurrency(amountToCollectNow)} & Generate Order`}
                    </span>
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Proofing Terms & Conditions Modal */}
      <Modal
        isOpen={isTermsModalOpen}
        onClose={() => setIsTermsModalOpen(false)}
        title="Terms & Conditions — Design Proof & Print Approval"
        subtitle="Customer Quality Confirmation Policy"
        maxWidth="lg"
      >
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p className="font-medium text-slate-900 text-sm">
            Please review the order specification and proofing conditions carefully. Confirming the proof verifies that everything is correct, including:
          </p>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Text (spelling, contact numbers, grammar, and alignment)</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Colors, images, logo clarity, and design layout</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Dimensions and bleed/crop margins (if applicable)</span>
            </div>
          </div>

          <p className="text-slate-600">
            Once we receive confirmation or approval, we immediately release the Job Card to prepress and offset/digital presses.
          </p>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-start gap-3">
            <RiAlertFill className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-amber-900 font-bold mb-1">⚠ Notice:</strong>
              By confirming the proof, the customer acknowledges that the design is final, and any post-print typographic or graphical errors remain the customer&apos;s responsibility.
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <Button type="button" variant="outline" size="md" onClick={() => setIsTermsModalOpen(false)}>
              Close
            </Button>
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={() => {
                setTermsAccepted(true);
                setIsTermsModalOpen(false);
              }}
            >
              <RiCheckLine className="h-4 w-4 mr-1.5" />
              <span>Accept & Confirm</span>
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
