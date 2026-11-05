'use client';

import Link from 'next/link';

const CATEGORIES = [
  { name: 'All Products', href: '/products', active: true },
  { name: 'Visiting Cards', href: '/products/premium-visiting-cards' },
  { name: 'Apparel, Bags & Caps', href: '/products' },
  { name: 'Labels, Packaging & Stickers', href: '/products' },
  { name: 'Corporate Gifts', href: '/products' },
  { name: 'Signs, Poster & Marketing', href: '/products/roll-up-luxury-standee' },
  { name: 'Letterheads & Stationery', href: '/products' },
  { name: 'Custom Rigid Boxes', href: '/products' },
];

export function CategoryNav() {
  return (
    <div className="bg-white border-b border-brand-border px-4 sm:px-8 py-2.5 overflow-x-auto">
      <div className="mx-auto max-w-7xl flex items-center justify-between gap-6 text-xs font-semibold text-zinc-600 whitespace-nowrap">
        {CATEGORIES.map((cat, idx) => (
          <Link
            key={idx}
            href={cat.href}
            className={`transition-colors hover:text-brand-dark ${
              cat.active ? 'text-brand-dark font-extrabold' : ''
            }`}
          >
            {cat.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
