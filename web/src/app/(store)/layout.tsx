import React from 'react';
import { Navbar } from '@/components/Navbar';
import { StorefrontMobileBottomNav } from '@/components/StorefrontMobileBottomNav';
import { Footer } from '@/components/Footer';

export default function CustomerStoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white w-full max-w-full overflow-x-clip">
      {/* Customer Storefront Navigation (Navbar with categories, promo ribbon, live cart) */}
      <Navbar />

      {/* Storefront Page Content (padded on mobile to accommodate bottom nav) */}
      <main className="flex-1 w-full max-w-full overflow-x-clip pb-16 md:pb-0">{children}</main>

      {/* Mobile-First Bottom Navigation Bar */}
      <StorefrontMobileBottomNav />

      {/* Official PrintBazaar Store Footer */}
      <Footer />
    </div>
  );
}
