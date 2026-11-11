'use client';

import React from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useWishlist } from '@/lib/wishlist';

export interface ProductCardProps {
  id: string;
  name: string;
  description?: string;
  price: string | number;
  originalPrice?: string | number;
  pricePrefix?: string;
  priceUnit?: string;
  href: string;
  image: string;
  fallbackImage?: string;
  tag?: string;
  sku?: string;
  categoryName?: string;
  productionDays?: number | string;
  actionText?: string;
  className?: string;
  onAddToCart?: (id: string) => void;
  onOrderNow?: (id: string) => void;
}

export function ProductCard({
  id,
  name,
  description,
  price,
  originalPrice,
  pricePrefix,
  priceUnit,
  href,
  image,
  fallbackImage = 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=800&auto=format&fit=crop&q=80',
  tag,
  actionText = 'Order Now',
  className = '',
  onAddToCart,
  onOrderNow,
}: ProductCardProps) {
  const { isWishlisted, toggleWishlist } = useWishlist();
  const wishlisted = isWishlisted(id);

  // Format price string if number
  const formatPrice = (val?: string | number) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'number') return `₹${val.toLocaleString('en-IN')}`;
    return val.startsWith('₹') ? val : `₹${val}`;
  };

  const displayPrice = formatPrice(price);
  const displayOriginalPrice = formatPrice(originalPrice);

  const handleWishlistClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(id);
  };

  const handleOrderNowClick = (e: React.MouseEvent) => {
    if (onOrderNow) {
      e.preventDefault();
      e.stopPropagation();
      onOrderNow(id);
    } else if (onAddToCart) {
      e.preventDefault();
      e.stopPropagation();
      onAddToCart(id);
    }
  };

  return (
    <Link
      href={href}
      className={`group relative bg-white rounded-xl sm:rounded-2xl border border-neutral-200/80 hover:border-neutral-300 hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between h-full touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFED00] focus-visible:ring-offset-2 ${className}`}
    >
      <div>
        {/* 1. Product Image Canvas with object-cover Edge-to-Edge Fill */}
        <div className="relative w-full aspect-square bg-[#F8F9FA] overflow-hidden">
          {/* Top-Left Badge: e.g. "Best Seller", "New", "Popular", "Sale" */}
          {tag && (
            <span className="absolute top-2 left-2 sm:top-2.5 sm:left-2.5 z-10 inline-flex items-center bg-[#FFED00] text-black text-[9px] sm:text-[11px] font-bold px-2 sm:px-2.5 py-0.5 rounded-full shadow-2xs font-sans tracking-tight">
              {tag}
            </span>
          )}

          {/* Top-Right Circular Wishlist Button */}
          <button
            type="button"
            onClick={handleWishlistClick}
            aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
            className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 z-10 h-6 w-6 sm:h-7 sm:w-7 rounded-full bg-white/90 backdrop-blur-xs hover:bg-white text-neutral-400 hover:text-black flex items-center justify-center border border-neutral-200/60 shadow-2xs transition-transform active:scale-90"
          >
            <Heart
              className={`h-3 w-3 sm:h-3.5 sm:w-3.5 transition-colors ${
                wishlisted
                  ? 'fill-[#FFED00] text-black stroke-[2.2]'
                  : 'text-neutral-400 group-hover/btn:text-black'
              }`}
            />
          </button>

          {/* Product Image: object-cover */}
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transform-none"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackImage;
            }}
          />
        </div>

        {/* 2. Structured Product Details with Tight, Responsive Spacing */}
        <div className="p-2 sm:p-3 pb-0">
          {/* Product Title */}
          <h3 className="text-[11.5px] xs:text-xs sm:text-[13.5px] font-bold text-neutral-900 group-hover:text-black transition-colors leading-tight line-clamp-1 font-sans">
            {name}
          </h3>

          {/* Price Row: Current Price + Strikethrough Original Price */}
          <div className="flex items-baseline gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 flex-wrap">
            <span className="text-[12.5px] xs:text-sm sm:text-base font-bold text-neutral-900 font-sans tabular-nums tracking-tight">
              {displayPrice}
            </span>
            {displayOriginalPrice && (
              <span className="text-[10px] sm:text-xs text-neutral-400 line-through font-normal tabular-nums">
                {displayOriginalPrice}
              </span>
            )}
            {priceUnit && (
              <span className="text-[9px] sm:text-[10px] text-neutral-500 font-normal">
                {priceUnit}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 3. Action Button: "Order Now" with 8px radius */}
      <div className="p-2 sm:p-3 pt-2 sm:pt-2.5 mt-auto">
        <button
          type="button"
          onClick={handleOrderNowClick}
          className="w-full py-2 rounded-[8px] bg-[#FFED00] hover:bg-[#FACC15] text-black font-bold text-xs sm:text-[13px] transition-all flex items-center justify-center gap-1 shadow-2xs active:scale-[0.99] font-sans tracking-tight"
        >
          <span>{actionText}</span>
        </button>
      </div>
    </Link>
  );
}
