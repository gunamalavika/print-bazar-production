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
    <section className="bg-[#FAFAFA] border-b border-neutral-200/70 py-9 sm:py-11 lg:py-14 w-full max-w-full overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 lg:gap-0 lg:divide-x lg:divide-neutral-200/80">
          {FEATURES.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center gap-3.5 sm:gap-4 ${
                idx === 0
                  ? 'lg:pr-6'
                  : idx === FEATURES.length - 1
                  ? 'lg:pl-6'
                  : 'lg:px-6'
              }`}
            >
              {/* Circular Icon Container */}
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-[#F5F5F7] flex items-center justify-center shrink-0 transition-transform duration-200 hover:scale-105 shadow-2xs">
                <img
                  src={item.iconSrc}
                  alt={item.title}
                  className="w-5 h-5 object-contain"
                  width={20}
                  height={20}
                  loading="eager"
                />
              </div>

              {/* Text: Title + Subtitle */}
              <div className="min-w-0 flex-1">
                <h4 className="text-[13.5px] sm:text-sm font-bold text-neutral-900 tracking-tight leading-snug font-sans">
                  {item.title}
                </h4>
                <p className="text-[11.5px] sm:text-xs text-neutral-500 font-normal leading-snug mt-0.5 font-sans truncate sm:whitespace-normal">
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
