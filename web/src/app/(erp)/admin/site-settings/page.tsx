'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Save,
  CheckCircle2,
  Upload,
  Plus,
  Trash2,
  Eye,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  ExternalLink,
  Image as ImageIcon,
  Sparkles,
  Megaphone,
  Check,
  Clock,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { api } from '@/lib/api';
import {
  useSiteSettings,
  saveSiteSettings,
  resolveSiteAssetUrl,
  DEFAULT_SITE_SETTINGS,
  SiteHeroImage,
  SiteMarqueeItem,
  MarqueeIconType,
} from '@/lib/site-settings';
import { renderMarqueeIcon } from '@/components/TopMarqueeBar';

const ICON_OPTIONS: Array<{ value: MarqueeIconType; label: string }> = [
  { value: 'truck', label: 'Shipping Truck' },
  { value: 'shield', label: 'Quality Shield' },
  { value: 'clock', label: 'Turnaround Clock' },
  { value: 'sparkles', label: 'Sparkles / Promo' },
  { value: 'tag', label: 'Discount Tag' },
  { value: 'award', label: 'Quality Award' },
];

export default function AdminSiteSettingsPage() {
  const { settings, setSettings } = useSiteSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // New Hero Image URL form state
  const [newHeroUrl, setNewHeroUrl] = useState('');
  const [newHeroAlt, setNewHeroAlt] = useState('Print Bazzar Commercial Products');
  const [newHeroBadge, setNewHeroBadge] = useState('CALIBRATED TO ISO 12647');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // New Marquee Point form state
  const [newMarqueeText, setNewMarqueeText] = useState('');
  const [newMarqueeIcon, setNewMarqueeIcon] = useState<MarqueeIconType>('sparkles');

  const showToast = (msg: string) => {
    setSaveSuccess(msg);
    setTimeout(() => setSaveSuccess(null), 4000);
  };

  // Persist helper
  const handlePersist = async (nextSettings = settings, message = 'Site settings saved and replicated to the Home Page & Header!') => {
    setIsSaving(true);
    try {
      const saved = await saveSiteSettings(nextSettings);
      setSettings(saved);
      showToast(message);
    } finally {
      setIsSaving(false);
    }
  };

  // Upload Hero Image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      let uploadedUrl = '';
      try {
        const res = await api.uploadMedia(file);
        uploadedUrl = res.url;
      } catch {
        // Fallback to Data URL if backend media endpoint is unreachable
        uploadedUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const newSlide: SiteHeroImage = {
        id: `hero-${Date.now()}`,
        imageUrl: uploadedUrl,
        altText: newHeroAlt.trim() || file.name,
        badgeText: newHeroBadge.trim() || 'CALIBRATED TO ISO 12647',
        isActive: true,
      };

      const nextHeroImages = [newSlide, ...(settings.heroImages || [])];
      const next = {
        ...settings,
        heroImageUrl: uploadedUrl,
        heroAltText: newSlide.altText || settings.heroAltText,
        heroBadgeText: newSlide.badgeText || settings.heroBadgeText,
        heroImages: nextHeroImages,
      };
      setSettings(next);
      await handlePersist(next, 'New Hero Image uploaded and published to the Home Page!');
    } catch (err: any) {
      alert(err?.message || 'Failed to upload hero image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Add Hero Image by URL
  const handleAddHeroByUrl = async () => {
    const trimmed = newHeroUrl.trim();
    if (!trimmed) return;

    const newSlide: SiteHeroImage = {
      id: `hero-${Date.now()}`,
      imageUrl: trimmed,
      altText: newHeroAlt.trim() || 'Print Bazzar Commercial Products',
      badgeText: newHeroBadge.trim() || 'CALIBRATED TO ISO 12647',
      isActive: true,
    };

    const nextHeroImages = [newSlide, ...(settings.heroImages || [])];
    const next = {
      ...settings,
      heroImageUrl: trimmed,
      heroAltText: newSlide.altText || settings.heroAltText,
      heroBadgeText: newSlide.badgeText || settings.heroBadgeText,
      heroImages: nextHeroImages,
    };

    setNewHeroUrl('');
    setSettings(next);
    await handlePersist(next, 'Hero image added and published to the Home Page!');
  };

  // Set Primary Hero Image
  const handleSetPrimaryHero = async (slide: SiteHeroImage) => {
    const nextHeroImages = [
      { ...slide, isActive: true },
      ...(settings.heroImages || []).filter((item) => item.id !== slide.id),
    ];
    const next = {
      ...settings,
      heroImageUrl: slide.imageUrl,
      heroAltText: slide.altText || settings.heroAltText,
      heroBadgeText: slide.badgeText || settings.heroBadgeText,
      heroImages: nextHeroImages,
    };
    setSettings(next);
    await handlePersist(next, 'Primary Home Page Hero Image updated!');
  };

  // Toggle Hero Slide Active
  const handleToggleHeroActive = (id: string) => {
    const nextHeroImages = (settings.heroImages || []).map((img) =>
      img.id === id ? { ...img, isActive: !img.isActive } : img
    );
    const firstActive = nextHeroImages.find((img) => img.isActive) || nextHeroImages[0];
    setSettings({
      ...settings,
      heroImageUrl: firstActive ? firstActive.imageUrl : settings.heroImageUrl,
      heroImages: nextHeroImages,
    });
  };

  // Update Hero Slide fields
  const handleUpdateHeroSlide = (id: string, patch: Partial<SiteHeroImage>) => {
    const nextHeroImages = (settings.heroImages || []).map((img) =>
      img.id === id ? { ...img, ...patch } : img
    );
    const firstActive = nextHeroImages.find((img) => img.isActive) || nextHeroImages[0];
    setSettings({
      ...settings,
      heroImageUrl: firstActive ? firstActive.imageUrl : settings.heroImageUrl,
      heroBadgeText: firstActive?.badgeText || settings.heroBadgeText,
      heroImages: nextHeroImages,
    });
  };

  // Delete Hero Slide
  const handleDeleteHeroSlide = (id: string) => {
    const remaining = (settings.heroImages || []).filter((img) => img.id !== id);
    const fallbackList = remaining.length > 0 ? remaining : DEFAULT_SITE_SETTINGS.heroImages;
    const firstActive = fallbackList.find((img) => img.isActive) || fallbackList[0];
    setSettings({
      ...settings,
      heroImageUrl: firstActive.imageUrl,
      heroBadgeText: firstActive.badgeText || settings.heroBadgeText,
      heroImages: fallbackList,
    });
  };

  // Reorder Hero Slide
  const handleMoveHeroSlide = (index: number, direction: 'up' | 'down') => {
    const list = [...(settings.heroImages || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    const firstActive = list.find((img) => img.isActive) || list[0];
    setSettings({
      ...settings,
      heroImageUrl: firstActive ? firstActive.imageUrl : settings.heroImageUrl,
      heroBadgeText: firstActive?.badgeText || settings.heroBadgeText,
      heroImages: list,
    });
  };

  // Marquee Point Handlers
  const handleAddMarqueeItem = async () => {
    const trimmed = newMarqueeText.trim();
    if (!trimmed) return;

    const newItem: SiteMarqueeItem = {
      id: `mq-${Date.now()}`,
      text: trimmed,
      icon: newMarqueeIcon,
      isActive: true,
    };

    const next = {
      ...settings,
      marqueeItems: [...(settings.marqueeItems || []), newItem],
    };
    setNewMarqueeText('');
    setSettings(next);
    await handlePersist(next, 'Header marquee point added and published!');
  };

  const handleUpdateMarqueeItem = (id: string, patch: Partial<SiteMarqueeItem>) => {
    setSettings({
      ...settings,
      marqueeItems: (settings.marqueeItems || []).map((item) =>
        item.id === id ? { ...item, ...patch } : item
      ),
    });
  };

  const handleDeleteMarqueeItem = (id: string) => {
    setSettings({
      ...settings,
      marqueeItems: (settings.marqueeItems || []).filter((item) => item.id !== id),
    });
  };

  const handleMoveMarqueeItem = (index: number, direction: 'up' | 'down') => {
    const list = [...(settings.marqueeItems || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIdx];
    list[targetIdx] = temp;
    setSettings({
      ...settings,
      marqueeItems: list,
    });
  };

  const handleResetDefaults = async () => {
    if (!confirm('Reset Home Page Hero Image and Header Marquee points back to factory defaults?')) {
      return;
    }
    setSettings(DEFAULT_SITE_SETTINGS);
    await handlePersist(DEFAULT_SITE_SETTINGS, 'Restored default Home Page Hero & Header Marquee settings!');
  };

  const activeHeroSlides = (settings.heroImages || []).filter(
    (img) => img.isActive && img.imageUrl?.trim()
  );
  const previewSlides =
    activeHeroSlides.length > 0
      ? activeHeroSlides
      : [settings.heroImages?.[0] || DEFAULT_SITE_SETTINGS.heroImages[0]];

  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const slideIntervalSeconds = Math.max(
    1,
    Math.min(60, Number(settings.heroSlideIntervalSeconds) || 5)
  );
  const isAutoSlideOn = settings.heroAutoSlide !== false;

  useEffect(() => {
    if (previewSlideIdx >= previewSlides.length) {
      setPreviewSlideIdx(0);
    }
  }, [previewSlides.length, previewSlideIdx]);

  useEffect(() => {
    if (previewSlides.length <= 1 || !isAutoSlideOn) return;
    const timer = setInterval(() => {
      setPreviewSlideIdx((prev) => (prev + 1) % previewSlides.length);
    }, slideIntervalSeconds * 1000);
    return () => clearInterval(timer);
  }, [previewSlides.length, isAutoSlideOn, slideIntervalSeconds]);

  const activePreviewHero = previewSlides[previewSlideIdx] || previewSlides[0];

  const activeMarqueeList = (settings.marqueeItems || []).filter(
    (item) => item.isActive && item.text?.trim()
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 bg-white p-5 rounded-xl border shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
            <span className="px-2 py-0.5 rounded bg-[#FFED00] text-black border border-black/20">
              PLANT GOVERNANCE & ROLES
            </span>
            <span>•</span>
            <span className="text-slate-900">STOREFRONT SITE SETTINGS</span>
          </div>
          <h1 className="text-[22px] sm:text-[26px] font-bold text-slate-900 tracking-tight leading-tight mt-1.5">
            Site Settings — Home Hero & Header Marquee
          </h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Upload and manage the Home Page Hero Section image(s) and customize the Header Marquee announcement points. Changes replicate live on the storefront.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-xs transition shadow-2xs"
          >
            <Eye className="h-3.5 w-3.5" />
            <span>View Live Home Page</span>
            <ExternalLink className="h-3 w-3 text-slate-400" />
          </Link>

          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-semibold text-xs transition cursor-pointer"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset Defaults</span>
          </button>

          <button
            type="button"
            onClick={() => handlePersist(settings)}
            disabled={isSaving}
            className="inline-flex items-center gap-2 bg-[#FFED00] hover:bg-[#F2DE00] text-black font-bold text-xs px-4 py-2.5 rounded-lg border border-black/20 shadow-xs transition active:scale-95 cursor-pointer disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'PUBLISHING...' : 'SAVE & PUBLISH TO HOME PAGE'}</span>
          </button>
        </div>
      </div>

      {/* Toast Notification */}
      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs font-semibold rounded-xl flex items-center justify-between shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{saveSuccess}</span>
          </div>
          <Link
            href="/"
            target="_blank"
            className="text-xs font-bold text-emerald-800 underline hover:text-emerald-950"
          >
            Open Home Page ➔
          </Link>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 1: HEADER MARQUEE ANNOUNCEMENT POINTS                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#FFED00] border border-black/15 flex items-center justify-center text-black shrink-0">
              <Megaphone className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                1. Header Marquee Points (Top Announcement Bar)
              </h2>
              <p className="text-xs text-slate-500">
                Set the scrolling promotional points displayed at the very top of the storefront header (`TopMarqueeBar`).
              </p>
            </div>
          </div>
          <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
            {activeMarqueeList.length} Active Point{activeMarqueeList.length === 1 ? '' : 's'}
          </span>
        </div>

        {/* Live Header Marquee Preview */}
        <div className="space-y-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            LIVE HEADER MARQUEE PREVIEW
          </span>
          <div className="w-full bg-[#111111] text-white rounded-lg border border-neutral-800 overflow-hidden py-2 px-4">
            {activeMarqueeList.length === 0 ? (
              <p className="text-xs text-neutral-400 text-center font-mono">
                No active marquee points — Top marquee bar will be hidden on the storefront.
              </p>
            ) : (
              <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                {activeMarqueeList.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 shrink-0">
                    {renderMarqueeIcon(item.icon)}
                    <span className="text-xs font-medium text-neutral-100 whitespace-nowrap">
                      {item.text}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Add New Marquee Point Bar */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <span className="text-xs font-bold text-slate-800 block">
            Add New Header Marquee Point
          </span>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <select
              value={newMarqueeIcon}
              onChange={(e) => setNewMarqueeIcon(e.target.value as MarqueeIconType)}
              className="h-10 px-3 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            >
              {ICON_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  Icon: {opt.label}
                </option>
              ))}
            </select>

            <input
              type="text"
              value={newMarqueeText}
              onChange={(e) => setNewMarqueeText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddMarqueeItem();
                }
              }}
              placeholder="e.g., Free Shipping on Orders Over ₹999 • Same-Day Dispatch Available"
              className="flex-1 h-10 px-3.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            />

            <button
              type="button"
              onClick={handleAddMarqueeItem}
              disabled={!newMarqueeText.trim()}
              className="h-10 px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center justify-center gap-1.5 transition cursor-pointer disabled:opacity-40 shrink-0"
            >
              <Plus className="h-4 w-4" />
              <span>Add Point</span>
            </button>
          </div>
        </div>

        {/* Marquee Points List */}
        <div className="space-y-2.5">
          {(settings.marqueeItems || []).map((item, idx) => (
            <div
              key={item.id}
              className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition ${
                item.isActive
                  ? 'bg-white border-slate-200 shadow-2xs'
                  : 'bg-slate-50 border-slate-200/70 opacity-60'
              }`}
            >
              <div className="flex items-center gap-2.5 flex-1 min-w-0">
                <span className="w-6 h-6 rounded-full bg-slate-900 text-[#FFED00] flex items-center justify-center shrink-0">
                  {renderMarqueeIcon(item.icon)}
                </span>

                <select
                  value={item.icon}
                  onChange={(e) =>
                    handleUpdateMarqueeItem(item.id, {
                      icon: e.target.value as MarqueeIconType,
                    })
                  }
                  className="h-9 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
                >
                  {ICON_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={item.text}
                  onChange={(e) =>
                    handleUpdateMarqueeItem(item.id, { text: e.target.value })
                  }
                  className="flex-1 h-9 px-3 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00] min-w-0"
                />
              </div>

              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  type="button"
                  onClick={() => handleMoveMarqueeItem(idx, 'up')}
                  disabled={idx === 0}
                  title="Move up"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleMoveMarqueeItem(idx, 'down')}
                  disabled={idx === (settings.marqueeItems?.length || 0) - 1}
                  title="Move down"
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                >
                  <ArrowDown className="h-3.5 w-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleUpdateMarqueeItem(item.id, { isActive: !item.isActive })
                  }
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                    item.isActive
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {item.isActive ? 'Active' : 'Hidden'}
                </button>

                <button
                  type="button"
                  onClick={() => handleDeleteMarqueeItem(item.id)}
                  title="Remove marquee point"
                  className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* SECTION 2: HOME PAGE FULL-WIDTH HERO BANNER IMAGE                      */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-[#FFED00] border border-black/15 flex items-center justify-center text-black shrink-0">
              <ImageIcon className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                2. Home Page Full-Width Hero Banner Image, Text & Buttons
              </h2>
              <p className="text-xs text-slate-500">
                Upload a full-width Hero Banner image and control whether to show custom text & CTA buttons or just the pure full-width banner image alone.
              </p>
            </div>
          </div>

          {/* 2-Button Mode Selector: Just Banner Only vs Banner + Text & Buttons */}
          <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 self-start lg:self-center">
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  showHeroTextOverlay: false,
                })
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                settings.showHeroTextOverlay === false
                  ? 'bg-slate-900 text-[#FFED00] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Just Banner Only (No Text / Buttons)
            </button>
            <button
              type="button"
              onClick={() =>
                setSettings({
                  ...settings,
                  showHeroTextOverlay: true,
                })
              }
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                settings.showHeroTextOverlay !== false
                  ? 'bg-[#FFED00] text-black border border-black/15 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Banner + Text & Buttons
            </button>
          </div>
        </div>

        {/* Live Full-Width Hero Banner Preview */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              <span>
                LIVE FULL-WIDTH HERO BANNER PREVIEW ({previewSlides.length} ACTIVE SLIDE
                {previewSlides.length === 1 ? '' : 'S'})
              </span>
            </span>
            <div className="flex items-center gap-2">
              {previewSlides.length > 1 && (
                <span className="text-[10px] font-mono font-bold text-slate-700 bg-[#FEFCE8] border border-yellow-300 px-2 py-0.5 rounded inline-flex items-center gap-1">
                  <Clock className="h-3 w-3 text-amber-600" />
                  <span>
                    {isAutoSlideOn
                      ? `AUTO-SLIDING EVERY ${slideIntervalSeconds}s (SLIDE ${previewSlideIdx + 1}/${previewSlides.length})`
                      : `MANUAL SLIDE (${previewSlideIdx + 1}/${previewSlides.length})`}
                  </span>
                </span>
              )}
              <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                {settings.showHeroTextOverlay === false
                  ? 'PURE BANNER ONLY'
                  : 'BANNER + CUSTOM OVERLAY'}
              </span>
            </div>
          </div>

          <div className="relative w-full min-h-[260px] sm:min-h-[340px] rounded-xl overflow-hidden border border-slate-200 bg-neutral-900 flex items-center shadow-xs">
            {/* Horizontal Sliding Track in Preview */}
            <div
              className="absolute inset-0 flex transition-transform duration-700 ease-in-out"
              style={{
                transform: `translateX(-${previewSlideIdx * 100}%)`,
              }}
            >
              {previewSlides.map((slide, sIdx) => (
                <div key={slide?.id || sIdx} className="relative w-full h-full shrink-0">
                  <img
                    src={resolveSiteAssetUrl(slide?.imageUrl || settings.heroImageUrl)}
                    alt={slide?.altText || settings.heroAltText}
                    className="w-full h-full object-cover object-center"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=1600&auto=format&fit=crop&q=80';
                    }}
                  />
                </div>
              ))}
            </div>

            {settings.showHeroTextOverlay !== false && (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-transparent z-10" />
                <div className="relative z-20 p-6 sm:p-10 max-w-xl space-y-3.5">
                  {settings.showHeroBadge !== false && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#FFED00] text-black text-[10px] font-mono font-bold uppercase">
                      <span className="h-1.5 w-1.5 rounded-full bg-black" />
                      <span>
                        {activePreviewHero?.badgeText ||
                          settings.heroBadgeText ||
                          'COMMERCIAL PRINTING & PACKAGING OS'}
                      </span>
                    </div>
                  )}

                  {settings.showHeroHeading !== false && (
                    <h3 className="text-xl sm:text-3xl font-bold text-white leading-tight">
                      {settings.heroTitle ?? 'Commercial Print Excellence,'}{' '}
                      {settings.heroHighlightText && (
                        <span className="text-[#FFED00] underline">
                          {settings.heroHighlightText}
                        </span>
                      )}{' '}
                      {settings.heroTitleSuffix ?? 'for Scale.'}
                    </h3>
                  )}

                  {settings.showHeroDescription !== false && settings.heroDescription && (
                    <p className="text-xs sm:text-sm text-neutral-200 line-clamp-2">
                      {settings.heroDescription}
                    </p>
                  )}

                  {(settings.showHeroPrimaryBtn !== false ||
                    settings.showHeroSecondaryBtn !== false) && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-1">
                      {settings.showHeroPrimaryBtn !== false && (
                        <span className="px-4 py-2 rounded-lg bg-[#FFED00] text-black font-bold text-xs shadow-xs">
                          {settings.heroPrimaryBtnText || 'START CUSTOM CONFIGURATION'} →
                        </span>
                      )}
                      {settings.showHeroSecondaryBtn !== false && (
                        <span className="px-4 py-2 rounded-lg bg-white text-black font-bold text-xs shadow-xs">
                          {settings.heroSecondaryBtnText || 'EXPLORE 2026 CATALOGUE'}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}

            <style jsx>{`
              @keyframes previewDotProgress {
                from {
                  width: 0%;
                }
                to {
                  width: 100%;
                }
              }
            `}</style>

            {/* Preview Slide Navigation Controls */}
            {previewSlides.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewSlideIdx((prev) =>
                      prev === 0 ? previewSlides.length - 1 : prev - 1
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-black/45 hover:bg-[#FFED00] text-white hover:text-black backdrop-blur-md border border-white/20 shadow flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewSlideIdx((prev) => (prev + 1) % previewSlides.length)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-30 h-9 w-9 rounded-full bg-black/45 hover:bg-[#FFED00] text-white hover:text-black backdrop-blur-md border border-white/20 shadow flex items-center justify-center transition-all cursor-pointer"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </>
            )}

            {/* Modern Dot-Expand Pagination in Preview */}
            <div className="absolute bottom-3.5 inset-x-0 z-30 flex items-center justify-center pointer-events-none">
              <div className="pointer-events-auto inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/50 backdrop-blur-md border border-white/15 shadow-md">
                {previewSlides.map((slide, idx) => {
                  const isCurrent = idx === previewSlideIdx;
                  return (
                    <button
                      key={slide?.id || idx}
                      type="button"
                      onClick={() => setPreviewSlideIdx(idx)}
                      className={`relative h-2 rounded-full overflow-hidden transition-all duration-500 ease-out cursor-pointer ${
                        isCurrent
                          ? 'w-9 bg-white/30'
                          : 'w-2 bg-white/45 hover:bg-white/80'
                      }`}
                    >
                      {isCurrent && (
                        <span
                          key={`${previewSlideIdx}-${slideIntervalSeconds}-${isAutoSlideOn}`}
                          className="absolute inset-y-0 left-0 rounded-full bg-[#FFED00]"
                          style={
                            previewSlides.length > 1 && isAutoSlideOn
                              ? {
                                  animation: `previewDotProgress ${slideIntervalSeconds}s linear forwards`,
                                }
                              : { width: '100%' }
                          }
                        />
                      )}
                    </button>
                  );
                })}
                {previewSlides.length > 1 && (
                  <span className="ml-1 pl-2 border-l border-white/20 text-[9px] font-mono font-bold text-white/90">
                    {String(previewSlideIdx + 1).padStart(2, '0')}/
                    {String(previewSlides.length).padStart(2, '0')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Controllable Hero Text & CTA Buttons Editor */}
        {settings.showHeroTextOverlay === false ? (
          <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-slate-900 block">
                Pure Full-Width Image Banner Mode Active
              </span>
              <p className="text-xs text-slate-600 mt-0.5">
                All text, headlines, and buttons are hidden. Only your full-width banner image is displayed on the Home Page.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] font-mono font-bold text-slate-600 uppercase">
                Banner Click Link:
              </span>
              <input
                type="text"
                value={settings.heroBannerLinkHref || '/products'}
                onChange={(e) =>
                  setSettings({ ...settings, heroBannerLinkHref: e.target.value })
                }
                placeholder="/products"
                className="w-48 h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
              />
            </div>
          </div>
        ) : (
          <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-xs font-bold uppercase font-mono text-slate-800">
                  Hero Banner Text & CTA Button Controls
                </h3>
                <p className="text-[11px] text-slate-500">
                  Toggle each element ON/OFF or customize the text and button links displayed on the Hero Banner.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    showHeroTextOverlay: false,
                  })
                }
                className="text-[11px] font-bold text-slate-600 hover:text-black underline cursor-pointer"
              >
                Hide All Text & Show Banner Only
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* 1. Eyebrow Badge Control */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    1. Top Eyebrow Badge
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        showHeroBadge: settings.showHeroBadge === false ? true : false,
                      })
                    }
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                      settings.showHeroBadge !== false
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {settings.showHeroBadge !== false ? 'Shown' : 'Hidden'}
                  </button>
                </div>
                {settings.showHeroBadge !== false && (
                  <input
                    type="text"
                    value={settings.heroBadgeText || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedSlides = (settings.heroImages || []).map((s, idx) =>
                        idx === 0 ? { ...s, badgeText: val } : s
                      );
                      setSettings({
                        ...settings,
                        heroBadgeText: val,
                        heroImages: updatedSlides,
                      });
                    }}
                    placeholder="COMMERCIAL PRINTING & PACKAGING OS"
                    className="w-full h-9 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
                  />
                )}
              </div>

              {/* 2. Trust Pillars Bar Control */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">
                    2. Bottom 3 Trust Badges Row
                  </span>
                  <span className="text-[11px] text-slate-500">
                    2400 DPI Precision • Pan-India Dispatch • Zero Price Drift
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setSettings({
                      ...settings,
                      showHeroTrustPillars:
                        settings.showHeroTrustPillars === false ? true : false,
                    })
                  }
                  className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer shrink-0 ${
                    settings.showHeroTrustPillars !== false
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {settings.showHeroTrustPillars !== false ? 'Shown' : 'Hidden'}
                </button>
              </div>

              {/* 3. Main Headline Control */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    3. Main Display Headline
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        showHeroHeading: settings.showHeroHeading === false ? true : false,
                      })
                    }
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                      settings.showHeroHeading !== false
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {settings.showHeroHeading !== false ? 'Shown' : 'Hidden'}
                  </button>
                </div>
                {settings.showHeroHeading !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                        First Part
                      </span>
                      <input
                        type="text"
                        value={settings.heroTitle ?? ''}
                        onChange={(e) =>
                          setSettings({ ...settings, heroTitle: e.target.value })
                        }
                        placeholder="Commercial Print Excellence,"
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                        Yellow Highlight Word
                      </span>
                      <input
                        type="text"
                        value={settings.heroHighlightText ?? ''}
                        onChange={(e) =>
                          setSettings({ ...settings, heroHighlightText: e.target.value })
                        }
                        placeholder="Engineered"
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                        Ending Text
                      </span>
                      <input
                        type="text"
                        value={settings.heroTitleSuffix ?? ''}
                        onChange={(e) =>
                          setSettings({ ...settings, heroTitleSuffix: e.target.value })
                        }
                        placeholder="for Scale."
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Description / Subtitle Control */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    4. Hero Description / Subtitle
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        showHeroDescription:
                          settings.showHeroDescription === false ? true : false,
                      })
                    }
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                      settings.showHeroDescription !== false
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {settings.showHeroDescription !== false ? 'Shown' : 'Hidden'}
                  </button>
                </div>
                {settings.showHeroDescription !== false && (
                  <textarea
                    rows={2}
                    value={settings.heroDescription ?? ''}
                    onChange={(e) =>
                      setSettings({ ...settings, heroDescription: e.target.value })
                    }
                    placeholder="Direct-to-press precision for visiting cards..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
                  />
                )}
              </div>

              {/* 5. Primary CTA Button Control */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    5. Primary Button (Yellow CTA)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        showHeroPrimaryBtn:
                          settings.showHeroPrimaryBtn === false ? true : false,
                      })
                    }
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                      settings.showHeroPrimaryBtn !== false
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {settings.showHeroPrimaryBtn !== false ? 'Shown' : 'Hidden'}
                  </button>
                </div>
                {settings.showHeroPrimaryBtn !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                        Button Label
                      </span>
                      <input
                        type="text"
                        value={settings.heroPrimaryBtnText ?? ''}
                        onChange={(e) =>
                          setSettings({ ...settings, heroPrimaryBtnText: e.target.value })
                        }
                        placeholder="START CUSTOM CONFIGURATION"
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                        Button Link URL
                      </span>
                      <input
                        type="text"
                        value={settings.heroPrimaryBtnHref ?? ''}
                        onChange={(e) =>
                          setSettings({ ...settings, heroPrimaryBtnHref: e.target.value })
                        }
                        placeholder="/products/premium-visiting-cards"
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 6. Secondary CTA Button Control */}
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    6. Secondary Button (White CTA)
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        showHeroSecondaryBtn:
                          settings.showHeroSecondaryBtn === false ? true : false,
                      })
                    }
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border cursor-pointer ${
                      settings.showHeroSecondaryBtn !== false
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {settings.showHeroSecondaryBtn !== false ? 'Shown' : 'Hidden'}
                  </button>
                </div>
                {settings.showHeroSecondaryBtn !== false && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                        Button Label
                      </span>
                      <input
                        type="text"
                        value={settings.heroSecondaryBtnText ?? ''}
                        onChange={(e) =>
                          setSettings({ ...settings, heroSecondaryBtnText: e.target.value })
                        }
                        placeholder="EXPLORE 2026 CATALOGUE"
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] font-mono text-slate-400 block mb-0.5">
                        Button Link URL
                      </span>
                      <input
                        type="text"
                        value={settings.heroSecondaryBtnHref ?? ''}
                        onChange={(e) =>
                          setSettings({ ...settings, heroSecondaryBtnHref: e.target.value })
                        }
                        placeholder="/products"
                        className="w-full h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-900"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Upload Box + URL Input */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-600 mb-1">
                Banner Alt / Title
              </label>
              <input
                type="text"
                value={newHeroAlt}
                onChange={(e) => setNewHeroAlt(e.target.value)}
                placeholder="Print Bazzar Commercial Products"
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-mono font-bold uppercase text-slate-600 mb-1">
                Hero Eyebrow Badge Text
              </label>
              <input
                type="text"
                value={newHeroBadge}
                onChange={(e) => setNewHeroBadge(e.target.value)}
                placeholder="COMMERCIAL PRINTING & PACKAGING OS"
                className="w-full h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
              />
            </div>
          </div>

          {/* Direct File Upload Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex-1 py-3.5 px-4 rounded-xl border-2 border-dashed border-slate-300 hover:border-black bg-white hover:bg-[#FEFCE8]/40 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Upload className="h-4 w-4 text-slate-700" />
              <span>
                {isUploading
                  ? 'Uploading Full-Width Hero Banner...'
                  : 'Upload Full-Width Hero Banner Image from Computer (JPG, PNG, WEBP)'}
              </span>
            </button>
          </div>

          {/* Or Add via URL */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newHeroUrl}
              onChange={(e) => setNewHeroUrl(e.target.value)}
              placeholder="Or paste full-width banner image URL (e.g. /images/home/hero-products.jpg or https://...)"
              className="flex-1 h-9 px-3 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
            />
            <button
              type="button"
              onClick={handleAddHeroByUrl}
              disabled={!newHeroUrl.trim()}
              className="h-9 px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs inline-flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add Banner URL</span>
            </button>
          </div>
        </div>

        {/* Hero Images List + Sliding Interval Timing Controls */}
        <div className="space-y-3.5">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase font-mono text-slate-900">
                  Configured Full-Width Hero Banners ({(settings.heroImages || []).length})
                </span>
                <span className="px-2 py-0.5 rounded bg-[#FFED00] text-black font-mono text-[10px] font-bold border border-black/15">
                  {activeHeroSlides.length} ACTIVE SLIDE{activeHeroSlides.length === 1 ? '' : 'S'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                When 2 or more banners are active, they smoothly slide across the full width of the Home Page Hero Section at your configured interval timing.
              </p>
            </div>

            {/* Auto-Slide & Interval Timing Controls */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {/* Auto-Slide ON/OFF Toggle */}
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    heroAutoSlide: settings.heroAutoSlide === false ? true : false,
                  })
                }
                className={`h-9 px-3 rounded-lg text-xs font-bold border inline-flex items-center gap-1.5 transition cursor-pointer ${
                  isAutoSlideOn
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-300'
                }`}
              >
                {isAutoSlideOn ? (
                  <>
                    <Play className="h-3.5 w-3.5 text-emerald-600 fill-emerald-600" />
                    <span>Auto-Slide: ON</span>
                  </>
                ) : (
                  <>
                    <Pause className="h-3.5 w-3.5 text-slate-500" />
                    <span>Auto-Slide: PAUSED</span>
                  </>
                )}
              </button>

              {/* Preset Interval Buttons */}
              <div className="inline-flex items-center bg-white border border-slate-300 rounded-lg p-0.5 gap-0.5">
                <span className="px-2 text-[10px] font-mono font-bold uppercase text-slate-500 flex items-center gap-1">
                  <Clock className="h-3 w-3 text-slate-500" />
                  <span>Interval:</span>
                </span>
                {[2, 3, 4, 5, 7, 10].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() =>
                      setSettings({
                        ...settings,
                        heroAutoSlide: true,
                        heroSlideIntervalSeconds: sec,
                      })
                    }
                    className={`px-2 py-1 rounded-md text-[11px] font-mono font-bold transition cursor-pointer ${
                      slideIntervalSeconds === sec && isAutoSlideOn
                        ? 'bg-[#FFED00] text-black border border-black/20 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {sec}s
                  </button>
                ))}
              </div>

              {/* Custom Interval Number Input */}
              <div className="inline-flex items-center gap-1.5 bg-white border border-slate-300 rounded-lg px-2.5 h-9">
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={slideIntervalSeconds}
                  onChange={(e) => {
                    const val = Math.max(1, Math.min(60, Number(e.target.value) || 5));
                    setSettings({
                      ...settings,
                      heroSlideIntervalSeconds: val,
                    });
                  }}
                  className="w-12 text-xs font-mono font-bold text-slate-900 text-center focus:outline-none"
                />
                <span className="text-[10px] font-mono text-slate-500 uppercase">sec</span>
              </div>
            </div>
          </div>

          <div className="space-y-2.5">
            {(settings.heroImages || []).map((slide, idx) => {
              const isPrimary = idx === 0 && slide.isActive;
              return (
                <div
                  key={slide.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition ${
                    slide.isActive
                      ? 'bg-white border-slate-300 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0 w-full">
                    <div className="relative h-16 w-32 rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                      <img
                        src={resolveSiteAssetUrl(slide.imageUrl)}
                        alt={slide.altText || 'Hero Banner'}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&auto=format&fit=crop&q=80';
                        }}
                      />
                      <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-black/75 text-[#FFED00] font-mono text-[9px] font-bold">
                        #{idx + 1}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        {isPrimary && (
                          <span className="px-2 py-0.5 rounded bg-[#FFED00] text-black font-mono text-[9px] font-bold uppercase border border-black/20">
                            SLIDE #1 (PRIMARY)
                          </span>
                        )}
                        <span className="text-[11px] font-mono text-slate-400 truncate">
                          {slide.imageUrl}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={slide.altText || ''}
                          onChange={(e) =>
                            handleUpdateHeroSlide(slide.id, { altText: e.target.value })
                          }
                          placeholder="Banner Alt Text"
                          className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                        />
                        <input
                          type="text"
                          value={slide.badgeText || ''}
                          onChange={(e) =>
                            handleUpdateHeroSlide(slide.id, { badgeText: e.target.value })
                          }
                          placeholder="Eyebrow Badge Text"
                          className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                        />
                        <input
                          type="text"
                          value={slide.linkHref || ''}
                          onChange={(e) =>
                            handleUpdateHeroSlide(slide.id, { linkHref: e.target.value })
                          }
                          placeholder="Banner Link (e.g. /products)"
                          className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded text-xs font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-black"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                    {(settings.heroImages?.length || 0) > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleMoveHeroSlide(idx, 'up')}
                          disabled={idx === 0}
                          title="Move slide earlier"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMoveHeroSlide(idx, 'down')}
                          disabled={idx === (settings.heroImages?.length || 0) - 1}
                          title="Move slide later"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}

                    {!isPrimary && (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryHero(slide)}
                        className="px-2.5 py-1.5 rounded-lg bg-[#FEFCE8] hover:bg-[#FFED00] text-black border border-yellow-300 text-[11px] font-bold transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <Check className="h-3 w-3" />
                        <span>Set #1</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleToggleHeroActive(slide.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition cursor-pointer ${
                        slide.isActive
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-slate-100 text-slate-500 border-slate-200'
                      }`}
                    >
                      {slide.isActive ? 'Active' : 'Hidden'}
                    </button>

                    {(settings.heroImages?.length || 0) > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteHeroSlide(slide.id)}
                        title="Delete hero banner"
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

