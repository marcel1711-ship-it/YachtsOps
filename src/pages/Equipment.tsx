import React, { useState, useEffect } from 'react';
import { Search, Plus, ChevronDown, Filter, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { demoEquipment, demoVessels, demoUsers } from '../data/demoData';
import { supabase } from '../lib/supabase';
import { AddEquipmentModal } from '../components/Equipment/AddEquipmentModal';
import { EditEquipmentModal } from '../components/Equipment/EditEquipmentModal';
import { Equipment as EquipmentType } from '../types';

interface EquipmentProps {
  onNavigate: (page: string, params?: any) => void;
}

interface VesselOption {
  id: string;
  name: string;
}

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const Equipment: React.FC<EquipmentProps> = ({ onNavigate }) => {
  const { currentUser, selectedVesselId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterVessel, setFilterVessel] = useState<string>('all');
  const [filterManufacturer, setFilterManufacturer] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser, selectedVesselId]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      let filtered = demoEquipment;
      if (currentUser.role === 'customer_admin') {
        filtered = filtered.filter(e => currentUser.vessel_ids.includes(e.vessel_id));
      } else if (currentUser.role === 'standard_user') {
        filtered = filtered.filter(e => e.vessel_id === selectedVesselId);
      }
      setEquipment(filtered as EquipmentType[]);
      const userVessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setVessels(userVessels.map(v => ({ id: v.id, name: v.name })));
      setLoading(false);
      return;
    }

    let query = supabase.from('equipment').select('*');

    if (currentUser.role === 'standard_user' && selectedVesselId) {
      query = query.eq('vessel_id', selectedVesselId);
    } else if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      query = query.eq('company_id', currentUser.company_id);
    }

    const { data } = await query.order('created_at', { ascending: false });
    setEquipment(data || []);

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

  const handleSave = async (equipmentData: any) => {
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      const newItem: EquipmentType = {
        id: `eq-demo-${Date.now()}`,
        vessel_id: equipmentData.vessel_id,
        name: equipmentData.name,
        type: equipmentData.type,
        manufacturer: equipmentData.manufacturer,
        model: equipmentData.model,
        serial_number: equipmentData.serial_number,
        description: '',
        location: equipmentData.location,
        created_at: new Date().toISOString(),
      };
      setEquipment(prev => [newItem, ...prev]);
      setShowAddModal(false);
      return;
    }

    const companyId = currentUser.company_id || null;
    const { error } = await supabase.from('equipment').insert({
      name: equipmentData.name,
      type: equipmentData.type,
      manufacturer: equipmentData.manufacturer,
      model: equipmentData.model,
      serial_number: equipmentData.serial_number,
      location: equipmentData.location,
      specifications: equipmentData.specifications,
      installation_date: equipmentData.installation_date || null,
      vessel_id: equipmentData.vessel_id,
      company_id: companyId,
    });

    if (!error) {
      setShowAddModal(false);
      loadData();
    }
  };

  const handleEquipmentSaved = () => {
    setEditingEquipment(null);
    if (!currentUser || isDemoUser(currentUser.email)) return;
    loadData();
  };

  const handleDeleteEquipment = async (id: string) => {
    if (!currentUser) return;
    if (isDemoUser(currentUser.email)) {
      setEquipment(prev => prev.filter(e => e.id !== id));
      setEditingEquipment(null);
      return;
    }
    await supabase.from('equipment').delete().eq('id', id);
    setEditingEquipment(null);
    loadData();
  };

  const getFilteredEquipment = () => {
    let filtered = equipment;

    if (searchTerm) {
      filtered = filtered.filter(e =>
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.manufacturer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.serial_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterType !== 'all') filtered = filtered.filter(e => e.type === filterType);
    if (filterVessel !== 'all') filtered = filtered.filter(e => e.vessel_id === filterVessel);
    if (filterManufacturer !== 'all') filtered = filtered.filter(e => e.manufacturer === filterManufacturer);

    return filtered;
  };

  const filtered = getFilteredEquipment();
  const types = Array.from(new Set(equipment.map(e => e.type)));
  const manufacturers = Array.from(new Set(equipment.map(e => e.manufacturer)));

  const getVesselName = (vesselId: string) => vessels.find(v => v.id === vesselId)?.name || '';

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Equipment Management</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">Manage vessel equipment and systems</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Equipment
        </button>
      </div>

      {showAddModal && (
        <AddEquipmentModal
          onClose={() => setShowAddModal(false)}
          onSave={handleSave}
        />
      )}

      {editingEquipment && (
        <EditEquipmentModal
          equipment={editingEquipment}
          onClose={() => setEditingEquipment(null)}
          onSaved={handleEquipmentSaved}
          onDelete={handleDeleteEquipment}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-7">
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
              placeholder="Search equipment..."
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
              {types.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterManufacturer}
              onChange={(e) => setFilterManufacturer(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Manufacturers</option>
              {manufacturers.map(manufacturer => (
                <option key={manufacturer} value={manufacturer}>{manufacturer}</option>
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
              {[1,2,3].map(i => (
                <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium">No equipment found</p>
              <p className="text-sm text-gray-500 mt-1">Try adjusting your filters</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Equipment Name</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Type</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Manufacturer</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Model</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Serial Number</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Location</th>
                  <th className="text-left py-4 px-4 text-xs font-bold text-gray-700 uppercase tracking-wider">Vessel</th>
                  <th className="py-4 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map(item => (
                  <tr
                    key={item.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div className="font-semibold text-gray-900">{item.name}</div>
                      <div className="text-sm text-gray-500 mt-0.5">{item.description}</div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {item.type}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-900">{item.manufacturer}</td>
                    <td className="py-4 px-4 text-sm text-gray-700">{item.model}</td>
                    <td className="py-4 px-4 text-sm text-gray-700 font-mono">{item.serial_number}</td>
                    <td className="py-4 px-4 text-sm text-gray-600">{item.location}</td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-medium text-gray-900">{getVesselName(item.vessel_id)}</span>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => setEditingEquipment(item)}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-500 hover:text-gray-700"
                        title="Edit equipment"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
