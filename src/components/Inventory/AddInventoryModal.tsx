import React, { useState, useEffect, useRef } from 'react';
import { X, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { demoVessels, demoEquipment, demoUsers } from '../../data/demoData';

interface AddInventoryModalProps {
  onClose: () => void;
  onSave: (item: NewInventoryData) => void;
}

export interface NewInventoryData {
  name: string;
  part_number: string;
  category: string;
  type: 'spare_part' | 'consumable';
  vessel_id: string;
  equipment_id: string;
  current_stock: number;
  minimum_stock: number;
  unit_of_measure: string;
  location: string;
  notes: string;
}

interface VesselOption {
  id: string;
  name: string;
}

interface EquipmentOption {
  id: string;
  name: string;
  vessel_id: string;
}

const isDemoUser = (email: string) =>
  demoUsers.some(u => u.email === email);

const CATEGORIES = [
  'Engine Parts',
  'Electrical',
  'Hydraulic',
  'Fuel System',
  'Cooling System',
  'Safety Equipment',
  'Lubricants',
  'Filters',
  'Gaskets & Seals',
  'Fasteners',
  'Other',
];

const UNITS = ['pcs', 'liters', 'kg', 'meters', 'boxes', 'sets'];

export const AddInventoryModal: React.FC<AddInventoryModalProps> = ({ onClose, onSave }) => {
  const { currentUser, selectedVesselId } = useAuth();
  const [formData, setFormData] = useState<NewInventoryData>({
    name: '',
    part_number: '',
    category: '',
    type: 'spare_part',
    vessel_id: '',
    equipment_id: '',
    current_stock: 0,
    minimum_stock: 1,
    unit_of_measure: 'pcs',
    location: '',
    notes: '',
  });

  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [categoryInput, setCategoryInput] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  const filteredCategories = CATEGORIES.filter(c =>
    c.toLowerCase().includes(categoryInput.toLowerCase())
  );
  const showAddNew =
    categoryInput.trim().length > 0 &&
    !CATEGORIES.some(c => c.toLowerCase() === categoryInput.trim().toLowerCase());

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target as Node)) {
        setCategoryOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    loadVessels();
  }, [currentUser]);

  useEffect(() => {
    if (vessels.length === 1 && !formData.vessel_id) {
      setFormData(prev => ({ ...prev, vessel_id: vessels[0].id }));
    }
  }, [vessels]);

  useEffect(() => {
    if (formData.vessel_id) {
      loadEquipment(formData.vessel_id);
    } else {
      setEquipment([]);
    }
  }, [formData.vessel_id]);

  const loadVessels = async () => {
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      const userVessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setVessels(userVessels.map(v => ({ id: v.id, name: v.name })));

      if (selectedVesselId && userVessels.some(v => v.id === selectedVesselId)) {
        setFormData(prev => ({ ...prev, vessel_id: selectedVesselId }));
      }
      return;
    }

    let query = supabase.from('vessels').select('id, name');

    if (currentUser.role === 'master_admin') {
      // no filter
    } else if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      query = query.eq('company_id', currentUser.company_id);
    } else if (currentUser.vessel_ids.length > 0) {
      query = query.in('id', currentUser.vessel_ids);
    } else {
      setVessels([]);
      return;
    }

    const { data } = await query;
    if (data) {
      setVessels(data);
      if (selectedVesselId && data.some((v: VesselOption) => v.id === selectedVesselId)) {
        setFormData(prev => ({ ...prev, vessel_id: selectedVesselId }));
      }
    }
  };

  const loadEquipment = async (vesselId: string) => {
    if (isDemoUser(currentUser?.email || '')) {
      const items = demoEquipment
        .filter(e => e.vessel_id === vesselId)
        .map(e => ({ id: e.id, name: e.name, vessel_id: e.vessel_id }));
      setEquipment(items);
      return;
    }

    const { data } = await supabase
      .from('equipment')
      .select('id, name, vessel_id')
      .eq('vessel_id', vesselId);

    if (data) setEquipment(data);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.part_number || !formData.category || !formData.vessel_id) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Add Inventory Item</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Item Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Oil Filter Element"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Part Number *
              </label>
              <input
                type="text"
                value={formData.part_number}
                onChange={(e) => setFormData({ ...formData, part_number: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., 1R-0751"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type *
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="spare_part">Spare Part</option>
                <option value="consumable">Consumable</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={categoryRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <div
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent flex items-center gap-2 cursor-text"
                onClick={() => setCategoryOpen(true)}
              >
                <input
                  type="text"
                  value={categoryInput || formData.category}
                  onChange={(e) => {
                    setCategoryInput(e.target.value);
                    setFormData({ ...formData, category: '' });
                    setCategoryOpen(true);
                  }}
                  onFocus={() => setCategoryOpen(true)}
                  placeholder="Select or type a category..."
                  className="flex-1 outline-none bg-transparent text-gray-900 placeholder-gray-400 text-sm"
                  required={!formData.category}
                />
                <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${categoryOpen ? 'rotate-180' : ''}`} />
              </div>
              {categoryOpen && (
                <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-52 overflow-y-auto">
                  {filteredCategories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      className={`w-full text-left px-4 py-2.5 text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors ${formData.category === cat ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFormData({ ...formData, category: cat });
                        setCategoryInput('');
                        setCategoryOpen(false);
                      }}
                    >
                      {cat}
                    </button>
                  ))}
                  {showAddNew && (
                    <button
                      type="button"
                      className="w-full text-left px-4 py-2.5 text-sm text-blue-600 font-medium hover:bg-blue-50 transition-colors border-t border-gray-100 flex items-center gap-2"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        const newCat = categoryInput.trim();
                        setFormData({ ...formData, category: newCat });
                        setCategoryInput('');
                        setCategoryOpen(false);
                      }}
                    >
                      <span className="text-blue-500 font-bold">+</span>
                      Add "{categoryInput.trim()}"
                    </button>
                  )}
                  {filteredCategories.length === 0 && !showAddNew && (
                    <p className="px-4 py-3 text-sm text-gray-400">No matches found</p>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vessel *
              </label>
              <select
                value={formData.vessel_id}
                onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value, equipment_id: '' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Vessel</option>
                {vessels.map(vessel => (
                  <option key={vessel.id} value={vessel.id}>{vessel.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Related Equipment (Optional)
            </label>
            <select
              value={formData.equipment_id}
              onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={!formData.vessel_id}
            >
              <option value="">Not linked to specific equipment</option>
              {equipment.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.name}</option>
              ))}
            </select>
            <p className="mt-1.5 text-xs text-gray-500">
              Link this item to a specific piece of equipment on the vessel (e.g., Main Engine, Generator)
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Current Stock *
              </label>
              <input
                type="number"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Min Stock *
              </label>
              <input
                type="number"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: parseInt(e.target.value) || 1 })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <select
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Storage Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Store Room A, Shelf 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Additional information, specifications, or ordering details..."
            />
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              You will receive alerts when stock falls below the minimum level.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg"
            >
              Add Item
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
