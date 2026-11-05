'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiFoldersLine,
  RiEditLine,
  RiDeleteBin7Line,
  RiLoader4Line,
  RiImage2Line,
  RiCloseLine,
  RiCheckboxCircleLine,
  RiArrowLeftLine,
  RiSearch2Line,
  RiUpload2Line,
  RiShoppingBag3Line,
} from 'react-icons/ri';
import { api, ProductCategoryItem, resolveImageUrl } from '@/lib/api';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // Create / Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ProductCategoryItem | null>(null);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('');
  const [sortOrder, setSortOrder] = useState(0);
  const [isActive, setIsActive] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImg, setIsUploadingImg] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadCategories = async () => {
    setIsLoading(true);
    try {
      const data = await api.adminListCategories();
      setCategories(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Summary Metrics calculated from actual backend data
  const totalCategoriesCount = categories.length;
  const activeCategoriesCount = useMemo(() => {
    return categories.filter((c) => c.isActive).length;
  }, [categories]);
  const inactiveCategoriesCount = useMemo(() => {
    return categories.filter((c) => !c.isActive).length;
  }, [categories]);
  const productsAssignedCount = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c._count?.products || 0), 0);
  }, [categories]);

  // Filtered Flat Categories List
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categories.filter((cat) => {
      // Status filter
      if (statusFilter === 'ACTIVE' && !cat.isActive) return false;
      if (statusFilter === 'INACTIVE' && cat.isActive) return false;

      // Search filter (name or slug or description)
      if (q) {
        const matchesName = cat.name.toLowerCase().includes(q);
        const matchesSlug = cat.slug.toLowerCase().includes(q);
        const matchesDesc = (cat.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesSlug && !matchesDesc) return false;
      }

      return true;
    });
  }, [categories, searchQuery, statusFilter]);

  const openCreateModal = () => {
    setEditingCategory(null);
    setName('');
    setSlug('');
    setDescription('');
    setImage('');
    setSortOrder(categories.length + 1);
    setIsActive(true);
    setFormError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (cat: ProductCategoryItem) => {
    setEditingCategory(cat);
    setName(cat.name);
    setSlug(cat.slug);
    setDescription(cat.description || '');
    setImage(cat.image || '');
    setSortOrder(cat.sortOrder ?? 0);
    setIsActive(cat.isActive);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingCategory) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)+/g, ''),
      );
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImg(true);
    try {
      const res = await api.uploadReferenceImage(file);
      setImage(res.fileUrl);
    } catch (err: any) {
      alert(err?.message || 'Failed to upload category image');
    } finally {
      setIsUploadingImg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setFormError('Category Name and Slug are required.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (editingCategory) {
        await api.adminUpdateCategory(editingCategory.id, {
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || undefined,
          image: image.trim() || undefined,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        });
      } else {
        await api.adminCreateCategory({
          name: name.trim(),
          slug: slug.trim().toLowerCase(),
          description: description.trim() || undefined,
          image: image.trim() || undefined,
          sortOrder: Number(sortOrder) || 0,
          isActive,
        });
      }
      setIsModalOpen(false);
      await loadCategories();
    } catch (err: any) {
      setFormError(err?.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, catName: string, productCount: number) => {
    if (productCount > 0) {
      if (
        !confirm(
          `Warning: Category '${catName}' currently has ${productCount} assigned product(s).\nDeleting this category may affect those products.\n\nAre you sure you want to proceed?`,
        )
      ) {
        return;
      }
    } else {
      if (!confirm(`Are you sure you want to delete category '${catName}'?`)) {
        return;
      }
    }

    try {
      await api.adminDeleteCategory(id);
      await loadCategories();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete category');
    }
  };

  return (
    <div className="space-y-6">
      {/* ============================================================ */}
      {/* 2. PAGE HEADER */}
      {/* ============================================================ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 transition mr-1"
              title="Back to Products"
            >
              <RiArrowLeftLine className="h-4 w-4" />
            </Link>
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
              Categories
            </h1>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Manage product categories displayed in the Print Bazzar storefront.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-[13px] px-4 py-2.5 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95 cursor-pointer"
          >
            <RiAddLine className="h-4 w-4" />
            <span>+ Add Category</span>
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 3. SIMPLIFIED SUMMARY CARDS */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Categories */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase font-mono block">
            Total Categories
          </span>
          <div className="text-2xl font-black text-slate-900 font-mono mt-1">
            {totalCategoriesCount}
          </div>
          <span className="text-[10px] text-slate-400">All storefront categories</span>
        </div>

        {/* Active Categories */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-emerald-700 uppercase font-mono block">
            Active Categories
          </span>
          <div className="text-2xl font-black text-emerald-900 font-mono mt-1">
            {activeCategoriesCount}
          </div>
          <span className="text-[10px] text-emerald-600">Visible on customer store</span>
        </div>

        {/* Products Assigned */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-blue-700 uppercase font-mono block">
            Products Assigned
          </span>
          <div className="text-2xl font-black text-blue-900 font-mono mt-1">
            {productsAssignedCount}
          </div>
          <span className="text-[10px] text-blue-600">Total assigned product SKUs</span>
        </div>

        {/* Inactive Categories */}
        <div className="p-4 rounded-xl bg-white border border-slate-200/90 shadow-2xs">
          <span className="text-[11px] font-bold text-amber-700 uppercase font-mono block">
            Inactive Categories
          </span>
          <div className="text-2xl font-black text-amber-900 font-mono mt-1">
            {inactiveCategoriesCount}
          </div>
          <span className="text-[10px] text-amber-600">Hidden from storefront</span>
        </div>
      </div>

      {/* ============================================================ */}
      {/* 4. FILTERS & SEARCH */}
      {/* ============================================================ */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Categories ({totalCategoriesCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('ACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              statusFilter === 'ACTIVE'
                ? 'bg-white text-emerald-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active ({activeCategoriesCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('INACTIVE')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
              statusFilter === 'INACTIVE'
                ? 'bg-white text-amber-700 shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactive ({inactiveCategoriesCount})
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <RiSearch2Line className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name or slug..."
            className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
            >
              <RiCloseLine className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* ============================================================ */}
      {/* 5. FLAT CATEGORY TABLE */}
      {/* ============================================================ */}
      <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400">
            <RiLoader4Line className="h-8 w-8 animate-spin text-slate-500 mb-2" />
            <p className="text-xs">Loading categories...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="py-16 text-center text-slate-500 space-y-3">
            <RiFoldersLine className="h-10 w-10 mx-auto text-slate-300" />
            <p className="text-sm font-medium text-slate-700">No categories found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              {searchQuery
                ? `No categories matching "${searchQuery}". Try clearing search.`
                : 'Get started by creating your first product category.'}
            </p>
            {searchQuery ? (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-xs text-blue-600 hover:underline cursor-pointer"
              >
                Clear Search
              </button>
            ) : (
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-1 bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] font-bold text-xs px-3.5 py-2 rounded-lg cursor-pointer"
              >
                <RiAddLine className="h-3.5 w-3.5" />
                <span>Add Category</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Slug</th>
                  <th className="py-3 px-4 text-center">Products</th>
                  <th className="py-3 px-4">Storefront Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredCategories.map((cat) => {
                  const prodCount = cat._count?.products || 0;
                  return (
                    <tr
                      key={cat.id}
                      className="hover:bg-slate-50/70 transition-colors group"
                    >
                      {/* Column 1: Category */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {cat.image ? (
                            <img
                              src={resolveImageUrl(cat.image)}
                              alt={cat.name}
                              className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-slate-50"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                              <RiFoldersLine className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate group-hover:text-slate-950">
                              {cat.name}
                            </span>
                            {cat.description ? (
                              <p className="text-[11px] text-slate-500 truncate max-w-md mt-0.5">
                                {cat.description}
                              </p>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">
                                No description configured
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Column 2: Slug */}
                      <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                          /{cat.slug}
                        </span>
                      </td>

                      {/* Column 3: Products */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            prodCount > 0
                              ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          <RiShoppingBag3Line className="h-3 w-3" />
                          <span>{prodCount}</span>
                        </span>
                      </td>

                      {/* Column 4: Storefront Status */}
                      <td className="py-3.5 px-4">
                        {cat.isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </span>
                        )}
                      </td>

                      {/* Column 5: Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(cat)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 transition cursor-pointer"
                            title="Edit category"
                          >
                            <RiEditLine className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.name, prodCount)}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:border-red-200 hover:bg-red-50 transition cursor-pointer"
                            title="Delete category"
                          >
                            <RiDeleteBin7Line className="h-4 w-4" />
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

      {/* ============================================================ */}
      {/* 6. ADD / EDIT CATEGORY MODAL */}
      {/* ============================================================ */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingCategory ? 'Edit Category' : 'Add Category'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure top-level category details for the storefront.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
                  {formError}
                </div>
              )}

              {/* Category Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Category Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Packaging & Rigid Boxes"
                  className="w-full h-10 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition"
                  required
                />
              </div>

              {/* Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Slug <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-xs text-slate-400">
                    /
                  </span>
                  <input
                    type="text"
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase())}
                    placeholder="packaging"
                    className="w-full h-10 pl-7 pr-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition"
                    required
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-0.5 block font-mono">
                  URL slug used on the storefront (e.g. /products?category={slug || 'slug'})
                </span>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Short description highlighting print specifications or department materials..."
                  className="w-full p-3 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900 focus:bg-white transition resize-none"
                />
              </div>

              {/* Category Image */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Category Image
                </label>
                {image ? (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img
                        src={resolveImageUrl(image)}
                        alt="Preview"
                        className="w-10 h-10 rounded-lg object-cover border border-slate-200 shrink-0 bg-white"
                      />
                      <span className="text-xs text-slate-600 truncate max-w-[200px]">
                        Image uploaded
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setImage('')}
                      className="text-xs text-red-600 hover:underline px-2 py-1 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImg}
                      className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-50 border border-slate-300 hover:bg-slate-100 text-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RiUpload2Line className="h-4 w-4" />
                      <span>{isUploadingImg ? 'Uploading...' : 'Choose Image File'}</span>
                    </button>
                    <span className="text-[11px] text-slate-400">
                      PNG, JPG, WebP supported
                    </span>
                  </div>
                )}
              </div>

              {/* Active / Inactive Status */}
              <div className="pt-2 border-t border-slate-100">
                <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-slate-800 select-none">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-4 h-4 accent-[#0F172A] rounded border-slate-300"
                  />
                  <span>Active Category (visible on storefront)</span>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-lg text-xs font-bold bg-[#FFED00] hover:bg-[#F2E100] text-[#0F172A] border border-[#E3A008]/40 shadow-xs transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
