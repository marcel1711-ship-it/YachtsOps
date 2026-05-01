import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Package,
  AlertTriangle,
  Wrench,
  MapPin,
  QrCode,
  Download,
  ChevronRight,
  Phone,
  Mail,
  TrendingDown,
  TrendingUp,
  Ship,
  Plus,
  Minus,
  Pencil
} from 'lucide-react';
import { generateQRDataURL, generateLocationURL } from '../utils/qrcode';
import { useAuth } from '../contexts/AuthContext';
import {
  demoInventoryItems,
  demoEquipment,
  demoVessels,
  demoStockMovements,
  demoUsers,
} from '../data/demoData';
import { supabase } from '../lib/supabase';
import { isLowStock, formatDate, formatDateTime } from '../utils/helpers';
import { InventoryItem, StockMovement } from '../types';
import { EditInventoryModal } from '../components/Inventory/EditInventoryModal';

interface InventoryDetailProps {
  onNavigate: (page: string, params?: any) => void;
  params?: any;
}

interface EquipmentInfo { id: string; name: string; type: string; }
interface VesselInfo { id: string; name: string; type: string; }

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const InventoryDetail: React.FC<InventoryDetailProps> = ({ onNavigate, params }) => {
  const { currentUser } = useAuth();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [equipment, setEquipment] = useState<EquipmentInfo | null>(null);
  const [vessel, setVessel] = useState<VesselInfo | null>(null);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [adjustType, setAdjustType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [adjustQty, setAdjustQty] = useState(1);
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [locationQR, setLocationQR] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [params?.itemId]);

  const loadData = async () => {
    if (!params?.itemId || !currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      const demoItem = params.demoItem || demoInventoryItems.find(i => i.id === params.itemId);
      setItem(demoItem as InventoryItem || null);
      if (demoItem) {
        const eq = demoItem.equipment_id ? demoEquipment.find(e => e.id === demoItem.equipment_id) : null;
        setEquipment(eq ? { id: eq.id, name: eq.name, type: eq.type } : null);
        const v = demoVessels.find(v => v.id === demoItem.vessel_id);
        setVessel(v ? { id: v.id, name: v.name, type: v.type } : null);
        setStockMovements(demoStockMovements.filter(m => m.inventory_id === demoItem.id) as StockMovement[]);
      }
      setLoading(false);
      return;
    }

    const { data: itemData } = await supabase.from('inventory_items').select('*').eq('id', params.itemId).maybeSingle();
    setItem(itemData);

    if (itemData) {
      if (itemData.equipment_id) {
        const { data: eqData } = await supabase.from('equipment').select('id, name, type').eq('id', itemData.equipment_id).maybeSingle();
        setEquipment(eqData);
      }
      const { data: vesselData } = await supabase.from('vessels').select('id, name, type').eq('id', itemData.vessel_id).maybeSingle();
      setVessel(vesselData);
      const { data: movementsData } = await supabase.from('stock_movements').select('*').eq('inventory_id', itemData.id).order('created_at', { ascending: false });
      setStockMovements(movementsData || []);
    }

    setLoading(false);
  };

  const handleAdjustStock = async () => {
    if (!item || !currentUser) return;
    if (!adjustReason.trim()) { alert('Please provide a reason'); return; }

    setAdjusting(true);

    const newStock = adjustType === 'in'
      ? item.current_stock + adjustQty
      : adjustType === 'out'
      ? Math.max(0, item.current_stock - adjustQty)
      : adjustQty;

    if (isDemoUser(currentUser.email)) {
      const fakeMovement: StockMovement = {
        id: `mv-demo-${Date.now()}`,
        inventory_id: item.id,
        vessel_id: item.vessel_id,
        movement_type: adjustType,
        quantity: adjustType === 'adjustment' ? newStock - item.current_stock : adjustQty,
        reason: adjustReason,
        reference_id: null,
        performed_by_id: currentUser.id,
        performed_by_name: currentUser.full_name,
        created_at: new Date().toISOString(),
      };
      setItem({ ...item, current_stock: newStock });
      setStockMovements(prev => [fakeMovement, ...prev]);
      setShowAdjustModal(false);
      setAdjustReason('');
      setAdjustQty(1);
      setAdjusting(false);
      return;
    }

    const { error: moveErr } = await supabase.from('stock_movements').insert({
      inventory_id: item.id,
      vessel_id: item.vessel_id,
      movement_type: adjustType,
      quantity: adjustType === 'adjustment' ? newStock - item.current_stock : adjustQty,
      reason: adjustReason,
      performed_by_id: currentUser.id,
      performed_by_name: currentUser.full_name,
    });

    if (!moveErr) {
      await supabase.from('inventory_items').update({ current_stock: newStock }).eq('id', item.id);
      setShowAdjustModal(false);
      setAdjustReason('');
      setAdjustQty(1);
      loadData();
    }

    setAdjusting(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-10 bg-gray-100 rounded-xl animate-pulse w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {[1,2].map(i => <div key={i} className="h-48 bg-gray-50 rounded-2xl animate-pulse" />)}
          </div>
          <div className="h-64 bg-gray-50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">Item not found</p>
          <button onClick={() => onNavigate('inventory')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors">
            Back to Inventory
          </button>
        </div>
      </div>
    );
  }

  const lowStock = isLowStock(item);
  const stockPercentage = item.minimum_stock > 0 ? Math.round((item.current_stock / item.minimum_stock) * 100) : 100;
  const isDemo = isDemoUser(currentUser?.email || '');

  // Generate QR for this item's storage location if not yet generated
  if (item.storage_location && !locationQR) {
    generateQRDataURL(generateLocationURL(item.storage_location), 200).then(setLocationQR);
  }

  const handleDownloadQR = () => {
    if (!locationQR) return;
    const a = document.createElement('a');
    a.href = locationQR;
    a.download = `qr-${(item.storage_location || 'location').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => onNavigate('inventory')} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft className="w-6 h-6 text-gray-600" />
        </button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{item.name}</h1>
          <p className="text-gray-600 mt-1">{item.category}</p>
        </div>
        {!isDemo && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex items-center gap-2 px-5 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              <Pencil className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setShowAdjustModal(true)}
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              Adjust Stock
            </button>
          </div>
        )}
      </div>

      {lowStock && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-red-900">Low Stock Alert</h3>
            <p className="text-sm text-red-800 mt-1">Current stock is at or below minimum threshold. Reorder recommended immediately.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Item Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="text-sm font-medium text-gray-600">Part Number</label>
                <p className="text-gray-900 mt-1 font-mono">{item.part_number}</p>
              </div>
              {item.serial_number && (
                <div>
                  <label className="text-sm font-medium text-gray-600">Serial Number</label>
                  <p className="text-gray-900 mt-1 font-mono">{item.serial_number}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-600">Type</label>
                <span className="inline-block mt-1 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm capitalize">
                  {item.type.replace('_', ' ')}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Category</label>
                <p className="text-gray-900 mt-1">{item.category}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Unit of Measure</label>
                <p className="text-gray-900 mt-1">{item.unit_of_measure}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600">Storage Location</label>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-4 h-4 text-gray-500" />
                  <p className="text-gray-900">{item.storage_location}</p>
                </div>
              </div>
            </div>
            {item.description && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-600">Description</label>
                <p className="text-gray-900 mt-1">{item.description}</p>
              </div>
            )}
            {item.notes && (
              <div className="mt-6">
                <label className="text-sm font-medium text-gray-600">Notes</label>
                <div className="mt-2 p-4 bg-yellow-50 border border-yellow-200 rounded-xl">
                  <p className="text-sm text-gray-800">{item.notes}</p>
                </div>
              </div>
            )}
          </div>

          {(item.supplier_name || item.supplier_email) && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Supplier Information</h2>
              <div className="space-y-4">
                {item.supplier_name && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Supplier Name</label>
                    <p className="text-gray-900 mt-1 font-medium">{item.supplier_name}</p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {item.supplier_email && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Email</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Mail className="w-4 h-4 text-gray-500" />
                        <a href={`mailto:${item.supplier_email}`} className="text-blue-600 hover:text-blue-700">{item.supplier_email}</a>
                      </div>
                    </div>
                  )}
                  {item.supplier_phone && (
                    <div>
                      <label className="text-sm font-medium text-gray-600">Phone</label>
                      <div className="flex items-center gap-2 mt-1">
                        <Phone className="w-4 h-4 text-gray-500" />
                        <a href={`tel:${item.supplier_phone}`} className="text-blue-600 hover:text-blue-700">{item.supplier_phone}</a>
                      </div>
                    </div>
                  )}
                </div>
                {item.supplier_email && (
                  <button
                    onClick={() => window.open(`mailto:${item.supplier_email}?subject=Reorder Request: ${item.name}`, '_blank')}
                    className="w-full px-4 py-3 bg-blue-50 text-blue-700 rounded-xl font-medium hover:bg-blue-100 transition-colors"
                  >
                    Send Reorder Request
                  </button>
                )}
              </div>
            </div>
          )}

          {stockMovements.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Stock Movement History</h2>
              <div className="space-y-3">
                {stockMovements.map(movement => (
                  <div key={movement.id} className="p-4 bg-gray-50 rounded-xl">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-xl ${movement.movement_type === 'in' ? 'bg-green-100' : 'bg-red-100'}`}>
                          {movement.movement_type === 'in' ? (
                            <TrendingUp className="w-5 h-5 text-green-600" />
                          ) : (
                            <TrendingDown className="w-5 h-5 text-red-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {movement.movement_type === 'in' ? 'Stock Added' : movement.movement_type === 'out' ? 'Stock Removed' : 'Adjustment'}
                          </p>
                          <p className="text-sm text-gray-600 mt-1">{movement.reason}</p>
                          <p className="text-xs text-gray-500 mt-1">By {movement.performed_by_name} • {formatDateTime(movement.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`text-lg font-semibold ${movement.movement_type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                          {movement.quantity > 0 && movement.movement_type === 'in' ? '+' : ''}{movement.quantity}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Stock Status</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Current Stock</span>
                  <span className="text-2xl font-bold text-gray-900">{item.current_stock} {item.unit_of_measure}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${lowStock ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${Math.min(stockPercentage, 100)}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{stockPercentage}% of minimum stock</p>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Minimum Stock</span>
                  <span className="font-medium text-gray-900">{item.minimum_stock} {item.unit_of_measure}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <label className="text-sm font-medium text-gray-600">Status</label>
                <div className="mt-2">
                  {lowStock ? (
                    <span className="flex items-center gap-2 px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-medium">
                      <AlertTriangle className="w-4 h-4" />
                      Low Stock - Reorder Needed
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 px-3 py-2 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                      In Stock
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {item.storage_location && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <QrCode className="w-5 h-5 text-blue-600" />
                  Location QR
                </h2>
              </div>
              <div className="flex flex-col items-center gap-3">
                <div className="p-3 bg-white rounded-2xl border-2 border-gray-100 shadow-inner">
                  {locationQR ? (
                    <img src={locationQR} alt="Location QR" className="w-36 h-36" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center bg-gray-50 rounded-xl">
                      <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-gray-900">{item.storage_location}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Scan to ver todos los items aqui</p>
                </div>
                <div className="flex gap-2 w-full">
                  {locationQR && (
                    <button
                      onClick={handleDownloadQR}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-700 rounded-xl text-xs font-semibold hover:bg-gray-100 transition-colors border border-gray-200"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Download
                    </button>
                  )}
                  <button
                    onClick={() => onNavigate('location-view', { location: item.storage_location })}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 transition-colors"
                  >
                    Ver ubicacion
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {vessel && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Vessel</h2>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Ship className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{vessel.name}</p>
                  <p className="text-sm text-gray-600">{vessel.type}</p>
                </div>
              </div>
            </div>
          )}

          {equipment && (
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Associated Equipment</h2>
              <div className="flex items-center gap-3">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Wrench className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{equipment.name}</p>
                  <p className="text-sm text-gray-600">{equipment.type}</p>
                </div>
              </div>
            </div>
          )}

          {!isDemo && (
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">Quick Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => { setAdjustType('in'); setShowAdjustModal(true); }}
                  className="w-full px-4 py-2 bg-white text-blue-700 rounded-xl text-sm font-medium hover:shadow-md transition-all text-left flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add Stock
                </button>
                <button
                  onClick={() => { setAdjustType('out'); setShowAdjustModal(true); }}
                  className="w-full px-4 py-2 bg-white text-blue-700 rounded-xl text-sm font-medium hover:shadow-md transition-all text-left flex items-center gap-2"
                >
                  <Minus className="w-4 h-4" />
                  Record Usage
                </button>
                {item.supplier_email && (
                  <button
                    onClick={() => window.open(`mailto:${item.supplier_email}`, '_blank')}
                    className="w-full px-4 py-2 bg-white text-blue-700 rounded-xl text-sm font-medium hover:shadow-md transition-all text-left"
                  >
                    Contact Supplier
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showEditModal && !isDemo && item && (
        <EditInventoryModal
          item={item}
          onClose={() => setShowEditModal(false)}
          onSaved={() => { setShowEditModal(false); loadData(); }}
        />
      )}

      {showAdjustModal && !isDemo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-5">Adjust Stock</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['in', 'out', 'adjustment'] as const).map(type => (
                    <button
                      key={type}
                      onClick={() => setAdjustType(type)}
                      className={`px-3 py-2 rounded-xl text-sm font-medium border-2 transition-all capitalize ${
                        adjustType === type ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      {type === 'in' ? 'Add' : type === 'out' ? 'Remove' : 'Set'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {adjustType === 'adjustment' ? 'New Stock Level' : 'Quantity'} ({item.unit_of_measure})
                </label>
                <input
                  type="number"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Math.max(0, parseInt(e.target.value) || 0))}
                  min="0"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Reason *</label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Used during engine maintenance, Received new shipment..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAdjustModal(false)}
                className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustStock}
                disabled={adjusting}
                className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
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
