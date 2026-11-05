'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RiAddLine,
  RiStackLine,
  RiExchangeLine,
  RiAlertLine,
  RiSearch2Line,
  RiLoader4Line,
  RiCloseLine,
  RiHistoryLine,
  RiArrowLeftLine,
  RiCheckboxCircleLine,
} from 'react-icons/ri';
import { formatCurrency } from '@/lib/utils';
import { api, InventoryItemDto } from '@/lib/api';

export default function AdminInventoryPage() {
  const [items, setItems] = useState<InventoryItemDto[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [activeView, setActiveView] = useState<'ITEMS' | 'MOVEMENTS'>('ITEMS');

  // Modal State: Create Item
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState<any>('SUBSTRATE');
  const [unit, setUnit] = useState('SHEETS');
  const [currentStock, setCurrentStock] = useState<number>(1000);
  const [minThreshold, setMinThreshold] = useState<number>(200);
  const [costPerUnit, setCostPerUnit] = useState<number>(10);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  // Modal State: Record Movement
  const [movementItem, setMovementItem] = useState<InventoryItemDto | null>(null);
  const [movementType, setMovementType] = useState<any>('STOCK_IN');
  const [movementQty, setMovementQty] = useState<number>(100);
  const [movementNotes, setMovementNotes] = useState('');
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [inventoryData, movementsData] = await Promise.all([
        api.adminListInventory({ lowStockOnly }),
        api.adminListStockMovements(),
      ]);
      setItems(inventoryData || []);
      setMovements(movementsData || []);
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lowStockOnly]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !sku) return;

    try {
      await api.adminCreateInventoryItem({
        name,
        sku,
        category,
        unit,
        currentStock: Number(currentStock),
        minStockThreshold: Number(minThreshold),
        costPerUnit: Number(costPerUnit),
        location,
        notes,
      });
      setIsCreateModalOpen(false);
      setName('');
      setSku('');
      setLocation('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to create inventory item');
    }
  };

  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementItem || !movementQty) return;

    setIsSubmittingMovement(true);
    try {
      await api.adminRecordStockMovement(movementItem.id, {
        type: movementType,
        quantity: Number(movementQty),
        notes: movementNotes,
      });
      setMovementItem(null);
      setMovementQty(100);
      setMovementNotes('');
      await loadData();
    } catch (err: any) {
      alert(err?.message || 'Failed to record stock movement');
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.location && item.location.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesCat && matchesSearch;
  });

  const lowStockCount = items.filter(
    (i) => Number(i.currentStock) <= Number(i.minStockThreshold),
  ).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/admin/products"
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 transition mr-1"
              title="Back to Products"
            >
              <RiArrowLeftLine className="h-4 w-4" />
            </Link>
            <h1 className="text-[24px] sm:text-[28px] font-semibold text-slate-900 tracking-tight leading-[1.2]">
              Materials & Substrate Inventory
            </h1>
          </div>
          <p className="text-[13px] text-slate-500 mt-1">
            Raw paper sheets, greyboards, lamination films, hot stamping foils & stock ledger.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setActiveView(activeView === 'ITEMS' ? 'MOVEMENTS' : 'ITEMS')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            <RiHistoryLine className="h-4 w-4" />
            <span>{activeView === 'ITEMS' ? 'Stock Ledger' : 'Inventory Items'}</span>
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-[#FFED00] hover:bg-[#F2E100] text-slate-950 font-semibold text-[13px] px-4 py-2.5 rounded-lg border border-[#E3A008]/40 shadow-xs transition active:scale-95"
          >
            <RiAddLine className="h-4 w-4" />
            <span>Add Raw Material</span>
          </button>
        </div>
      </div>

      {/* Metrics Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[12px] font-mono uppercase text-slate-500 font-medium tracking-wider block">
            Total Material SKUs
          </span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-slate-900 font-mono mt-1 block tabular-nums leading-tight">
            {items.length}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[12px] font-mono uppercase text-rose-600 font-medium tracking-wider block">
            Low Stock Alerts
          </span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-rose-600 font-mono mt-1 block tabular-nums leading-tight">
            {lowStockCount}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[12px] font-mono uppercase text-emerald-600 font-medium tracking-wider block">
            Substrates & Boards
          </span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-emerald-600 font-mono mt-1 block tabular-nums leading-tight">
            {items.filter((i) => i.category === 'SUBSTRATE' || i.category === 'BOARD').length}
          </span>
        </div>

        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <span className="text-[12px] font-mono uppercase text-amber-600 font-medium tracking-wider block">
            Consumables & Inks
          </span>
          <span className="text-[24px] sm:text-[28px] font-semibold text-amber-600 font-mono mt-1 block tabular-nums leading-tight">
            {items.filter((i) => i.category === 'INK_CONSUMABLE').length}
          </span>
        </div>
      </div>

      {activeView === 'ITEMS' ? (
        <>
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="relative w-full md:w-80">
              <RiSearch2Line className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search materials, SKU, location..."
                className="w-full h-10 bg-white border border-slate-300 rounded-lg pl-9 pr-4 text-[14px] font-normal leading-[1.4] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-10 bg-white border border-slate-300 rounded-lg px-3 text-[13px] font-medium text-slate-700 focus:outline-none focus:border-slate-900"
              >
                <option value="ALL">All Categories</option>
                <option value="SUBSTRATE">Paper Substrates</option>
                <option value="BOARD">Rigid Boards</option>
                <option value="INK_CONSUMABLE">Inks & Lamination Films</option>
                <option value="PACKAGING">Packaging Materials</option>
              </select>

              <button
                type="button"
                onClick={() => setLowStockOnly(!lowStockOnly)}
                className={`h-10 px-3.5 rounded-lg border text-[13px] font-medium transition ${
                  lowStockOnly
                    ? 'bg-rose-50 text-rose-700 border-rose-200 font-semibold'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                {lowStockOnly ? 'Showing Low Stock' : 'Filter Low Stock'}
              </button>
            </div>
          </div>

          {/* Inventory Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            {isLoading ? (
              <div className="py-20 text-center flex flex-col items-center">
                <RiLoader4Line className="h-8 w-8 text-amber-500 animate-spin mb-2" />
                <span className="text-[13px] font-mono text-slate-500">Loading Material Stock...</span>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[14px] font-medium text-slate-600">No inventory materials match the filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[12px] font-mono uppercase text-slate-600 font-semibold">
                      <th className="py-3.5 px-4">Material / Item</th>
                      <th className="py-3.5 px-4">SKU & Category</th>
                      <th className="py-3.5 px-4">Current Stock</th>
                      <th className="py-3.5 px-4">Threshold</th>
                      <th className="py-3.5 px-4">Cost / Unit</th>
                      <th className="py-3.5 px-4">Location</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[13px]">
                    {filteredItems.map((item) => {
                      const isLowStock = Number(item.currentStock) <= Number(item.minStockThreshold);

                      return (
                        <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-4 font-semibold text-slate-900">
                            {item.name}
                            {item.notes && (
                              <span className="text-[11px] text-slate-400 font-normal block mt-0.5">
                                {item.notes}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="text-[11px] font-mono font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                              {item.sku}
                            </span>
                            <span className="text-[11px] font-mono text-slate-400 block mt-0.5">
                              {item.category}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`font-mono font-semibold text-[13px] tabular-nums ${
                                  isLowStock ? 'text-rose-600' : 'text-slate-900'
                                }`}
                              >
                                {item.currentStock} {item.unit}
                              </span>
                              {isLowStock && (
                                <span className="bg-rose-100 text-rose-700 text-[10px] font-mono font-semibold px-1.5 py-0.5 rounded">
                                  LOW STOCK
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono text-slate-500 tabular-nums text-[12px]">
                            Min: {item.minStockThreshold} {item.unit}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                            {formatCurrency(Number(item.costPerUnit))}
                          </td>

                          <td className="py-3.5 px-4 text-slate-600 font-mono text-[12px]">
                            {item.location || 'Central Floor'}
                          </td>

                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setMovementItem(item);
                                setMovementType('STOCK_IN');
                                setMovementQty(100);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-[12px] font-semibold hover:bg-slate-800 transition shadow-sm"
                            >
                              Adjust / Stock In
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : (
        /* Stock Movement Ledger */
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h3 className="text-[12px] font-mono font-semibold text-slate-700 uppercase tracking-wider">
              Immutable Stock Movement Ledger
            </h3>
            <span className="text-[11px] font-mono text-slate-500">
              Showing recent {movements.length} transactions
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[12px] font-mono uppercase text-slate-600 font-semibold">
                  <th className="py-3.5 px-4">Timestamp</th>
                  <th className="py-3.5 px-4">Item</th>
                  <th className="py-3.5 px-4">Movement Type</th>
                  <th className="py-3.5 px-4">Quantity</th>
                  <th className="py-3.5 px-4">Balance After</th>
                  <th className="py-3.5 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-[13px]">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4 font-mono text-slate-500 text-[12px] tabular-nums">
                      {new Date(m.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">
                      {m.inventoryItem?.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-slate-900 tabular-nums">
                      {m.quantity}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600 tabular-nums">
                      {m.balanceAfter}
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 text-[12px]">
                      {m.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: CREATE MATERIAL ITEM */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-[15px] font-semibold text-slate-900">
                Add Raw Material / Stock Item
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateItem} className="p-5 space-y-3.5">
              <div>
                <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!sku) {
                      setSku(`RAW-${e.target.value.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`);
                    }
                  }}
                  placeholder="e.g. 350 GSM Art Card Sheets 25x36"
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-normal leading-[1.4] text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">SKU Code *</label>
                  <input
                    type="text"
                    required
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full h-10 bg-slate-50 border border-slate-300 rounded-lg px-3 text-[14px] font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    <option value="SUBSTRATE">Paper Substrate</option>
                    <option value="BOARD">Rigid Board</option>
                    <option value="INK_CONSUMABLE">Ink & Film</option>
                    <option value="PACKAGING">Packaging Unit</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Stock Unit *</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                  >
                    <option value="SHEETS">SHEETS</option>
                    <option value="ROLLS">ROLLS</option>
                    <option value="KG">KG</option>
                    <option value="PIECES">PIECES</option>
                    <option value="LITERS">LITERS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(Number(e.target.value))}
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Min Low Stock Alert</label>
                  <input
                    type="number"
                    value={minThreshold}
                    onChange={(e) => setMinThreshold(Number(e.target.value))}
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Cost Per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPerUnit}
                    onChange={(e) => setCostPerUnit(Number(e.target.value))}
                    className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-mono font-medium text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Warehouse Location</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Paper Bay A-12"
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-normal text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] shadow-sm transition"
                >
                  Save Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: RECORD STOCK MOVEMENT */}
      {movementItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xl max-w-sm w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="text-[15px] font-semibold text-slate-900">
                Stock Adjustment: {movementItem.name}
              </h3>
              <button onClick={() => setMovementItem(null)} className="p-1 rounded text-slate-400 hover:text-slate-600">
                <RiCloseLine className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRecordMovement} className="p-5 space-y-3.5">
              <div>
                <span className="text-[12px] font-mono text-slate-500 block">
                  Current Available Stock: <strong className="text-slate-900 font-semibold">{movementItem.currentStock} {movementItem.unit}</strong>
                </span>
              </div>

              <div>
                <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Movement Type</label>
                <select
                  value={movementType}
                  onChange={(e) => setMovementType(e.target.value)}
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-medium text-slate-900 focus:outline-none focus:border-slate-900"
                >
                  <option value="STOCK_IN">STOCK IN (Received from Supplier)</option>
                  <option value="CONSUMPTION">CONSUMPTION (Used on Shop Floor)</option>
                  <option value="ADJUSTMENT">ADJUSTMENT (Audit Reconciliation)</option>
                  <option value="RETURN">RETURN (Scrap or Return)</option>
                </select>
              </div>

              <div>
                <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Quantity ({movementItem.unit}) *</label>
                <input
                  type="number"
                  required
                  value={movementQty}
                  onChange={(e) => setMovementQty(Number(e.target.value))}
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-mono font-semibold text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-[12px] sm:text-[13px] font-medium text-slate-700 mb-1">Notes / Reason</label>
                <input
                  type="text"
                  value={movementNotes}
                  onChange={(e) => setMovementNotes(e.target.value)}
                  placeholder="e.g. Received PO-2026-0045"
                  className="w-full h-10 bg-white border border-slate-300 rounded-lg px-3 text-[14px] font-normal text-slate-900 focus:outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 placeholder:text-slate-400"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setMovementItem(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingMovement}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-[13px] shadow-sm transition disabled:opacity-50"
                >
                  {isSubmittingMovement ? 'Recording...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
