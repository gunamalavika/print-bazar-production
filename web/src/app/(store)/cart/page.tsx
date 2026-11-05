'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Trash2,
  FileCheck,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Printer,
  Truck,
  Layers,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Lock,
} from 'lucide-react';
import { formatCurrency, getEstimatedDeliveryText } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { CustomerAuthModal } from '@/components/auth/CustomerAuthModal';
import { Button, Badge, EmptyState } from '@/components/ui';

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [cartItems, setCartItems] = useState<any[]>([]);
  const [promoCode, setPromoCode] = useState('');
  const [discountApplied, setDiscountApplied] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Global payment mode for checkout (defaults to SPLIT_50 if any item selected it, else FULL)
  const [cartPaymentMode, setCartPaymentMode] = useState<'FULL' | 'SPLIT_50'>('FULL');

  // Sync items from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('pb2_cart');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCartItems(parsed);
          const hasSplit = parsed.some((it: any) => it.paymentMode === 'SPLIT_50');
          if (hasSplit) {
            setCartPaymentMode('SPLIT_50');
          }
        } else {
          setCartItems([]);
        }
      } else {
        setCartItems([]);
      }
    } catch {
      setCartItems([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const removeItem = (idx: number) => {
    const updated = cartItems.filter((_, i) => i !== idx);
    setCartItems(updated);
    localStorage.setItem('pb2_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const updateQuantity = (idx: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...cartItems];
    const item = updated[idx];
    item.quantity = newQty;
    if (item.unitPrice) {
      item.totalPrice = item.unitPrice * newQty;
      item.subtotal = item.totalPrice;
      const tax = Math.round(item.totalPrice * 0.18 * 100) / 100;
      item.taxAmount = tax;
      item.grandTotal = item.totalPrice + tax;
      if (item.paymentMode === 'SPLIT_50') {
        item.advanceAmount = Math.round(item.grandTotal * 0.5 * 100) / 100;
        item.balanceAmount = Math.round((item.grandTotal - item.advanceAmount) * 100) / 100;
      }
    }
    setCartItems(updated);
    localStorage.setItem('pb2_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const setItemPaymentMode = (idx: number, mode: 'FULL' | 'SPLIT_50') => {
    const updated = [...cartItems];
    const item = updated[idx];
    item.paymentMode = mode;
    const total = Number(item.grandTotal) || (Number(item.totalPrice) * 1.18);
    if (mode === 'SPLIT_50') {
      item.advanceAmount = Math.round(total * 0.5 * 100) / 100;
      item.balanceAmount = Math.round((total - item.advanceAmount) * 100) / 100;
    } else {
      item.advanceAmount = total;
      item.balanceAmount = 0;
    }
    setCartItems(updated);
    setCartPaymentMode(mode);
    localStorage.setItem('pb2_cart', JSON.stringify(updated));
    window.dispatchEvent(new Event('cart-updated'));
  };

  const subtotal = cartItems.reduce((acc, it) => acc + (Number(it.totalPrice) || 0), 0);
  const discountAmount = discountApplied ? subtotal * 0.05 : 0;
  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const gstAmount = Math.round(taxableAmount * 0.18 * 100) / 100;
  const totalAmount = taxableAmount + gstAmount;

  const isSplit = cartPaymentMode === 'SPLIT_50';
  const advanceAmountDue = isSplit ? Math.round(totalAmount * 0.5 * 100) / 100 : totalAmount;
  const balanceAmountDue = isSplit ? Math.round((totalAmount - advanceAmountDue) * 100) / 100 : 0;

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    if (promoCode.trim().toUpperCase() === 'SAVE5') {
      setDiscountApplied(true);
    } else {
      alert('Invalid promo code. Use SAVE5 for 5% off.');
    }
  };

  const isItemMissingArtwork = (item: any): boolean => {
    if (!item) return false;

    // 1. If the customer hired a designer or design assistance is required, customer file uploads are NOT required
    if (
      item.hasDesignService ||
      item.selectedDesignService ||
      item.designServiceRequirement === 'REQUIRED' ||
      item.artworkConfig?.designServiceRequirement === 'REQUIRED'
    ) {
      return false;
    }

    // 2. If artwork config explicitly disables artwork upload
    const status = item.artworkConfig?.status || item.artworkStatus || 'REQUIRED';
    if (status === 'DISABLED') {
      return false;
    }

    const filesMap = item.artworkFiles || {};
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

  const handleProceedToCheckout = () => {
    if (cartItems.length === 0) return;

    if (hasMissingArtwork) {
      alert('One or more items in your cart require artwork upload. Please upload the required artwork files before proceeding to checkout.');
      return;
    }

    // Preserve the complete cart with all configured items and financial breakdown
    const checkoutSession = {
      ...cartItems[0], // Backward-compatibility for any legacy single-item reader
      items: cartItems, // Authoritative array of all configured products
      paymentMode: cartPaymentMode,
      discountApplied,
      promoCode,
      subtotal,
      discountAmount,
      taxableAmount,
      taxAmount: gstAmount,
      grandTotal: totalAmount,
      advanceAmount: advanceAmountDue,
      balanceAmount: balanceAmountDue,
    };

    sessionStorage.setItem('pb2_active_cart', JSON.stringify(checkoutSession));

    if (user && user.role === 'CUSTOMER') {
      router.push('/checkout');
    } else {
      setIsAuthModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F8F8] pb-28 md:pb-24 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E5E5] py-5 sm:py-7 px-4 sm:px-8">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold text-[#854D0E] bg-[#FEFCE8] px-2.5 py-0.5 rounded-[6px] border border-yellow-200 uppercase tracking-wider mb-1.5">
              <ShoppingBag className="h-3.5 w-3.5 text-[#854D0E]" />
              <span>SHOPPING CART & PREFLIGHT AUDIT</span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-semibold text-black tracking-tight font-sans">
              Review Configured Print Jobs ({cartItems.length})
            </h1>
          </div>

          <Link href="/products" className="self-start sm:self-auto">
            <Button variant="outline" size="sm" className="min-h-[40px]">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              <span>Continue Shopping</span>
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
        {cartItems.length === 0 ? (
          <EmptyState
            icon={ShoppingBag}
            title="Your Cart is Empty"
            description="You haven't configured any print jobs yet. Browse our commercial catalogue and configure products with live specifications."
            action={
              <Link href="/products">
                <Button variant="primary" size="md">
                  <span>Explore Catalogue</span>
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </Link>
            }
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Cart Items List */}
            <div className="lg:col-span-8 space-y-4">
              {cartItems.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-card hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-[#FFED00] text-slate-950 text-[9px] font-mono font-black px-1.5 py-0.5 rounded border border-[#E3A008]/40">
                          {item.sku || 'PRINT-JOB'}
                        </span>
                        <h3 className="text-base font-bold text-slate-900 font-display">
                          {item.productName || item.name || 'Commercial Print Item'}
                        </h3>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Production Quantity: <strong>{item.quantity} units</strong>
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 mt-1 inline-flex">
                        <Truck className="h-3 w-3 text-emerald-600" />
                        <span>Expected Delivery: {getEstimatedDeliveryText(item.productionDays || 2).deliveryRange}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <span className="text-lg font-black text-slate-900 font-display">
                        {formatCurrency(Number(item.totalPrice) || 0)}
                      </span>
                      <button
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                        title="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Specifications & Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-lg border border-slate-100">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                        CONFIGURED OPTIONS
                      </span>
                      {item.fieldValues && Object.keys(item.fieldValues).length > 0 ? (
                        Object.entries(item.fieldValues).map(([k, v]: [string, any]) => (
                          <div key={k} className="flex justify-between text-slate-700">
                            <span className="capitalize">{k.replace(/([A-Z])/g, ' $1')}:</span>
                            <span className="font-bold text-slate-900">{String(v)}</span>
                          </div>
                        ))
                      ) : (
                        <p className="text-slate-500 italic">Standard Factory Specs</p>
                      )}
                    </div>

                    <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-3">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                        ARTWORK & PREPRESS STATUS
                      </span>
                      {item.artworkFiles && Object.keys(item.artworkFiles).length > 0 ? (
                        <div className="space-y-1">
                          {Object.entries(item.artworkFiles).map(([slotKey, file]: [string, any]) => (
                            <div key={slotKey} className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px]">
                              <FileCheck className="h-3 w-3 text-emerald-600 flex-shrink-0" />
                              <span className="uppercase text-[9px] font-mono bg-purple-100 text-purple-900 px-1.5 py-0.5 rounded font-black">
                                {slotKey.replace(/_/g, ' ')}
                              </span>
                              <span className="truncate max-w-[140px] text-slate-800 font-medium">{file.originalFileName}</span>
                            </div>
                          ))}
                        </div>
                      ) : item.artworkFile ? (
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-1.5 text-emerald-800 font-bold">
                            <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                            <span className="truncate max-w-[200px]">{item.artworkFile.originalFileName}</span>
                          </div>
                          <span className="text-[10px] text-slate-500 block font-mono">
                            {item.artworkFile.actualMegapixels ? `${item.artworkFile.actualMegapixels} MP Resolution` : 'File Ready'}
                          </span>
                        </div>
                      ) : isItemMissingArtwork(item) ? (
                        <div className="p-1.5 bg-amber-50 rounded border border-amber-300 text-amber-900 text-[11px] font-bold flex items-center gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                          <span>Artwork upload required before checkout</span>
                        </div>
                      ) : (
                        <span className="text-slate-500 text-[11px] block">
                          No artwork required for this item
                        </span>
                      )}

                      {item.selectedDesignService && (
                        <div className="pt-1 text-[11px] font-bold text-amber-900 flex items-center gap-1">
                          <Sparkles className="h-3 w-3 text-[#E3A008]" />
                          <span>In-house Design Service Included</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-Variant Line Breakdown if configured */}
                  {item.variantLines && item.variantLines.length > 0 && (
                    <div className="p-3 bg-amber-50/70 rounded-lg border border-amber-200/90 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-950 uppercase tracking-wider">
                        <span>Multi-Variant Combination Breakdown</span>
                        <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded border border-amber-300">
                          {item.quantity} Total Pcs
                        </span>
                      </div>
                      <div className="divide-y divide-amber-200/60 text-xs">
                        {item.variantLines.map((vl: any, vIdx: number) => {
                          const comboStr = Object.entries(vl.combination || {})
                            .map(([k, v]) => `${k.toUpperCase()}: ${v}`)
                            .join(' • ');
                          return (
                            <div key={vIdx} className="py-1.5 flex items-center justify-between text-slate-800">
                              <span className="font-semibold text-slate-900">{comboStr}</span>
                              <span className="font-mono font-bold text-amber-900 bg-white px-2 py-0.5 rounded border border-amber-200">
                                {vl.quantity} pcs {vl.unitPrice ? `(@ ₹${Number(vl.unitPrice).toFixed(2)})` : ''}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Quantity Controller & Payment Term */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-600">Quantity:</span>
                      {item.variantLines && item.variantLines.length > 0 ? (
                        <span className="px-3 py-1 text-xs font-mono font-bold text-slate-900 bg-slate-100 rounded-lg border border-slate-200">
                          {item.quantity} pcs ({item.variantLines.length} variant combinations)
                        </span>
                      ) : (
                        <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-white shadow-xs">
                          <button
                            onClick={() => updateQuantity(idx, Math.max(1, item.quantity - 50))}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 text-xs font-mono font-bold text-slate-900 border-x border-slate-200">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(idx, item.quantity + 50)}
                            className="px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          >
                            +
                          </button>
                        </div>
                      )}
                      <span className="text-[11px] text-slate-500 font-mono ml-2">
                        ₹{(Number(item.totalPrice) / item.quantity).toFixed(2)} / unit
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Terms:</span>
                      <button
                        type="button"
                        onClick={() => setItemPaymentMode(idx, item.paymentMode === 'SPLIT_50' ? 'FULL' : 'SPLIT_50')}
                        className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all flex items-center gap-1.5 ${
                          item.paymentMode === 'SPLIT_50'
                            ? 'bg-amber-50 text-amber-900 border-amber-300'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-300'
                        }`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-[#E3A008]" />
                        <span>{item.paymentMode === 'SPLIT_50' ? '50% Split Milestone' : 'Full Settlement (100%)'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Right Column: Order Summary & Checkout */}
            <div className="lg:col-span-4 space-y-4">
              <div className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-elevated space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 font-display border-b border-slate-100 pb-3">
                  Order Summary
                </h3>

                {/* Payment Mode Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono font-bold text-slate-400 uppercase block">
                    Payment Terms
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCartPaymentMode('FULL');
                        const updated = cartItems.map((it) => ({ ...it, paymentMode: 'FULL' }));
                        setCartItems(updated);
                        localStorage.setItem('pb2_cart', JSON.stringify(updated));
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        cartPaymentMode === 'FULL'
                          ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 block font-display">100% Full Pay</span>
                      <span className="text-[10px] text-slate-500 font-mono">Single settlement</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setCartPaymentMode('SPLIT_50');
                        const updated = cartItems.map((it) => ({ ...it, paymentMode: 'SPLIT_50' }));
                        setCartItems(updated);
                        localStorage.setItem('pb2_cart', JSON.stringify(updated));
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        cartPaymentMode === 'SPLIT_50'
                          ? 'border-slate-900 bg-amber-50/40 ring-1 ring-slate-900 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 block font-display">50% Split</span>
                      <span className="text-[10px] text-amber-700 font-mono font-bold">50% now / 50% dispatch</span>
                    </button>
                  </div>
                </div>

                {/* Promo Code Form */}
                <form onSubmit={handleApplyPromo} className="flex gap-2 pt-1">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo Code (SAVE5)"
                    className="flex-1 h-9 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 uppercase font-mono font-bold"
                  />
                  <Button type="submit" variant="outline" size="sm">
                    Apply
                  </Button>
                </form>

                {discountApplied && (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-[11px] font-bold text-emerald-800 flex items-center justify-between">
                    <span>5% Bulk Promo Applied</span>
                    <span>- {formatCurrency(discountAmount)}</span>
                  </div>
                )}

                {/* Price Calculation Rows */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(subtotal)}</span>
                  </div>

                  {discountApplied && (
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Discount (SAVE5)</span>
                      <span className="font-mono font-bold">-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-600">
                    <span>Estimated GST (18%)</span>
                    <span className="font-mono font-bold text-slate-900">{formatCurrency(gstAmount)}</span>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    <span>Standard Express Shipping</span>
                    <span className="font-mono font-bold text-emerald-700">FREE</span>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex justify-between items-baseline">
                    <div>
                      <span className="text-xs font-bold text-slate-600 block">
                        Total Order Value
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Includes 18% GST</span>
                    </div>
                    <span className="text-lg font-black text-slate-900 font-display">
                      {formatCurrency(totalAmount)}
                    </span>
                  </div>

                  {/* Split Milestone Breakdown Block */}
                  {isSplit && (
                    <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-900">
                        <span className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-[#E3A008]" />
                          Deposit Due Today (50%):
                        </span>
                        <span className="font-mono font-black text-slate-950 text-sm">
                          {formatCurrency(advanceAmountDue)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-amber-200/60">
                        <span>Balance on Dispatch:</span>
                        <span className="font-mono font-bold text-slate-800">
                          {formatCurrency(balanceAmountDue)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Missing Artwork Alert Banner */}
                {hasMissingArtwork && (
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-300 text-xs text-amber-950 font-medium flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block">Artwork Upload Required</span>
                      <span className="text-[11px] text-amber-800">
                        Please upload your required artwork files for items in your cart before proceeding to checkout.
                      </span>
                    </div>
                  </div>
                )}

                {/* Checkout Button */}
                <Button
                  variant="primary"
                  size="lg"
                  className={`w-full ${
                    hasMissingArtwork
                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed border-slate-300 opacity-60'
                      : 'shadow-brand'
                  }`}
                  disabled={hasMissingArtwork}
                  onClick={handleProceedToCheckout}
                >
                  {hasMissingArtwork ? (
                    <span className="flex items-center gap-1.5 font-bold">
                      <Lock className="h-4 w-4" />
                      <span>Upload Artwork to Proceed</span>
                    </span>
                  ) : (
                    <span>
                      {isSplit
                        ? `Proceed to Checkout (${formatCurrency(advanceAmountDue)} Due Today)`
                        : `Proceed to Checkout (${formatCurrency(totalAmount)})`}
                    </span>
                  )}
                  {!hasMissingArtwork && <ArrowRight className="h-4 w-4 ml-1.5" />}
                </Button>

                {/* Trust Badges */}
                <div className="pt-2 border-t border-slate-100 space-y-1.5 text-[11px] text-slate-500 font-medium">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>ISO 12647-2 Press Color Calibrated</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Truck className="h-3.5 w-3.5 text-sky-600" />
                    <span>Real-time Order Milestones & Live Tracking</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Customer Checkout Authentication Gate Modal */}
      <CustomerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={() => {
          setIsAuthModalOpen(false);
          router.push('/checkout');
        }}
      />
    </div>
  );
}
