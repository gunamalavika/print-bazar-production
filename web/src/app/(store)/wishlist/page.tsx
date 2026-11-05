'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Heart, ShoppingCart, ArrowLeft, Trash2, ArrowRight } from 'lucide-react';
import { api, DynamicProduct, resolveImageUrl } from '@/lib/api';
import { useWishlist } from '@/lib/wishlist';
import { ProductCard, Button, EmptyState } from '@/components/ui';

export default function WishlistPage() {
  const { wishlist, wishlistCount } = useWishlist();
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        const prods = await api.getProducts().catch(() => []);
        setProducts(Array.isArray(prods) ? prods : []);
      } catch (err) {
        console.error('Failed to load products for wishlist:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadProducts();
  }, []);

  // Filter products by wishlist IDs or slugs
  const wishlistedProducts = useMemo(() => {
    if (!wishlist || wishlist.length === 0) return [];
    return products.filter(
      (p) => wishlist.includes(p.id) || wishlist.includes(p.slug)
    );
  }, [wishlist, products]);

  return (
    <div className="min-h-screen bg-[#FAFAFA] py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header Breadcrumbs & Title */}
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-black transition-colors mb-3"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Continue Shopping</span>
          </Link>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[#E5E7EB] pb-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FFED00] flex items-center justify-center border border-black/10 shadow-xs">
                <Heart className="h-5 w-5 text-black fill-black" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-black tracking-tight">
                  My Wishlist
                </h1>
                <p className="text-xs text-[#64748B] mt-0.5 font-medium">
                  {wishlistCount} {wishlistCount === 1 ? 'item saved' : 'items saved'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/cart"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold bg-white text-black border border-[#E5E7EB] rounded-[8px] hover:border-black/30 shadow-2xs transition-colors"
              >
                <ShoppingCart className="h-4 w-4" />
                <span>Go to Cart</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {[1, 2, 3, 4].map((n) => (
              <div
                key={n}
                className="bg-white rounded-[14px] border border-[#E5E7EB] p-4 h-72 animate-pulse flex flex-col justify-between"
              >
                <div className="bg-slate-100 rounded-lg h-36 w-full" />
                <div className="space-y-2 mt-4">
                  <div className="bg-slate-100 h-4 rounded w-3/4" />
                  <div className="bg-slate-100 h-3 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : wishlistedProducts.length === 0 ? (
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] p-12 text-center max-w-lg mx-auto shadow-2xs my-10">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-[#FEF9C3] flex items-center justify-center text-[#854D0E]">
              <Heart className="h-7 w-7 text-black stroke-[1.8]" />
            </div>
            <h2 className="text-lg font-bold text-black mb-1">Your wishlist is empty</h2>
            <p className="text-xs text-[#64748B] mb-6 leading-relaxed">
              Explore our print catalogue and click the heart icon on any product to save it for quick quoting and ordering later.
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FFED00] hover:bg-[#F2E100] text-black font-bold text-xs rounded-[8px] border border-black/20 shadow-xs transition-colors"
            >
              <span>Explore Products</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {wishlistedProducts.map((prod) => {
              const primaryImage =
                prod.images?.find((img) => img.isPrimary) ||
                prod.images?.[0];
              const imageUrl = resolveImageUrl(primaryImage?.url);

              return (
                <ProductCard
                  key={prod.id}
                  id={prod.id}
                  name={prod.name}
                  description={prod.description || 'High-definition industrial printing specifications.'}
                  price={Number(prod.basePrice) || 0}
                  href={`/products/${prod.slug}`}
                  image={imageUrl}
                  sku={prod.sku}
                  categoryName={prod.category?.name || 'Commercial Print'}
                  actionText="Add to cart"
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
