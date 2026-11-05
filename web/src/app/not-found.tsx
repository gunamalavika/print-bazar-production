'use client';

import Link from 'next/link';
import { RiPrinterLine, RiArrowLeftLine, RiSearch2Line } from 'react-icons/ri';
import { Button } from '@/components/ui';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 bg-[#FFFBEB] text-slate-900 border border-[#FFED00] rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <RiPrinterLine className="h-8 w-8 text-slate-900" />
      </div>

      <span className="font-mono text-xs font-bold text-[#E3A008] uppercase tracking-widest bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200 mb-3">
        404 — PAGE NOT FOUND
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight font-display max-w-md">
        This Print Job or Page Doesn&apos;t Exist
      </h1>

      <p className="text-sm text-slate-600 max-w-md mt-2.5 leading-relaxed">
        The route you are looking for may have been moved, renamed, or is restricted to internal factory operators.
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Link href="/">
          <Button variant="primary" size="md">
            <RiArrowLeftLine className="h-4 w-4 mr-1.5" />
            <span>Return to Storefront</span>
          </Button>
        </Link>
        <Link href="/products">
          <Button variant="outline" size="md">
            <RiSearch2Line className="h-4 w-4 mr-1.5" />
            <span>Browse Products</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
