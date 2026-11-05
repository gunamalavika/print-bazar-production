'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Search,
  Building2,
  FileText,
  DollarSign,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface CustomerRecord {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  gstin: string;
  creditLimit: number;
  currentBalance: number;
  tier: 'ENTERPRISE_GOLD' | 'COMMERCIAL' | 'RETAIL';
  totalOrders: number;
  activeOrders: number;
  gstVerified: boolean;
}

const CUSTOMERS_DATA: CustomerRecord[] = [
  {
    id: 'CUST-001',
    companyName: 'Acme Logistics Corp',
    contactPerson: 'Arjun Raman',
    email: 'arjun.raman@acmelogistics.in',
    phone: '+91 98201 12345',
    gstin: '27AADCB2230M1ZT',
    creditLimit: 250000,
    currentBalance: 0,
    tier: 'ENTERPRISE_GOLD',
    totalOrders: 28,
    activeOrders: 1,
    gstVerified: true,
  },
  {
    id: 'CUST-002',
    companyName: 'Zenith Tech Systems Pvt Ltd',
    contactPerson: 'Pooja Deshmukh',
    email: 'pooja.d@zenithtech.com',
    phone: '+91 98450 67890',
    gstin: '29AABCZ9910K1ZP',
    creditLimit: 100000,
    currentBalance: 12450,
    tier: 'COMMERCIAL',
    totalOrders: 14,
    activeOrders: 2,
    gstVerified: true,
  },
  {
    id: 'CUST-003',
    companyName: 'Kaveri Herbals Natural Care',
    contactPerson: 'Suresh Menon',
    email: 'procurement@kaveriherbals.in',
    phone: '+91 94470 11223',
    gstin: '32AABCK4410H1ZZ',
    creditLimit: 50000,
    currentBalance: 0,
    tier: 'COMMERCIAL',
    totalOrders: 9,
    activeOrders: 1,
    gstVerified: true,
  },
];

export default function CustomersAdminPage() {
  const [search, setSearch] = useState('');

  const filtered = CUSTOMERS_DATA.filter((c) =>
    c.companyName.toLowerCase().includes(search.toLowerCase()) ||
    c.gstin.toLowerCase().includes(search.toLowerCase()) ||
    c.contactPerson.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* 1. Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-[12px] font-mono font-semibold text-slate-500 uppercase tracking-wider">
            <span>CLIENT DIRECTORY</span>
            <span>•</span>
            <span className="text-slate-900 font-bold">CREDIT TERMS & TAX VALIDATION</span>
          </div>
          <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2] mt-1">
            Corporate Customers & Accounts Ledger
          </h1>
          <p className="text-[13px] sm:text-[14px] text-slate-500 leading-normal mt-0.5">
            Verified B2B corporate profiles, GSTIN validation, and approved credit limits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] px-4 py-2 rounded-lg shadow-sm transition">
            + Onboard Corporate Account
          </button>
        </div>
      </div>

      {/* 2. Search & Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <span className="text-slate-500 font-mono text-[12px] font-medium uppercase tracking-wider block">TOTAL CORPORATE ACCOUNTS</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-slate-900 font-mono mt-1 block tabular-nums">142</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <span className="text-slate-500 font-mono text-[12px] font-medium uppercase tracking-wider block">ACTIVE PRODUCTION JOBS</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-slate-900 font-mono mt-1 block tabular-nums">18</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <span className="text-slate-500 font-mono text-[12px] font-medium uppercase tracking-wider block">TOTAL CREDIT LINE ALLOCATED</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-slate-900 font-mono mt-1 block tabular-nums">₹45.0 L</span>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
          <span className="text-slate-500 font-mono text-[12px] font-medium uppercase tracking-wider block">GST RECONCILIATION MATCH</span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-emerald-700 font-mono mt-1 block tabular-nums">100%</span>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="relative max-w-md">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by company, GSTIN, or contact name..."
          className="w-full h-10 text-[14px] font-normal leading-[1.4] bg-white border border-slate-300 rounded-lg pl-3.5 pr-10 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
        />
        <Search className="h-4 w-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* 4. Table */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-mono text-[12px] font-semibold uppercase">
                <th className="p-3.5">COMPANY / CLIENT</th>
                <th className="p-3.5">GSTIN & COMPLIANCE</th>
                <th className="p-3.5">TIER</th>
                <th className="p-3.5">CREDIT LIMIT</th>
                <th className="p-3.5 text-center">ORDERS</th>
                <th className="p-3.5 text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-[13px]">
              {filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-slate-900 text-amber-300 font-semibold flex items-center justify-center text-[11px] shrink-0">
                        {c.companyName.substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <strong className="block text-slate-900 font-semibold text-[13px]">
                          {c.companyName}
                        </strong>
                        <span className="text-slate-500 text-[12px]">
                          {c.contactPerson} • {c.phone}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="p-3.5 font-mono">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-900 tabular-nums">{c.gstin}</span>
                      {c.gstVerified && (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">100% Tax Compliant</span>
                  </td>

                  <td className="p-3.5">
                    <span className="bg-amber-100 text-amber-900 text-[11px] font-mono font-semibold px-2 py-0.5 rounded border border-amber-200">
                      {c.tier}
                    </span>
                  </td>

                  <td className="p-3.5 font-mono">
                    <span className="font-semibold text-slate-900 tabular-nums">
                      {formatCurrency(c.creditLimit)}
                    </span>
                    <span className="text-[11px] text-slate-500 block tabular-nums">
                      Outstanding: {formatCurrency(c.currentBalance)}
                    </span>
                  </td>

                  <td className="p-3.5 text-center font-mono">
                    <span className="font-semibold text-slate-900 tabular-nums">{c.totalOrders}</span>
                    <span className="text-[11px] text-emerald-700 block font-medium tabular-nums">
                      ({c.activeOrders} Active)
                    </span>
                  </td>

                  <td className="p-3.5 text-right">
                    <Link
                      href={`/sales/orders`}
                      className="inline-flex items-center gap-1 bg-white hover:bg-slate-100 text-slate-900 font-medium px-2.5 py-1.5 rounded-lg border border-slate-200 text-[12px] transition"
                    >
                      <span>View Orders</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
