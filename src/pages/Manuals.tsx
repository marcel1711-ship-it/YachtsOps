import React, { useState, useEffect } from 'react';
import { FileText, Upload, Search, Download, Trash2, Filter, ChevronDown, BookOpen, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { demoMaintenanceManuals, demoEquipment, demoVessels, demoUsers } from '../data/demoData';
import { formatFileSize, formatDateTime } from '../utils/helpers';
import { UploadManualModal } from '../components/Manuals/UploadManualModal';
import { MaintenanceManual } from '../types';

interface ManualsProps {
  onNavigate: (page: string, params?: any) => void;
}

interface VesselOption { id: string; name: string; }
interface EquipmentOption { id: string; name: string; vessel_id: string; }

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

const FILE_TYPE_COLORS: Record<string, string> = {
  pdf: 'bg-red-100 text-red-700',
  doc: 'bg-blue-100 text-blue-700',
  docx: 'bg-blue-100 text-blue-700',
};

function getFileExt(fileName: string) {
  return fileName?.split('.').pop()?.toLowerCase() || 'file';
}

export const Manuals: React.FC<ManualsProps> = ({ onNavigate }) => {
  const { currentUser, selectedVesselId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVessel, setFilterVessel] = useState<string>('all');
  const [filterEquipment, setFilterEquipment] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [manuals, setManuals] = useState<MaintenanceManual[]>([]);
  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [equipment, setEquipment] = useState<EquipmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [currentUser, selectedVesselId]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      let filtered = demoMaintenanceManuals;
      const userVessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      const vesselIds = userVessels.map(v => v.id);

      if (currentUser.role === 'standard_user') {
        filtered = filtered.filter(m => m.vessel_id === selectedVesselId);
      } else {
        filtered = filtered.filter(m => vesselIds.includes(m.vessel_id));
      }

      setManuals(filtered as MaintenanceManual[]);
      setVessels(userVessels.map(v => ({ id: v.id, name: v.name })));

      const eqFiltered = demoEquipment.filter(e => vesselIds.includes(e.vessel_id));
      setEquipment(eqFiltered.map(e => ({ id: e.id, name: e.name, vessel_id: e.vessel_id })));
      setLoading(false);
      return;
    }

    let manualQuery = supabase.from('maintenance_manuals').select('*');
    if (currentUser.role === 'standard_user' && selectedVesselId) {
      manualQuery = manualQuery.eq('vessel_id', selectedVesselId);
    } else if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      manualQuery = manualQuery.eq('company_id', currentUser.company_id);
    }
    const { data: manualData } = await manualQuery.order('created_at', { ascending: false });
    setManuals(manualData || []);

    let vesselQuery = supabase.from('vessels').select('id, name');
    if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      vesselQuery = vesselQuery.eq('company_id', currentUser.company_id);
    } else if (currentUser.role === 'standard_user' && currentUser.vessel_ids.length > 0) {
      vesselQuery = vesselQuery.in('id', currentUser.vessel_ids);
    }
    const { data: vesselData } = await vesselQuery;
    setVessels(vesselData || []);

    const { data: eqData } = await supabase.from('equipment').select('id, name, vessel_id');
    setEquipment(eqData || []);

    setLoading(false);
  };

  const handleDelete = async (manualId: string) => {
    if (!currentUser || isDemoUser(currentUser.email)) return;
    const { error } = await supabase.from('maintenance_manuals').delete().eq('id', manualId);
    if (!error) { setDeleteConfirm(null); loadData(); }
  };

  const getFilteredManuals = () => {
    let filtered = manuals;

    if (filterVessel !== 'all') filtered = filtered.filter(m => m.vessel_id === filterVessel);
    if (filterEquipment !== 'all') {
      filtered = filtered.filter(m => m.equipment_id === filterEquipment);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(m =>
        m.title.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term) ||
        m.file_name?.toLowerCase().includes(term)
      );
    }

    return filtered;
  };

  const filtered = getFilteredManuals();
  const getVesselName = (vesselId: string) => vessels.find(v => v.id === vesselId)?.name || null;
  const getEquipmentName = (equipmentId: string | null) =>
    equipmentId ? equipment.find(e => e.id === equipmentId)?.name || null : null;

  const filteredEquipmentOptions = filterVessel !== 'all'
    ? equipment.filter(e => e.vessel_id === filterVessel)
    : equipment;

  const isDemo = isDemoUser(currentUser?.email || '');

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Maintenance Manuals</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">Equipment documentation and service manuals</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl shrink-0 self-start sm:self-auto"
        >
          <Upload className="w-5 h-5" />
          Upload Manual
        </button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Manuals</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{manuals.length}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Vessels Covered</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {new Set(manuals.map(m => m.vessel_id)).size}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Equipment Linked</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">
            {manuals.filter(m => m.equipment_id).length}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-7">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search manuals..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="relative">
            <select
              value={filterVessel}
              onChange={(e) => { setFilterVessel(e.target.value); setFilterEquipment('all'); }}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Vessels</option>
              {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterEquipment}
              onChange={(e) => setFilterEquipment(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              disabled={filteredEquipmentOptions.length === 0}
            >
              <option value="all">All Equipment</option>
              {filteredEquipmentOptions.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filtered.length}</span> {filtered.length === 1 ? 'manual' : 'manuals'}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-52 bg-gray-50 rounded-2xl animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-10 h-10 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold text-lg">No manuals found</p>
            <p className="text-sm text-gray-500 mt-2">
              {searchTerm || filterVessel !== 'all' || filterEquipment !== 'all'
                ? 'Try adjusting your filters'
                : 'Upload your first manual to get started'}
            </p>
            {!searchTerm && filterVessel === 'all' && filterEquipment === 'all' && (
              <button
                onClick={() => setShowUploadModal(true)}
                className="mt-4 flex items-center gap-2 px-5 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors mx-auto"
              >
                <Upload className="w-4 h-4" />
                Upload Manual
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(manual => {
              const equipmentName = getEquipmentName(manual.equipment_id);
              const vesselName = getVesselName(manual.vessel_id);
              const ext = getFileExt(manual.file_name);
              const extColor = FILE_TYPE_COLORS[ext] || 'bg-gray-100 text-gray-700';

              return (
                <div
                  key={manual.id}
                  className="p-5 border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all flex flex-col"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <div className="p-3 bg-blue-50 rounded-xl flex-shrink-0">
                      <FileText className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 leading-tight">{manual.title}</h3>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${extColor}`}>
                          {ext}
                        </span>
                        <span className="text-xs text-gray-500">{formatFileSize(manual.file_size)}</span>
                      </div>
                    </div>
                  </div>

                  {manual.description && (
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2 flex-grow">{manual.description}</p>
                  )}

                  <div className="space-y-1.5 mb-4 mt-auto">
                    {vesselName && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="text-gray-400">Vessel:</span>
                        <span className="font-medium text-gray-800">{vesselName}</span>
                      </div>
                    )}
                    {equipmentName && (
                      <div className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span className="text-gray-400">Equipment:</span>
                        <span className="font-medium text-gray-800">{equipmentName}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <span>Uploaded by {manual.uploaded_by_name}</span>
                      <span className="text-gray-300">·</span>
                      <span>{formatDateTime(manual.created_at)}</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-100">
                    {manual.file_url ? (
                      <a
                        href={manual.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Open
                      </a>
                    ) : (
                      <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium cursor-not-allowed">
                        <Download className="w-4 h-4" />
                        No File
                      </div>
                    )}
                    {!isDemo && (
                      deleteConfirm === manual.id ? (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleDelete(manual.id)}
                            className="px-3 py-2.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-2.5 border border-gray-300 text-gray-600 rounded-xl text-xs font-semibold hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(manual.id)}
                          className="px-3 py-2.5 border border-gray-200 text-gray-500 rounded-xl hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-colors"
                          title="Delete manual"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showUploadModal && (
        <UploadManualModal
          onClose={() => setShowUploadModal(false)}
          onSaved={loadData}
        />
      )}
    </div>
  );
};
