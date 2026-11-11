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
      className="md:hidden fixed bottom-0 inset-x-0 w-full max-w-[100vw] z-[100] bg-white border-t border-[#E5E7EB] shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
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
      <div className="grid grid-cols-4 h-[58px] items-stretch w-full max-w-full">
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
              className={`relative flex flex-col items-center justify-center h-full px-1 touch-manipulation transition-all duration-150 active:scale-95 ${
                isActive ? 'text-black' : 'text-[#737373] hover:text-black'
              }`}
            >
              {/* Active Indicator Bar on Top */}
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2.5px] bg-[#FFED00] rounded-b-full shadow-xs" />
              )}

              <div className="relative flex items-center justify-center">
                <Icon
                  className={`h-5 w-5 transition-transform duration-150 ${
                    isActive ? 'text-black stroke-[2.2] scale-105' : 'text-[#737373] stroke-[1.8]'
                  }`}
                />
                {item.isCart && cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 h-4 min-w-[16px] px-1 rounded-full bg-[#FFED00] text-black font-bold text-[9px] font-mono flex items-center justify-center border border-black shadow-xs">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10.5px] tracking-tight leading-none mt-1 truncate max-w-full text-center transition-colors ${
                  isActive ? 'font-bold text-black' : 'font-medium text-[#737373]'
                }`}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
