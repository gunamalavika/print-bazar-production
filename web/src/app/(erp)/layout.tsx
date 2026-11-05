'use client';

import React from 'react';
import { AdminShell } from '@/components/admin/AdminShell';

export default function ErpLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="erp-root font-sans text-[14px] leading-[1.5] text-black bg-[#F8F8F8]">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
