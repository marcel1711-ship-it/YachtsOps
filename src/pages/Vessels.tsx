import React, { useState, useEffect } from 'react';
import { Ship, Search, Plus, MapPin, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

interface Vessel {
  id: string;
  company_id: string;
  name: string;
  type: string;
  manufacturer: string;
  model: string;
  year_built: number | null;
  flag: string;
  imo_number: string;
  mmsi: string;
  call_sign: string;
  registration_id: string;
  length_overall: number | null;
  beam: number | null;
  gross_tonnage: number | null;
  location: string;
  notes: string;
  photo_url: string | null;
  company?: { name: string };
}

interface VesselsProps {
  onNavigate: (page: string, params?: any) => void;
}

const VESSEL_TYPE_LABELS: Record<string, string> = {
  motor_yacht: 'Motor Yacht',
  sailing_yacht: 'Sailing Yacht',
  catamaran: 'Catamaran',
  explorer_yacht: 'Explorer Yacht',
  superyacht: 'Superyacht',
  gulet: 'Gulet',
  other: 'Other',
};

export const Vessels: React.FC<VesselsProps> = ({ onNavigate }) => {
  const { currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [vessels, setVessels] = useState<Vessel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchVessels();
  }, [currentUser]);

  const fetchVessels = async () => {
    try {
      setIsLoading(true);
      setError(null);

      let query = supabase
        .from('vessels')
        .select('*, company:companies(name)')
        .order('name', { ascending: true });

      if (currentUser?.role === 'customer_admin' && currentUser.company_id) {
        query = query.eq('company_id', currentUser.company_id);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;
      setVessels(data || []);
    } catch (err: any) {
      console.error('Error fetching vessels:', err);
      setError(err.message || 'Failed to load vessels');
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredVessels = () => {
    let filtered = vessels;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(term) ||
        (v.registration_id || '').toLowerCase().includes(term) ||
        (v.type || '').toLowerCase().includes(term) ||
        (v.location || '').toLowerCase().includes(term)
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(v => v.type === filterType);
    }

    return filtered;
  };

  const filteredVessels = getFilteredVessels();
  const types = Array.from(new Set(vessels.map(v => v.type).filter(Boolean)));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Vessel Management</h1>
          <p className="text-gray-600 mt-1 text-sm sm:text-base">Manage fleet vessels and configurations</p>
        </div>
        <button
          onClick={() => onNavigate('vessel-create')}
          className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          Add Vessel
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search vessels..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            {types.map(type => (
              <option key={type} value={type}>
                {VESSEL_TYPE_LABELS[type] || type}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-16">
            <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-600">Loading vessels...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
            <p className="text-red-600 font-medium mb-2">Error Loading Vessels</p>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchVessels}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVessels.length === 0 ? (
              <div className="col-span-full text-center py-16">
                <Ship className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600 font-medium mb-1">No vessels found</p>
                <p className="text-sm text-gray-500">
                  {vessels.length === 0
                    ? 'Vessels are created when adding Yacht Owner customers.'
                    : 'Try adjusting your search or filter.'}
                </p>
              </div>
            ) : (
              filteredVessels.map(vessel => (
                <div
                  key={vessel.id}
                  className="border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer overflow-hidden"
                  onClick={() => onNavigate('vessel-detail', { vesselId: vessel.id })}
                >
                  {vessel.photo_url ? (
                    <div className="relative h-44 overflow-hidden">
                      <img
                        src={vessel.photo_url}
                        alt={vessel.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <h3 className="text-lg font-bold text-white truncate">{vessel.name}</h3>
                        <span className="inline-block mt-1 px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white rounded-lg text-xs font-medium">
                          {VESSEL_TYPE_LABELS[vessel.type] || vessel.type || 'Unknown'}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="h-24 bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
                      <Ship className="w-10 h-10 text-white/50" />
                    </div>
                  )}

                  <div className="p-5">
                    {!vessel.photo_url && (
                      <div className="mb-4">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">{vessel.name}</h3>
                        <span className="inline-block mt-1 px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-xs font-medium">
                          {VESSEL_TYPE_LABELS[vessel.type] || vessel.type || 'Unknown'}
                        </span>
                      </div>
                    )}

                    <div className="space-y-2">
                      {vessel.registration_id && (
                        <div>
                          <p className="text-xs text-gray-500">Registration ID</p>
                          <p className="text-sm font-medium text-gray-900">{vessel.registration_id}</p>
                        </div>
                      )}

                      {vessel.year_built && (
                        <div>
                          <p className="text-xs text-gray-500">Year Built</p>
                          <p className="text-sm font-medium text-gray-900">{vessel.year_built}</p>
                        </div>
                      )}

                      {vessel.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <p className="text-sm text-gray-700">{vessel.location}</p>
                        </div>
                      )}

                      {vessel.company && (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                          <p className="text-sm text-gray-700 truncate">{vessel.company.name}</p>
                        </div>
                      )}
                    </div>

                    {vessel.notes && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-sm text-gray-600 line-clamp-2">{vessel.notes}</p>
                      </div>
                    )}

                    {(vessel.length_overall || vessel.flag) && (
                      <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4">
                        {vessel.length_overall && (
                          <div>
                            <p className="text-xs text-gray-500">LOA</p>
                            <p className="text-sm font-medium text-gray-900">{vessel.length_overall}m</p>
                          </div>
                        )}
                        {vessel.flag && (
                          <div>
                            <p className="text-xs text-gray-500">Flag</p>
                            <p className="text-sm font-medium text-gray-900">{vessel.flag}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
