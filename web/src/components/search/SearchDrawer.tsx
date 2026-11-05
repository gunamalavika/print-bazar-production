'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Sparkles,
  ArrowRight,
  Printer,
  ChevronRight,
  Layers,
  Tag,
} from 'lucide-react';
import { api, DynamicProduct, resolveImageUrl } from '@/lib/api';
import { Skeleton } from '@/components/ui';

interface SearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_TAGS = [
  'Custom Rigid Box',
  'Visiting Cards',
  'Roll-Up Standees',
  'Marketing Flyers',
  'Corporate Apparel',
  'Labels & Stickers',
];

export function SearchDrawer({ isOpen, onClose }: SearchDrawerProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Prevent background scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Auto focus input after open animation
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      return () => {
        document.body.style.overflow = 'unset';
        clearTimeout(timer);
      };
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [isOpen]);

  // Load products on drawer open
  useEffect(() => {
    if (isOpen && !hasLoadedOnce) {
      setIsLoading(true);
      api
        .getProducts()
        .then((data) => {
          setProducts(Array.isArray(data) ? data : []);
          setHasLoadedOnce(true);
        })
        .catch((err) => {
          console.error('Failed to load products in SearchDrawer:', err);
        })
        .finally(() => {
          setIsLoading(false);
        });
    }
  }, [isOpen, hasLoadedOnce]);

  // Handle Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered or popular products
  const displayProducts = useMemo(() => {
    if (!products || products.length === 0) return [];

    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      // Return popular / featured products first, or first 6 products
      const featured = products.filter((p) => p.isFeatured);
      return (featured.length >= 3 ? featured : products).slice(0, 6);
    }

    return products.filter((p) => {
      const nameMatch = p.name?.toLowerCase().includes(trimmed);
      const descMatch = p.description?.toLowerCase().includes(trimmed);
      const skuMatch = p.sku?.toLowerCase().includes(trimmed);
      const catMatch = p.category?.name?.toLowerCase().includes(trimmed);
      return nameMatch || descMatch || skuMatch || catMatch;
    });
  }, [products, query]);



  const handleProductClick = (slug: string) => {
    onClose();
    router.push(`/products/${slug}`);
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    inputRef.current?.focus();
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
        aria-label="Search Products"
        className="relative w-full max-w-md sm:max-w-lg bg-white h-full shadow-2xl z-10 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-300"
      >
        {/* ======================================================== */}
        {/* 1. DRAWER HEADER & SEARCH INPUT                          */}
        {/* ======================================================== */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] bg-white flex-shrink-0">
          <div className="flex items-center justify-between pb-3.5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-[8px] bg-[#FFED00] flex items-center justify-center border border-black/10">
                <Search className="h-4 w-4 text-black stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-black tracking-tight">
                  Search Print Bazzar
                </h2>
                <p className="text-[11px] text-[#64748B]">
                  Instant lookup by SKU, GSM, substrate, or product
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full text-[#64748B] hover:text-black hover:bg-neutral-100 transition-colors"
              aria-label="Close search drawer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Search Input (Auto-shows results as you type) */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  onClose();
                  router.push(`/products?search=${encodeURIComponent(query.trim())}`);
                }
              }}
              placeholder="Search products, rigid boxes, cards, standees..."
              className="w-full h-11 pl-10 pr-10 text-[13.5px] font-medium bg-[#F8FAFC] text-black border border-[#E2E8F0] rounded-xl focus:outline-none focus:border-black focus:bg-white shadow-2xs transition-all placeholder:text-[#94A3B8]"
            />
            <Search className="h-4 w-4 text-[#64748B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />

            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery('');
                    inputRef.current?.focus();
                  }}
                  className="p-1 text-[#94A3B8] hover:text-black rounded-full hover:bg-slate-200/60 transition-colors"
                  aria-label="Clear input"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Quick Suggestions Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-3 text-xs">
            <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#94A3B8] flex-shrink-0">
              Popular:
            </span>
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => handleTagClick(tag)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap transition-colors border ${
                  query.toLowerCase() === tag.toLowerCase()
                    ? 'bg-black text-[#FFED00] border-black'
                    : 'bg-[#F1F5F9] hover:bg-[#E2E8F0] text-slate-700 border-transparent'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. DRAWER BODY / PRODUCT LIST WITH SKELETON EFFECT       */}
        {/* ======================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
              {query.trim() ? (
                <>
                  <span>Results for &ldquo;{query}&rdquo;</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    ({displayProducts.length})
                  </span>
                </>
              ) : (
                <>
                  <Sparkles className="h-3.5 w-3.5 text-[#EAB308]" />
                  <span>Popular Products</span>
                </>
              )}
            </span>

            {query.trim() && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-[11px] text-[#64748B] hover:text-black font-medium transition-colors"
              >
                Clear filter
              </button>
            )}
          </div>

          {/* SKELETAL EFFECT DURING LOADING */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div
                  key={i}
                  className="flex items-center gap-3.5 p-3 rounded-xl border border-slate-100 bg-white"
                >
                  <Skeleton className="w-16 h-16 sm:w-18 sm:h-18 rounded-[10px] flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-3 w-16 rounded-full" />
                      <Skeleton className="h-3 w-12 rounded-full" />
                    </div>
                    <Skeleton className="h-4 w-3/4 rounded" />
                    <Skeleton className="h-3.5 w-24 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayProducts.length === 0 ? (
            /* EMPTY STATE */
            <div className="py-12 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 p-6">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                No matching products found
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto mb-4">
                We couldn&apos;t find anything matching &ldquo;{query}&rdquo;. Try another term or explore our full print catalogue.
              </p>
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onClose();
                  router.push('/products');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold bg-[#FFED00] hover:bg-[#F2E100] text-black rounded-[8px] border border-black/15 shadow-2xs transition-colors"
              >
                <span>Browse All Products</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            /* PRODUCT RESULTS LIST */
            <div className="space-y-2.5">
              {displayProducts.map((prod) => {
                const primaryImage =
                  prod.images?.find((img) => img.isPrimary) ||
                  prod.images?.[0];
                const imageUrl = resolveImageUrl(primaryImage?.url);
                const priceFormatted = Number(prod.basePrice)
                  ? `₹${Number(prod.basePrice).toLocaleString('en-IN')}`
                  : 'Custom Quote';

                return (
                  <div
                    key={prod.id}
                    onClick={() => handleProductClick(prod.slug)}
                    className="group flex items-center gap-3.5 p-3 rounded-xl border border-slate-200/90 hover:border-black/40 bg-white hover:bg-slate-50/70 transition-all duration-150 cursor-pointer shadow-2xs hover:shadow-xs"
                  >
                    {/* Thumbnail */}
                    <div className="relative w-16 h-16 sm:w-18 sm:h-18 rounded-[10px] bg-[#F7F7F5] border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                      {imageUrl ? (
                        <img
                          src={imageUrl}
                          alt={prod.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                      ) : (
                        <Printer className="w-6 h-6 text-slate-300" />
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 flex-wrap">
                        {prod.category?.name && (
                          <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-[4px]">
                            {prod.category.name}
                          </span>
                        )}
                        {prod.sku && (
                          <span className="text-[9px] font-mono text-slate-400">
                            {prod.sku}
                          </span>
                        )}
                        {prod.isFeatured && (
                          <span className="text-[9px] font-bold text-black bg-[#FFED00] px-1.5 py-0.2 rounded border border-black/10">
                            POPULAR
                          </span>
                        )}
                      </div>

                      <h4 className="text-[13px] font-bold text-slate-900 group-hover:text-black truncate">
                        {prod.name}
                      </h4>

                      <div className="flex items-center justify-between mt-1">
                        <div className="flex items-baseline gap-1">
                          <span className="text-[10px] font-semibold text-slate-400">
                            FROM
                          </span>
                          <span className="text-[13px] font-black text-black font-sans">
                            {priceFormatted}
                          </span>
                          {prod.minQuantity && (
                            <span className="text-[10px] text-slate-400 font-medium">
                              / {prod.minQuantity} units
                            </span>
                          )}
                        </div>

                        <span className="text-[11px] font-bold text-slate-700 group-hover:text-black flex items-center gap-0.5">
                          Configure
                          <ChevronRight className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 3. DRAWER FOOTER                                         */}
        {/* ======================================================== */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between flex-shrink-0">
          <p className="text-[11px] text-slate-500 font-medium truncate">
            {query.trim()
              ? `Press Enter to search all results for "${query}"`
              : 'Explore hundreds of custom packaging & print items'}
          </p>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (query.trim()) {
                router.push(`/products?search=${encodeURIComponent(query.trim())}`);
              } else {
                router.push('/products');
              }
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-black hover:underline flex-shrink-0 ml-3"
          >
            <span>{query.trim() ? 'View all matches' : 'Full Catalogue'}</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
