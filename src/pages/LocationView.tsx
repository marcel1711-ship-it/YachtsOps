import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Package,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Minus,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { demoInventoryItems, demoUsers } from '../data/demoData';
import { isLowStock } from '../utils/helpers';
import { InventoryItem } from '../types';

interface LocationViewProps {
  onNavigate: (page: string, params?: any) => void;
  location: string;
}

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const LocationView: React.FC<LocationViewProps> = ({ onNavigate, location }) => {
  const { currentUser } = useAuth();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [successItem, setSuccessItem] = useState<string | null>(null);

  useEffect(() => {
    loadItems();
  }, [location, currentUser]);

  const loadItems = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      const demo = demoInventoryItems.filter(
        i => i.storage_location?.toLowerCase() === location.toLowerCase()
      );
      setItems(demo as InventoryItem[]);
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('inventory_items')
      .select('*')
      .ilike('storage_location', location);

    setItems(data || []);
    setLoading(false);
  };

  const handleAdjust = async () => {
    if (!selectedItem || !currentUser || isDemoUser(currentUser.email)) return;
    if (!adjustReason.trim()) { alert('Please provide a reason'); return; }

    setAdjusting(true);

    const newStock =
      adjustType === 'in'
        ? selectedItem.current_stock + adjustQty
        : adjustType === 'out'
        ? Math.max(0, selectedItem.current_stock - adjustQty)
        : adjustQty;

    const delta = adjustType === 'adjustment' ? newStock - selectedItem.current_stock : adjustQty;

    const { error: moveErr } = await supabase.from('stock_movements').insert({
      inventory_id: selectedItem.id,
      vessel_id: selectedItem.vessel_id,
      movement_type: adjustType,
      quantity: delta,
      reason: adjustReason,
      performed_by_id: currentUser.id,
      performed_by_name: currentUser.full_name,
    });

    if (!moveErr) {
      await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', selectedItem.id);
      setSuccessItem(selectedItem.id);
      setTimeout(() => setSuccessItem(null), 2500);
      setSelectedItem(null);
      setAdjustReason('');
      setAdjustQty(1);
      loadItems();
    }

    setAdjusting(false);
  };

  const openAdjust = (item: InventoryItem, type: 'in' | 'out') => {
    setSelectedItem(item);
    setAdjustType(type);
    setAdjustQty(1);
    setAdjustReason('');
  };

  const isDemo = isDemoUser(currentUser?.email || '');
  const lowCount = items.filter(isLowStock).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-5 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center gap-4">
          <button
            onClick={() => onNavigate('inventory')}
            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2.5 bg-white/10 rounded-xl flex-shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-0.5">Storage Location</p>
              <h1 className="text-lg font-bold truncate">{location}</h1>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-2xl font-bold">{items.length}</p>
            <p className="text-xs text-slate-400">items</p>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {/* Low stock warning */}
        {lowCount > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm font-semibold text-red-800">
              {lowCount} {lowCount === 1 ? 'item needs' : 'items need'} restocking at this location
            </p>
          </div>
        )}

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-white rounded-2xl animate-pulse border border-gray-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <Package className="w-14 h-14 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">No items found at this location</p>
            <p className="text-sm text-gray-500 mt-1">Check the location name or add items in Inventory</p>
          </div>
        ) : (
          items.map(item => {
            const low = isLowStock(item);
            const success = successItem === item.id;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border transition-all duration-300 ${
                  success
                    ? 'border-green-300 shadow-green-100 shadow-lg'
                    : low
                    ? 'border-red-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-900 text-base">{item.name}</h3>
                        {low && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded-lg text-xs font-medium">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        )}
                        {success && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 rounded-lg text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Updated
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">{item.part_number} • {item.category}</p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className={`text-2xl font-bold ${low ? 'text-red-600' : 'text-gray-900'}`}>
                        {item.current_stock}
                      </p>
                      <p className="text-xs text-gray-500">{item.unit_of_measure}</p>
                    </div>
                  </div>

                  {/* Stock bar */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs text-gray-500">Min: {item.minimum_stock} {item.unit_of_measure}</span>
                      <span className="text-xs text-gray-500">
                        {item.minimum_stock > 0
                          ? `${Math.round((item.current_stock / item.minimum_stock) * 100)}% of minimum`
                          : 'No minimum set'}
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${low ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{
                          width: item.minimum_stock > 0
                            ? `${Math.min((item.current_stock / item.minimum_stock) * 100, 100)}%`
                            : '100%'
                        }}
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  {!isDemo && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => openAdjust(item, 'in')}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors border border-emerald-200"
                      >
                        <TrendingUp className="w-4 h-4" />
                        Add Stock
                      </button>
                      <button
                        onClick={() => openAdjust(item, 'out')}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-orange-50 text-orange-700 rounded-xl text-sm font-semibold hover:bg-orange-100 transition-colors border border-orange-200"
                      >
                        <TrendingDown className="w-4 h-4" />
                        Record Use
                      </button>
                      <button
                        onClick={() => onNavigate('inventory-detail', { itemId: item.id })}
                        className="px-3 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors border border-gray-200"
                      >
                        Details
                      </button>
                    </div>
                  )}
                  {isDemo && (
                    <button
                      onClick={() => onNavigate('inventory-detail', { itemId: item.id })}
                      className="mt-4 w-full px-3 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      View Details
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Adjust modal */}
      {selectedItem && !isDemo && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
          <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-md p-6">
            <div className="flex items-center gap-3 mb-5">
              <div className={`p-2 rounded-xl ${adjustType === 'in' ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                {adjustType === 'in'
                  ? <TrendingUp className={`w-5 h-5 text-emerald-600`} />
                  : <TrendingDown className={`w-5 h-5 text-orange-600`} />
                }
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {adjustType === 'in' ? 'Add Stock' : 'Record Usage'}
                </h2>
                <p className="text-sm text-gray-500">{selectedItem.name}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quantity ({selectedItem.unit_of_measure})
                </label>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setAdjustQty(Math.max(1, adjustQty - 1))}
                    className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <input
                    type="number"
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(Math.max(1, parseInt(e.target.value) || 1))}
                    min="1"
                    className="flex-1 text-center text-2xl font-bold px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    onClick={() => setAdjustQty(adjustQty + 1)}
                    className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder={adjustType === 'in' ? 'e.g., Received new shipment...' : 'e.g., Used during engine maintenance...'}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setSelectedItem(null)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjust}
                disabled={adjusting || !adjustReason.trim()}
                className={`flex-1 px-4 py-3 text-white rounded-xl font-semibold transition-all disabled:opacity-50 ${
                  adjustType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-orange-600 hover:bg-orange-700'
                }`}
              >
                {adjusting ? 'Saving...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
