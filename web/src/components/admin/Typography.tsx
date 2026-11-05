'use client';

import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Standard ERP Page Header Container
 */
export function PageHeader({
  title,
  description,
  badge,
  compact = false,
  actions,
  className,
  children,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  badge?: React.ReactNode;
  compact?: boolean;
  actions?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E5E5] bg-white p-4 sm:p-5 rounded-[8px] border shadow-xs',
        className
      )}
    >
      <div className="space-y-1 min-w-0">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1
            className={cn(
              'font-semibold text-black tracking-tight leading-[1.25]',
              compact ? 'text-[18px] sm:text-[20px]' : 'text-[20px] sm:text-[24px]'
            )}
          >
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="text-[13px] sm:text-[14px] text-[#525252] leading-normal max-w-3xl">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2.5 flex-shrink-0 flex-wrap">
          {actions}
        </div>
      )}
      {children}
    </div>
  );
}

/**
 * 24px Semibold Page Title (Main Page Heading)
 */
export function PageTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'text-[20px] sm:text-[24px] font-semibold text-black tracking-tight leading-[1.25]',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

/**
 * 20px Semibold Page Title Compact (Dense Screens / Drawers)
 */
export function PageTitleCompact({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h1
      className={cn(
        'text-[18px] sm:text-[20px] font-semibold text-black tracking-tight leading-[1.25]',
        className
      )}
      {...props}
    >
      {children}
    </h1>
  );
}

/**
 * 18px Semibold Section Title (Main Content Sections)
 */
export function SectionTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn(
        'text-[18px] font-semibold text-black tracking-tight leading-[1.35]',
        className
      )}
      {...props}
    >
      {children}
    </h2>
  );
}

/**
 * 16px Semibold Subsection Title (Panels / Grouped Fields)
 */
export function SubsectionTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        'text-[16px] font-semibold text-black tracking-tight leading-[1.35]',
        className
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

/**
 * 15px Semibold Card Title (Cards / Kanban Items)
 */
export function CardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h4
      className={cn(
        'text-[15px] font-semibold text-black leading-[1.35]',
        className
      )}
      {...props}
    >
      {children}
    </h4>
  );
}

/**
 * 14px Regular Body Text (Default Application Copy)
 */
export function BodyText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        'text-[14px] font-normal text-black leading-[1.5]',
        className
      )}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * 14px Medium Body Emphasis (Important Values / Inline Emphasis)
 */
export function BodyEmphasis({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[14px] font-medium text-black leading-[1.5]',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 13px Table Body Text (Dense Operational Data)
 */
export function TableText({
  className,
  emphasis = false,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { emphasis?: boolean }) {
  return (
    <span
      className={cn(
        'text-[13px] leading-[1.4]',
        emphasis ? 'font-medium text-black' : 'font-normal text-neutral-800',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 12px Table Header (Column Labels)
 */
export function TableHeader({
  className,
  children,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        'text-[12px] font-semibold text-[#525252] uppercase tracking-wider py-2.5 px-3 leading-[1.3] text-left',
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

/**
 * 13px Form Label (Inputs, Selects, Radio Groups)
 */
export function FormLabel({
  className,
  required = false,
  children,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement> & { required?: boolean }) {
  return (
    <label
      className={cn(
        'block text-[13px] font-medium text-black leading-[1.35] mb-1.5',
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="text-[#B91C1C] ml-0.5 font-normal">*</span>}
    </label>
  );
}

/**
 * 12px Helper / Metadata Text (Hints, Timestamps, Secondary Details)
 */
export function HelperText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[12px] font-normal text-[#737373] leading-[1.4] mt-1', className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * 12px Error Text
 */
export function ErrorText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-[12px] font-medium text-[#B91C1C] leading-[1.4] mt-1', className)}
      {...props}
    >
      {children}
    </p>
  );
}

/**
 * 12px Caption Text
 */
export function CaptionText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn('text-[12px] font-normal text-[#737373] leading-[1.4]', className)}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 24px-32px Dashboard Metric Value with Tabular Nums (KPI Value)
 */
export function MetricValue({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[24px] sm:text-[28px] font-semibold tracking-tight text-black tabular-nums leading-[1.1] block',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 13px-14px Financial Price Value with Tabular Nums
 */
export function PriceText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[13px] sm:text-[14px] font-semibold text-black tabular-nums',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

/**
 * 12px-13px SKU / Identifier Code (Monospace, Tabular Identifiers)
 */
export function SkuText({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        'text-[12px] sm:text-[13px] font-medium font-mono text-neutral-800 bg-[#F5F5F5] border border-[#E5E5E5] px-1.5 py-0.5 rounded',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

