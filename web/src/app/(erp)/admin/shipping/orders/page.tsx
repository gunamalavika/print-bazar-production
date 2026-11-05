'use client';

import React, { useState, useEffect } from 'react';
import {
  RiTruckLine,
  RiSearch2Line,
  RiFilter3Line,
  RiRefreshLine,
  RiEditLine,
  RiCheckboxCircleLine,
  RiAlertLine,
  RiTimeLine,
  RiEyeLine,
  RiExternalLinkLine,
} from 'react-icons/ri';
import { api } from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { Modal } from '@/components/ui';
import { ShippingNavTabs } from '../components/ShippingNavTabs';

export default function ShippingOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Dispatch Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrierName, setCarrierName] = useState('Delhivery');
  const [shippingStatus, setShippingStatus] = useState('IN_TRANSIT');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.listShippingOrders({
        page,
        limit: 20,
        search: search.trim() || undefined,
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
      });

      if (res && Array.isArray(res.items)) {
        setOrders(res.items);
        setTotalPages(res.totalPages || 1);
        setTotalItems(res.total || res.items.length);
      } else if (Array.isArray(res)) {
        setOrders(res);
        setTotalPages(1);
        setTotalItems(res.length);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load shipping orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchOrders();
  };

  const openUpdateModal = (order: any) => {
    setSelectedOrder(order);
    setTrackingNumber(order.trackingNumber || '');
    setCarrierName(order.carrierName || 'Delhivery');
    setShippingStatus(order.shippingStatus || 'IN_TRANSIT');
    setIsModalOpen(true);
  };

  const handleUpdateShipping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;
    setIsUpdating(true);
    try {
      await api.updateShippingOrderStatus(selectedOrder.id, {
        shippingStatus,
        trackingNumber: trackingNumber.trim() || undefined,
        carrierName: carrierName.trim() || undefined,
      });
      setIsModalOpen(false);
      fetchOrders();
    } catch (err: any) {
      alert(err?.message || 'Failed to update order shipping status');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shipping Orders & Fulfillment</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track order dispatch weights, destination zones, logistics charges, and courier tracking details.
          </p>
        </div>
        <button
          onClick={fetchOrders}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition w-fit"
        >
          <RiRefreshLine className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh Orders
        </button>
      </div>

      <ShippingNavTabs />

      {/* Filter and Search Bar */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full flex items-center gap-2">
          <div className="relative flex-1">
            <RiSearch2Line className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Order ID, Customer, or PIN Code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition"
          >
            Search
          </button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            <RiFilter3Line className="w-4 h-4 text-slate-400" />
            <span className="font-semibold whitespace-nowrap">Shipping Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
          >
            <option value="ALL">All Statuses ({totalItems})</option>
            <option value="PENDING">Pending Fulfillment</option>
            <option value="PACKED">Packed & Weighed</option>
            <option value="IN_TRANSIT">In Transit</option>
            <option value="DELIVERED">Delivered</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RiAlertLine className="w-5 h-5 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchOrders} className="underline font-bold">Retry</button>
        </div>
      )}

      {/* Orders Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Order ID & Date</th>
                <th className="py-3 px-4">Customer & Destination</th>
                <th className="py-3 px-4">Zone</th>
                <th className="py-3 px-4 text-right">Billable Weight</th>
                <th className="py-3 px-4 text-right">Shipping Fee</th>
                <th className="py-3 px-4 text-center">Fulfillment Status</th>
                <th className="py-3 px-4">Tracking Info</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    Loading shipping orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No shipping orders found matching criteria.
                  </td>
                </tr>
              ) : (
                orders.map((order) => {
                  const billableG = order.shippingSnapshot?.billableWeightGrams || 500;
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/60 transition">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-slate-900">{order.orderNumber || order.id?.slice(0, 8)}</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'Recent'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{order.customerName || order.user?.name || 'Customer'}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                          PIN: {order.destinationPincode || order.shippingAddress?.pincode || '110001'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-800">
                          {order.shippingSnapshot?.zoneCode || 'LOCAL'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold text-slate-700">
                        {billableG >= 1000 ? `${(billableG / 1000).toFixed(2)} kg` : `${billableG} g`}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                        {formatCurrency(order.shippingFee || order.shippingSnapshot?.finalShippingCharge || 0)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            order.shippingStatus === 'DELIVERED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : order.shippingStatus === 'IN_TRANSIT'
                              ? 'bg-sky-100 text-sky-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {order.shippingStatus || 'PENDING'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {order.trackingNumber ? (
                          <div>
                            <div className="font-mono font-bold text-slate-800">{order.trackingNumber}</div>
                            <div className="text-[10px] text-slate-400">{order.carrierName || 'Courier'}</div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Not Assigned</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openUpdateModal(order)}
                          className="px-2.5 py-1 text-xs font-semibold text-sky-600 hover:text-sky-800 hover:bg-sky-50 rounded transition"
                        >
                          Update Tracking
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing Page {page} of {totalPages} ({totalItems} total orders)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 border border-slate-300 rounded bg-white hover:bg-slate-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dispatch Tracking Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Update Shipping: ${selectedOrder?.orderNumber || 'Order'}`}
      >
        <form onSubmit={handleUpdateShipping} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Logistics Status</label>
            <select
              value={shippingStatus}
              onChange={(e) => setShippingStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              <option value="PENDING">Pending Packaging</option>
              <option value="PACKED">Packed & Weighed</option>
              <option value="IN_TRANSIT">Handed Over / In Transit</option>
              <option value="OUT_FOR_DELIVERY">Out for Delivery</option>
              <option value="DELIVERED">Delivered</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Courier Carrier</label>
              <input
                type="text"
                placeholder="e.g. Delhivery, BlueDart, DTDC"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">AWB / Tracking Number</label>
              <input
                type="text"
                placeholder="e.g. 12948291048"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg transition disabled:opacity-50"
            >
              {isUpdating ? 'Saving...' : 'Update Dispatch Info'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

