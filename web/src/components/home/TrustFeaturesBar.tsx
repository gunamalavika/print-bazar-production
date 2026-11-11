'use client';

import React from 'react';

const FEATURES = [
  {
    id: 'customizable',
    title: '100% Customizable',
    subtitle: 'Upload your design or create online',
    iconSrc: '/images/trust/customizable.svg',
  },
  {
    id: 'quality',
    title: 'Premium Quality',
    subtitle: 'Vibrant colors & long lasting prints',
    iconSrc: '/images/trust/quality.svg',
  },
  {
    id: 'pricing',
    title: 'Affordable Prices',
    subtitle: 'Great value for money',
    iconSrc: '/images/trust/pricing.svg',
  },
  {
    id: 'secure',
    title: 'Secure Checkout',
    subtitle: 'Multiple payment options',
    iconSrc: '/images/trust/secure.svg',
  },
];

export function TrustFeaturesBar() {
  return (
    <section className="bg-white border-b border-neutral-200/70 py-4 sm:py-7 lg:py-9 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-3 sm:px-6 lg:px-8">
        {/* 2 columns on mobile (2x2 grid), 4 columns on desktop with dividers */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 lg:gap-0 lg:divide-x lg:divide-neutral-200/80">
          {FEATURES.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 sm:gap-3.5 lg:gap-4 ${
                idx === 0
                  ? 'lg:pr-6'
                  : idx === FEATURES.length - 1
                  ? 'lg:pl-6'
                  : 'lg:px-6'
              }`}
            >
              {/* Circular Icon Container */}
              <div className="w-9 h-9 sm:w-11 sm:h-11 lg:w-12 lg:h-12 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 shadow-2xs">
                <img
                  src={item.iconSrc}
                  alt={item.title}
                  className="w-4 h-4 sm:w-5 sm:h-5 object-contain"
                  width={20}
                  height={20}
                  loading="eager"
                />
              </div>

              {/* Text: Title + Subtitle */}
              <div className="min-w-0 flex-1">
                <h4 className="text-[12px] sm:text-[13.5px] lg:text-sm font-bold text-neutral-900 tracking-tight leading-tight font-sans">
                  {item.title}
                </h4>
                <p className="text-[10px] sm:text-[11.5px] lg:text-xs text-neutral-500 font-normal leading-tight mt-0.5 font-sans truncate sm:whitespace-normal">
                  {item.subtitle}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
