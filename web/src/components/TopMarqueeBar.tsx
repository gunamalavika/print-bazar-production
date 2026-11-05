'use client';

import React, { useMemo } from 'react';
import { Sparkles, Tag, Award } from 'lucide-react';
import { useSiteSettings, MarqueeIconType, DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

export function renderMarqueeIcon(iconType: MarqueeIconType) {
  switch (iconType) {
    case 'truck':
      return (
        <svg
          className="w-4 h-4 text-[#FFED00] shrink-0"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M2 4.5A1.5 1.5 0 0 1 3.5 3H15a1 1 0 0 1 1 1v2.5h3.382a2 2 0 0 1 1.664.89l2.42 3.63A2 2 0 0 1 24 12.133V16.5a1.5 1.5 0 0 1-1.5 1.5H21a3 3 0 0 1-6 0h-5a3 3 0 0 1-6 0H3.5A1.5 1.5 0 0 1 2 16.5v-12Zm16 4V11h4.085l-1.667-2.5H18ZM7 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm11 0a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
        </svg>
      );
    case 'shield':
      return (
        <svg
          className="w-4 h-4 shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M12 2L3.5 5.8v6.2c0 5.4 3.6 10.4 8.5 11.6 4.9-1.2 8.5-6.2 8.5-11.6V5.8L12 2z"
            fill="#FFED00"
          />
          <path
            d="m9 11.8 2.2 2.2 4.3-4.3"
            stroke="#000000"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'clock':
      return (
        <svg
          className="w-4 h-4 text-[#FFED00] shrink-0"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" stroke="#FFED00" strokeWidth="2.2" />
          <path
            d="M12 7v5l3 2"
            stroke="#FFED00"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'sparkles':
      return <Sparkles className="w-4 h-4 text-[#FFED00] shrink-0" />;
    case 'tag':
      return <Tag className="w-4 h-4 text-[#FFED00] shrink-0" />;
    case 'award':
      return <Award className="w-4 h-4 text-[#FFED00] shrink-0" />;
    default:
      return <Sparkles className="w-4 h-4 text-[#FFED00] shrink-0" />;
  }
}

export function TopMarqueeBar() {
  const { settings } = useSiteSettings();

  const activeItems = useMemo(() => {
    const list = Array.isArray(settings.marqueeItems)
      ? settings.marqueeItems.filter((item) => item.isActive && item.text?.trim())
      : DEFAULT_SITE_SETTINGS.marqueeItems;
    return list;
  }, [settings.marqueeItems]);

  if (activeItems.length === 0) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Promotional announcements"
      className="w-full bg-[#111111] text-white border-b border-neutral-800/80 overflow-hidden select-none py-1.5 sm:py-2 relative z-50 group"
    >
      <div className="flex w-full overflow-hidden">
        {/* Infinite CSS Marquee Track with Dual Buffers for Seamless Loop */}
        <div className="animate-pb-marquee flex items-center shrink-0">
          {[...Array(4)].map((_, loopIdx) => (
            <div key={loopIdx} className="flex items-center shrink-0">
              {activeItems.map((item) => (
                <div
                  key={`${loopIdx}-${item.id}`}
                  className="flex items-center gap-2 px-5 sm:px-8 md:px-12 shrink-0"
                >
                  {renderMarqueeIcon(item.icon)}
                  <span className="text-[11px] sm:text-xs md:text-[12.5px] font-medium text-neutral-100 tracking-tight whitespace-nowrap font-sans">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Second mirror track to guarantee seamless infinite wrapping without gaps */}
        <div
          aria-hidden="true"
          className="animate-pb-marquee flex items-center shrink-0"
        >
          {[...Array(4)].map((_, loopIdx) => (
            <div key={`mirror-${loopIdx}`} className="flex items-center shrink-0">
              {activeItems.map((item) => (
                <div
                  key={`mirror-${loopIdx}-${item.id}`}
                  className="flex items-center gap-2 px-5 sm:px-8 md:px-12 shrink-0"
                >
                  {renderMarqueeIcon(item.icon)}
                  <span className="text-[11px] sm:text-xs md:text-[12.5px] font-medium text-neutral-100 tracking-tight whitespace-nowrap font-sans">
                    {item.text}
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

