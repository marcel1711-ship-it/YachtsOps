import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  Filter,
  Plus,
  Search,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  demoMaintenanceTasks,
  demoEquipment,
  demoVessels,
  demoUsers
} from '../data/demoData';
import { supabase } from '../lib/supabase';
import {
  calculateDaysUntilDue,
  formatDate,
  getTaskStatusColor,
  getPriorityColor,
  sortTasksByUrgency
} from '../utils/helpers';
import { TaskDetail } from '../components/Maintenance/TaskDetail';
import { CompleteTaskModal } from '../components/Maintenance/CompleteTaskModal';
import { NewTaskModal } from '../components/Maintenance/NewTaskModal';
import { EditTaskModal } from '../components/Maintenance/EditTaskModal';
import { MaintenanceTask, MaintenanceHistory } from '../types';

interface MaintenanceProps {
  onNavigate: (page: string, params?: any) => void;
  params?: any;
}

interface VesselOption { id: string; name: string; }
interface EquipmentOption { id: string; name: string; vessel_id: string; }
interface UserOption { id: string; full_name: string; }

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const Maintenance: React.FC<MaintenanceProps> = ({ onNavigate, params }) => {
  const { currentUser, selectedVesselId } = useAuth();
  const [selectedTask, setSelectedTask] = useState<string | null>(params?.taskId || null);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterVessel, setFilterVessel] = useState<string>('all');
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [equipmentMap, setEquipmentMap] = useState<Record<string, EquipmentOption>>({});
  const [usersMap, setUsersMap] = useState<Record<string, UserOption>>({});
  const [loading, setLoading] = useState(true);
  const [lastCompletionMap, setLastCompletionMap] = useState<Record<string, MaintenanceHistory>>({});

  useEffect(() => {
    loadData();
  }, [currentUser, selectedVesselId]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      let filtered = demoMaintenanceTasks;
      if (currentUser.role === 'customer_admin') {
        filtered = filtered.filter(t => currentUser.vessel_ids.includes(t.vessel_id));
      } else if (currentUser.role === 'standard_user') {
        filtered = filtered.filter(t => t.vessel_id === selectedVesselId);
      }
      setTasks(filtered as MaintenanceTask[]);

      const userVessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setVessels(userVessels.map(v => ({ id: v.id, name: v.name })));

      const eqMap: Record<string, EquipmentOption> = {};
      demoEquipment.forEach(e => { eqMap[e.id] = { id: e.id, name: e.name, vessel_id: e.vessel_id }; });
      setEquipmentMap(eqMap);

      const uMap: Record<string, UserOption> = {};
      demoUsers.forEach(u => { uMap[u.id] = { id: u.id, full_name: u.full_name }; });
      setUsersMap(uMap);

      setLoading(false);
      return;
    }

    let query = supabase.from('maintenance_tasks').select('*');
    if (currentUser.role === 'standard_user' && selectedVesselId) {
      query = query.eq('vessel_id', selectedVesselId);
    } else if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      query = query.eq('company_id', currentUser.company_id);
    }
    const { data: taskData } = await query.order('next_due_date', { ascending: true });
    setTasks(taskData || []);

    let vesselQuery = supabase.from('vessels').select('id, name');
    if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      vesselQuery = vesselQuery.eq('company_id', currentUser.company_id);
    } else if (currentUser.role === 'standard_user' && currentUser.vessel_ids.length > 0) {
      vesselQuery = vesselQuery.in('id', currentUser.vessel_ids);
    }
    const { data: vesselData } = await vesselQuery;
    setVessels(vesselData || []);

    const { data: eqData } = await supabase.from('equipment').select('id, name, vessel_id');
    const eqMap: Record<string, EquipmentOption> = {};
    (eqData || []).forEach((e: EquipmentOption) => { eqMap[e.id] = e; });
    setEquipmentMap(eqMap);

    const { data: usersData } = await supabase.from('users').select('id, full_name');
    const uMap: Record<string, UserOption> = {};
    (usersData || []).forEach((u: UserOption) => { uMap[u.id] = u; });
    setUsersMap(uMap);

    const { data: historyData } = await supabase
      .from('maintenance_history')
      .select('*')
      .order('completion_date', { ascending: false });
    const lcMap: Record<string, MaintenanceHistory> = {};
    (historyData || []).forEach((h: MaintenanceHistory) => {
      if (!lcMap[h.task_id]) lcMap[h.task_id] = h;
    });
    setLastCompletionMap(lcMap);

    setLoading(false);
  };

  const handleNewTask = async (taskData: any) => {
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      setShowNewTaskModal(false);
      return;
    }

    const today = new Date();
    const dueDate = new Date(taskData.next_due_date);
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    const status = diffDays < 0 ? 'overdue' : diffDays <= 7 ? 'due_soon' : 'upcoming';

    const { error } = await supabase.from('maintenance_tasks').insert({
      title: taskData.title,
      description: taskData.description,
      category: taskData.category,
      priority: taskData.priority,
      vessel_id: taskData.vessel_id,
      equipment_id: taskData.equipment_id || null,
      assigned_user_id: taskData.assigned_user_id || null,
      next_due_date: taskData.next_due_date,
      frequency: taskData.interval_type === 'hours' ? 'custom' : taskData.interval_type === 'months' ? 'monthly' : 'custom',
      custom_interval_days: taskData.interval_type === 'days' ? taskData.interval_value : null,
      status,
      company_id: currentUser.company_id || null,
      reminder_days_before: [],
      required_parts: [],
      checklist_items: [],
    });

    if (!error) {
      setShowNewTaskModal(false);
      loadData();
    }
  };

  const handleComplete = async (completionData: any) => {
    if (!currentUser || !selectedTaskObj) return;

    if (isDemoUser(currentUser.email)) {
      setShowCompleteModal(false);
      setSelectedTask(null);
      return;
    }

    const { error: historyError } = await supabase.from('maintenance_history').insert({
      task_id: selectedTaskObj.id,
      vessel_id: selectedTaskObj.vessel_id,
      company_id: selectedTaskObj.company_id || null,
      equipment_id: selectedTaskObj.equipment_id || null,
      task_title: selectedTaskObj.title,
      due_date: selectedTaskObj.next_due_date,
      completion_date: completionData.completion_date,
      completed_by_id: currentUser.id,
      completed_by_name: completionData.completed_by_name,
      completed_by_email: completionData.completed_by_email,
      comments: completionData.comments,
      photos: completionData.photos,
      parts_used: completionData.parts_used,
      issues_detected: completionData.issues_detected,
    });

    if (!historyError) {
      await supabase.from('maintenance_tasks').update({
        status: 'completed',
        last_completed_date: new Date().toISOString().split('T')[0],
      }).eq('id', selectedTaskObj.id);

      // Auto-deduct inventory for each part used
      const partsUsed: { inventory_id: string; quantity: number; name: string }[] =
        completionData.parts_used || [];

      for (const part of partsUsed) {
        if (!part.inventory_id || part.quantity <= 0) continue;

        // Fetch current stock
        const { data: invData } = await supabase
          .from('inventory_items')
          .select('current_stock')
          .eq('id', part.inventory_id)
          .maybeSingle();

        if (invData) {
          const newStock = Math.max(0, invData.current_stock - part.quantity);
          await supabase
            .from('inventory_items')
            .update({ current_stock: newStock })
            .eq('id', part.inventory_id);

          await supabase.from('stock_movements').insert({
            inventory_id: part.inventory_id,
            vessel_id: selectedTaskObj.vessel_id,
            movement_type: 'out',
            quantity: part.quantity,
            reason: 'Used in maintenance',
            reference_id: selectedTaskObj.id,
            performed_by_id: currentUser.id,
            performed_by_name: currentUser.full_name,
          });
        }
      }

      setShowCompleteModal(false);
      setSelectedTask(null);
      loadData();
    }
  };

  const getFilteredTasks = () => {
    let filtered = tasks;

    if (filterStatus !== 'all') filtered = filtered.filter(t => t.status === filterStatus);
    if (filterPriority !== 'all') filtered = filtered.filter(t => t.priority === filterPriority);
    if (filterCategory !== 'all') filtered = filtered.filter(t => t.category === filterCategory);
    if (filterVessel !== 'all') filtered = filtered.filter(t => t.vessel_id === filterVessel);

    if (searchTerm) {
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return sortTasksByUrgency(filtered);
  };

  const filteredTasks = getFilteredTasks();
  const categories = Array.from(new Set(tasks.map(t => t.category)));
  const selectedTaskObj = selectedTask ? tasks.find(t => t.id === selectedTask) || null : null;

  if (selectedTaskObj) {
    return (
      <>
        <TaskDetail
          task={selectedTaskObj}
          equipmentMap={equipmentMap}
          vesselMap={Object.fromEntries(vessels.map(v => [v.id, v]))}
          usersMap={usersMap}
          lastCompletion={lastCompletionMap[selectedTaskObj.id] || null}
          onBack={() => setSelectedTask(null)}
          onComplete={() => setShowCompleteModal(true)}
          onEdit={() => setShowEditModal(true)}
        />
        {showCompleteModal && (
          <CompleteTaskModal
            task={selectedTaskObj}
            onClose={() => setShowCompleteModal(false)}
            onComplete={handleComplete}
          />
        )}
        {showEditModal && (
          <EditTaskModal
            task={selectedTaskObj}
            onClose={() => setShowEditModal(false)}
            onSaved={() => { setShowEditModal(false); loadData(); }}
          />
        )}
      </>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 tracking-tight">Maintenance Tasks</h1>
          <p className="text-gray-500 mt-1 sm:mt-2 text-sm sm:text-base">Manage preventive maintenance schedule</p>
        </div>
        <button
          onClick={() => setShowNewTaskModal(true)}
          className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-5 h-5" />
          New Task
        </button>
      </div>

      {showNewTaskModal && (
        <NewTaskModal
          onClose={() => setShowNewTaskModal(false)}
          onSave={handleNewTask}
        />
      )}

      <div className="bg-white rounded-2xl border border-gray-200 p-7">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-7">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
          </div>

          <div className="relative">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Status</option>
              <option value="overdue">Overdue</option>
              <option value="due_soon">Due Soon</option>
              <option value="upcoming">Upcoming</option>
              <option value="completed">Completed</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
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
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
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
            Showing <span className="font-semibold text-gray-900">{filteredTasks.length}</span> {filteredTasks.length === 1 ? 'task' : 'tasks'}
          </p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No maintenance tasks found</p>
              </div>
            ) : (
              filteredTasks.map(task => {
                const daysUntil = calculateDaysUntilDue(task.next_due_date);
                const equipment = equipmentMap[task.equipment_id];
                const vessel = vessels.find(v => v.id === task.vessel_id);
                const assignedUser = usersMap[task.assigned_user_id];

                return (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTask(task.id)}
                    className="p-5 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 break-words">{task.title}</h3>
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 ${getTaskStatusColor(task.status)}`}>
                            {task.status.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 ${getPriorityColor(task.priority)}`}>
                            {task.priority.toUpperCase()}
                          </span>
                        </div>

                        <p className="text-sm text-gray-600 mb-3">{task.category}</p>

                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          {equipment && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Equipment:</span>
                              <span>{equipment.name}</span>
                            </div>
                          )}
                          {vessel && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Vessel:</span>
                              <span>{vessel.name}</span>
                            </div>
                          )}
                          {assignedUser && (
                            <div className="flex items-center gap-1">
                              <span className="font-medium">Assigned:</span>
                              <span>{assignedUser.full_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex sm:flex-col sm:text-right items-center sm:items-end gap-3 sm:gap-0 sm:ml-6 shrink-0">
                        <div className={`text-base sm:text-lg font-bold ${
                          task.status === 'overdue' ? 'text-red-600' :
                          task.status === 'due_soon' ? 'text-orange-600' : 'text-blue-600'
                        }`}>
                          {task.status === 'overdue'
                            ? `${Math.abs(daysUntil)}d overdue`
                            : `${daysUntil}d`
                          }
                        </div>
                        <p className="text-sm text-gray-500 sm:mt-1">{formatDate(task.next_due_date)}</p>
                        {task.status === 'overdue' && (
                          <div className="sm:mt-2 flex items-center gap-1 text-red-600">
                            <AlertTriangle className="w-4 h-4" />
                            <span className="text-xs font-medium">URGENT</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
