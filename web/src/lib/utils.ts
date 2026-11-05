import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getApiHost } from './api';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(num || 0);
}

export function formatDate(dateString?: string | Date | null): string {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(dateString);
  }
}

export function getEstimatedDeliveryText(productionDays: number = 2): {
  dispatchDate: string;
  deliveryRange: string;
  totalDays: string;
} {
  const now = new Date();
  const dispatch = new Date(now);
  const pDays = Math.max(1, Number(productionDays) || 2);
  dispatch.setDate(dispatch.getDate() + pDays);

  const minDelivery = new Date(dispatch);
  minDelivery.setDate(minDelivery.getDate() + 1);

  const maxDelivery = new Date(dispatch);
  maxDelivery.setDate(maxDelivery.getDate() + 2);

  const shortOpts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  const fullOpts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };

  return {
    dispatchDate: dispatch.toLocaleDateString('en-IN', shortOpts),
    deliveryRange: `${minDelivery.toLocaleDateString('en-IN', shortOpts)} – ${maxDelivery.toLocaleDateString('en-IN', fullOpts)}`,
    totalDays: `${pDays}–${pDays + 2} Business Days`,
  };
}

export function isVideoMedia(url?: string | null): boolean {
  if (!url) return false;
  const clean = url.split('?')[0].toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.mov') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.m4v') ||
    clean.endsWith('.mkv') ||
    url.includes('youtube.com') ||
    url.includes('youtu.be') ||
    url.includes('vimeo.com')
  );
}

export function resolveArtworkUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const str = String(rawUrl).trim();
  if (!str) return null;

  // If already absolute http / https / blob / data url
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('blob:') ||
    str.startsWith('data:')
  ) {
    return str;
  }

  // Get base API host origin without /api/v1 or trailing slashes
  const apiBase = getApiHost();

  if (str.startsWith('/uploads/')) {
    return `${apiBase}${str}`;
  }
  if (str.startsWith('uploads/')) {
    return `${apiBase}/${str}`;
  }
  if (str.startsWith('/references/') || str.startsWith('references/')) {
    const clean = str.startsWith('/') ? str : `/${str}`;
    return `${apiBase}/uploads${clean}`;
  }
  if (str.startsWith('/artwork/') || str.startsWith('artwork/')) {
    const clean = str.startsWith('/') ? str : `/${str}`;
    return `${apiBase}/uploads${clean}`;
  }
  if (str.startsWith('ref_')) {
    return `${apiBase}/uploads/references/${str}`;
  }
  if (str.startsWith('art_')) {
    return `${apiBase}/uploads/artwork/${str}`;
  }
  if (str.startsWith('/')) {
    return `${apiBase}${str}`;
  }
  // Default fallback for storage keys / filenames
  return `${apiBase}/uploads/artwork/${str}`;
}

/**
 * Auto-generates a standardized Print Bazaar Product SKU.
 * Format: PB-{NUMBER}
 * e.g., "PB-100", "PB-101"
 * No product name words or abbreviations.
 */
export function generateProductSku(
  _productName?: string,
  _categoryName?: string,
  suffix?: string | number
): string {
  const prefix = 'PB';
  if (suffix !== undefined && suffix !== null && String(suffix).trim() !== '') {
    const s = String(suffix).trim();
    if (s.toUpperCase().startsWith('PB-')) {
      return s.toUpperCase();
    }
    const digits = s.replace(/\D/g, '');
    if (digits) {
      return `${prefix}-${digits}`;
    }
  }
  return `${prefix}-100`;
}

/**
 * Computes the next sequential PB-{NUMBER} SKU based on existing products.
 * Default starting SKU is PB-100.
 */
export function getNextAvailableProductSku(existingProducts?: Array<{ sku?: string }>): string {
  let maxNum = 99;
  if (Array.isArray(existingProducts)) {
    for (const p of existingProducts) {
      if (!p.sku) continue;
      const match = p.sku.match(/^PB-(\d+)$/i);
      if (match) {
        const val = parseInt(match[1], 10);
        if (!isNaN(val) && val > maxNum) {
          maxNum = val;
        }
      }
    }
  }
  return `PB-${maxNum + 1}`;
}
