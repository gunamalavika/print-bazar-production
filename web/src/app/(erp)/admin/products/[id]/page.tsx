'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { RiArrowLeftLine, RiLoader4Line } from 'react-icons/ri';
import { api, DynamicProduct, ProductCategoryItem } from '@/lib/api';
import { ProductSetupStudio } from '../components/ProductSetupStudio';

export default function AdminProductEditorPage() {
  const params = useParams();
  const router = useRouter();
  const productId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [product, setProduct] = useState<DynamicProduct | null>(null);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);

  useEffect(() => {
    if (!productId) return;
    loadData();
  }, [productId]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [prod, cats] = await Promise.all([
        api.adminGetProductById(productId),
        api.adminListCategories(),
      ]);
      setProduct(prod);
      setCategories(cats || []);
    } catch (err: any) {
      setLoadError(err?.message || 'Failed to load product details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <RiArrowLeftLine className="w-4 h-4" />
          <span>Back to Products Catalogue</span>
        </Link>
      </div>

      {isLoading && (
        <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center gap-3">
          <RiLoader4Line className="w-8 h-8 animate-spin text-amber-500" />
          <span className="text-sm font-medium">Loading Product Setup Studio...</span>
        </div>
      )}

      {loadError && (
        <div className="p-5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm">
          {loadError}
        </div>
      )}

      {!isLoading && product && (
        <ProductSetupStudio
          initialProduct={product}
          categories={categories}
          isNew={false}
          onSaved={(saved) => {
            setProduct(saved);
          }}
          onCancel={() => router.push('/admin/products')}
        />
      )}
    </div>
  );
}
