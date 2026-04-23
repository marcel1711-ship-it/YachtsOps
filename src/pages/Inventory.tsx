import React, { useState, useEffect } from 'react';
import { Package, Search, AlertTriangle, Plus, Filter, ChevronDown, FileDown, MapPin, SlidersHorizontal } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { demoInventoryItems, demoVessels, demoUsers } from '../data/demoData';
import { supabase } from '../lib/supabase';
import { isLowStock } from '../utils/helpers';
import { AddInventoryModal } from '../components/Inventory/AddInventoryModal';
import { AdjustStockModal } from '../components/Inventory/AdjustStockModal';
import { LocationsPanel } from '../components/Inventory/LocationsPanel';
import { InventoryItem } from '../types';

interface InventoryProps {
  onNavigate: (page: string, params?: any) => void;
}

interface VesselOption { id: string; name: string; }

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const Inventory: React.FC<InventoryProps> = ({ onNavigate }) => {
  const { currentUser, selectedVesselId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterVessel, setFilterVessel] = useState<string>('all');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [activeTab, setActiveTab] = useState<'items' | 'locations'>('items');
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser, selectedVesselId]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      let filtered = demoInventoryItems;
      if (currentUser.role === 'customer_admin') {
        filtered = filtered.filter(i => currentUser.vessel_ids.includes(i.vessel_id));
      } else if (currentUser.role === 'standard_user') {
        filtered = filtered.filter(i => i.vessel_id === selectedVesselId);
      }
      setItems(filtered as InventoryItem[]);
      const userVessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setVessels(userVessels.map(v => ({ id: v.id, name: v.name })));
      setLoading(false);
      return;
    }

    let query = supabase.from('inventory_items').select('*');
    if (currentUser.role === 'standard_user' && selectedVesselId) {
      query = query.eq('vessel_id', selectedVesselId);
    } else if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      query = query.eq('company_id', currentUser.company_id);
    }
    const { data } = await query.order('created_at', { ascending: false });
    setItems(data || []);

    let vesselQuery = supabase.from('vessels').select('id, name');
    if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      vesselQuery = vesselQuery.eq('company_id', currentUser.company_id);
    } else if (currentUser.role === 'standard_user' && currentUser.vessel_ids.length > 0) {
      vesselQuery = vesselQuery.in('id', currentUser.vessel_ids);
    }
    const { data: vesselData } = await vesselQuery;
    setVessels(vesselData || []);
    setLoading(false);
  };

  const handleSave = async (itemData: any) => {
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      setShowAddModal(false);
      return;
    }

    const { error } = await supabase.from('inventory_items').insert({
      name: itemData.name,
      part_number: itemData.part_number,
      category: itemData.category,
      type: itemData.type,
      vessel_id: itemData.vessel_id,
      equipment_id: itemData.equipment_id || null,
      current_stock: itemData.current_stock,
      minimum_stock: itemData.minimum_stock,
      unit_of_measure: itemData.unit_of_measure,
      storage_location: itemData.location,
      notes: itemData.notes,
      company_id: currentUser.company_id || null,
    });

    if (!error) {
      setShowAddModal(false);
      loadData();
    }
  };

  const handleAdjustStock = async (
    movementType: 'in' | 'out' | 'adjustment',
    quantity: number,
    reason: string,
    notes: string
  ) => {
    if (!adjustingItem || !currentUser) return;

    const newStock =
      movementType === 'in'
        ? adjustingItem.current_stock + quantity
        : movementType === 'out'
        ? Math.max(0, adjustingItem.current_stock - quantity)
        : quantity;

    if (isDemoUser(currentUser.email)) {
      setItems(prev =>
        prev.map(i => i.id === adjustingItem.id ? { ...i, current_stock: newStock } : i)
      );
      setAdjustingItem(null);
      return;
    }

    await supabase
      .from('inventory_items')
      .update({ current_stock: newStock })
      .eq('id', adjustingItem.id);

    await supabase.from('stock_movements').insert({
      inventory_id: adjustingItem.id,
      vessel_id: adjustingItem.vessel_id,
      movement_type: movementType,
      quantity,
      reason,
      notes,
      performed_by_id: currentUser.id,
      performed_by_name: currentUser.full_name,
    });

    setAdjustingItem(null);
    loadData();
  };

  const getFilteredItems = () => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(i =>
        i.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.part_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        i.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') filtered = filtered.filter(i => i.type === filterType);
    if (filterCategory !== 'all') filtered = filtered.filter(i => i.category === filterCategory);
    if (filterVessel !== 'all') filtered = filtered.filter(i => i.vessel_id === filterVessel);
    if (showLowStockOnly) filtered = filtered.filter(isLowStock);

    return filtered;
  };

  const filtered = getFilteredItems();
  const categories = Array.from(new Set(items.map(i => i.category)));
  const lowStockCount = filtered.filter(isLowStock).length;

  const getVesselName = (vesselId: string) => vessels.find(v => v.id === vesselId)?.name || '';

  const handleExportPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const vesselLabel = filterVessel !== 'all'
      ? vessels.find(v => v.id === filterVessel)?.name || 'All Vessels'
      : 'All Vessels';

    const rows = filtered.map(item => {
      const low = isLowStock(item);
      const vesselName = getVesselName(item.vessel_id);
      return `
        <tr class="${low ? 'low-stock' : ''}">
          <td>
            <strong>${item.name}</strong>
            ${vesselName ? `<br/><small>${vesselName}</small>` : ''}
          </td>
          <td>${item.part_number || '—'}</td>
          <td>${item.category || '—'}</td>
          <td>${item.type.replace('_', ' ')}</td>
          <td class="center">${item.current_stock} ${item.unit_of_measure}</td>
          <td class="center">${item.minimum_stock} ${item.unit_of_measure}</td>
          <td class="center ${low ? 'status-low' : 'status-ok'}">${low ? 'Low Stock' : 'In Stock'}</td>
        </tr>`;
    }).join('');

    const lowCount = filtered.filter(isLowStock).length;
    const okCount = filtered.length - lowCount;

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Inventory Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 13px; }
    .header { background: #1e3a5f; color: #fff; padding: 28px 32px 24px; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 4px; }
    .header p { font-size: 12px; opacity: 0.75; }
    .meta { display: flex; gap: 32px; padding: 16px 32px; background: #f4f7fa; border-bottom: 1px solid #dde3eb; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    .meta-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }
    .summary { display: flex; gap: 16px; padding: 16px 32px; }
    .summary-card { flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .summary-card.total { border-color: #bfdbfe; background: #eff6ff; }
    .summary-card.ok { border-color: #bbf7d0; background: #f0fdf4; }
    .summary-card.low { border-color: #fecaca; background: #fef2f2; }
    .summary-card .num { font-size: 24px; font-weight: 700; }
    .summary-card.total .num { color: #1d4ed8; }
    .summary-card.ok .num { color: #15803d; }
    .summary-card.low .num { color: #dc2626; }
    .summary-card .lbl { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .table-wrap { padding: 8px 32px 32px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; }
    th { background: #f8fafc; text-align: left; padding: 10px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #4b5563; border-bottom: 2px solid #e5e7eb; }
    td { padding: 10px 12px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
    td small { color: #6b7280; font-size: 11px; }
    tr.low-stock { background: #fff8f8; }
    .center { text-align: center; }
    .status-ok { color: #15803d; font-weight: 600; }
    .status-low { color: #dc2626; font-weight: 600; }
    .footer { margin-top: 24px; padding: 12px 32px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Inventory Report</h1>
    <p>Generated on ${dateStr} at ${timeStr}</p>
  </div>
  <div class="meta">
    <div class="meta-item"><span class="meta-label">Vessel</span><span class="meta-value">${vesselLabel}</span></div>
    <div class="meta-item"><span class="meta-label">Type Filter</span><span class="meta-value">${filterType === 'all' ? 'All Types' : filterType.replace('_', ' ')}</span></div>
    <div class="meta-item"><span class="meta-label">Category</span><span class="meta-value">${filterCategory === 'all' ? 'All Categories' : filterCategory}</span></div>
  </div>
  <div class="summary">
    <div class="summary-card total"><div class="num">${filtered.length}</div><div class="lbl">Total Items</div></div>
    <div class="summary-card ok"><div class="num">${okCount}</div><div class="lbl">In Stock</div></div>
    <div class="summary-card low"><div class="num">${lowCount}</div><div class="lbl">Low Stock</div></div>
  </div>
  <div class="table-wrap">
    <table>
      <thead>
        <tr>
          <th>Item Name</th>
          <th>Part Number</th>
          <th>Category</th>
          <th>Type</th>
          <th class="center">Current Stock</th>
          <th class="center">Min Stock</th>
          <th class="center">Status</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">YachtMaint &mdash; Inventory Report &mdash; ${dateStr}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory-report-${now.toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isDemo = isDemoUser(currentUser?.email || '');

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Inventory Management</h1>
          <p className="text-gray-500 mt-2 text-base">Track spare parts and consumables</p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'items' && (
            <button
              onClick={handleExportPDF}
              disabled={filtered.length === 0}
              className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown className="w-5 h-5" />
              Export PDF
            </button>
          )}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl"
          >
            <Plus className="w-5 h-5" />
            Add Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('items')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'items'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Package className="w-4 h-4" />
          All Items
        </button>
        <button
          onClick={() => setActiveTab('locations')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            activeTab === 'locations'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <MapPin className="w-4 h-4" />
          Locations & QR
        </button>
      </div>

      {showAddModal && (
        <AddInventoryModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
        />
      )}

      {adjustingItem && (
        <AdjustStockModal
          item={adjustingItem}
          onClose={() => setAdjustingItem(null)}
          onSave={handleAdjustStock}
        />
      )}

      {/* Locations & QR tab */}
      {activeTab === 'locations' && (
        <LocationsPanel
          items={items}
          onNavigate={onNavigate}
          isDemo={isDemo}
        />
      )}

      {activeTab === 'items' && lowStockCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-yellow-900">Low Stock Alert</h3>
            <p className="text-sm text-yellow-800 mt-1">
              {lowStockCount} {lowStockCount === 1 ? 'item' : 'items'} below minimum stock level. Reorder recommended.
            </p>
          </div>
          <button
            onClick={() => setShowLowStockOnly(!showLowStockOnly)}
            className="px-4 py-2 bg-yellow-600 text-white rounded-xl text-sm font-medium hover:bg-yellow-700 transition-colors"
          >
            {showLowStockOnly ? 'Show All' : 'View Low Stock'}
          </button>
        </div>
      )}

      {activeTab === 'items' && <div className="bg-white rounded-2xl border border-gray-200 p-7">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search inventory..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Types</option>
              <option value="spare_part">Spare Parts</option>
              <option value="consumable">Consumables</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterVessel}
              onChange={(e) => setFilterVessel(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Vessels</option>
              {vessels.map(vessel => (
                <option key={vessel.id} value={vessel.id}>{vessel.name}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filtered.length}</span> {filtered.length === 1 ? 'item' : 'items'}
          </p>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Item Name</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Part Number</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Category</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Type</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Current Stock</th>
                  <th className="text-center py-4 px-4 font-semibold text-gray-900">Min Stock</th>
                  <th className="text-left py-4 px-4 font-semibold text-gray-900">Status</th>
                  <th className="py-4 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-12">
                      <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-600">No inventory items found</p>
                    </td>
                  </tr>
                ) : (
                  filtered.map(item => {
                    const lowStock = isLowStock(item);
                    const vesselName = getVesselName(item.vessel_id);

                    return (
                      <tr
                        key={item.id}
                        className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => onNavigate('inventory-detail', { itemId: item.id, demoItem: item })}
                      >
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {vesselName && (
                              <p className="text-sm text-gray-600">{vesselName}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-gray-700">{item.part_number}</td>
                        <td className="py-4 px-4 text-gray-700">{item.category}</td>
                        <td className="py-4 px-4">
                          <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm capitalize">
                            {item.type.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <span className={`font-semibold ${lowStock ? 'text-red-600' : 'text-gray-900'}`}>
                            {item.current_stock} {item.unit_of_measure}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center text-gray-700">
                          {item.minimum_stock} {item.unit_of_measure}
                        </td>
                        <td className="py-4 px-4">
                          {lowStock ? (
                            <span className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm font-medium flex items-center gap-1 w-fit">
                              <AlertTriangle className="w-4 h-4" />
                              Low Stock
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setAdjustingItem(item)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors border border-gray-200 hover:border-blue-200"
                            title="Adjust stock"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                            Adjust
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>}
    </div>
  );
};
