'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  RiAddLine,
  RiSearch2Line,
  RiFilter3Line,
  RiFileCopyLine,
  RiEditLine,
  RiEyeLine,
  RiCheckboxCircleLine,
  RiArchiveLine,
  RiDeleteBin7Line,
  RiLoader4Line,
  RiArrowRightLine,
  RiCloseLine,
  RiCheckLine,
  RiSettings4Line,
  RiRefreshLine,
  RiStarFill,
  RiStarLine,
  RiFireFill,
  RiExternalLinkLine,
  RiFolder2Line,
  RiPriceTag3Line,
  RiStackLine,
  RiArrowDownSLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import {
  api,
  DynamicProduct,
  ProductCategoryItem,
  resolveImageUrl,
} from '@/lib/api';
import { Button, Modal } from '@/components/ui';
import { ProductSetupStudio } from './components/ProductSetupStudio';

export default function AdminProductsPage() {
  const router = useRouter();

  // Data
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('ALL');
  const [selectedFeaturedFilter, setSelectedFeaturedFilter] = useState<'ALL' | 'FEATURED'>('ALL');

  // Studio Mode: Create New Product
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // Quick Edit Modal
  const [viewingProduct, setViewingProduct] = useState<DynamicProduct | null>(null);
  const [modalEditName, setModalEditName] = useState('');
  const [modalEditPrice, setModalEditPrice] = useState<number | string>('');
  const [modalEditStatus, setModalEditStatus] = useState<'PUBLISHED' | 'DRAFT' | 'ARCHIVED'>('PUBLISHED');
  const [modalEditStock, setModalEditStock] = useState<number | string>('');
  const [isSavingModalEdit, setIsSavingModalEdit] = useState(false);
  const [modalEditError, setModalEditError] = useState<string | null>(null);

  // Toast Auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [prodsRes, catsRes] = await Promise.allSettled([
        api.adminListProducts({ limit: 100 }),
        api.adminListCategories(),
      ]);

      if (prodsRes.status === 'fulfilled') {
        const val = prodsRes.value;
        const list = Array.isArray(val) ? val : (val as any)?.data || [];
        setProducts(list);
      } else {
        console.error('Failed to load products:', prodsRes.reason);
        setLoadError(prodsRes.reason?.message || 'Failed to load products from server.');
      }

      if (catsRes.status === 'fulfilled') {
        const val = catsRes.value;
        const list = Array.isArray(val) ? val : (val as any)?.data || [];
        setCategories(list);
      } else {
        console.error('Failed to load categories:', catsRes.reason);
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setLoadError(err?.message || 'Failed to load products from server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      if (selectedCategoryFilter !== 'ALL' && prod.categoryId !== selectedCategoryFilter) {
        return false;
      }
      if (selectedStatusFilter !== 'ALL' && prod.status !== selectedStatusFilter) {
        return false;
      }
      if (selectedFeaturedFilter === 'FEATURED' && !prod.isFeatured) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = prod.name?.toLowerCase().includes(q);
        const matchSku = prod.sku?.toLowerCase().includes(q);
        const matchSlug = prod.slug?.toLowerCase().includes(q);
        if (!matchName && !matchSku && !matchSlug) return false;
      }
      return true;
    });
  }, [products, selectedCategoryFilter, selectedStatusFilter, selectedFeaturedFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const published = products.filter((p) => p.status === 'PUBLISHED').length;
    const draft = products.filter((p) => p.status === 'DRAFT').length;
    const archived = products.filter((p) => p.status === 'ARCHIVED').length;
    const featured = products.filter((p) => p.isFeatured).length;
    return { total, published, draft, archived, featured };
  }, [products]);

  // Actions
  const handleToggleFeatured = async (id: string) => {
    setActionLoadingId(id);
    try {
      const updated = await api.adminToggleFeaturedProduct(id);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFeatured: updated.isFeatured } : p))
      );
      setNotification({
        message: updated.isFeatured ? 'Product added to Trending / Home Showcase' : 'Product removed from Trending',
        type: 'success',
      });
    } catch (err: any) {
      setNotification({ message: err?.message || 'Failed to toggle trending status', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUpdateStatus = async (id: string, newStatus: 'PUBLISHED' | 'DRAFT' | 'ARCHIVED') => {
    setActionLoadingId(id);
    try {
      const updated = await api.adminUpdateProduct(id, { status: newStatus });
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: updated.status } : p))
      );
      setNotification({
        message: `Product status updated to ${newStatus}`,
        type: 'success',
      });
    } catch (err: any) {
      setNotification({ message: err?.message || 'Failed to update product status', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionLoadingId(id);
    try {
      const dup = await api.adminDuplicateProduct(id);
      setProducts((prev) => [dup, ...prev]);
      setNotification({ message: `Cloned "${dup.name}" successfully`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: err?.message || 'Failed to duplicate product', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"? This action cannot be undone.`)) return;
    setActionLoadingId(id);
    try {
      await api.adminDeleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
      setNotification({ message: `Deleted product "${name}"`, type: 'success' });
    } catch (err: any) {
      setNotification({ message: err?.message || 'Failed to delete product', type: 'error' });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenQuickEdit = (prod: DynamicProduct) => {
    setViewingProduct(prod);
    setModalEditName(prod.name);
    setModalEditPrice(prod.basePrice);
    setModalEditStatus(prod.status);
    setModalEditStock(prod.stockQuantity ?? 1000);
    setModalEditError(null);
  };

  const handleSaveQuickEdit = async () => {
    if (!viewingProduct) return;
    setIsSavingModalEdit(true);
    setModalEditError(null);
    try {
      const updated = await api.adminUpdateProduct(viewingProduct.id, {
        name: modalEditName.trim(),
        basePrice: parseFloat(String(modalEditPrice)) || 0,
        status: modalEditStatus,
        stockQuantity: parseInt(String(modalEditStock), 10) || 0,
      });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p)));
      setViewingProduct(null);
      setNotification({ message: `Product "${updated.name}" updated successfully`, type: 'success' });
    } catch (err: any) {
      setModalEditError(err?.message || 'Failed to update product details.');
    } finally {
      setIsSavingModalEdit(false);
    }
  };

  return (
    <div className="space-y-6 max-w-[1600px] mx-auto pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 ${
            notification.type === 'success'
              ? 'bg-slate-900 text-white border-slate-700 shadow-slate-900/20'
              : 'bg-rose-900 text-white border-rose-700 shadow-rose-900/20'
          }`}
        >
          {notification.type === 'success' ? (
            <RiCheckLine className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <RiCloseLine className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-[24px] sm:text-[28px] font-bold text-slate-900 tracking-tight leading-[1.2]">
              Products Catalogue & Studio
            </h1>
            <span className="text-[11px] bg-amber-50 text-amber-900 border border-amber-300/80 px-2 py-0.5 rounded-md font-mono font-bold">
              v2.0
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1 max-w-2xl">
            Configure printing products, custom option groups, preflight artwork rules, exact pricing matrices, and live customer visibility.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreatingProduct(!isCreatingProduct)}
            className="flex items-center gap-2 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-bold text-[13px] px-4 py-2.5 rounded-xl border border-amber-300 shadow-xs transition active:scale-95 cursor-pointer"
          >
            {isCreatingProduct ? (
              <>
                <RiCloseLine className="w-4 h-4" /> Close Studio
              </>
            ) : (
              <>
                <RiAddLine className="w-4 h-4" /> Create New Product
              </>
            )}
          </button>
        </div>
      </div>

      {/* Top Metrics Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div
          onClick={() => { setSelectedStatusFilter('ALL'); setSelectedFeaturedFilter('ALL'); }}
          className={`bg-white p-4 rounded-xl border transition cursor-pointer ${
            selectedStatusFilter === 'ALL' && selectedFeaturedFilter === 'ALL'
              ? 'border-slate-900 ring-1 ring-slate-900 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">All Products</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{stats.total}</div>
        </div>

        <div
          onClick={() => { setSelectedStatusFilter('PUBLISHED'); setSelectedFeaturedFilter('ALL'); }}
          className={`bg-white p-4 rounded-xl border transition cursor-pointer ${
            selectedStatusFilter === 'PUBLISHED' && selectedFeaturedFilter === 'ALL'
              ? 'border-emerald-500 ring-1 ring-emerald-500 shadow-xs'
              : 'border-slate-200 hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live / Published
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1">{stats.published}</div>
        </div>

        <div
          onClick={() => { setSelectedStatusFilter('DRAFT'); setSelectedFeaturedFilter('ALL'); }}
          className={`bg-white p-4 rounded-xl border transition cursor-pointer ${
            selectedStatusFilter === 'DRAFT' && selectedFeaturedFilter === 'ALL'
              ? 'border-amber-500 ring-1 ring-amber-500 shadow-xs'
              : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Drafts
          </div>
          <div className="text-xl font-bold text-amber-700 mt-1">{stats.draft}</div>
        </div>

        <div
          onClick={() => { setSelectedStatusFilter('ARCHIVED'); setSelectedFeaturedFilter('ALL'); }}
          className={`bg-white p-4 rounded-xl border transition cursor-pointer ${
            selectedStatusFilter === 'ARCHIVED' && selectedFeaturedFilter === 'ALL'
              ? 'border-slate-400 ring-1 ring-slate-400 shadow-xs'
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            Archived
          </div>
          <div className="text-xl font-bold text-slate-700 mt-1">{stats.archived}</div>
        </div>

        <div
          onClick={() => setSelectedFeaturedFilter((prev) => (prev === 'ALL' ? 'FEATURED' : 'ALL'))}
          className={`bg-white p-4 rounded-xl border transition cursor-pointer col-span-2 sm:col-span-1 ${
            selectedFeaturedFilter === 'FEATURED'
              ? 'border-amber-500 ring-1 ring-amber-500 bg-amber-50/30 shadow-xs'
              : 'border-slate-200 hover:border-amber-300'
          }`}
        >
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-900 uppercase tracking-wider">
            <RiStarFill className="w-3.5 h-3.5 text-amber-500" />
            Trending Showcase
          </div>
          <div className="text-xl font-bold text-amber-900 mt-1">{stats.featured}</div>
        </div>
      </div>

      {/* Inline Product Setup Studio for Creating New Products */}
      {isCreatingProduct && (
        <div className="mb-8">
          <ProductSetupStudio
            categories={categories}
            existingProducts={products}
            isNew={true}
            onSaved={(newProd) => {
              setProducts((prev) => [newProd, ...prev]);
              setIsCreatingProduct(false);
              setNotification({ message: `Created "${newProd.name}" successfully!`, type: 'success' });
            }}
            onCancel={() => setIsCreatingProduct(false)}
          />
        </div>
      )}

      {/* Error Alert if Load Failed */}
      {loadError && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-rose-800 text-xs shadow-2xs">
          <div>
            <span className="font-bold">Failed to synchronize products: </span>
            <span>{loadError}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="flex items-center gap-1 bg-white border border-rose-300 hover:bg-rose-100 text-rose-800 font-semibold px-3 py-1.5 rounded-lg text-xs transition cursor-pointer shrink-0"
          >
            <RiRefreshLine className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <RiSearch2Line className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by product name, SKU, or URL slug..."
            className="w-full bg-slate-50 hover:bg-white focus:bg-white border border-slate-200 hover:border-slate-300 focus:border-amber-500 rounded-xl pl-10 pr-9 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <RiCloseLine className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Category Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <RiFolder2Line className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 text-xs">
            <span className="text-slate-400 font-medium">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-transparent border-none text-xs text-slate-800 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <option value="ALL">All Status</option>
              <option value="PUBLISHED">Published</option>
              <option value="DRAFT">Draft</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          {/* Trending Toggle Chip */}
          <button
            type="button"
            onClick={() =>
              setSelectedFeaturedFilter((prev) => (prev === 'ALL' ? 'FEATURED' : 'ALL'))
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border inline-flex items-center gap-1.5 transition cursor-pointer ${
              selectedFeaturedFilter === 'FEATURED'
                ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-2xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <RiStarFill className={selectedFeaturedFilter === 'FEATURED' ? 'text-amber-600' : 'text-slate-400'} />
            <span>Trending ({stats.featured})</span>
          </button>

          {(selectedCategoryFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || selectedFeaturedFilter !== 'ALL' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSelectedFeaturedFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-slate-500 hover:text-slate-900 underline font-semibold px-2 cursor-pointer"
            >
              Reset
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            title="Refresh catalogue list"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
          >
            <RiRefreshLine className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RiLoader4Line className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-xs font-semibold text-slate-600">Loading catalogue products...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-16 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xl">
              <RiStackLine />
            </div>
            {products.length > 0 ? (
              <>
                <p className="font-bold text-slate-800 text-sm">No products match your filters</p>
                <p className="text-slate-400">Try adjusting your search query, status, or category filter.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter('ALL');
                    setSelectedStatusFilter('ALL');
                    setSelectedFeaturedFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2 rounded-xl transition cursor-pointer"
                >
                  Clear All Filters
                </button>
              </>
            ) : (
              <>
                <p className="font-bold text-slate-800 text-sm">Your catalogue is currently empty</p>
                <p className="text-slate-400">Get started by configuring your first custom printing product.</p>
                <button
                  type="button"
                  onClick={() => setIsCreatingProduct(true)}
                  className="mt-2 text-xs font-bold text-slate-950 bg-[#FFED00] hover:bg-[#F2E100] border border-amber-300 px-4 py-2 rounded-xl shadow-2xs transition cursor-pointer"
                >
                  + Create New Product
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/90 text-[11px] text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <th scope="col" className="py-3.5 px-4 w-[60px] text-center">
                    Trend
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[280px]">
                    Product
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[120px]">
                    SKU
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[140px]">
                    Category
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[120px]">
                    Option Groups
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[110px]">
                    Base Price
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[150px]">
                    Status
                  </th>
                  <th scope="col" className="py-3.5 px-4 min-w-[200px] text-right pr-6">
                    Studio & Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => {
                  const primaryImg = prod.images?.find((img) => img.isPrimary) || prod.images?.[0];
                  const groupsCount = prod.optionGroups?.length ?? (prod.fields?.length || 0);
                  const isActionLoading = actionLoadingId === prod.id;

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Trend Star Button */}
                      <td className="py-4 px-4 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(prod.id)}
                          disabled={isActionLoading}
                          title={prod.isFeatured ? 'Trending on Home (Click to remove)' : 'Feature as Trending on Home Page'}
                          className={`w-8 h-8 mx-auto rounded-xl flex items-center justify-center transition-all cursor-pointer border ${
                            prod.isFeatured
                              ? 'bg-amber-100 text-amber-700 border-amber-300 shadow-2xs hover:scale-105'
                              : 'bg-white text-slate-300 border-slate-200 hover:text-amber-500 hover:border-amber-300'
                          }`}
                        >
                          {prod.isFeatured ? (
                            <RiStarFill className="w-4 h-4 text-amber-500" />
                          ) : (
                            <RiStarLine className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      {/* Product Thumbnail + Name + Slug */}
                      <td className="py-4 px-4 align-middle">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200/80 overflow-hidden shrink-0 flex items-center justify-center shadow-2xs group-hover:border-slate-300 transition-colors">
                            {primaryImg ? (
                              <img
                                src={resolveImageUrl(primaryImg.url)}
                                alt={prod.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold font-mono">NO IMG</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 group-hover:text-amber-700 transition-colors truncate text-[13px]">
                              <Link href={`/admin/products/${prod.id}`} title={prod.name}>
                                {prod.name}
                              </Link>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-[11px] text-slate-400 font-mono truncate" title={`/${prod.slug}`}>
                                /{prod.slug}
                              </span>
                              <Link
                                href={`/products/${prod.slug}`}
                                target="_blank"
                                rel="noreferrer"
                                title="Open live storefront product page in new tab"
                                className="text-slate-400 hover:text-amber-600 transition-colors p-0.5"
                              >
                                <RiExternalLinkLine className="w-3 h-3" />
                              </Link>
                              {prod.keyPoints && prod.keyPoints.length > 0 && (
                                <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded font-medium border border-emerald-200/60 hidden sm:inline-block">
                                  {prod.keyPoints.length} points
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* SKU */}
                      <td className="py-4 px-4 align-middle">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 border border-slate-200 rounded-lg font-mono text-[11px] font-semibold tracking-tight">
                          {prod.sku || 'NO-SKU'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 align-middle">
                        <span className="inline-flex items-center gap-1.5 text-slate-700 text-xs font-medium">
                          <RiFolder2Line className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]" title={prod.category?.name || 'Unassigned'}>
                            {prod.category?.name || 'Unassigned'}
                          </span>
                        </span>
                      </td>

                      {/* Option Groups Count */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                            groupsCount > 0
                              ? 'bg-amber-50 text-amber-900 border-amber-200/80'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          <RiStackLine className="w-3.5 h-3.5 text-amber-600" />
                          {groupsCount} {groupsCount === 1 ? 'group' : 'groups'}
                        </span>
                      </td>

                      {/* Base Price */}
                      <td className="py-4 px-4 align-middle font-mono font-bold text-slate-900 text-[13px] whitespace-nowrap">
                        {formatCurrency(Number(prod.basePrice))}
                      </td>

                      {/* STATUS (Clean, dedicated column with direct status switcher) */}
                      <td className="py-4 px-4 align-middle whitespace-nowrap">
                        <div className="relative inline-block">
                          <select
                            value={prod.status}
                            disabled={isActionLoading}
                            onChange={(e) => handleUpdateStatus(prod.id, e.target.value as any)}
                            className={`appearance-none text-xs font-bold pl-6 pr-6 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${
                              prod.status === 'PUBLISHED'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/70'
                                : prod.status === 'DRAFT'
                                ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/70'
                                : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200/70'
                            }`}
                          >
                            <option value="PUBLISHED">Published</option>
                            <option value="DRAFT">Draft</option>
                            <option value="ARCHIVED">Archived</option>
                          </select>

                          {/* Status Dot Indicator */}
                          <span
                            className={`absolute left-2.5 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none ${
                              prod.status === 'PUBLISHED'
                                ? 'bg-emerald-500 ring-2 ring-emerald-200'
                                : prod.status === 'DRAFT'
                                ? 'bg-amber-500 ring-2 ring-amber-200'
                                : 'bg-slate-400'
                            }`}
                          />

                          {/* Dropdown Chevron */}
                          <RiArrowDownSLine className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none opacity-60" />
                        </div>
                      </td>

                      {/* STUDIO & ACTIONS */}
                      <td className="py-4 px-4 text-right align-middle pr-6">
                        <div className="flex items-center justify-end gap-1.5 font-sans whitespace-nowrap">
                          {/* Primary Studio Button */}
                          <Link
                            href={`/admin/products/${prod.id}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 border border-amber-300 font-bold text-xs shadow-2xs transition active:scale-95"
                            title="Open in Setup Studio"
                          >
                            <RiSettings4Line className="w-3.5 h-3.5" />
                            <span>Studio</span>
                          </Link>

                          {/* Quick Storefront View */}
                          <Link
                            href={`/products/${prod.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors"
                            title="Preview on Storefront"
                          >
                            <RiEyeLine className="w-4 h-4" />
                          </Link>

                          {/* Quick Edit Modal */}
                          <button
                            type="button"
                            onClick={() => handleOpenQuickEdit(prod)}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer"
                            title="Quick Edit basics"
                          >
                            <RiEditLine className="w-4 h-4" />
                          </button>

                          {/* Duplicate */}
                          <button
                            type="button"
                            onClick={() => handleDuplicate(prod.id)}
                            disabled={isActionLoading}
                            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-colors cursor-pointer disabled:opacity-40"
                            title="Duplicate Product"
                          >
                            <RiFileCopyLine className="w-4 h-4" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => handleDelete(prod.id, prod.name)}
                            disabled={isActionLoading}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-colors cursor-pointer disabled:opacity-40"
                            title="Delete Product"
                          >
                            <RiDeleteBin7Line className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Edit Modal */}
      {viewingProduct && (
        <Modal
          isOpen={Boolean(viewingProduct)}
          onClose={() => setViewingProduct(null)}
          title={`Quick Edit: ${viewingProduct.name}`}
        >
          <div className="space-y-4 text-xs">
            {modalEditError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl">
                {modalEditError}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                value={modalEditName}
                onChange={(e) => setModalEditName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={modalEditPrice}
                  onChange={(e) => setModalEditPrice(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <select
                  value={modalEditStatus}
                  onChange={(e) => setModalEditStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 cursor-pointer"
                >
                  <option value="PUBLISHED">Published</option>
                  <option value="DRAFT">Draft</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-slate-200">
              <Link
                href={`/admin/products/${viewingProduct.id}`}
                className="text-amber-800 hover:text-amber-900 hover:underline inline-flex items-center gap-1 font-bold text-xs"
              >
                Open in Full Setup Studio <RiArrowRightLine className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setViewingProduct(null)}>
                  Cancel
                </Button>
                <button
                  type="button"
                  onClick={handleSaveQuickEdit}
                  disabled={isSavingModalEdit}
                  className="bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-bold text-xs px-4 py-2 rounded-xl border border-amber-300 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSavingModalEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
