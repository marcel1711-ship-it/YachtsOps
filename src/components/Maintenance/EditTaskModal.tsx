import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, ChevronDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { demoEquipment, demoVessels, demoUsers } from '../../data/demoData';
import { MaintenanceTask } from '../../types';

interface EditTaskModalProps {
  task: MaintenanceTask;
  onClose: () => void;
  onSaved: () => void;
}

interface VesselOption { id: string; name: string; }
interface UserOption { id: string; full_name: string; role: string; vessel_ids: string[]; }

const MAINTENANCE_CATEGORIES = [
  'Engine', 'Electrical', 'Hull', 'Hydraulic', 'Fuel System',
  'Cooling System', 'Navigation', 'Safety', 'Plumbing', 'Deck Equipment', 'HVAC', 'Other',
];

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const EditTaskModal: React.FC<EditTaskModalProps> = ({ task, onClose, onSaved }) => {
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    title: task.title,
    description: task.description || '',
    category: task.category,
    priority: task.priority,
    vessel_id: task.vessel_id,
    equipment_id: task.equipment_id || '',
    assigned_user_id: task.assigned_user_id || '',
    next_due_date: task.next_due_date,
    status: task.status,
  });

  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserOption[]>([]);
  const [realEquipment, setRealEquipment] = useState<{ id: string; name: string }[]>([]);
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
    if (!formData.vessel_id || isDemoUser(currentUser?.email || '')) return;
    supabase.from('equipment').select('id, name').eq('vessel_id', formData.vessel_id).then(({ data }) => {
      setRealEquipment(data || []);
    });
  }, [formData.vessel_id]);

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
    if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      query = query.eq('company_id', currentUser.company_id);
    } else if (currentUser.vessel_ids.length > 0) {
      query = query.in('id', currentUser.vessel_ids);
    }
    const { data } = await query;
    if (data) setVessels(data);
  };

  const loadCompanyUsers = async () => {
    if (!currentUser) return;
    if (isDemoUser(currentUser.email)) {
      const users = currentUser.role === 'master_admin'
        ? demoUsers.filter(u => u.role !== 'master_admin')
        : demoUsers.filter(u => u.company_id === currentUser.company_id);
      setCompanyUsers(users.map(u => ({ id: u.id, full_name: u.full_name, role: u.role, vessel_ids: u.vessel_ids })));
      return;
    }
    try {
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
    } catch {}
  };

  const availableEquipment = isDemoUser(currentUser?.email || '')
    ? demoEquipment.filter(e => e.vessel_id === formData.vessel_id)
    : realEquipment;

  const availableUsers = companyUsers.filter(u => {
    if (!formData.vessel_id) return true;
    if (u.role === 'customer_admin') return true;
    return u.vessel_ids.includes(formData.vessel_id);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.vessel_id || !formData.next_due_date) {
      alert('Please fill in all required fields');
      return;
    }
    if (!currentUser || isDemoUser(currentUser.email)) { onClose(); return; }

    setSaving(true);
    const today = new Date();
    const dueDate = new Date(formData.next_due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const autoStatus = formData.status === 'completed'
      ? 'completed'
      : diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'upcoming';

    const { error } = await supabase.from('maintenance_tasks').update({
      title: formData.title,
      description: formData.description,
      category: formData.category,
      priority: formData.priority,
      vessel_id: formData.vessel_id,
      equipment_id: formData.equipment_id || null,
      assigned_user_id: formData.assigned_user_id || null,
      next_due_date: formData.next_due_date,
      status: autoStatus,
    }).eq('id', task.id);

    setSaving(false);
    if (!error) { onSaved(); onClose(); }
    else alert('Error saving task. Please try again.');
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Edit Maintenance Task</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={categoryRef} className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Category *</label>
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
                        setFormData({ ...formData, category: categoryInput.trim() });
                        setCategoryInput('');
                        setCategoryOpen(false);
                      }}
                    >
                      <span className="text-blue-500 font-bold">+</span>
                      Add "{categoryInput.trim()}"
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Vessel *</label>
              <select
                value={formData.vessel_id}
                onChange={(e) => setFormData({ ...formData, vessel_id: e.target.value, equipment_id: '', assigned_user_id: '' })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select Vessel</option>
                {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Equipment</label>
              <select
                value={formData.equipment_id}
                onChange={(e) => setFormData({ ...formData, equipment_id: e.target.value })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={!formData.vessel_id}
              >
                <option value="">No Equipment</option>
                {availableEquipment.map(eq => <option key={eq.id} value={eq.id}>{eq.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Assigned To</label>
            <select
              value={formData.assigned_user_id}
              onChange={(e) => setFormData({ ...formData, assigned_user_id: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Unassigned</option>
              {availableUsers.map(u => (
                <option key={u.id} value={u.id}>{u.full_name}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Next Due Date *</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="upcoming">Upcoming</option>
                <option value="due_soon">Due Soon</option>
                <option value="overdue">Overdue</option>
                <option value="completed">Completed</option>
              </select>
            </div>
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
              disabled={saving}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
