'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/ui';
import { api, DynamicProduct, resolveImageUrl } from '@/lib/api';

const PRODUCT_FALLBACK_IMAGES: Record<string, string> = {
  'luxury-rollup-standee': '/images/home/prod-banners.jpg',
  'custom-rigid-box': '/images/home/prod-boxes.jpg',
  'premium-visiting-cards': '/images/home/prod-cards.jpg',
  'visiting-card-pro': '/images/home/prod-cards.jpg',
  't-shirt': '/images/home/prod-tshirts.jpg',
};

export function FeaturedProducts() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [products, setProducts] = useState<DynamicProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    // Load products flagged as isFeatured (checked in /admin/products)
    api
      .getProducts(undefined, undefined, true)
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        setProducts(list);
      })
      .catch((err) => {
        console.warn('Failed to load featured products for home page:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const checkScroll = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 10);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScroll, { passive: true });
      window.addEventListener('resize', checkScroll);
      return () => {
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
  }, [products]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      const scrollAmount = direction === 'left' ? -containerWidth * 0.75 : containerWidth * 0.75;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!isLoading && products.length === 0) {
    return null;
  }

  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20 border-b border-neutral-200/70 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header: "Trending Products" on left, "View all products →" on right */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight font-sans">
              Trending Products
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Hand-picked bestsellers and customer favorites directly from our press
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-black transition-colors"
            >
              <span>View all products</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2] transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>

            {/* Desktop Left/Right Navigation Arrows */}
            {products.length > 3 && (
              <div className="hidden sm:flex items-center gap-1 ml-2">
                <button
                  type="button"
                  onClick={() => scroll('left')}
                  disabled={!canScrollLeft}
                  aria-label="Scroll left"
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                    canScrollLeft
                      ? 'border-neutral-300 text-neutral-800 hover:bg-neutral-100 hover:border-neutral-400 active:scale-95 cursor-pointer'
                      : 'border-neutral-200 text-neutral-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
                </button>

                <button
                  type="button"
                  onClick={() => scroll('right')}
                  disabled={!canScrollRight}
                  aria-label="Scroll right"
                  className={`w-7 h-7 rounded-full flex items-center justify-center border transition-all ${
                    canScrollRight
                      ? 'border-neutral-300 text-neutral-800 hover:bg-neutral-100 hover:border-neutral-400 active:scale-95 cursor-pointer'
                      : 'border-neutral-200 text-neutral-300 cursor-not-allowed opacity-50'
                  }`}
                >
                  <ChevronRight className="w-4 h-4 stroke-[2.2]" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Products Row: Cards in a Row on Desktop, Horizontally Scrollable */}
        <div
          ref={scrollRef}
          className="flex items-stretch gap-4 sm:gap-5 overflow-x-auto scrollbar-none scroll-smooth pb-3 pt-1 touch-pan-x"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {products.map((prod) => {
            const primaryImg = prod.images?.find((img) => img.isPrimary) || prod.images?.[0];
            const fallbackImg =
              PRODUCT_FALLBACK_IMAGES[prod.slug] || '/images/home/prod-cards.jpg';
            const resolvedImg = primaryImg?.url ? resolveImageUrl(primaryImg.url) : fallbackImg;
            const price = Number(prod.basePrice) || 0;
            const originalPrice = price > 0 ? Math.round(price * 1.35) : undefined;

            return (
              <div
                key={prod.id}
                className="flex-shrink-0 w-[180px] min-w-[180px] sm:w-[calc((100%-2*16px)/3)] sm:min-w-[calc((100%-2*16px)/3)] lg:w-[calc((100%-4*20px)/5)] lg:min-w-[calc((100%-4*20px)/5)] lg:max-w-[calc((100%-4*20px)/5)]"
              >
                <ProductCard
                  id={prod.id}
                  name={prod.name}
                  price={price}
                  originalPrice={originalPrice}
                  href={`/products/${prod.slug}`}
                  image={resolvedImg}
                  fallbackImage={fallbackImg}
                  tag={prod.tags?.[0] || 'Popular'}
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
