'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShoppingCart,
  Heart,
  Search,
  Truck,
  User,
  ChevronDown,
  ArrowRight,
  Printer,
  LogOut,
  PhoneCall,
  Sparkles,
  Menu,
  X,
  Layers,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useWishlist } from '@/lib/wishlist';
import { SearchDrawer } from '@/components/search/SearchDrawer';
import { Button } from '@/components/ui';
import { TopMarqueeBar } from '@/components/TopMarqueeBar';

const CATEGORIES = [
  { name: 'All Products', href: '/products', id: 'ALL' },
  { name: 'Visiting Cards', href: '/products?category=visiting-cards', id: 'CARDS' },
  { name: 'Roll-Up Standees', href: '/products?category=signs-banners', id: 'STAND' },
  { name: 'Custom Rigid Boxes', href: '/products/custom-rigid-box', id: 'BOXES' },
  { name: 'Marketing Flyers', href: '/products?category=marketing-materials', id: 'FLYERS' },
  { name: 'Corporate Apparel', href: '/products?category=corporate-apparel', id: 'APPAREL' },
  { name: 'Labels & Stickers', href: '/products?category=labels-stickers', id: 'LABELS' },
  { name: 'Letterheads & Stationery', href: '/products?category=stationery', id: 'OFFICE' },
];

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout, getRoleDestination } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchDrawerOpen, setSearchDrawerOpen] = useState(false);
  const [cartCount, setCartCount] = useState<number>(0);
  const { wishlistCount } = useWishlist();
  const userDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(event.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    if (userDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userDropdownOpen]);

  // Sync cart count from localStorage
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

  const handleLogout = async () => {
    setUserDropdownOpen(false);
    await logout();
  };

  return (
    <div className="w-full max-w-full bg-white border-b border-[#E5E5E5] sticky top-0 z-50">
      {/* 1. TOP MARQUEE BAR (Above Header, Marquee Style & Responsive for All Devices) */}
      <TopMarqueeBar />

      {/* 2. MAIN STOREFRONT HEADER */}
      <header className="px-3 sm:px-8 py-2 sm:py-2.5 bg-white border-b border-[#E5E5E5] w-full relative z-30">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-2 sm:gap-4 lg:gap-8">
          {/* Brand Logo - Sleek & compact on mobile, standard on desktop */}
          <Link href="/" className="flex items-center group flex-shrink-0" aria-label="Print Bazzar Home">
            <Image
              src="/brand-logo.png"
              alt="Print Bazzar"
              width={160}
              height={30}
              priority
              style={{ width: 'auto', height: 'auto' }}
              className="h-[17px] xs:h-[18px] sm:h-[24px] md:h-[28px] lg:h-[30px] w-auto object-contain transition-transform duration-200 group-hover:scale-102"
            />
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Search Icon Button - Opens Side Drawer */}
            <button
              type="button"
              onClick={() => setSearchDrawerOpen(true)}
              aria-label="Open search drawer"
              className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-black hover:text-black rounded-full hover:bg-neutral-100 transition-colors group cursor-pointer shrink-0"
              title="Search products"
            >
              <Search className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] text-black group-hover:scale-110 transition-transform" />
            </button>

            {/* Wishlist Button - Icon Only */}
            <Link
              href="/wishlist"
              className="relative w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-black hover:text-black rounded-full hover:bg-neutral-100 transition-colors group shrink-0"
              title="Saved Wishlist"
              aria-label="Wishlist"
            >
              <div className="relative flex items-center justify-center">
                <Heart className="h-[18px] w-[18px] sm:h-[20px] sm:w-[20px] text-black group-hover:scale-110 transition-transform" />
                {wishlistCount > 0 && (
                  <span className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 min-w-[15px] sm:min-w-[17px] h-[15px] sm:h-[17px] px-0.5 rounded-full bg-[#FFED00] text-black font-bold text-[8.5px] sm:text-[9px] flex items-center justify-center border border-black shadow-xs">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </div>
            </Link>

            {/* Cart Button - Hidden on mobile view alone, visible on sm and above */}
            <Link
              href="/cart"
              className="relative hidden sm:flex w-9 h-9 items-center justify-center text-black hover:text-black rounded-full hover:bg-neutral-100 transition-colors group shrink-0"
              title="Shopping Cart"
              aria-label="Shopping Cart"
            >
              <div className="relative flex items-center justify-center">
                <ShoppingCart className="h-[20px] w-[20px] text-black group-hover:scale-110 transition-transform" />
                {cartCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[17px] h-[17px] px-0.5 rounded-full bg-[#FFED00] text-black font-bold text-[9px] flex items-center justify-center border border-black shadow-xs">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </div>
            </Link>

            {/* User Profile or Login - Hidden on mobile view alone, visible on sm and above */}
            {isAuthenticated && user ? (
              <div ref={userDropdownRef} className="relative z-50 shrink-0 hidden sm:block">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  aria-label="User Account Menu"
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[#E5E7EB] hover:border-black text-[13px] font-semibold text-black bg-white transition cursor-pointer shadow-2xs"
                >
                  <div className="h-5 w-5 rounded-full bg-[#FFED00] text-black font-bold text-[10px] flex items-center justify-center border border-black/10">
                    {user.fullName.charAt(0).toUpperCase()}
                  </div>
                  <span className="max-w-[120px] truncate">
                    {user.fullName.split(' ')[0]}
                  </span>
                  <ChevronDown className="h-3 w-3 text-[#64748B]" />
                </button>

                {userDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#E5E7EB] rounded-[8px] shadow-2xl py-2 text-xs text-black z-[9999] animate-in fade-in-50 zoom-in-95 duration-150 divide-y divide-[#E5E7EB]">
                    <div className="px-4 py-2 bg-[#F8F8F8]">
                      <p className="font-semibold text-black truncate">{user.fullName}</p>
                      <p className="text-[11px] text-[#737373] font-mono truncate">{user.email}</p>
                      <span className="inline-block mt-1 font-mono text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[#FEFCE8] text-[#854D0E] border border-yellow-200">
                        {user.role.replace(/_/g, ' ')}
                      </span>
                    </div>

                    <div className="py-1">
                      <Link
                        href="/account"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#F5F5F5] font-normal text-black"
                      >
                        <User className="h-3.5 w-3.5 text-[#737373]" />
                        <span>Customer Portal</span>
                      </Link>

                      <Link
                        href="/account/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 hover:bg-[#F5F5F5] font-normal text-black"
                      >
                        <Layers className="h-3.5 w-3.5 text-[#737373]" />
                        <span>Order History</span>
                      </Link>

                      {user.role !== 'CUSTOMER' && (
                        <Link
                          href={getRoleDestination(user.role)}
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center justify-between px-4 py-2 hover:bg-[#FEFCE8] font-semibold text-black border-t border-[#E5E5E5] my-1"
                        >
                          <span>Staff ERP Console</span>
                          <ArrowRight className="h-3.5 w-3.5 text-black" />
                        </Link>
                      )}
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2 px-4 py-2 hover:bg-[#FEF2F2] text-[#B91C1C] font-semibold text-left transition-colors cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] bg-[#FFED00] text-black text-[13px] font-bold border border-black/10 shadow-xs hover:bg-[#F2E100] transition-colors cursor-pointer shrink-0"
              >
                <User className="h-4 w-4" />
                <span>Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 3. CATEGORY NAVIGATION STRIP */}
      <nav className="hidden md:block bg-white border-b border-[#E5E7EB] px-4 sm:px-8 py-2 relative z-10">
        <div className="mx-auto max-w-7xl flex items-center justify-between gap-4 overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-1.5 text-[13px] font-medium">
            {CATEGORIES.map((cat) => {
              const isActive =
                cat.id === 'ALL'
                  ? pathname === '/products'
                  : cat.id === 'BOXES'
                  ? pathname.includes('rigid') || pathname.includes('packaging')
                  : cat.href === pathname || (cat.href !== '/products' && pathname.startsWith(cat.href));
              return (
                <Link
                  key={cat.id}
                  href={cat.href}
                  className={`px-3 py-1.5 rounded-[6px] whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-[#FFED00] text-black font-semibold shadow-xs'
                      : 'text-[#64748B] hover:text-[#080808] hover:bg-[#F8FAFC]'
                  }`}
                >
                  {cat.id === 'ALL' && <Layers className="h-3.5 w-3.5 text-black" />}
                  <span>{cat.name}</span>
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-3 text-[13px] text-[#525252] flex-shrink-0 font-medium">
            <Link href="/products" className="hover:text-black flex items-center gap-1.5 font-bold text-black transition-colors">
              <Sparkles className="h-3.5 w-3.5 text-black" />
              <span>Full Catalogue ➔</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* 4. MOBILE DRAWER */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-[#E5E5E5] p-4 space-y-4 animate-in slide-in-from-top-2 duration-150">
          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setSearchDrawerOpen(true);
            }}
            className="w-full h-9 pl-9 pr-4 text-[13px] bg-[#F5F5F5] border border-[#E5E5E5] rounded-[8px] text-left text-[#737373] relative flex items-center cursor-pointer"
          >
            <Search className="h-4 w-4 text-[#737373] absolute left-3 top-1/2 -translate-y-1/2" />
            <span>Search products, rigid boxes, cards...</span>
          </button>

          <div className="space-y-1">
            <p className="text-[10px] font-mono font-bold text-[#737373] uppercase tracking-wider px-2">
              Browse Categories
            </p>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.id}
                href={cat.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 text-[13px] font-medium text-black hover:bg-[#F5F5F5] rounded-[6px]"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="pt-2 border-t border-[#E5E5E5] flex items-center justify-between">
            <Link
              href="/tracking/PB-2026-0001"
              onClick={() => setMobileMenuOpen(false)}
              className="text-[13px] font-medium text-black flex items-center gap-1.5"
            >
              <Truck className="h-4 w-4 text-[#737373]" />
              <span>Track Order</span>
            </Link>
            <Link
              href="/products/premium-visiting-cards"
              onClick={() => setMobileMenuOpen(false)}
              className="bg-[#FFED00] text-black font-semibold text-[13px] px-3 py-1.5 rounded-[6px] border border-neutral-300"
            >
              Order Now ➔
            </Link>
          </div>
        </div>
      )}

      {/* 5. SEARCH SIDE DRAWER */}
      <SearchDrawer
        isOpen={searchDrawerOpen}
        onClose={() => setSearchDrawerOpen(false)}
      />
    </div>
  );
}

