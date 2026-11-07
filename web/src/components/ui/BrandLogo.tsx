'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

export interface BrandLogoProps {
  /**
   * 'light' for light/white backgrounds (black text, yellow icon)
   * 'dark' for dark backgrounds (white text, yellow icon)
   * 'icon-only' for compact icon avatar/mark
   */
  variant?: 'light' | 'dark' | 'icon-only';
  /** Preset height sizes, or 'custom' to use className exclusively */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom';
  /** Extra classNames for the image or container */
  className?: string;
  /** Optional badge text displayed next to the logo, e.g. '2.0', 'OS' */
  badge?: string;
  /** Badge color scheme */
  badgeVariant?: 'yellow' | 'dark' | 'outline';
  /** Optional subtitle or role text underneath */
  subtitle?: string;
  /** Wrap in link to this URL (e.g. '/' or '/admin/dashboard'). If null or false, no link wrapper */
  href?: string | null;
  /** Image loading priority */
  priority?: boolean;
}

const SIZE_MAP = {
  xs: 'h-6 sm:h-7 w-auto',
  sm: 'h-7 sm:h-8 w-auto',
  md: 'h-8 sm:h-9 md:h-10 w-auto',
  lg: 'h-10 sm:h-11 md:h-12 w-auto',
  xl: 'h-12 sm:h-14 md:h-16 w-auto',
  custom: '',
};

export function BrandLogo({
  variant = 'light',
  size = 'md',
  className = '',
  badge,
  badgeVariant = 'yellow',
  subtitle,
  href = '/',
  priority = false,
}: BrandLogoProps) {
  const isDark = variant === 'dark';
  const isIconOnly = variant === 'icon-only';

  const logoSrc = isIconOnly
    ? '/logo-icon.png'
    : isDark
    ? '/brand-logo-white.png'
    : '/brand-logo.png';

  const width = isIconOnly ? 180 : 964;
  const height = isIconOnly ? 180 : 182;

  const sizeClass = SIZE_MAP[size];

  const content = (
    <div className={`inline-flex items-center gap-2 group select-none ${className}`}>
      <div className="relative flex-shrink-0 flex items-center">
        <Image
          src={logoSrc}
          alt="Print Bazzar"
          width={width}
          height={height}
          priority={priority}
          style={{ width: 'auto', height: 'auto' }}
          className={`${sizeClass} object-contain transition-transform duration-200 group-hover:scale-102`}
        />
      </div>

      {(badge || subtitle) && (
        <div className="flex flex-col justify-center min-w-0">
          {badge && (
            <span
              className={`text-[9px] sm:text-[10px] font-mono font-bold px-1.5 py-0.5 rounded tracking-wider uppercase inline-block w-fit ${
                badgeVariant === 'yellow'
                  ? 'bg-[#FFED00] text-black border border-neutral-300'
                  : badgeVariant === 'dark'
                  ? 'bg-black text-[#FFED00]'
                  : 'border border-neutral-400 text-neutral-600'
              }`}
            >
              {badge}
            </span>
          )}
          {subtitle && (
            <span
              className={`text-[9px] sm:text-[10px] font-medium tracking-wider uppercase mt-0.5 ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}
            >
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex items-center flex-shrink-0 focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}

