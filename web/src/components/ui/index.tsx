'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// -------------------------------------------------------------
// 1. BUTTON
// -------------------------------------------------------------
const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium tracking-tight rounded-[8px] transition-all duration-150 select-none disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFED00] focus-visible:ring-offset-2 active:scale-[0.98] cursor-pointer',
  {
    variants: {
      variant: {
        primary:
          'bg-[#FFED00] hover:bg-[#F2E100] text-black border border-neutral-300/80 shadow-xs font-semibold',
        secondary:
          'bg-white hover:bg-[#F5F5F5] text-black border border-[#E5E5E5] shadow-xs',
        dark:
          'bg-black hover:bg-neutral-900 text-white border border-black shadow-xs',
        outline:
          'bg-white hover:bg-[#F5F5F5] text-black border border-[#E5E5E5] shadow-xs',
        subtle:
          'bg-[#F5F5F5] hover:bg-[#E5E5E5] text-black border border-transparent',
        ghost:
          'hover:bg-[#F5F5F5] text-black',
        danger:
          'bg-[#FEF2F2] hover:bg-red-100 text-[#B91C1C] border border-red-200 shadow-xs',
        dangerOutline:
          'bg-white hover:bg-red-50 text-[#B91C1C] border border-red-200 shadow-xs',
      },
      size: {
        xs: 'text-[12px] h-7 px-2.5 gap-1.5',
        sm: 'text-[13px] h-8 px-3 gap-1.5',
        md: 'text-[14px] h-9 sm:h-10 px-4 gap-2',
        lg: 'text-[14px] h-11 px-6 gap-2.5 font-semibold',
        icon: 'h-9 w-9 p-0',
        iconSm: 'h-7 w-7 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      >
        {isLoading && (
          <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

// -------------------------------------------------------------
// 2. BADGE & STATUS BADGE
// -------------------------------------------------------------
const badgeVariants = cva(
  'inline-flex items-center font-mono font-medium uppercase tracking-wider rounded px-2 py-0.5 text-[10px] transition-colors',
  {
    variants: {
      variant: {
        yellow: 'bg-[#FEFCE8] text-[#854D0E] border border-[#FFED00]',
        brand: 'bg-[#FFED00] text-black font-semibold border border-neutral-300',
        gold: 'bg-[#FEFCE8] text-[#854D0E] border border-yellow-200',
        emerald: 'bg-[#F0FDF4] text-[#166534] border border-green-200',
        blue: 'bg-[#F0F9FF] text-[#075985] border border-sky-200',
        indigo: 'bg-[#EEF2FF] text-[#3730A3] border border-indigo-200',
        purple: 'bg-[#FAF5FF] text-[#6B21A8] border border-purple-200',
        rose: 'bg-[#FFF1F2] text-[#9F1239] border border-rose-200',
        red: 'bg-[#FEF2F2] text-[#B91C1C] border border-red-200',
        zinc: 'bg-[#F5F5F5] text-[#525252] border border-[#E5E5E5]',
        dark: 'bg-black text-white font-semibold',
      },
    },
    defaultVariants: {
      variant: 'zinc',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {children}
    </span>
  );
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const norm = status?.toUpperCase() || 'UNKNOWN';

  let variant: VariantProps<typeof badgeVariants>['variant'] = 'zinc';
  let dotColor = 'bg-[#737373]';

  if (
    norm.includes('PAID') ||
    norm.includes('DELIVERED') ||
    norm.includes('PASSED') ||
    norm.includes('COMPLETED') ||
    norm.includes('APPROVED') ||
    norm.includes('PUBLISHED') ||
    norm.includes('ACTIVE') ||
    norm.includes('ON_TIME')
  ) {
    variant = 'emerald';
    dotColor = 'bg-[#166534]';
  } else if (
    norm.includes('PENDING') ||
    norm.includes('PROGRESS') ||
    norm.includes('PRINTING') ||
    norm.includes('PRODUCTION') ||
    norm.includes('REVIEW') ||
    norm.includes('CLAIMED') ||
    norm.includes('PACKING')
  ) {
    variant = 'blue';
    dotColor = 'bg-[#075985]';
  } else if (
    norm.includes('REQUIRED') ||
    norm.includes('APPROVAL') ||
    norm.includes('WAITING') ||
    norm.includes('AT_RISK') ||
    norm.includes('DISPATCH') ||
    norm.includes('WARNING')
  ) {
    variant = 'gold';
    dotColor = 'bg-[#854D0E]';
  } else if (
    norm.includes('HOLD') ||
    norm.includes('REJECTED') ||
    norm.includes('FAILED') ||
    norm.includes('DELAYED') ||
    norm.includes('BLOCKED') ||
    norm.includes('OVERDUE')
  ) {
    variant = 'red';
    dotColor = 'bg-[#B91C1C]';
  }

  const label = status.replace(/_/g, ' ');

  return (
    <span
      className={cn(
        badgeVariants({ variant }),
        'inline-flex items-center gap-1.5 py-0.5 px-2 font-mono text-[10px]',
        className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0', dotColor)} />
      <span>{label}</span>
    </span>
  );
}

// -------------------------------------------------------------
// 3. CARD / PANEL
// -------------------------------------------------------------
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white border border-[#E5E5E5] rounded-[8px] p-4 sm:p-5 shadow-xs transition-all',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  title,
  subtitle,
  action,
  children,
}: {
  className?: string;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between pb-3 mb-4 border-b border-[#E5E5E5]',
        className
      )}
    >
      <div>
        {title && (
          <h3 className="text-[15px] sm:text-[16px] font-semibold text-black tracking-tight font-sans">
            {title}
          </h3>
        )}
        {subtitle && (
          <p className="text-[12px] sm:text-[13px] text-[#525252] mt-0.5 leading-tight font-sans">
            {subtitle}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
      {children}
    </div>
  );
}

// -------------------------------------------------------------
// 4. INPUT & FORM CONTROLS
// -------------------------------------------------------------
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, ...props }, ref) => {
    return (
      <div className="w-full space-y-1">
        {label && (
          <label className="block text-[13px] font-medium text-black">
            {label}
            {props.required && <span className="text-[#B91C1C] ml-0.5">*</span>}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full h-9 sm:h-10 px-3 py-2 text-[14px] font-normal text-black bg-white border border-[#E5E5E5] rounded-[8px] placeholder:text-[#737373] focus:outline-none focus:border-black focus:ring-1 focus:ring-black transition-colors disabled:bg-[#F5F5F5] disabled:text-[#737373]',
            error && 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-[#B91C1C] bg-red-50/20',
            className
          )}
          {...props}
        />
        {hint && !error && (
          <p className="text-[12px] text-[#737373] leading-tight">{hint}</p>
        )}
        {error && (
          <p className="text-[12px] font-medium text-[#B91C1C] leading-tight">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';

// -------------------------------------------------------------
// 5. EMPTY STATE
// -------------------------------------------------------------
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'bg-[#F5F5F5]/60 border border-dashed border-[#E5E5E5] rounded-[8px] p-8 text-center flex flex-col items-center justify-center min-h-[200px]',
        className
      )}
    >
      {Icon && (
        <div className="h-10 w-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center text-[#737373] mb-3 shadow-xs">
          <Icon className="h-5 w-5" />
        </div>
      )}
      <h4 className="text-[15px] font-semibold text-black">{title}</h4>
      {description && (
        <p className="text-[13px] text-[#525252] max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// -------------------------------------------------------------
// 6. SKELETON LOADER
// -------------------------------------------------------------
export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('animate-pulse bg-[#E5E5E5]/60 rounded-[6px]', className)}
      {...props}
    />
  );
}

// -------------------------------------------------------------
// 7. DIALOGS & NAVIGATION
// -------------------------------------------------------------
export * from './Modal';
export * from './Tabs';
export * from './ProductCard';
export * from './BrandLogo';


