'use client';

import { useState, useEffect, useCallback } from 'react';
import { api, resolveImageUrl } from './api';

export type MarqueeIconType = 'truck' | 'shield' | 'clock' | 'sparkles' | 'tag' | 'award';

export interface SiteMarqueeItem {
  id: string;
  text: string;
  icon: MarqueeIconType;
  isActive: boolean;
}

export interface SiteHeroImage {
  id: string;
  imageUrl: string;
  mobileImageUrl?: string;
  mobileAltText?: string;
  altText?: string;
  badgeText?: string;
  badgeBgColor?: string;
  badgeTextColor?: string;
  linkHref?: string;
  isActive: boolean;
  // Per-slide H1 title, description, buttons, colors & font
  title?: string;
  titleHighlight?: string;
  titleColor?: string;
  titleFontFamily?: string;
  description?: string;
  descriptionColor?: string;
  primaryBtnText?: string;
  primaryBtnHref?: string;
  primaryBtnBgColor?: string;
  primaryBtnTextColor?: string;
  secondaryBtnText?: string;
  secondaryBtnHref?: string;
  secondaryBtnBgColor?: string;
  secondaryBtnTextColor?: string;
  textPosition?: 'left' | 'center' | 'right';
}

export interface SiteSettings {
  heroImageUrl: string;
  heroMobileImageUrl?: string;
  heroAltText: string;
  heroBadgeText: string;
  heroTitle: string;
  heroHighlightText: string;
  heroTitleSuffix: string;
  heroDescription: string;
  heroPrimaryBtnText: string;
  heroPrimaryBtnHref: string;
  heroSecondaryBtnText: string;
  heroSecondaryBtnHref: string;
  heroBannerLinkHref: string;
  heroTitleColor?: string;
  heroTitleFontFamily?: string;
  heroDescriptionColor?: string;
  heroPrimaryBtnBgColor?: string;
  heroPrimaryBtnTextColor?: string;
  heroSecondaryBtnBgColor?: string;
  heroSecondaryBtnTextColor?: string;
  heroTextPosition?: 'left' | 'center' | 'right';
  showHeroTextOverlay: boolean;
  hideHeroTextOnMobile?: boolean;
  mobileBannerMode?: 'single' | 'separate';
  showHeroBadge: boolean;
  showHeroHeading: boolean;
  showHeroDescription: boolean;
  showHeroPrimaryBtn: boolean;
  showHeroSecondaryBtn: boolean;
  showHeroTrustPillars: boolean;
  heroAutoSlide: boolean;
  heroSlideIntervalSeconds: number;
  heroStartingPrice: string;
  heroStartingSubtitle: string;
  heroSlaTitle: string;
  heroSlaSubtitle: string;
  heroImages: SiteHeroImage[];
  marqueeItems: SiteMarqueeItem[];
  updatedAt?: string;
}

export const HERO_FONT_OPTIONS = [
  { value: 'inherit', label: 'Default Font (Inter / Sans-Serif)' },
  { value: "'Poppins', sans-serif", label: 'Poppins (Geometric Punchy)' },
  { value: "'Montserrat', sans-serif", label: 'Montserrat (Corporate Sharp)' },
  { value: "'Playfair Display', serif", label: 'Playfair Display (Luxury Editorial)' },
  { value: "'Merriweather', serif", label: 'Merriweather (Classic Book Serif)' },
  { value: "'Oswald', sans-serif", label: 'Oswald (Industrial High-Impact)' },
  { value: 'ui-monospace, monospace', label: 'Monospace (Technical / Calibrated)' },
];

export const COLOR_SWATCH_PRESETS = [
  { label: 'White', color: '#FFFFFF' },
  { label: 'PrintBazar Yellow', color: '#FFED00' },
  { label: 'Light Slate', color: '#E2E8F0' },
  { label: 'Jet Black', color: '#000000' },
  { label: 'Flame Orange', color: '#F97316' },
  { label: 'Sky Blue', color: '#38BDF8' },
  { label: 'Emerald Green', color: '#10B981' },
  { label: 'Coral Rose', color: '#F43F5E' },
];

