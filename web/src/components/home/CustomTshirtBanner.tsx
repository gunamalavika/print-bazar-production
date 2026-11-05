'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function CustomTshirtBanner() {
  return (
    <section className="bg-[#FAFAFA] py-10 sm:py-14 lg:py-16 border-b border-neutral-200/70 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Link
          href="/products?category=corporate-apparel"
          className="group relative block w-full rounded-2xl sm:rounded-[22px] overflow-hidden bg-[#181A19] shadow-sm hover:shadow-xl transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFED00]"
        >
          {/* Responsive Layout: Vertical on Mobile (flex-col), Horizontal on Tablet/Desktop (sm:flex-row) */}
          <div className="flex flex-col sm:flex-row items-stretch w-full min-h-[220px] lg:min-h-[240px] relative">
            {/* Desktop Graphic: Angled Cut with T-Shirts & Palm Leaves (Right 56%) */}
            <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[54%] md:w-[56%] lg:w-[58%] pointer-events-none overflow-hidden">
              <Image
                src="/images/banners/tshirt-graphic-desktop.webp"
                alt="Custom Printed T-Shirts Special Offer"
                fill
                priority
                unoptimized
                className="w-full h-full object-cover object-left transition-transform duration-500 ease-out group-hover:scale-102"
              />
            </div>

            {/* Content Area: Native Vector HTML Typography (Crystal Clear, Never Blurred) */}
            <div className="relative z-10 flex flex-col justify-center p-6 sm:p-7 md:p-8 lg:p-10 w-full sm:w-[50%] md:w-[46%] lg:w-[44%] shrink-0">
              {/* Limited Time Offer Pill */}
              <div>
                <span className="inline-flex items-center px-3 py-1 rounded-full bg-[#FFED00] text-black font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider font-sans shadow-2xs">
                  LIMITED TIME OFFER
                </span>
              </div>

              {/* Title */}
              <h3 className="text-2xl sm:text-2xl md:text-3xl lg:text-[34px] font-black text-white tracking-tight leading-tight mt-2.5 sm:mt-3 font-sans">
                Custom T-Shirts
              </h3>

              {/* Price */}
              <p className="text-xl sm:text-xl md:text-2xl lg:text-[28px] font-extrabold text-[#FFED00] mt-1 sm:mt-1.5 font-sans">
                <span className="text-white font-bold">From </span>₹299 only
              </p>

              {/* Description */}
              <p className="text-xs sm:text-[13px] md:text-sm text-neutral-300 font-medium mt-1.5 sm:mt-2 leading-relaxed font-sans max-w-sm sm:max-w-none">
                Premium quality. Full color printing. No minimum order.
              </p>

              {/* CTA Button */}
              <div className="mt-4 sm:mt-5">
                <span className="inline-flex items-center gap-2 px-5 sm:px-6 py-2 sm:py-2.5 rounded-full bg-[#FFED00] group-hover:bg-[#FACC15] text-black font-black text-xs sm:text-[13px] transition-all shadow-sm group-hover:translate-x-1 font-sans">
                  <span>Shop Now</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>
            </div>

            {/* Mobile Graphic: Stacked in Vertical Direction Below Text */}
            <div className="sm:hidden relative w-full aspect-[16/9] overflow-hidden bg-[#181A19]">
              <Image
                src="/images/banners/tshirt-graphic-mobile.webp"
                alt="Custom Printed T-Shirts Special Offer"
                fill
                priority
                unoptimized
                className="w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-102"
              />
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
