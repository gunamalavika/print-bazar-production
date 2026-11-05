'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { api, ProductCategoryItem, resolveImageUrl } from '@/lib/api';

const DEFAULT_CATEGORY_FALLBACKS: Record<string, string> = {
  'visiting-cards': '/images/home/prod-cards.jpg',
  'signs-banners': '/images/home/prod-banners.jpg',
  'rigid-presentation-boxes': '/images/home/prod-boxes.jpg',
  'mono-cartons': '/images/home/prod-boxes.jpg',
  'corrugated-mailers': '/images/home/prod-boxes.jpg',
  'roll-up-standees-sub': '/images/home/prod-banners.jpg',
  'vinyl-flex-banners': '/images/home/prod-banners.jpg',
  'marketing-materials': '/images/home/prod-flyers.jpg',
  'packaging': '/images/home/prod-boxes.jpg',
  'business-cards': '/images/home/prod-cards.jpg',
  'corporate-gifts': '/images/home/cat-gifts.jpg',
  'corporate-apparel': '/images/home/prod-tshirts.jpg',
  'stickers': '/images/home/prod-stickers.jpg',
};

export function CategoryShowcase() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [categories, setCategories] = useState<ProductCategoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    api
      .getCategories()
      .then((data) => {
        if (!isMounted) return;
        const list = Array.isArray(data) ? data : [];
        // Only show active categories
        const activeList = list.filter((c) => c.isActive !== false);
        setCategories(activeList);
      })
      .catch((err) => {
        console.warn('Failed to load categories for showcase:', err);
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
  }, [categories]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const containerWidth = scrollRef.current.clientWidth;
      const scrollAmount = direction === 'left' ? -containerWidth * 0.75 : containerWidth * 0.75;
      scrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  if (!isLoading && categories.length === 0) {
    return null;
  }

  return (
    <section className="bg-[#FAFAFA] border-b border-neutral-200/70 py-10 sm:py-14 lg:py-16 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header: "Shop by Category" & "View all categories →" */}
        <div className="flex items-center justify-between mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-neutral-900 tracking-tight font-sans">
              Shop by Category
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Explore our full printing and custom packaging categories
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-600 hover:text-black transition-colors"
            >
              <span>View all categories</span>
              <ArrowRight className="w-3.5 h-3.5 stroke-[2.2] transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>

            {/* Desktop Left/Right Navigation Arrows */}
            {categories.length > 4 && (
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

        {/* Horizontal Scrollable Row */}
        <div
          ref={scrollRef}
          className="flex items-start gap-3 sm:gap-4 overflow-x-auto scrollbar-none scroll-smooth pb-2 pt-1 touch-pan-x"
          style={{
            scrollbarWidth: 'none',
            msOverflowStyle: 'none',
          }}
        >
          {categories.map((cat) => {
            const fallbackImg =
              DEFAULT_CATEGORY_FALLBACKS[cat.slug] || '/images/home/prod-cards.jpg';
            const resolvedImg = cat.image?.trim()
              ? resolveImageUrl(cat.image)
              : fallbackImg;

            return (
              <Link
                key={cat.id}
                href={`/products?category=${encodeURIComponent(cat.slug || cat.id)}`}
                className="group flex flex-col items-center flex-shrink-0 w-[105px] min-w-[105px] sm:w-[calc((100%-4*12px)/5)] sm:min-w-[calc((100%-4*12px)/5)] md:w-[calc((100%-5*14px)/6)] md:min-w-[calc((100%-5*14px)/6)] lg:w-[calc((100%-7*16px)/8)] lg:min-w-[calc((100%-7*16px)/8)] lg:max-w-[calc((100%-7*16px)/8)] touch-manipulation select-none cursor-pointer"
              >
                {/* Card Container: Soft gray rounded square container */}
                <div className="relative w-full aspect-square rounded-2xl sm:rounded-[18px] bg-[#F6F7F9] p-2 sm:p-2.5 flex items-center justify-center overflow-hidden border border-neutral-200/50 group-hover:bg-[#ECEEF2] group-hover:border-neutral-300/80 group-hover:shadow-xs transition-all duration-300">
                  <img
                    src={resolvedImg}
                    alt={cat.name}
                    className="w-full h-full object-cover rounded-xl transition-transform duration-300 ease-out group-hover:scale-106 motion-reduce:transform-none"
                    loading="lazy"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = fallbackImg;
                    }}
                  />
                </div>

                {/* Category Name Centered Underneath */}
                <span className="block text-center mt-2 sm:mt-2.5 text-xs sm:text-[13px] font-semibold text-neutral-800 group-hover:text-black leading-snug truncate w-full font-sans transition-colors">
                  {cat.name}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
