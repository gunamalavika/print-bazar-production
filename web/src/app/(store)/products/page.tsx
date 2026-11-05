'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  LayoutGrid,
  CreditCard,
  Presentation,
  Package,
  FileText,
  Shirt,
  Tag,
  BookOpen,
  Zap,
  ShieldCheck,
  Headphones,
  Search,
  X,
  ChevronDown,
  Filter,
  Printer,
  Sparkles,
  SlidersHorizontal,
} from 'lucide-react';
import { api, DynamicProduct, ProductCategoryItem, resolveImageUrl } from '@/lib/api';
import { Button, Skeleton, EmptyState, ProductCard } from '@/components/ui';

interface CategoryConfig {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  slugs: string[];
}

const SIDEBAR_CATEGORIES: CategoryConfig[] = [
  {
    id: 'ALL',
    name: 'All Products',
    icon: LayoutGrid,
    slugs: ['all'],
  },
  {
    id: 'visiting-cards',
    name: 'Visiting Cards',
    icon: CreditCard,
    slugs: ['visiting-cards', 'business-cards'],
  },
  {
    id: 'signs-banners',
    name: 'Roll-Up Standees',
    icon: Presentation,
    slugs: ['signs-banners', 'standee', 'roll-up'],
  },
  {
    id: 'packaging',
    name: 'Custom Rigid Boxes',
    icon: Package,
    slugs: ['packaging', 'boxes', 'rigid-box', 'custom-rigid-boxes'],
  },
  {
    id: 'marketing-materials',
    name: 'Marketing Flyers',
    icon: FileText,
    slugs: ['marketing-materials', 'flyers', 'marketing'],
  },
  {
    id: 'corporate-apparel',
    name: 'Corporate Apparel',
    icon: Shirt,
    slugs: ['corporate-apparel', 'apparel', 'clothing'],
  },
  {
    id: 'labels-stickers',
    name: 'Labels & Stickers',
    icon: Tag,
    slugs: ['labels-stickers', 'labels', 'stickers'],
  },
  {
    id: 'stationery',
    name: 'Letterheads & Stationery',
    icon: BookOpen,
    slugs: ['stationery', 'letterheads', 'office'],
  },
];

function ProductsCatalogueContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialCatParam =
    searchParams.get('categoryId') || searchParams.get('category') || 'ALL';
  const initialSearchParam = searchParams.get('search') || '';

  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>(initialCatParam);
  const [searchQuery, setSearchQuery] = useState(initialSearchParam);
  const [sortBy, setSortBy] = useState<string>('featured');
  const [isLoading, setIsLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);

  // Sync category param from URL on change
  useEffect(() => {
    const param = searchParams.get('categoryId') || searchParams.get('category');
    if (param) {
      setSelectedCatId(param);
    } else {
      setSelectedCatId('ALL');
    }
  }, [searchParams]);

  // Sync search param from URL on change
  useEffect(() => {
    const searchParam = searchParams.get('search');
    if (searchParam !== null) {
      setSearchQuery(searchParam);
    }
  }, [searchParams]);

  // Load products and categories from backend
  useEffect(() => {
    async function loadCatalogue() {
      setIsLoading(true);
      try {
        const [catsRes, prodsRes] = await Promise.all([
          api.getCategories().catch(() => []),
          api.getProducts().catch(() => []),
        ]);
        setCategories(Array.isArray(catsRes) ? catsRes : []);
        setProducts(Array.isArray(prodsRes) ? prodsRes : []);
      } catch (err) {
        console.error('Failed to load catalogue:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCatalogue();
  }, []);

  // Compute live counts for each sidebar category
  const getCategoryCount = (item: CategoryConfig) => {
    if (item.id === 'ALL') return products.length;
    return products.filter((p) => {
      const prodCatId = (p.categoryId || '').toLowerCase();
      const prodCatSlug = (p.category?.slug || '').toLowerCase();
      const prodCatName = (p.category?.name || '').toLowerCase();

      return (
        prodCatId === item.id.toLowerCase() ||
        item.slugs.some(
          (s) =>
            prodCatSlug.includes(s) ||
            prodCatName.includes(s) ||
            prodCatId.includes(s)
        )
      );
    }).length;
  };

  // Determine currently active category name
  const currentCategoryTitle = useMemo(() => {
    if (selectedCatId === 'ALL') return 'All Products';
    const foundSidebar = SIDEBAR_CATEGORIES.find((c) => c.id === selectedCatId);
    if (foundSidebar) return foundSidebar.name;
    const foundApiCat = categories.find(
      (c) => c.id === selectedCatId || c.slug === selectedCatId
    );
    if (foundApiCat) return foundApiCat.name;
    return 'Products';
  }, [selectedCatId, categories]);

  // Filter products by active category and search query
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      const prodCatId = (prod.categoryId || '').toLowerCase();
      const prodCatSlug = (prod.category?.slug || '').toLowerCase();
      const prodCatName = (prod.category?.name || '').toLowerCase();

      let matchesCategory = false;
      if (selectedCatId === 'ALL') {
        matchesCategory = true;
      } else {
        const sidebarItem = SIDEBAR_CATEGORIES.find((c) => c.id === selectedCatId);
        if (sidebarItem) {
          matchesCategory =
            prodCatId === selectedCatId.toLowerCase() ||
            sidebarItem.slugs.some(
              (s) =>
                prodCatSlug.includes(s) ||
                prodCatName.includes(s) ||
                prodCatId.includes(s)
            );
        } else {
          matchesCategory =
            prodCatId === selectedCatId.toLowerCase() ||
            prodCatSlug === selectedCatId.toLowerCase();
        }
      }

      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        prod.name.toLowerCase().includes(query) ||
        (prod.description && prod.description.toLowerCase().includes(query)) ||
        prod.sku.toLowerCase().includes(query) ||
        (prod.tags && prod.tags.some((t) => t.toLowerCase().includes(query)));

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCatId, searchQuery]);

  // Sort filtered products based on toolbar selection
  const sortedAndFilteredProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'featured') {
      list.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
    } else if (sortBy === 'price-asc') {
      list.sort((a, b) => Number(a.basePrice || 0) - Number(b.basePrice || 0));
    } else if (sortBy === 'price-desc') {
      list.sort((a, b) => Number(b.basePrice || 0) - Number(a.basePrice || 0));
    } else if (sortBy === 'name-asc') {
      list.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === 'sla') {
      list.sort((a, b) => Number(a.productionDays || 99) - Number(b.productionDays || 99));
    }
    return list;
  }, [filteredProducts, sortBy]);

  // Handler for category selection
  const handleSelectCategory = (categoryId: string) => {
    setSelectedCatId(categoryId);
    setMobileFilterOpen(false);

    const params = new URLSearchParams(window.location.search);
    if (categoryId === 'ALL') {
      params.delete('category');
      params.delete('categoryId');
    } else {
      params.set('category', categoryId);
    }
    const newQuery = params.toString() ? `?${params.toString()}` : '';
    router.replace(`/products${newQuery}`, { scroll: false });
  };

  return (
    <div className="min-h-screen bg-[#FFFFFF] pb-24 w-full max-w-full overflow-x-clip font-sans">
      <div className="mx-auto max-w-[1400px] px-3.5 sm:px-6 lg:px-8 pt-5 sm:pt-7">
        {/* 1. CATALOGUE HERO SECTION */}
        <div className="relative overflow-hidden rounded-[14px] sm:rounded-2xl bg-gradient-to-r from-[#FAF8F5] via-[#FFFDF7] to-[#FDFBF7] border border-[#EBE8DF] p-5 sm:p-7 lg:p-9 mb-7 shadow-xs">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 lg:gap-8">
            {/* Left Content */}
            <div className="max-w-2xl">
              <div className="flex items-center gap-2.5 mb-2.5">
                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-widest text-[#B45309] uppercase">
                  Industrial Print Catalogue
                </span>
                <span className="h-[2px] w-12 bg-[#FFDD00]" />
              </div>

              <h1 className="text-[22px] sm:text-3xl lg:text-[34px] font-extrabold text-[#111827] tracking-tight leading-tight">
                Manufacturing Substrates & Finishing.
              </h1>

              <p className="mt-2 text-[12.5px] sm:text-[13.5px] text-[#64748B] leading-relaxed max-w-xl">
                Every product is produced on factory-calibrated Heidelberg offset, HP
                Indigo digital, and Roland roll-fed machinery. Configure dimensions,
                GSM, materials, and finishing options to receive instant server-backed
                pricing.
              </p>
            </div>

            {/* Right Mockup Image Asset */}
            <div className="w-full lg:w-auto shrink-0 flex justify-center">
              <div className="relative w-full max-w-[420px] sm:max-w-[460px] aspect-[16/10] overflow-hidden rounded-xl border border-black/10 shadow-sm bg-white">
                <img
                  src="/images/catalogue-hero.jpg"
                  alt="Industrial Print Machinery, Substrates & Packaging"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 2. MOBILE CATEGORY SELECTOR & FILTER TRIGGER */}
        <div className="lg:hidden mb-5 sticky top-[120px] z-20 bg-white/95 backdrop-blur-xs py-2 -mx-3.5 px-3.5 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMobileFilterOpen(!mobileFilterOpen)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-white border border-[#E5E7EB] text-xs font-bold text-slate-800 shadow-2xs hover:border-black"
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-black" />
              <span>Categories ({SIDEBAR_CATEGORIES.length})</span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${mobileFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Quick horizontal category chip scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {SIDEBAR_CATEGORIES.slice(0, 4).map((cat) => {
                const isSelected = selectedCatId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors shrink-0 ${
                      isSelected
                        ? 'bg-[#080808] text-white font-semibold'
                        : 'bg-[#F8FAFC] text-slate-600 border border-[#E2E8F0]'
                    }`}
                  >
                    {cat.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expandable Mobile Category Drawer */}
          {mobileFilterOpen && (
            <div className="mt-3 p-3 bg-white border border-[#E5E7EB] rounded-xl shadow-lg space-y-1 animate-in fade-in-50 duration-150">
              <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider font-mono">
                Select Category
              </div>
              {SIDEBAR_CATEGORIES.map((cat) => {
                const isSelected = selectedCatId === cat.id;
                const count = getCategoryCount(cat);
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left ${
                      isSelected
                        ? 'bg-[#FFF9D6] text-black font-bold border-l-4 border-[#FFED00] pl-2.5'
                        : 'text-slate-700 hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={`h-4 w-4 ${isSelected ? 'text-black' : 'text-slate-500'}`} />
                      <span>{cat.name}</span>
                    </div>
                    <span className="text-xs text-slate-400">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. TWO-COLUMN CATALOGUE LAYOUT */}
        <div className="grid grid-cols-1 lg:grid-cols-[250px_1fr] gap-6 lg:gap-8 items-start relative">
          {/* ================= LEFT COLUMN: STICKY CATEGORIES SIDEBAR ================= */}
          <aside className="hidden lg:block space-y-4 sticky top-[136px] self-start max-h-[calc(100vh-146px)] overflow-y-auto no-scrollbar pb-6 z-20">
            {/* A. CATEGORIES CARD */}
            <div className="bg-white rounded-[14px] border border-[#E5E7EB] p-2.5 shadow-2xs">
              <div className="flex items-center gap-2 px-3 py-2 text-[14px] font-bold text-[#111827] border-b border-[#F1F5F9] pb-2.5">
                <Printer className="h-4 w-4 text-black" />
                <span>Categories</span>
              </div>

              <div className="space-y-0.5 mt-1.5">
                {SIDEBAR_CATEGORIES.map((cat) => {
                  const isSelected = selectedCatId === cat.id;
                  const count = getCategoryCount(cat);
                  const Icon = cat.icon;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleSelectCategory(cat.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[8px] text-[13px] transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFF9D6] text-[#080808] font-bold border-l-[3.5px] border-[#FFED00] pl-2.5 shadow-2xs'
                          : 'text-[#475569] hover:bg-[#FFFDF0] hover:text-[#080808] font-normal'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 shrink-0 ${
                            isSelected ? 'text-[#080808] stroke-[2.2]' : 'text-[#64748B]'
                          }`}
                        />
                        <span className="truncate">{cat.name}</span>
                      </div>
                      <span
                        className={`text-[11.5px] shrink-0 ml-1.5 font-mono ${
                          isSelected ? 'text-[#080808] font-semibold' : 'text-[#94A3B8]'
                        }`}
                      >
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* B. VALUE PROPOSITION BENEFITS CARD */}
            <div className="bg-white rounded-[14px] border border-[#E5E7EB] p-3.5 shadow-2xs divide-y divide-[#F1F5F9]">
              {/* Fast Turnaround */}
              <div className="flex items-start gap-3 py-2.5 first:pt-1">
                <div className="mt-0.5 text-black shrink-0">
                  <Zap className="h-4 w-4 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold text-[#111827]">Fast Turnaround</h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                    Get your prints on time, every time.
                  </p>
                </div>
              </div>

              {/* Premium Quality */}
              <div className="flex items-start gap-3 py-2.5">
                <div className="mt-0.5 text-black shrink-0">
                  <ShieldCheck className="h-4 w-4 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold text-[#111827]">Premium Quality</h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                    High-grade materials & finishes.
                  </p>
                </div>
              </div>

              {/* Dedicated Support */}
              <div className="flex items-start gap-3 py-2.5 last:pb-1">
                <div className="mt-0.5 text-black shrink-0">
                  <Headphones className="h-4 w-4 stroke-[2]" />
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold text-[#111827]">Dedicated Support</h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5 leading-snug">
                    We&apos;re here to help, always.
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* ================= RIGHT COLUMN: PRODUCT CATALOGUE ================= */}
          <main className="w-full min-w-0">
            {/* A. PRODUCT CATALOGUE TOOLBAR */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 mb-4.5 border-b border-[#E5E7EB]">
              {/* Category Title with Live Filtered Count */}
              <div>
                <h2 className="text-[17px] sm:text-[18px] font-bold text-[#111827] tracking-tight">
                  {currentCategoryTitle} ({sortedAndFilteredProducts.length})
                </h2>
              </div>

              {/* Sort & Grid/List View Controls */}
              <div className="flex items-center gap-3 self-end sm:self-auto flex-wrap">
                {/* Search Term Tag (if searched) */}
                {searchQuery && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FEFCE8] text-[#854D0E] text-xs border border-yellow-200">
                    <span>Query: &quot;{searchQuery}&quot;</span>
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="hover:text-black cursor-pointer"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                )}

                {/* Sort Dropdown */}
                <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                  <span className="font-normal text-[12px]">Sort by:</span>
                  <div className="relative">
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="appearance-none bg-white border border-[#E5E7EB] hover:border-black/30 rounded-[8px] pl-3 pr-7 py-1.5 text-[12.5px] font-semibold text-[#111827] cursor-pointer shadow-2xs focus:outline-none focus:ring-1 focus:ring-black"
                    >
                      <option value="featured">Featured</option>
                      <option value="price-asc">Price: Low to High</option>
                      <option value="price-desc">Price: High to Low</option>
                      <option value="name-asc">Name: A to Z</option>
                      <option value="sla">Production SLA</option>
                    </select>
                    <ChevronDown className="h-3 w-3 text-[#64748B] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* B. LOADING SKELETONS */}
            {isLoading && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4.5">
                {[...Array(8)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white rounded-[14px] border border-[#E5E7EB] p-3.5 space-y-3"
                  >
                    <Skeleton className="aspect-[16/11] w-full rounded-[10px]" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="pt-2 flex justify-between items-center">
                      <Skeleton className="h-5 w-20" />
                      <Skeleton className="h-8 w-24 rounded-[8px]" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* C. EMPTY STATE (NO RESULTS) */}
            {!isLoading && sortedAndFilteredProducts.length === 0 && (
              <EmptyState
                icon={Printer}
                title={
                  searchQuery
                    ? `No products matching "${searchQuery}"`
                    : `No products in ${currentCategoryTitle}`
                }
                description={
                  searchQuery
                    ? 'Try searching with general terms such as visiting cards, standees, boxes, or flyers.'
                    : 'There are currently no products under this category. Select All Products or browse another category.'
                }
                action={
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setSelectedCatId('ALL');
                      setSearchQuery('');
                      router.replace('/products');
                    }}
                  >
                    Reset Filters & View All
                  </Button>
                }
              />
            )}

            {/* D. PRODUCT GRID (MATCHING REFERENCE DESIGN) */}
            {!isLoading && sortedAndFilteredProducts.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-4.5">
                {sortedAndFilteredProducts.map((product) => {
                  const primaryImage =
                    product.images?.find((img) => img.isPrimary) ||
                    product.images?.[0];
                  const imageUrl = resolveImageUrl(primaryImage?.url);

                  return (
                    <ProductCard
                      key={product.id}
                      id={product.id}
                      name={product.name}
                      description={
                        product.description ||
                        'High-definition industrial offset and digital specifications.'
                      }
                      price={Number(product.basePrice) || 0}
                      pricePrefix="FROM"
                      priceUnit={
                        product.minQuantity
                          ? `/ ${product.minQuantity} units`
                          : '/ 100 units'
                      }
                      href={`/products/${product.slug}`}
                      image={imageUrl}
                      tag={product.isFeatured ? 'FEATURED' : undefined}
                      sku={product.sku}
                      categoryName={product.category?.name || 'Visiting Cards'}
                      productionDays={product.productionDays || 2}
                      actionText="Add to cart"
                    />
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-9 w-9 rounded-full border-3 border-black border-t-[#FFED00] animate-spin" />
            <span className="text-xs font-mono font-semibold text-slate-500">
              Loading Print Catalogue...
            </span>
          </div>
        </div>
      }
    >
      <ProductsCatalogueContent />
    </Suspense>
  );
}
