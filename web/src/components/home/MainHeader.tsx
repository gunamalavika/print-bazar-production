'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Printer,
  Search,
  ShoppingBag,
  ArrowRight,
  User,
  ChevronDown,
  LogOut,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';

export function MainHeader() {
  const router = useRouter();
  const { user, isAuthenticated, logout, getRoleDestination } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <header className="bg-white border-b border-brand-border px-4 sm:px-8 py-3 sticky top-0 z-40">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-6">
        {/* Brand Logo */}
        <Link href="/" className="flex items-center group flex-shrink-0" aria-label="Print Bazzar Home">
          <Image
            src="/brand-logo.png"
            alt="Print Bazzar"
            width={212}
            height={40}
            priority
            style={{ width: 'auto', height: 'auto' }}
            className="h-8 sm:h-9 md:h-10 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
          />
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden lg:flex items-center gap-7 text-xs font-semibold text-zinc-700">
          <Link href="/products" className="hover:text-brand-dark transition">
            Products
          </Link>
          <Link href="/products" className="hover:text-brand-dark transition">
            Services
          </Link>
          <Link href="/account" className="hover:text-brand-dark transition">
            Business
          </Link>
          <a href="#how-it-works" className="hover:text-brand-dark transition">
            How It Works
          </a>
          <a href="#why-us" className="hover:text-brand-dark transition">
            About Us
          </a>
          <a href="#contact" className="hover:text-brand-dark transition">
            Contact
          </a>
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Search Trigger */}
          <div className="relative">
            {searchOpen ? (
              <form onSubmit={handleSearchSubmit} className="flex items-center">
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products..."
                  className="w-48 sm:w-60 h-9 px-3 text-xs bg-[#FAFAFA] border border-brand-border rounded-[6px] focus:outline-none focus:border-brand-dark"
                  onBlur={() => !searchQuery && setSearchOpen(false)}
                />
              </form>
            ) : (
              <button
                onClick={() => setSearchOpen(true)}
                className="p-2 text-zinc-600 hover:text-brand-dark rounded-full hover:bg-zinc-100 transition cursor-pointer"
                title="Search"
              >
                <Search className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Cart Icon with Yellow Counter Badge */}
          <Link
            href="/cart"
            className="relative p-2 text-zinc-700 hover:text-brand-dark rounded-full hover:bg-zinc-100 transition"
            title="Shopping Cart"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-[#FCDD55] text-brand-dark font-black text-[9px] flex items-center justify-center border border-brand-dark">
              0
            </span>
          </Link>

          {/* Login or User Profile Button */}
          {isAuthenticated && user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-brand-border hover:border-brand-dark text-xs font-bold text-brand-dark bg-white transition cursor-pointer"
              >
                <div className="h-4 w-4 rounded-full bg-[#FCDD55] text-brand-dark font-bold text-[9px] flex items-center justify-center">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <span className="hidden sm:inline">{user.fullName.split(' ')[0]}</span>
                <ChevronDown className="h-3 w-3 text-zinc-400" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-brand-border rounded-[8px] shadow-card py-2 text-xs text-brand-dark z-50">
                  <div className="px-3 py-1.5 border-b border-zinc-100">
                    <p className="font-bold truncate">{user.fullName}</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">{user.email}</p>
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setUserDropdownOpen(false)}
                    className="block px-3 py-1.5 hover:bg-zinc-50 font-medium"
                  >
                    My Account
                  </Link>
                  {user.role !== 'CUSTOMER' && (
                    <Link
                      href={getRoleDestination(user.role)}
                      onClick={() => setUserDropdownOpen(false)}
                      className="block px-3 py-1.5 hover:bg-zinc-50 font-bold text-amber-900"
                    >
                      ERP Console ➔
                    </Link>
                  )}
                  <button
                    onClick={() => {
                      logout();
                      setUserDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 text-red-600 font-bold"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="px-3.5 py-1.5 rounded-[6px] border border-brand-border hover:border-brand-dark text-xs font-bold text-brand-dark bg-white transition"
            >
              Login
            </Link>
          )}

          {/* Primary CTA Button: Yellow #FCDD55 */}
          <Link
            href="/products/premium-visiting-cards"
            className="group flex items-center gap-1.5 bg-[#FCDD55] hover:bg-[#FBBF24] text-brand-dark font-bold text-xs px-4 py-2 rounded-[6px] border border-brand-dark shadow-subtle transition active:scale-[0.98]"
          >
            <span>START YOUR ORDER</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}
