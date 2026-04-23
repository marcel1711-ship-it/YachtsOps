import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { demoEquipment, demoVessels, demoUsers } from '../../data/demoData';

interface NewTaskModalProps {
  onClose: () => void;
  onSave: (task: NewTaskData) => void;
}

export interface NewTaskData {
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  vessel_id: string;
  equipment_id: string;
  assigned_user_id: string;
  next_due_date: string;
  interval_type: 'hours' | 'days' | 'months';
  interval_value: number;
}

interface VesselOption {
  id: string;
  name: string;
}

interface UserOption {
  id: string;
  full_name: string;
  role: string;
  vessel_ids: string[];
}

const MAINTENANCE_CATEGORIES = [
  'Engine',
  'Electrical',
  'Hull',
  'Hydraulic',
  'Fuel System',
  'Cooling System',
  'Navigation',
  'Safety',
  'Plumbing',
  'Deck Equipment',
  'HVAC',
  'Other',
];

const isDemoUser = (email: string) =>
  demoUsers.some(u => u.email === email);

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ onClose, onSave }) => {
  const { currentUser } = useAuth();
  const [formData, setFormData] = useState<NewTaskData>({
    title: '',
    description: '',
    category: '',
    priority: 'medium',
    vessel_id: '',
    equipment_id: '',
    assigned_user_id: currentUser?.id || '',
    next_due_date: '',
    interval_type: 'days',
    interval_value: 30,
  });

  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserOption[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [categoryOpen, setCategoryOpen] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);

  const filteredCategories = MAINTENANCE_CATEGORIES.filter(c =>
    c.toLowerCase().includes(categoryInput.toLowerCase())
  );
  const showAddNew =
    categoryInput.trim().length > 0 &&
    !MAINTENANCE_CATEGORIES.some(c => c.toLowerCase() === categoryInput.trim().toLowerCase());

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
    loadCompanyUsers();
  }, [currentUser]);

  useEffect(() => {
    if (vessels.length === 1 && !formData.vessel_id) {
      setFormData(prev => ({ ...prev, vessel_id: vessels[0].id }));
    }
  }, [vessels]);

  const loadVessels = async () => {
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      const userVessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setVessels(userVessels.map(v => ({ id: v.id, name: v.name })));
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
    if (data) setVessels(data);
  };

  const loadCompanyUsers = async () => {
    if (!currentUser) return;
    setLoadingUsers(true);

    try {
      if (isDemoUser(currentUser.email)) {
        const users = currentUser.role === 'master_admin'
          ? demoUsers.filter(u => u.role !== 'master_admin')
          : demoUsers.filter(u => u.company_id === currentUser.company_id);
        setCompanyUsers(users.map(u => ({
          id: u.id,
          full_name: u.full_name,
          role: u.role,
          vessel_ids: u.vessel_ids,
        })));
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-users`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
          'Apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ company_id: currentUser.company_id || null }),
      });

      const result = await response.json();
      if (response.ok && result.users) {
        setCompanyUsers(result.users.map((u: any) => ({
          id: u.id,
          full_name: u.user_metadata?.full_name || u.email,
          role: u.user_metadata?.role || 'standard_user',
          vessel_ids: u.user_metadata?.vessel_ids || [],
        })));
      }
    } finally {
      setLoadingUsers(false);
    }
  };

  const [realEquipment, setRealEquipment] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!formData.vessel_id || isDemoUser(currentUser?.email || '')) return;
    supabase.from('equipment').select('id, name').eq('vessel_id', formData.vessel_id).then(({ data }) => {
      setRealEquipment(data || []);
    });
  }, [formData.vessel_id]);

  const availableEquipment = isDemoUser(currentUser?.email || '')
    ? demoEquipment.filter(e => e.vessel_id === formData.vessel_id)
    : realEquipment;

  const availableUsers = companyUsers.filter(u => {
    if (!formData.vessel_id) return true;
    if (u.role === 'customer_admin') return true;
    return u.vessel_ids.includes(formData.vessel_id);
  });

  const getRoleLabel = (role: string) => {
    if (role === 'customer_admin') return 'Admin';
    if (role === 'standard_user') return 'User';
    return role;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.vessel_id || !formData.equipment_id || !formData.next_due_date) {
      alert('Please fill in all required fields');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create New Maintenance Task</h2>
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
              Task Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="e.g., Main Engine Oil Change"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Detailed description of the maintenance task..."
            />
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
                Priority *
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vessel *
              </label>
              <select
                value={formData.vessel_id}
                onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value, equipment_id: '', assigned_user_id: '' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Vessel</option>
                {vessels.map(vessel => (
                  <option key={vessel.id} value={vessel.id}>
                    {vessel.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Equipment *
              </label>
              <select
                value={formData.equipment_id}
                onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                disabled={!formData.vessel_id}
              >
                <option value="">Select Equipment</option>
                {availableEquipment.map(equipment => (
                  <option key={equipment.id} value={equipment.id}>
                    {equipment.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Assigned To
            </label>
            <select
              value={formData.assigned_user_id}
              onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingUsers}
            >
              <option value="">Unassigned</option>
              {availableUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.full_name} ({getRoleLabel(user.role)})
                </option>
              ))}
            </select>
            {formData.vessel_id && availableUsers.length === 0 && !loadingUsers && (
              <p className="mt-1.5 text-xs text-gray-500">No users assigned to this vessel</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Next Due Date *
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={formData.next_due_date}
                onChange={(e) => setFormData({ ...formData, next_due_date: e.target.value })}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Recurrence Interval
            </label>
            <div className="flex gap-3">
              <input
                type="number"
                value={formData.interval_value}
                onChange={(e) => setFormData({ ...formData, interval_value: parseInt(e.target.value) || 0 })}
                className="w-32 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                placeholder="30"
              />
              <select
                value={formData.interval_type}
                onChange={(e) => setFormData({ ...formData, interval_type: e.target.value as any })}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="hours">Hours</option>
                <option value="days">Days</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800">
              This task will be added to the maintenance schedule. You can edit or delete it later from the task detail view.
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
              Create Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
