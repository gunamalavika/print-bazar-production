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
} from 'react-icons/ri';
import {
  api,
  DynamicProduct,
  ProductCategoryItem,
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
  // 1. NAVIGATION & STEP MANAGEMENT
  // -------------------------------------------------------------
  const [currentStep, setCurrentStep] = useState<number>(1);
  // Steps: 1: Product Selection, 2: Customer Details, 3: Specs & Artwork, 4: Payment & Review

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
  // 3. WALK-IN CUSTOMER DETAILS STATE
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
  // 4. PRODUCT CONFIGURATION & MEDIA PREFLIGHT STATE
  // -------------------------------------------------------------
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({});
  const [quantity, setQuantity] = useState<number>(500);

  // Artwork & Preflight
  const [artworkFile, setArtworkFile] = useState<FlowArtworkState | null>(null);
  const [isUploadingArtwork, setIsUploadingArtwork] = useState<boolean>(false);
  const [artworkChoice, setArtworkChoice] = useState<'UPLOAD' | 'DESIGN' | 'SKIP'>('UPLOAD');
  const [designNotes, setDesignNotes] = useState<string>('');
  const [referenceImage, setReferenceImage] = useState<FlowReferenceImageState | null>(null);
  const [isUploadingRef, setIsUploadingRef] = useState<boolean>(false);
  const artworkInputRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);

  // Initialize fields when product changes
  useEffect(() => {
    if (selectedProduct) {
      const initial: Record<string, any> = {};
      if (selectedProduct.fields && selectedProduct.fields.length > 0) {
        for (const field of selectedProduct.fields) {
          if (field.defaultValue) {
            initial[field.key] = field.defaultValue;
          } else if (field.options && field.options.length > 0) {
            const def = field.options.find((o) => o.isDefault) || field.options[0];
            if (def) initial[field.key] = def.value;
          }
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
      }
    }
  }, [selectedProduct]);

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
      const res = await api.uploadArtwork(file, selectedProduct.id, Number(selectedProduct.minimumArtworkMegapixels) || 1.0);
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
  // 5. AUTHORITATIVE PRICING CALCULATION
  // -------------------------------------------------------------
  const [quote, setQuote] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    if (!selectedProduct) return;
    let isCurrent = true;
    const fetchQuote = async () => {
      setIsCalculating(true);
      try {
        const q = await api.calculateQuote({
          productId: selectedProduct.id,
          quantity: Number(quantity) || selectedProduct.minQuantity || 1,
          fieldValues,
          hasArtwork: effectiveHasArtwork,
          hasDesignService: effectiveHasDesign,
          hasReferenceImage: Boolean(referenceImage),
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
  }, [selectedProduct, quantity, fieldValues, effectiveHasArtwork, effectiveHasDesign, referenceImage]);

  const subtotalAmount = Number(quote?.subtotal || (Number(selectedProduct?.basePrice || 100) * quantity));
  const taxAmount = Number(quote?.totalTax || Math.round(subtotalAmount * 0.18 * 100) / 100);
  const grandTotalAmount = Number(quote?.grandTotal || Math.round((subtotalAmount + taxAmount) * 100) / 100);

  // -------------------------------------------------------------
  // 6. PAYMENT METHOD & SETTLEMENT STATE
  // -------------------------------------------------------------
  const [paymentMode, setPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI' | 'CARD' | 'BANK_TRANSFER' | 'CORPORATE_CREDIT'>('CASH');
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
    if (!customerName.trim()) errors.push('Walk-in Customer Name is required.');
    if (!customerPhone.trim()) errors.push('Customer Phone number is required for SMS/WhatsApp receipts.');
    if (deliveryMethod === 'COURIER' && (!shippingStreet.trim() || !shippingPincode.trim())) {
      errors.push('Please enter complete Street Address & Pincode for Courier Dispatch.');
    }
    if (quantity < (selectedProduct?.minQuantity || 1)) {
      errors.push(`Minimum quantity is ${selectedProduct?.minQuantity || 1} units.`);
    }
    if (!termsAccepted) {
      errors.push('Please confirm Terms & Conditions / Proofing policy.');
    }
    return errors;
  }, [selectedProduct, customerName, customerPhone, deliveryMethod, shippingStreet, shippingPincode, quantity, termsAccepted]);

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
            <span className="text-slate-600">OVER-THE-COUNTER & PHONE ORDERS</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display mt-1">
            Walk-in & Direct Counter Order Creation
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Instant point-of-sale intake, live matrix pricing, media preflight, and receipt generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link href="/sales/orders">
            <Button variant="outline" size="md" className="flex items-center gap-1.5 font-bold">
              <RiShoppingBag3Line className="h-4 w-4" />
              <span>Orders Master Queue</span>
            </Button>
          </Link>
          <Button
            variant="dark"
            size="md"
            onClick={handleResetOrder}
            className="flex items-center gap-1.5 bg-slate-900 text-white font-bold"
          >
            <RiAddLine className="h-4 w-4" />
            <span>New Walk-in Order</span>
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
        /* MULTI-STAGE POS ORDER ENTRY FLOW                              */
        /* ------------------------------------------------------------- */
        <div className="space-y-6">
          {/* Stepper Progress Bar */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 sm:p-4 shadow-xs">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { num: 1, label: 'Select Product', icon: RiShoppingBag3Line },
                { num: 2, label: 'Customer Intake', icon: RiUser3Line },
                { num: 3, label: 'Specs & Media', icon: RiEqualizerLine },
                { num: 4, label: 'Payment & Confirm', icon: RiMoneyDollarCircleLine },
              ].map((step) => {
                const isActive = currentStep === step.num;
                const isPassed = currentStep > step.num;
                const Icon = step.icon;

                return (
                  <button
                    key={step.num}
                    type="button"
                    onClick={() => setCurrentStep(step.num)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex items-center gap-2.5 cursor-pointer ${
                      isActive
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs font-bold'
                        : isPassed
                        ? 'border-emerald-200 bg-emerald-50 text-slate-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    <div
                      className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-mono font-bold ${
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

          {/* STEP 1: PRODUCT SELECTION */}
          {currentStep === 1 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
              <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                    Stage 01 • Product Catalogue
                  </span>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                    Select Product for Walk-in Order
                  </h2>
                </div>

                {/* Search Bar */}
                <div className="relative w-full sm:w-72">
                  <RiSearchLine className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search by name, SKU, tag..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-3 py-2 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:bg-white"
                  />
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex gap-2 overflow-x-auto pb-1 custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('ALL')}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                    selectedCategoryId === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Categories ({products.length})
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition flex-shrink-0 cursor-pointer ${
                      selectedCategoryId === cat.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Products Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredProducts.map((p) => {
                  const isSelected = selectedProduct?.id === p.id;
                  const primaryImg = p.images?.find((img) => img.isPrimary)?.url || p.images?.[0]?.url;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-slate-900 bg-amber-50/40 ring-2 ring-slate-900 shadow-md'
                          : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/60'
                      }`}
                    >
                      <div className="flex gap-3">
                        <img
                          src={resolveImageUrl(primaryImg)}
                          alt={p.name}
                          className="h-16 w-16 rounded-lg object-cover border border-slate-200 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-mono font-bold text-slate-400 block uppercase truncate">
                            {p.sku}
                          </span>
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">{p.name}</h4>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{p.description}</p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                        <span className="font-mono font-black text-slate-900">
                          From {formatCurrency(Number(p.basePrice || 100))}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          MOQ: {p.minQuantity || 1} units
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Step 1 Footer */}
              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={!selectedProduct}
                  onClick={() => setCurrentStep(2)}
                  className="flex items-center gap-2 font-bold"
                >
                  <span>Continue with {selectedProduct?.name || 'Product'}</span>
                  <RiArrowRightLine className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 2: CUSTOMER INTAKE */}
          {currentStep === 2 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                  Stage 02 • Customer Information
                </span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                  Walk-in & Direct Contact Details
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Capture customer name, mobile for automated status updates, and tax invoicing information.
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
                        Customer will collect finished parcel from factory desk
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

              {/* Step 2 Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button type="button" variant="outline" size="md" onClick={() => setCurrentStep(1)}>
                  <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                  <span>Back to Product</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  disabled={!customerName.trim() || !customerPhone.trim()}
                  onClick={() => setCurrentStep(3)}
                  className="flex items-center gap-2 font-bold"
                >
                  <span>Continue to Specs & Media</span>
                  <RiArrowRightLine className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3: SPECIFICATIONS & MEDIA PREFLIGHT */}
          {currentStep === 3 && selectedProduct && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-7 shadow-card space-y-6">
              <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                    Stage 03 • Configuration & Preflight
                  </span>
                  <h2 className="text-xl font-black text-slate-900 tracking-tight font-display mt-0.5">
                    {selectedProduct.name} Configuration
                  </h2>
                </div>
                <Badge variant="brand">{selectedProduct.sku}</Badge>
              </div>

              {/* Dynamic Product Fields */}
              {selectedProduct.fields && selectedProduct.fields.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                    Product Specification Options
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedProduct.fields.map((f) => (
                      <DynamicFieldRenderer
                        key={f.id}
                        field={f}
                        value={fieldValues[f.key]}
                        onChange={(val) => handleFieldValueChange(f.key, val)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Batch Quantity Selection */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <label className="text-xs font-bold text-slate-900 block">
                  Standard Production Volume Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {STANDARD_PRESETS.map((preset) => {
                    if (preset < (selectedProduct.minQuantity || 1)) return null;
                    const isSel = quantity === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setQuantity(preset)}
                        className={`p-3 rounded-xl text-center border transition-all cursor-pointer ${
                          isSel
                            ? 'border-slate-900 bg-slate-900 text-[#FFED00] font-black shadow-xs'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-800 font-bold'
                        }`}
                      >
                        <div className="text-sm font-mono">{preset.toLocaleString()}</div>
                        <div className="text-[10px] uppercase font-mono opacity-80">Units</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Media & Artwork Preflight Intake */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 font-mono">
                    Artwork & Prepress Gate
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">
                    Preflight resolution threshold: {Number(selectedProduct.minimumArtworkMegapixels || 1.0)} MP
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Customer Artwork */}
                  <button
                    type="button"
                    onClick={() => setArtworkChoice('UPLOAD')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                      artworkChoice === 'UPLOAD'
                        ? 'border-slate-900 bg-amber-50/50 ring-1.5 ring-slate-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <RiUploadCloud2Line className="h-6 w-6 text-blue-600 mb-1.5" />
                    <div className="text-xs font-bold text-slate-900">Upload Ready File</div>
                    <div className="text-[11px] text-slate-500 font-normal">Customer has PDF / AI / TIFF / JPEG</div>
                  </button>

                  {/* Option 2: In-House Design Service */}
                  <button
                    type="button"
                    onClick={() => setArtworkChoice('DESIGN')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                      artworkChoice === 'DESIGN'
                        ? 'border-slate-900 bg-amber-50/50 ring-1.5 ring-slate-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <RiPaletteLine className="h-6 w-6 text-[#E3A008] mb-1.5" />
                    <div className="text-xs font-bold text-slate-900">Request Design Studio</div>
                    <div className="text-[11px] text-slate-500 font-normal">
                      Design team assistance (+{formatCurrency(designPrice)})
                    </div>
                  </button>

                  {/* Option 3: Send Artwork Later */}
                  <button
                    type="button"
                    onClick={() => setArtworkChoice('SKIP')}
                    className={`p-4 rounded-xl border text-left transition cursor-pointer ${
                      artworkChoice === 'SKIP'
                        ? 'border-slate-900 bg-amber-50/50 ring-1.5 ring-slate-900 font-bold'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <RiFileList3Line className="h-6 w-6 text-slate-600 mb-1.5" />
                    <div className="text-xs font-bold text-slate-900">Collect via Email</div>
                    <div className="text-[11px] text-slate-500 font-normal">Customer will email artwork later</div>
                  </button>
                </div>

                {/* Upload File Input Area */}
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
                        <div className="text-xs font-bold text-slate-900">
                          {artworkFile ? `Uploaded: ${artworkFile.originalFileName}` : 'Select Prepress Artwork File'}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {artworkFile
                            ? `${(artworkFile.fileSize / (1024 * 1024)).toFixed(1)} MB • Quality: ${artworkFile.qualityStatus}`
                            : 'Accepts PDF, AI, PSD, EPS, TIFF, JPEG'}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploadingArtwork}
                        onClick={() => artworkInputRef.current?.click()}
                      >
                        <RiUploadCloud2Line className="h-4 w-4 mr-1.5" />
                        <span>{isUploadingArtwork ? 'Analyzing Preflight...' : 'Choose File'}</span>
                      </Button>
                    </div>
                  </div>
                )}

                {/* Design Brief Notes */}
                {artworkChoice === 'DESIGN' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-900">
                      Design Studio Instructions / Customer Brief
                    </label>
                    <textarea
                      value={designNotes}
                      onChange={(e) => setDesignNotes(e.target.value)}
                      placeholder="Enter customer logo requirements, text to print, colors, layout directions..."
                      rows={3}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-sans"
                    />
                  </div>
                )}
              </div>

              {/* Step 3 Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                <Button type="button" variant="outline" size="md" onClick={() => setCurrentStep(2)}>
                  <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
                  <span>Back to Customer</span>
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => setCurrentStep(4)}
                  className="flex items-center gap-2 font-bold"
                >
                  <span>Continue to Payment & Review</span>
                  <RiArrowRightLine className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 4: PAYMENT, TERMS & CONFIRMATION */}
          {currentStep === 4 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Order Summary & Review */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-card space-y-5">
                  <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-mono font-black uppercase text-amber-600 tracking-wider">
                        Stage 04 • Final Review
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
              </div>

              {/* Right Column: Authoritative Bill & Payment Collector */}
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
                        {formatCurrency(Number(quote?.baseSubtotal || subtotalAmount))}
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
            Please find the design proof for your order attached. Kindly review it carefully and confirm that everything is correct, including:
          </p>

          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/90 space-y-2.5">
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Text (spelling, grammar, and alignment)</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Colors, images, and design layout</span>
            </div>
            <div className="flex items-center gap-2.5 text-slate-800 font-semibold">
              <span className="h-2 w-2 rounded-full bg-[#E3A008] flex-shrink-0" />
              <span>Dimensions and bleed/crop marks (if applicable)</span>
            </div>
          </div>

          <p className="text-slate-600">
            If there are any changes needed, please let us know as soon as possible. Once we receive your approval, we’ll proceed with printing.
          </p>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-950 flex items-start gap-3">
            <RiAlertFill className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <strong className="block text-amber-900 font-bold mb-1">⚠ Please note:</strong>
              By confirming the proof, you acknowledge that the design is final, and any errors after printing will be your responsibility.
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
