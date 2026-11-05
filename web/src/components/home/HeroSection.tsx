'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight, ShieldCheck, Truck, Award, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { useSiteSettings, resolveSiteAssetUrl } from '@/lib/site-settings';

export function HeroSection() {
  const { settings } = useSiteSettings();
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  const activeHeroSlides = useMemo(() => {
    const activeFromList = (settings.heroImages || []).filter(
      (img) => img.isActive && img.imageUrl?.trim()
    );
    if (activeFromList.length > 0) {
      return activeFromList;
    }
    return [
      {
        id: 'primary-fallback',
        imageUrl: settings.heroImageUrl || '/images/home/hero-products.jpg',
        altText: settings.heroAltText || 'Print Bazzar Commercial Products',
        badgeText: settings.heroBadgeText || 'CALIBRATED TO ISO 12647',
        isActive: true,
      },
    ];
  }, [settings]);

  useEffect(() => {
    if (activeSlideIdx >= activeHeroSlides.length) {
      setActiveSlideIdx(0);
    }
  }, [activeHeroSlides.length, activeSlideIdx]);

  const intervalSeconds = Math.max(
    1,
    Math.min(60, Number(settings.heroSlideIntervalSeconds) || 5)
  );
  const autoSlideEnabled = settings.heroAutoSlide !== false;

  // Auto-advance hero slides if multiple active images are configured and auto-slide is enabled
  useEffect(() => {
    if (activeHeroSlides.length <= 1 || !autoSlideEnabled) return;
    const timer = setInterval(() => {
      setActiveSlideIdx((prev) => (prev + 1) % activeHeroSlides.length);
    }, intervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [activeHeroSlides.length, autoSlideEnabled, intervalSeconds]);

  const currentSlide = activeHeroSlides[activeSlideIdx] || activeHeroSlides[0];

  const hasAnyOverlayElement =
    settings.showHeroBadge !== false ||
    settings.showHeroHeading !== false ||
    settings.showHeroDescription !== false ||
    settings.showHeroPrimaryBtn !== false ||
    settings.showHeroSecondaryBtn !== false ||
    settings.showHeroTrustPillars !== false;

  const showOverlay = settings.showHeroTextOverlay !== false && hasAnyOverlayElement;

  return (
    <section className="relative w-full max-w-full border-b border-neutral-200/70 overflow-hidden bg-neutral-900 group">
      <style jsx>{`
        @keyframes heroDotProgress {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }
      `}</style>

      {/* Full-Width & Full-Height Hero Banner Sliding Track Layer */}
      <div className="relative w-full min-h-[72vh] sm:min-h-[82vh] lg:min-h-[calc(100vh-108px)] lg:h-[calc(100vh-108px)] flex items-center overflow-hidden">
        <div
          className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
          style={{
            transform: `translateX(-${activeSlideIdx * 100}%)`,
          }}
        >
          {activeHeroSlides.map((slide, idx) => (
            <div key={slide.id || idx} className="relative w-full h-full shrink-0">
              <img
                src={resolveSiteAssetUrl(slide.imageUrl || settings.heroImageUrl)}
                alt={
                  slide.altText ||
                  settings.heroAltText ||
                  'Print Bazzar Commercial Products'
                }
                className="w-full h-full object-cover object-center"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&auto=format&fit=crop&q=80';
                }}
              />
            </div>
          ))}
        </div>

        {/* Gradient Scrim when Text Overlay is enabled */}
        {showOverlay && (
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/25 sm:from-black/80 sm:via-black/55 sm:to-transparent z-10" />
        )}

        {/* Foreground Content (When Overlay is enabled) */}
        {showOverlay ? (
          <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20 relative z-20">
            <div className="max-w-2xl space-y-5">
              {/* Eyebrow Badge */}
              {settings.showHeroBadge !== false && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#FFED00] border border-black/20 shadow-xs">
                  <span className="h-2 w-2 rounded-full bg-black" />
                  <span className="text-[11px] font-mono font-bold text-black uppercase tracking-wider">
                    {currentSlide?.badgeText || settings.heroBadgeText || 'COMMERCIAL PRINTING & PACKAGING OS'}
                  </span>
                </div>
              )}

              {/* Main Display Headline */}
              {settings.showHeroHeading !== false && (
                <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-bold text-white tracking-tight leading-[1.12] font-sans drop-shadow-xs">
                  {settings.heroTitle ?? 'Commercial Print Excellence,'}{' '}
                  {settings.heroHighlightText && (
                    <span className="text-[#FFED00] underline decoration-[#FFED00]/80 decoration-4 underline-offset-4">
                      {settings.heroHighlightText}
                    </span>
                  )}{' '}
                  {settings.heroTitleSuffix ?? 'for Scale.'}
                </h1>
              )}

              {/* Value Proposition */}
              {settings.showHeroDescription !== false && settings.heroDescription && (
                <p className="text-[15px] sm:text-[16px] text-neutral-200 max-w-xl leading-relaxed font-sans">
                  {settings.heroDescription}
                </p>
              )}

              {/* CTAs */}
              {(settings.showHeroPrimaryBtn !== false || settings.showHeroSecondaryBtn !== false) && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  {settings.showHeroPrimaryBtn !== false && (
                    <Link
                      href={settings.heroPrimaryBtnHref || '/products/premium-visiting-cards'}
                      className="w-full sm:w-auto"
                    >
                      <Button variant="primary" size="lg" className="w-full justify-center shadow-md min-h-[44px]">
                        <span>{settings.heroPrimaryBtnText || 'START CUSTOM CONFIGURATION'}</span>
                        <ArrowRight className="h-4 w-4 ml-1" />
                      </Button>
                    </Link>
                  )}

                  {settings.showHeroSecondaryBtn !== false && (
                    <Link
                      href={settings.heroSecondaryBtnHref || '/products'}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        variant="secondary"
                        size="lg"
                        className="w-full justify-center min-h-[44px] bg-white/95 hover:bg-white text-black border-white"
                      >
                        <span>{settings.heroSecondaryBtnText || 'EXPLORE 2026 CATALOGUE'}</span>
                      </Button>
                    </Link>
                  )}
                </div>
              )}

              {/* Trust Proof Pillars */}
              {settings.showHeroTrustPillars !== false && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-5 border-t border-white/20">
                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-[6px] bg-[#FFED00] text-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      <ShieldCheck className="h-4 w-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-[13px] font-semibold text-white block leading-tight">
                        2400 DPI Precision
                      </span>
                      <span className="text-[12px] text-neutral-300 block leading-tight mt-0.5">
                        Heidelberg & HP Indigo
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-[6px] bg-[#FFED00] text-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      <Truck className="h-4 w-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-[13px] font-semibold text-white block leading-tight">
                        Pan-India Dispatch
                      </span>
                      <span className="text-[12px] text-neutral-300 block leading-tight mt-0.5">
                        Express Carrier SLAs
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <div className="h-8 w-8 rounded-[6px] bg-[#FFED00] text-black flex items-center justify-center flex-shrink-0 mt-0.5 shadow-2xs">
                      <Award className="h-4 w-4 stroke-[2.2]" />
                    </div>
                    <div>
                      <span className="text-[13px] font-semibold text-white block leading-tight">
                        Zero Price Drift
                      </span>
                      <span className="text-[12px] text-neutral-300 block leading-tight mt-0.5">
                        Server-Verified Quotes
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Clean Full-Width Clickable Banner Link when text overlay is disabled */
          <Link
            href={currentSlide?.linkHref || settings.heroBannerLinkHref || '/products'}
            aria-label={currentSlide?.altText || 'Explore Print Bazzar Catalogue'}
            className="absolute inset-0 z-10 block"
          />
        )}

        {/* Left / Right Slide Arrows when multiple active Hero Banners exist */}
        {activeHeroSlides.length > 1 && (
          <>
            <button
              type="button"
              onClick={() =>
                setActiveSlideIdx((prev) =>
                  prev === 0 ? activeHeroSlides.length - 1 : prev - 1
                )
              }
              aria-label="Previous hero banner"
              className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/45 hover:bg-[#FFED00] text-white hover:text-black backdrop-blur-md border border-white/20 hover:border-black/20 shadow-lg flex items-center justify-center opacity-85 hover:opacity-100 transition-all duration-200 cursor-pointer"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() =>
                setActiveSlideIdx((prev) => (prev + 1) % activeHeroSlides.length)
              }
              aria-label="Next hero banner"
              className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 h-10 w-10 sm:h-11 sm:w-11 rounded-full bg-black/45 hover:bg-[#FFED00] text-white hover:text-black backdrop-blur-md border border-white/20 hover:border-black/20 shadow-lg flex items-center justify-center opacity-85 hover:opacity-100 transition-all duration-200 cursor-pointer"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </>
        )}

        {/* Modern Dot-Expand Pagination Dock */}
        <div className="absolute bottom-5 sm:bottom-7 inset-x-0 z-30 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-white/15 shadow-lg">
            {activeHeroSlides.map((slide, idx) => {
              const isCurrent = idx === activeSlideIdx;
              return (
                <button
                  key={slide.id || idx}
                  type="button"
                  onClick={() => setActiveSlideIdx(idx)}
                  aria-label={`Go to hero slide ${idx + 1}`}
                  className={`relative h-2.5 rounded-full overflow-hidden transition-all duration-500 ease-out cursor-pointer ${
                    isCurrent
                      ? 'w-10 sm:w-12 bg-white/30 shadow-2xs'
                      : 'w-2.5 bg-white/45 hover:bg-white/80 hover:scale-110'
                  }`}
                >
                  {isCurrent && (
                    <span
                      key={`${activeSlideIdx}-${intervalSeconds}-${autoSlideEnabled}`}
                      className="absolute inset-y-0 left-0 rounded-full bg-[#FFED00]"
                      style={
                        activeHeroSlides.length > 1 && autoSlideEnabled
                          ? {
                              animation: `heroDotProgress ${intervalSeconds}s linear forwards`,
                            }
                          : { width: '100%' }
                      }
                    />
                  )}
                </button>
              );
            })}
            {activeHeroSlides.length > 1 && (
              <span className="ml-1 pl-2 border-l border-white/20 text-[10px] font-mono font-bold text-white/90 tracking-wider">
                {String(activeSlideIdx + 1).padStart(2, '0')}/
                {String(activeHeroSlides.length).padStart(2, '0')}
              </span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

