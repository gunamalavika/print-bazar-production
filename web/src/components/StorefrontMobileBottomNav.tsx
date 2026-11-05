'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Grid,
  ShoppingCart,
  Truck,
  User,
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isCart?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Catalog', href: '/products', icon: Grid },
  { label: 'Cart', href: '/cart', icon: ShoppingCart, isCart: true },
  { label: 'Account', href: '/account', icon: User },
];

export function StorefrontMobileBottomNav() {
  const pathname = usePathname();
  const [cartCount, setCartCount] = useState<number>(0);

  // Sync cart item count dynamically
  useEffect(() => {
    const updateCartCount = () => {
      try {
        const stored = localStorage.getItem('pb2_cart');
        if (stored) {
          const items = JSON.parse(stored);
          setCartCount(Array.isArray(items) ? items.length : 0);
        } else {
          setCartCount(0);
        }
      } catch {
        setCartCount(0);
      }
    };
    updateCartCount();
    window.addEventListener('storage', updateCartCount);
    window.addEventListener('cart-updated', updateCartCount);
    return () => {
      window.removeEventListener('storage', updateCartCount);
      window.removeEventListener('cart-updated', updateCartCount);
    };
  }, []);

  // On product detail pages, yield to the product sticky action & pricing bar
  if (pathname.startsWith('/products/') && pathname !== '/products') {
    return null;
  }

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 w-full max-w-[100vw] z-[100] bg-white/98 backdrop-blur-md border-t border-[#E5E5E5] shadow-elevated"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        maxWidth: '100vw',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-4 h-14 items-center px-1 w-full max-w-full">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isExact = pathname === item.href;
          const isSubMatch =
            !isExact &&
            item.href !== '/' &&
            (pathname.startsWith(`${item.href}/`) || pathname === item.href);
          const isActive = isExact || isSubMatch;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex flex-col items-center justify-center h-full min-h-[44px] px-0.5 touch-manipulation transition-colors ${
                isActive ? 'text-black font-semibold' : 'text-[#737373] hover:text-black font-normal'
              }`}
            >
              <div className="relative flex items-center justify-center">
                <div
                  className={`p-1 rounded-full transition-transform ${
                    isActive ? 'bg-[#FFED00] text-black scale-105' : 'text-current'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {item.isCart && cartCount > 0 && (
                  <span className="absolute -top-1 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-[#FFED00] text-black font-bold text-[9px] font-mono flex items-center justify-center border border-black shadow-xs">
                    {cartCount}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-medium tracking-tight leading-none mt-0.5 truncate max-w-full text-center">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
