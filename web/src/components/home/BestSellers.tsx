'use client';

import React, { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { ProductCard } from '@/components/ui';

const BEST_SELLER_PRODUCTS = [
  {
    id: 'bs-01',
    name: 'Velvet Soft-Touch Business Cards',
    subtitle: '400 GSM Artboard • Gold Foil',
    price: 349,
    pricePrefix: 'From',
    href: '/products/premium-visiting-cards',
    image: 'https://images.unsplash.com/photo-1589330694653-ded6df03f754?w=800&auto=format&fit=crop&q=80',
    tag: 'Bestseller',
  },
  {
    id: 'bs-02',
    name: 'Die-Cut Holographic Stickers',
    subtitle: 'Weatherproof • Rainbow sheen',
    price: 249,
    pricePrefix: 'From',
    href: '/products?category=stickers',
    image: 'https://images.unsplash.com/photo-1572375992501-4b0892d50c69?w=800&auto=format&fit=crop&q=80',
    tag: 'Top Rated',
  },
  {
    id: 'bs-03',
    name: 'Rigid Presentation Gift Boxes',
    subtitle: 'Magnetic flap • Kappa board',
    price: 999,
    pricePrefix: 'From',
    href: '/products/custom-rigid-box',
    image: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800&auto=format&fit=crop&q=80',
    tag: 'Luxury',
  },
  {
    id: 'bs-04',
    name: 'Corporate Lanyard ID Badges',
    subtitle: 'Satin lanyard • Metal clip',
    price: 169,
    pricePrefix: 'From',
    href: '/products?category=id-cards',
    image: 'https://images.unsplash.com/photo-1588702547923-7093a6c3ba33?w=800&auto=format&fit=crop&q=80',
    tag: 'Corporate',
  },
  {
    id: 'bs-05',
    name: 'Standee Marketing Banners',
    subtitle: '6x2.5 ft • Non-tear vinyl',
    price: 1299,
    pricePrefix: 'From',
    href: '/products/roll-up-luxury-standee',
    image: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80',
    tag: 'Hot',
  },
  {
    id: 'bs-06',
    name: 'Executive Bond Letterheads',
    subtitle: '120 GSM Royal Executive Bond',
    price: 449,
    pricePrefix: 'From',
    href: '/products',
    image: 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=800&auto=format&fit=crop&q=80',
    tag: 'Stationery',
  },
  {
    id: 'bs-07',
    name: 'Custom Product Packaging Labels',
    subtitle: 'Waterproof Roll • Gloss finish',
    price: 299,
    pricePrefix: 'From',
    href: '/products?category=labels',
    image: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=800&auto=format&fit=crop&q=80',
    tag: 'Packaging',
  },
  {
    id: 'bs-08',
    name: 'Engraved Steel Drinkware',
    subtitle: 'Double-wall insulated • 750ml',
    price: 499,
    pricePrefix: 'From',
    href: '/products?category=corporate-gifts',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    tag: 'Merchandise',
  },
  {
    id: 'bs-09',
    name: 'Folded Product Catalogues',
    subtitle: '16 Pages • Saddle stitched',
    price: 799,
    pricePrefix: 'From',
    href: '/products?category=brochures',
    image: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=800&auto=format&fit=crop&q=80',
    tag: 'Catalogues',
  },
  {
    id: 'bs-10',
    name: 'Desktop Photo Desk Calendars',
    subtitle: 'Wire-O bound • 12 Months',
    price: 399,
    pricePrefix: 'From',
    href: '/products?category=photo-products',
    image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=800&auto=format&fit=crop&q=80',
    tag: 'Yearly Hit',
  },
];

export function BestSellers() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScrollState = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 6);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 6);
  };

  useEffect(() => {
    checkScrollState();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', checkScrollState, { passive: true });
      window.addEventListener('resize', checkScrollState);
      return () => {
        el.removeEventListener('scroll', checkScrollState);
        window.removeEventListener('resize', checkScrollState);
      };
    }
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!scrollRef.current) return;
    const container = scrollRef.current;
    // Scroll by roughly 2 cards
    const step = (container.clientWidth / 5) * 2;
    container.scrollBy({
      left: direction === 'left' ? -step : step,
      behavior: 'smooth',
    });
  };

  return (
    <section className="bg-white py-12 sm:py-16 lg:py-20 border-b border-neutral-200/70 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header: Title & Subtitle on Left, Scroll Controls & View All on Right */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 font-sans">
              Best Sellers
            </h2>
            <p className="text-xs sm:text-sm text-neutral-500 mt-1 font-sans">
              Top performing and highest rated print essentials.
            </p>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {/* Desktop / Tablet Scroll Controls */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => handleScroll('left')}
                disabled={!canScrollLeft}
                aria-label="Scroll left"
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                  canScrollLeft
                    ? 'border-neutral-300 text-neutral-800 hover:bg-neutral-100 hover:border-neutral-400 active:scale-95 cursor-pointer'
                    : 'border-neutral-200 text-neutral-300 cursor-not-allowed opacity-40'
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => handleScroll('right')}
                disabled={!canScrollRight}
                aria-label="Scroll right"
                className={`w-7 h-7 rounded-full border flex items-center justify-center transition-all ${
                  canScrollRight
                    ? 'border-neutral-300 text-neutral-800 hover:bg-neutral-100 hover:border-neutral-400 active:scale-95 cursor-pointer'
                    : 'border-neutral-200 text-neutral-300 cursor-not-allowed opacity-40'
                }`}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* View All Link */}
            <Link
              href="/products"
              className="group inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-neutral-900 hover:text-black transition-colors ml-1"
            >
              <span>View All</span>
              <span className="w-5 h-5 rounded-full bg-[#FFED00] text-black flex items-center justify-center font-bold shadow-2xs transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight className="w-3 h-3 stroke-[2.5]" />
              </span>
            </Link>
          </div>
        </div>

        {/* 1 Row with Exactly 5 Products in View on Desktop + Remaining Scrollable */}
        <div
          ref={scrollRef}
          className="flex flex-nowrap gap-4 sm:gap-4 lg:gap-4 overflow-x-auto scroll-smooth scrollbar-none snap-x snap-mandatory pb-3 pt-1"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {BEST_SELLER_PRODUCTS.map((prod) => (
            <div
              key={prod.id}
              className="flex-shrink-0 snap-start w-[220px] min-w-[220px] sm:w-[calc((100%-2*16px)/3)] sm:min-w-[calc((100%-2*16px)/3)] lg:w-[calc((100%-4*16px)/5)] lg:min-w-[calc((100%-4*16px)/5)]"
            >
              <ProductCard
                id={prod.id}
                name={prod.name}
                description={prod.subtitle}
                price={prod.price}
                pricePrefix={prod.pricePrefix}
                href={prod.href}
                image={prod.image}
                tag={prod.tag}
                actionText="Order Now"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