export const SITE_SETTINGS_STORAGE_KEY = 'pb2_site_settings';

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  heroImageUrl: '/images/home/hero-products.jpg',
  heroMobileImageUrl: '',
  heroAltText: 'Print Bazzar Commercial Products',
  heroBadgeText: 'COMMERCIAL PRINTING & PACKAGING OS',
  heroTitle: 'Commercial Print Excellence,',
  heroHighlightText: 'Engineered',
  heroTitleSuffix: 'for Scale.',
  heroDescription:
    'Direct-to-press precision for visiting cards, luxury rigid boxes, roll-up displays, and marketing collateral. Dynamic live quoting, automated pre-flight checks, and ISO 12647 color calibration.',
  heroPrimaryBtnText: 'START CUSTOM CONFIGURATION',
  heroPrimaryBtnHref: '/products/premium-visiting-cards',
  heroSecondaryBtnText: 'EXPLORE 2026 CATALOGUE',
  heroSecondaryBtnHref: '/products',
  heroBannerLinkHref: '/products',
  showHeroTextOverlay: true,
  showHeroBadge: true,
  showHeroHeading: true,
  showHeroDescription: true,
  showHeroPrimaryBtn: true,
  showHeroSecondaryBtn: true,
  showHeroTrustPillars: true,
  heroAutoSlide: true,
  heroSlideIntervalSeconds: 5,
  heroStartingPrice: '₹199',
  heroStartingSubtitle: 'Visiting Cards (100 units)',
  heroSlaTitle: '24-48h',
  heroSlaSubtitle: 'Express Shop Floor Run',
  heroImages: [
    {
      id: 'hero-default-1',
      imageUrl: '/images/home/hero-products.jpg',
      altText: 'Print Bazzar Commercial Products',
      badgeText: 'CALIBRATED TO ISO 12647',
      isActive: true,
    },
  ],
  marqueeItems: [
    {
      id: 'shipping',
      text: 'Free Shipping on Orders Over ₹999',
      icon: 'truck',
      isActive: true,
    },
    {
      id: 'guarantee',
      text: 'High Quality Print Guarantee',
      icon: 'shield',
      isActive: true,
    },
    {
      id: 'turnaround',
      text: 'Fast Turnaround (3-5 Business Days)',
      icon: 'clock',
      isActive: true,
    },
  ],
};

export function resolveSiteAssetUrl(url?: string | null): string {
  if (!url || !url.trim()) {
    return '/images/home/hero-products.jpg';
  }
  const trimmed = url.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('/images/')
  ) {
    return trimmed;
  }
  return resolveImageUrl(trimmed);
}

export function getCachedSiteSettings(): SiteSettings {
  if (typeof window === 'undefined') {
    return DEFAULT_SITE_SETTINGS;
  }
  try {
    const raw = localStorage.getItem(SITE_SETTINGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_SITE_SETTINGS,
        ...parsed,
        heroImages:
          Array.isArray(parsed.heroImages) && parsed.heroImages.length > 0
            ? parsed.heroImages
            : DEFAULT_SITE_SETTINGS.heroImages,
        marqueeItems: Array.isArray(parsed.marqueeItems)
          ? parsed.marqueeItems
          : DEFAULT_SITE_SETTINGS.marqueeItems,
      };
    }
  } catch {
    // ignore storage read error
  }
  return DEFAULT_SITE_SETTINGS;
}

export async function saveSiteSettings(
  nextSettings: SiteSettings
): Promise<SiteSettings> {
  const payload: SiteSettings = {
    ...DEFAULT_SITE_SETTINGS,
    ...nextSettings,
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(payload));
    window.dispatchEvent(new Event('site-settings-updated'));
  }

  try {
    const savedFromApi = await api.adminUpdateSiteSettings(payload);
    if (savedFromApi && typeof window !== 'undefined') {
      localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(savedFromApi));
      window.dispatchEvent(new Event('site-settings-updated'));
      return savedFromApi;
    }
  } catch (err) {
    console.warn('Saved site settings locally; backend sync warning:', err);
  }

  return payload;
}

export function useSiteSettings() {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULT_SITE_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);

  const syncFromStorage = useCallback(() => {
    setSettings(getCachedSiteSettings());
  }, []);

  useEffect(() => {
    // 1. Immediate load from localStorage
    const local = getCachedSiteSettings();
    setSettings(local);
    setIsLoaded(true);

    // 2. Background sync from backend API
    api
      .getSiteSettings()
      .then((remote) => {
        if (remote && typeof remote === 'object') {
          const localCurrent = getCachedSiteSettings();
          // Only overwrite local if remote is newer or local was never saved
          const remoteTime = remote.updatedAt ? new Date(remote.updatedAt).getTime() : 0;
          const localTime = localCurrent.updatedAt ? new Date(localCurrent.updatedAt).getTime() : 0;
          if (remoteTime >= localTime) {
            const merged: SiteSettings = {
              ...DEFAULT_SITE_SETTINGS,
              ...remote,
              heroImages:
                Array.isArray(remote.heroImages) && remote.heroImages.length > 0
                  ? remote.heroImages
                  : DEFAULT_SITE_SETTINGS.heroImages,
              marqueeItems: Array.isArray(remote.marqueeItems)
                ? remote.marqueeItems
                : DEFAULT_SITE_SETTINGS.marqueeItems,
            };
            localStorage.setItem(SITE_SETTINGS_STORAGE_KEY, JSON.stringify(merged));
            setSettings(merged);
          }
        }
      })
      .catch(() => {
        // Keep local/default settings if backend endpoint is offline
      });

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener('site-settings-updated', syncFromStorage);
    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener('site-settings-updated', syncFromStorage);
    };
  }, [syncFromStorage]);

  return { settings, setSettings, isLoaded };
}

