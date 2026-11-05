'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { RiAlertLine, RiRefreshLine, RiHome4Line } from 'react-icons/ri';
import { Button } from '@/components/ui';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('App Router Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center">
      <div className="h-16 w-16 bg-red-50 text-red-600 border border-red-200 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <RiAlertLine className="h-8 w-8" />
      </div>

      <span className="font-mono text-xs font-bold text-red-700 uppercase tracking-widest bg-red-100 px-2.5 py-1 rounded-full border border-red-200 mb-3">
        SYSTEM EXCEPTION ENCOUNTERED
      </span>

      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-display max-w-md">
        An Unexpected Error Occurred
      </h1>

      <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2.5 leading-relaxed">
        {error?.message || 'The server encountered an error while processing this page or layout.'}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
        <Button variant="primary" size="md" onClick={() => reset()}>
          <RiRefreshLine className="h-4 w-4 mr-1.5" />
          <span>Retry Operation</span>
        </Button>
        <Link href="/">
          <Button variant="outline" size="md">
            <RiHome4Line className="h-4 w-4 mr-1.5" />
            <span>Storefront Home</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
