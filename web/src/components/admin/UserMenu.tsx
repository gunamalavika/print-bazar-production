'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import {
  RiLogoutBoxRLine,
  RiArrowDownSLine,
} from 'react-icons/ri';

export function UserMenu() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!user) return null;

  const initials = user.fullName
    ? user.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'PB';

  const formattedRole = user.role.replace(/_/g, ' ');

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1.5 rounded-[8px] border border-[#E5E5E5] bg-white hover:bg-[#F5F5F5] transition-colors shadow-xs focus:outline-none focus:ring-2 focus:ring-[#FFED00]"
        aria-expanded={isOpen}
        aria-haspopup="true"
        id="admin-user-menu-button"
      >
        <div className="h-8 w-8 rounded-[6px] bg-[#FFED00] text-black font-bold text-xs flex items-center justify-center flex-shrink-0 border border-neutral-300 shadow-xs">
          {initials}
        </div>
        <div className="text-left hidden sm:block pr-1">
          <div className="text-xs font-semibold text-black leading-tight truncate max-w-[130px]">
            {user.fullName}
          </div>
          <div className="text-[10px] font-mono text-[#737373] leading-tight truncate max-w-[130px] uppercase font-medium">
            {formattedRole}
          </div>
        </div>
        <RiArrowDownSLine className="h-4 w-4 text-[#737373] hidden sm:block" />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="admin-user-menu-button"
          className="absolute right-0 mt-2 w-72 bg-white rounded-[8px] border border-[#E5E5E5] shadow-elevated z-50 overflow-hidden divide-y divide-[#E5E5E5] animate-in fade-in zoom-in-95 duration-100"
        >
          {/* Header Identity */}
          <div className="p-3.5 bg-[#F8F8F8]">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-[6px] bg-[#FFED00] text-black font-bold text-xs flex items-center justify-center flex-shrink-0 border border-neutral-300 shadow-xs">
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-black truncate">{user.fullName}</div>
                <div className="text-[11px] text-[#737373] font-mono truncate">{user.email}</div>
                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#FFED00] text-black border border-neutral-300">
                    {formattedRole}
                  </span>
                  {user.department && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#F5F5F5] text-[#525252] border border-[#E5E5E5]">
                      {user.department.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Plant & Shift Session Info */}
          <div className="p-3 text-[11px] font-mono text-[#525252] bg-white space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">PLANT NODE:</span>
              <span className="font-semibold text-black">MUMBAI-PRESS-01</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">ACTIVE SHIFT:</span>
              <span className="font-semibold text-[#166534]">SHIFT A (08:00 - 16:30)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#737373]">RBAC PERMISSIONS:</span>
              <span className="font-semibold text-black">{user.permissions.length} Active Grants</span>
            </div>
          </div>

          {/* Sign Out Action */}
          <div className="p-1.5 bg-[#F8F8F8]">
            <button
              onClick={() => {
                setIsOpen(false);
                logout();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-[#B91C1C] hover:bg-[#FEF2F2] rounded-[6px] transition-colors text-left"
            >
              <RiLogoutBoxRLine className="h-4 w-4" />
              <span>Sign Out of Press Console</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

