'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  RiLoader4Line,
  RiAlertLine,
  RiArrowLeftLine,
} from 'react-icons/ri';
import {
  api,
  DynamicProduct,
} from '@/lib/api';
import { DynamicProductView } from '@/components/products/DynamicProductView';
import { Button } from '@/components/ui';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = (params.slug as string) || '';

  const [product, setProduct] = useState<DynamicProduct | null>(null);
  const [isLoadingProduct, setIsLoadingProduct] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch Product Schema from API
  useEffect(() => {
    async function loadProduct() {
      setIsLoadingProduct(true);
      setErrorMsg(null);
      try {
        const prod = await api.getProductBySlug(slug);
        setProduct(prod);
      } catch (err: any) {
        setErrorMsg(err?.message || 'Product not found or currently unavailable');
      } finally {
        setIsLoadingProduct(false);
      }
    }
    if (slug) {
      loadProduct();
    }
  }, [slug]);

  if (isLoadingProduct) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 bg-[#F8FAFC]">
        <RiLoader4Line className="h-10 w-10 text-[#FFED00] animate-spin mb-4" />
        <span className="text-xs font-mono text-slate-500 uppercase font-bold tracking-wider">
          Loading Manufacturing Engine & Spec Matrices...
        </span>
      </div>
    );
  }

  if (errorMsg || !product) {
    return (
      <div className="mx-auto max-w-xl my-16 bg-white border border-rose-200 rounded-2xl p-8 text-center shadow-card">
        <RiAlertLine className="h-12 w-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-lg font-black text-slate-900 font-display">Product Unavailable</h2>
        <p className="text-xs text-slate-600 mt-2">{errorMsg || 'The requested product could not be found.'}</p>
        <Link href="/products" className="inline-block mt-6">
          <Button variant="primary" size="md">
            <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
            <span>Return to Catalogue</span>
          </Button>
        </Link>
      </div>
    );
  }

  // Authoritative Dynamic Product Detail View for ALL catalog products
  return <DynamicProductView product={product} />;
}
