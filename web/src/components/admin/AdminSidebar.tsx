'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { getVisibleAdminNavigation } from './navigation';
import {
  RiCloseLine,
  RiLogoutBoxRLine,
  RiSearch2Line,
  RiPrinterLine,
} from 'react-icons/ri';

interface AdminSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AdminSidebar({ isOpen = false, onClose }: AdminSidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

  // Compute authorized sections strictly from backend permissions and role
  const authorizedSections = useMemo(() => {
    return getVisibleAdminNavigation(user?.permissions || [], user?.role);
  }, [user?.permissions, user?.role]);

  // Filter sections and items based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return authorizedSections;
    const q = searchQuery.toLowerCase();

    return authorizedSections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.section.toLowerCase().includes(q) ||
            (item.description && item.description.toLowerCase().includes(q))
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [authorizedSections, searchQuery]);

  const allItemHrefs = useMemo(() => {
    return authorizedSections.flatMap((s) => s.items.map((i) => i.href));
  }, [authorizedSections]);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PB';

  const formattedRole = user?.role ? user.role.replace(/_/g, ' ') : 'OPERATOR';

  const sidebarContent = (
    <div className="h-full flex flex-col justify-between bg-white border-r border-[#E5E5E5] text-black select-none">
      {/* Top Header & Navigation Section */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Brand Identity Header */}
        <div className="p-3.5 sm:p-4 border-b border-[#E5E5E5] bg-[#F8F8F8] flex items-center justify-between flex-shrink-0">
          <Link href="/admin/dashboard" className="flex flex-col gap-1.5 group min-w-0" aria-label="Print Bazzar Admin">
            <Image
              src="/brand-logo.png"
              alt="Print Bazzar"
              width={180}
              height={34}
              priority
              style={{ width: 'auto', height: 'auto' }}
              className="h-7 sm:h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-102"
            />
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#166534]" />
              <span className="text-[10px] font-mono tracking-wider text-[#737373] font-medium uppercase">
                PLANT OPERATING SYSTEM 2.0
              </span>
            </div>
          </Link>

          {/* Mobile Close Button */}
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 rounded-lg text-[#737373] hover:text-black hover:bg-[#F5F5F5] transition-colors"
              aria-label="Close sidebar"
            >
              <RiCloseLine className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Quick Filter Search Bar */}
        <div className="px-3 py-2.5 border-b border-[#E5E5E5] bg-white">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search station, queue, tools..."
              className="w-full h-8 pl-8 pr-3 text-[13px] font-normal bg-[#F5F5F5] text-black border border-[#E5E5E5] rounded-[8px] placeholder:text-[#737373] focus:outline-none focus:border-black focus:bg-white focus:ring-1 focus:ring-black transition-all font-sans"
            />
            <RiSearch2Line className="h-3.5 w-3.5 text-[#737373] absolute left-2.5 top-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 custom-scrollbar">
          {filteredSections.map((section) => (
            <div key={section.id} className="space-y-1">
              <div className="px-2.5 py-1 text-[11px] font-semibold tracking-wider text-[#737373] uppercase">
                {section.title}
              </div>

              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isExact = pathname === item.href;
                  const isSubMatch =
                    !isExact &&
                    item.href !== '/admin' &&
                    item.href !== '/admin/dashboard' &&
                    pathname.startsWith(`${item.href}/`) &&
                    !allItemHrefs.some(
                      (otherHref) =>
                        otherHref !== item.href &&
                        otherHref.startsWith(item.href) &&
                        (pathname === otherHref || pathname.startsWith(`${otherHref}/`))
                    );
                  const isActive = isExact || isSubMatch;

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onClose}
                      className={`group flex items-center justify-between px-2.5 py-2 rounded-[8px] text-[13px] transition-all relative ${
                        isActive
                          ? 'bg-[#FFED00] text-black font-semibold border border-neutral-300 shadow-xs'
                          : 'text-[#525252] hover:text-black hover:bg-[#F5F5F5] font-medium'
                      }`}
                      title={item.description}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Icon
                          className={`h-4 w-4 flex-shrink-0 transition-colors ${
                            isActive ? 'text-black' : 'text-[#737373] group-hover:text-black'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                      </div>

                      {item.badge && (
                        <span
                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded uppercase ${
                            isActive
                              ? 'bg-black text-[#FFED00]'
                              : 'bg-[#FEFCE8] text-[#854D0E] border border-yellow-200'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom User Card & Sign Out */}
      <div className="p-3 border-t border-[#E5E5E5] bg-[#F8F8F8] flex-shrink-0">
        <div className="p-2.5 rounded-[8px] bg-white border border-[#E5E5E5] shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-[6px] bg-[#FFED00] text-black font-bold text-xs flex items-center justify-center flex-shrink-0 border border-neutral-300 shadow-xs">
              {initials}
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-semibold text-black block truncate leading-tight">
                {user?.fullName || 'Plant Operator'}
              </span>
              <span className="text-[10px] font-mono text-[#737373] uppercase tracking-wider block truncate">
                {formattedRole}
              </span>
            </div>
          </div>

          <button
            onClick={() => logout()}
            className="p-1.5 rounded-[6px] text-[#737373] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors"
            title="Sign out of ERP Console"
          >
            <RiLogoutBoxRLine className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="hidden md:flex flex-col w-64 h-screen flex-shrink-0 sticky top-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative w-72 h-full max-w-xs shadow-xl z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

