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
  RiSparklingFill,
  RiArrowRightLine,
  RiCloseLine,
  RiCheckLine,
  RiSettings4Line,
  RiRefreshLine,
  RiStarFill,
  RiStarLine,
  RiFireFill,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import {
  api,
  DynamicProduct,
  ProductCategoryItem,
  resolveImageUrl,
} from '@/lib/api';
import { Button, Badge, Modal } from '@/components/ui';
import { ProductSetupStudio } from './components/ProductSetupStudio';

export default function AdminProductsPage() {
  const router = useRouter();

  // Data
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

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

  // Actions
  const handleToggleFeatured = async (id: string) => {
    setActionLoadingId(id);
    try {
      const updated = await api.adminToggleFeaturedProduct(id);
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isFeatured: updated.isFeatured } : p))
      );
    } catch (err: any) {
      alert(err?.message || 'Failed to toggle trending / featured status');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDuplicate = async (id: string) => {
    setActionLoadingId(id);
    try {
      const dup = await api.adminDuplicateProduct(id);
      setProducts((prev) => [dup, ...prev]);
    } catch (err: any) {
      alert(err?.message || 'Failed to duplicate product');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handlePublish = async (id: string) => {
    setActionLoadingId(id);
    try {
      const pub = await api.adminPublishProduct(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: pub.status } : p)));
    } catch (err: any) {
      alert(err?.message || 'Failed to publish product');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleArchive = async (id: string) => {
    setActionLoadingId(id);
    try {
      const arc = await api.adminArchiveProduct(id);
      setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, status: arc.status } : p)));
    } catch (err: any) {
      alert(err?.message || 'Failed to archive product');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete product "${name}"?`)) return;
    setActionLoadingId(id);
    try {
      await api.adminDeleteProduct(id);
      setProducts((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err?.message || 'Failed to delete product');
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
    } catch (err: any) {
      setModalEditError(err?.message || 'Failed to update product details.');
    } finally {
      setIsSavingModalEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
              Products Setup Studio
            </h1>
            <span className="text-xs bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-mono font-semibold">
              v2.0
            </span>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Configure printing products, custom option groups, admin-controlled artwork rules, exact pricing matrices, and live customer journeys.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsCreatingProduct(!isCreatingProduct)}
            className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-[13px] px-4 py-2.5 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 cursor-pointer"
          >
            {isCreatingProduct ? (
              <span className="flex items-center gap-1.5">
                <RiCloseLine className="w-4 h-4" /> Close Studio
              </span>
            ) : (
              <span className="flex items-center gap-1.5">
                <RiAddLine className="w-4 h-4" /> Create New Product
              </span>
            )}
          </button>
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
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xs">
        <div className="relative w-full md:w-80">
          <RiSearch2Line className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, SKU, or slug..."
            className="w-full bg-white border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 shadow-2xs"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Category:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Categories ({categories.length})</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-medium text-slate-500">Status:</span>
            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-amber-500 shadow-2xs cursor-pointer"
            >
              <option value="ALL">All Status ({products.length})</option>
              <option value="PUBLISHED">Published ({products.filter((p) => p.status === 'PUBLISHED').length})</option>
              <option value="DRAFT">Draft ({products.filter((p) => p.status === 'DRAFT').length})</option>
              <option value="ARCHIVED">Archived ({products.filter((p) => p.status === 'ARCHIVED').length})</option>
            </select>
          </div>

          <button
            type="button"
            onClick={() =>
              setSelectedFeaturedFilter((prev) => (prev === 'ALL' ? 'FEATURED' : 'ALL'))
            }
            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition cursor-pointer ${
              selectedFeaturedFilter === 'FEATURED'
                ? 'bg-[#FFED00] text-black border-black/20 shadow-2xs'
                : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
            }`}
          >
            <RiFireFill className={selectedFeaturedFilter === 'FEATURED' ? 'text-amber-600' : 'text-slate-400'} />
            <span>Trending ({products.filter((p) => p.isFeatured).length})</span>
          </button>

          {(selectedCategoryFilter !== 'ALL' || selectedStatusFilter !== 'ALL' || searchQuery.trim()) && (
            <button
              type="button"
              onClick={() => {
                setSelectedCategoryFilter('ALL');
                setSelectedStatusFilter('ALL');
                setSearchQuery('');
              }}
              className="text-xs text-slate-500 hover:text-slate-900 underline font-medium cursor-pointer"
            >
              Reset Filters
            </button>
          )}

          <button
            type="button"
            onClick={loadData}
            title="Refresh catalogue list"
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <RiRefreshLine className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-slate-200/90 rounded-xl overflow-hidden shadow-xs">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
            <RiLoader4Line className="w-8 h-8 animate-spin text-amber-500" />
            <span className="text-xs font-medium">Loading catalogue products...</span>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-xs flex flex-col items-center justify-center gap-2">
            {products.length > 0 ? (
              <>
                <p className="font-semibold text-slate-700">No products match your filter criteria.</p>
                <p className="text-slate-400">There are {products.length} products total in the catalogue.</p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategoryFilter('ALL');
                    setSelectedStatusFilter('ALL');
                    setSearchQuery('');
                  }}
                  className="mt-2 text-xs font-semibold text-amber-700 hover:text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg cursor-pointer"
                >
                  Clear Filters
                </button>
              </>
            ) : (
              <>
                <p className="font-semibold text-slate-700">No products found in catalogue.</p>
                <p className="text-slate-400">Get started by creating your first product in Setup Studio.</p>
                <button
                  type="button"
                  onClick={() => setIsCreatingProduct(true)}
                  className="mt-2 text-xs font-bold text-slate-900 bg-[#FFED00] hover:bg-[#F2E100] border border-[#E3A008]/40 px-3.5 py-1.5 rounded-lg shadow-2xs cursor-pointer"
                >
                  + Create New Product
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-700 table-fixed">
              <thead className="bg-slate-50 text-[11px] text-slate-600 font-semibold uppercase tracking-wider border-b border-slate-200 sticky top-0 z-10 shadow-2xs">
                <tr>
                  <th className="p-3.5 w-[5%] min-w-[50px] text-center">Trend</th>
                  <th className="p-3.5 w-[25%] min-w-[220px]">Product</th>
                  <th className="p-3.5 w-[14%] min-w-[120px]">SKU</th>
                  <th className="p-3.5 w-[16%] min-w-[130px]">Category</th>
                  <th className="p-3.5 w-[11%] min-w-[105px]">Option Groups</th>
                  <th className="p-3.5 w-[10%] min-w-[90px]">Base Price</th>
                  <th className="p-3.5 w-[9%] min-w-[85px]">Status</th>
                  <th className="p-3.5 w-[10%] min-w-[170px] text-right pr-4">Studio Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {filteredProducts.map((prod) => {
                  const primaryImg = prod.images?.find((img) => img.isPrimary) || prod.images?.[0];
                  const groupsCount = prod.optionGroups?.length ?? (prod.fields?.length || 0);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Trending / Featured Checkbox Button */}
                      <td className="p-3.5 align-middle text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleFeatured(prod.id)}
                          disabled={actionLoadingId === prod.id}
                          title={prod.isFeatured ? 'Trending on Home Page (Click to uncheck)' : 'Not Trending (Click to feature on Home Page)'}
                          className={`w-7 h-7 mx-auto rounded-lg flex items-center justify-center transition cursor-pointer border ${
                            prod.isFeatured
                              ? 'bg-[#FFED00] text-black border-[#E3A008] shadow-2xs'
                              : 'bg-white text-slate-300 border-slate-200 hover:text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {prod.isFeatured ? (
                            <RiStarFill className="w-4 h-4 text-amber-800" />
                          ) : (
                            <RiStarLine className="w-4 h-4" />
                          )}
                        </button>
                      </td>

                      <td className="p-3.5 font-sans align-middle">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {primaryImg ? (
                              <img src={resolveImageUrl(primaryImg.url)} alt={prod.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] text-slate-400 font-semibold">NO IMG</span>
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-bold text-slate-900 hover:text-amber-600 transition-colors truncate">
                              <Link href={`/admin/products/${prod.id}`} title={prod.name}>
                                {prod.name}
                              </Link>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono truncate" title={`/${prod.slug}`}>
                              /{prod.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 text-slate-600 align-middle font-mono truncate" title={prod.sku}>
                        {prod.sku}
                      </td>

                      <td className="p-3.5 font-sans text-slate-600 align-middle truncate" title={prod.category?.name || 'Unassigned'}>
                        {prod.category?.name || 'Unassigned'}
                      </td>

                      <td className="p-3.5 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded text-[11px] text-slate-700 border border-slate-200 font-medium">
                          {groupsCount} {groupsCount === 1 ? 'group' : 'groups'}
                        </span>
                      </td>

                      <td className="p-3.5 font-bold text-slate-900 font-mono align-middle whitespace-nowrap">
                        {formatCurrency(Number(prod.basePrice))}
                      </td>

                      <td className="p-3.5 align-middle whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            prod.status === 'PUBLISHED'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : prod.status === 'DRAFT'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}
                        >
                          {prod.status}
                        </span>
                      </td>

                      <td className="p-3.5 text-right align-middle pr-4">
                        <div className="flex items-center justify-end gap-1.5 font-sans whitespace-nowrap">
                          <Link
                            href={`/admin/products/${prod.id}`}
                            className="p-1.5 px-2.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-200 hover:bg-[#FFED00] hover:text-black transition-colors text-xs font-bold flex items-center gap-1 shadow-2xs"
                            title="Open in Setup Studio"
                          >
                            <RiSettings4Line className="w-4 h-4" /> Studio
                          </Link>

                          <button
                            type="button"
                            onClick={() => handleOpenQuickEdit(prod)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Quick Edit"
                          >
                            <RiEditLine className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicate(prod.id)}
                            disabled={actionLoadingId === prod.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Duplicate Product"
                          >
                            <RiFileCopyLine className="w-4 h-4" />
                          </button>

                          {prod.status === 'DRAFT' ? (
                            <button
                              type="button"
                              onClick={() => handlePublish(prod.id)}
                              disabled={actionLoadingId === prod.id}
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Publish Product"
                            >
                              <RiCheckboxCircleLine className="w-4 h-4" />
                            </button>
                          ) : prod.status === 'PUBLISHED' ? (
                            <button
                              type="button"
                              onClick={() => handleArchive(prod.id)}
                              disabled={actionLoadingId === prod.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title="Archive Product"
                            >
                              <RiArchiveLine className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handlePublish(prod.id)}
                              disabled={actionLoadingId === prod.id}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="Restore / Publish Product"
                            >
                              <RiRefreshLine className="w-4 h-4" />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(prod.id, prod.name)}
                            disabled={actionLoadingId === prod.id}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors"
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
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                {modalEditError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Product Name</label>
              <input
                type="text"
                value={modalEditName}
                onChange={(e) => setModalEditName(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Base Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={modalEditPrice}
                  onChange={(e) => setModalEditPrice(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs font-mono focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
                <select
                  value={modalEditStatus}
                  onChange={(e) => setModalEditStatus(e.target.value as any)}
                  className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
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
                className="text-amber-700 hover:text-amber-800 hover:underline inline-flex items-center gap-1 font-semibold"
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
                  className="bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-3.5 py-2 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
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
