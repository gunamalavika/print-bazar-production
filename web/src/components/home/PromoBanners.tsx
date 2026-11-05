'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight } from 'lucide-react';

export function PromoBanners() {
  return (
    <section className="bg-white py-8 sm:py-10 border-b border-neutral-200/70 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {/* Banner 1: Custom Printing (Dark Background) */}
          <Link
            href="/products"
            className="group relative rounded-2xl sm:rounded-[22px] bg-[#121212] overflow-hidden p-6 sm:p-7 flex flex-col justify-between min-h-[230px] sm:min-h-[250px] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            {/* Left Content */}
            <div className="relative z-10 max-w-[58%] sm:max-w-[56%] flex flex-col justify-between h-full">
              <div>
                <span className="text-[10px] sm:text-xs font-bold tracking-wider text-neutral-400 uppercase font-sans">
                  Custom Printing
                </span>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-white leading-tight font-sans mt-1">
                  Bring Your Design{' '}
                  <span className="text-[#FFED00]">to Life</span>
                </h3>
                <p className="text-xs sm:text-[13px] text-neutral-400 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed font-sans">
                  From cards to banners, we print it all with premium quality.
                </p>
              </div>

              <div className="mt-4 sm:mt-5">
                <span className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#FFED00] group-hover:bg-[#FACC15] text-black font-bold text-xs sm:text-[13px] transition-all shadow-2xs group-hover:translate-x-0.5">
                  <span>Explore Now</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>
            </div>

            {/* Right Mockup Graphic */}
            <div className="absolute right-0 bottom-0 top-1 w-[40%] sm:w-[42%] pointer-events-none flex items-end justify-end overflow-hidden">
              <Image
                src="/images/banners/pure-custom.png"
                alt="Custom Printing Mockup"
                width={360}
                height={320}
                className="w-full h-auto max-h-[95%] object-contain object-right-bottom transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </Link>

          {/* Banner 2: Business Printing (Light Background) */}
          <Link
            href="/products?category=flyers"
            className="group relative rounded-2xl sm:rounded-[22px] bg-[#F6F7F9] border border-neutral-200/80 overflow-hidden p-6 sm:p-7 flex flex-col justify-between min-h-[230px] sm:min-h-[250px] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            {/* Left Content */}
            <div className="relative z-10 max-w-[58%] sm:max-w-[56%] flex flex-col justify-between h-full">
              <div>
                <span className="text-[10px] sm:text-xs font-bold tracking-wider text-neutral-500 uppercase font-sans">
                  Business Printing
                </span>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-neutral-900 leading-tight font-sans mt-1">
                  Everything Your Business Needs to Print
                </h3>
                <p className="text-xs sm:text-[13px] text-neutral-500 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed font-sans">
                  Cards, flyers, brochures, labels and more.
                </p>
              </div>

              <div className="mt-4 sm:mt-5">
                <span className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#FFED00] group-hover:bg-[#FACC15] text-black font-bold text-xs sm:text-[13px] transition-all shadow-2xs group-hover:translate-x-0.5">
                  <span>Shop Business</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>
            </div>

            {/* Right Mockup Graphic */}
            <div className="absolute right-0 bottom-0 top-1 w-[40%] sm:w-[42%] pointer-events-none flex items-end justify-end overflow-hidden">
              <Image
                src="/images/banners/pure-business.png"
                alt="Business Printing Mockup"
                width={360}
                height={320}
                className="w-full h-auto max-h-[95%] object-contain object-right-bottom transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </Link>

          {/* Banner 3: Personalized Products (Light Background) */}
          <Link
            href="/products?category=corporate-gifts"
            className="group relative rounded-2xl sm:rounded-[22px] bg-[#F6F7F9] border border-neutral-200/80 overflow-hidden p-6 sm:p-7 flex flex-col justify-between min-h-[230px] sm:min-h-[250px] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
          >
            {/* Left Content */}
            <div className="relative z-10 max-w-[58%] sm:max-w-[56%] flex flex-col justify-between h-full">
              <div>
                <span className="text-[10px] sm:text-xs font-bold tracking-wider text-neutral-500 uppercase font-sans">
                  Personalized Products
                </span>
                <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-neutral-900 leading-tight font-sans mt-1">
                  Make It Personal
                </h3>
                <p className="text-xs sm:text-[13px] text-neutral-500 mt-1.5 sm:mt-2 line-clamp-2 leading-relaxed font-sans">
                  Custom gifts, photo products and more for your special moments.
                </p>
              </div>

              <div className="mt-4 sm:mt-5">
                <span className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full bg-[#FFED00] group-hover:bg-[#FACC15] text-black font-bold text-xs sm:text-[13px] transition-all shadow-2xs group-hover:translate-x-0.5">
                  <span>Explore Gift</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                </span>
              </div>
            </div>

            {/* Right Mockup Graphic */}
            <div className="absolute right-0 bottom-0 top-1 w-[40%] sm:w-[42%] pointer-events-none flex items-end justify-end overflow-hidden">
              <Image
                src="/images/banners/pure-gifts.png"
                alt="Personalized Products Mockup"
                width={360}
                height={320}
                className="w-full h-auto max-h-[95%] object-contain object-right-bottom transition-transform duration-300 group-hover:scale-105"
              />
            </div>
          </Link>
        </div>
      </div>
    </section>
  );
}

