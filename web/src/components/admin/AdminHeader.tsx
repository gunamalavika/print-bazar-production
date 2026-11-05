'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Breadcrumbs } from './Breadcrumbs';
import { UserMenu } from './UserMenu';
import {
  RiMenu2Line,
  RiNotification3Line,
  RiPrinterLine,
} from 'react-icons/ri';

interface AdminHeaderProps {
  onToggleSidebar?: () => void;
}

export function AdminHeader({ onToggleSidebar }: AdminHeaderProps) {
  return (
    <header className="h-14 bg-white border-b border-[#E5E5E5] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
      {/* Left: Mobile hamburger + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="md:hidden p-1.5 rounded-[6px] border border-[#E5E5E5] text-[#525252] hover:text-black hover:bg-[#F5F5F5] transition-colors"
          aria-label="Toggle Navigation Sidebar"
        >
          <RiMenu2Line className="h-5 w-5" />
        </button>

        <Link
          href="/admin/dashboard"
          className="flex items-center gap-2 border-r border-[#E5E5E5] pr-3 mr-1 group"
          title="Print Bazzar Plant OS"
        >
          <Image
            src="/logo-icon.png"
            alt="Print Bazzar"
            width={24}
            height={24}
            className="h-6 w-6 object-contain rounded-full transition-transform group-hover:scale-105"
          />
          <span className="hidden sm:inline font-mono text-xs font-bold tracking-tight text-black">
            PLANT OS
          </span>
        </Link>

        {/* Contextual Breadcrumbs */}
        <div className="overflow-hidden">
          <Breadcrumbs />
        </div>
      </div>

      {/* Right: Operational Status, Notifications & Authenticated User */}
      <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
        {/* Plant Status Indicator */}
        <div className="hidden xl:flex items-center gap-2 px-2.5 py-1 rounded-[6px] bg-[#F5F5F5] border border-[#E5E5E5] font-mono text-[10px]">
          <span className="h-2 w-2 rounded-full bg-[#166534]" />
          <span className="font-semibold text-black">PRESS ONLINE</span>
          <span className="text-[#737373]">•</span>
          <span className="text-[#525252]">SHIFT A</span>
        </div>

        {/* System Notifications */}
        <button
          type="button"
          aria-label="Factory Alerts and System Notifications"
          className="relative p-2 rounded-[6px] text-[#525252] hover:text-black hover:bg-[#F5F5F5] transition-colors border border-transparent hover:border-[#E5E5E5]"
          title="Factory Alerts (0)"
        >
          <RiNotification3Line className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-[#FFED00] ring-2 ring-white border border-neutral-300" />
        </button>

        {/* Dynamic Authenticated User Menu */}
        <UserMenu />
      </div>
    </header>
  );
}

