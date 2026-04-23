import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Package,
  Calendar,
  Building2,
  Users as UsersIcon,
  CreditCard,
  Activity,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  demoMaintenanceTasks,
  demoInventoryItems,
  demoMaintenanceHistory,
  demoVessels,
  demoUsers,
} from '../data/demoData';
import { supabase } from '../lib/supabase';
import { calculateDaysUntilDue, formatDate, isLowStock, sortTasksByUrgency } from '../utils/helpers';
import { MaintenanceTask, InventoryItem, MaintenanceHistory } from '../types';

interface DashboardProps {
  onNavigate: (page: string, params?: any) => void;
}

interface Company {
  id: string;
  name: string;
  customer_type: string;
  yacht_name: string;
  contact_name: string;
  subscription_status: 'active' | 'trial' | 'inactive';
  vessel_limit: number;
}

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

const MasterAdminDashboard: React.FC<{ onNavigate: (page: string, params?: any) => void }> = ({ onNavigate }) => {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCompanies(data || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const activeCustomers = companies.filter(c => c.subscription_status === 'active').length;
  const trialCustomers = companies.filter(c => c.subscription_status === 'trial').length;
  const retentionPct = companies.length > 0 ? Math.round((activeCustomers / companies.length) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Master Admin Dashboard</h1>
        <p className="text-gray-600 mt-1">Platform overview and customer management</p>
        <div className="mt-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium inline-block">Master Administrator</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Customers', value: companies.length, color: 'bg-blue-50 text-blue-600', icon: Building2, sub: 'All accounts' },
          { label: 'Active Subscriptions', value: activeCustomers, color: 'bg-green-50 text-green-600', icon: CreditCard, sub: `${trialCustomers} in trial` },
          { label: 'Trial Accounts', value: trialCustomers, color: 'bg-amber-50 text-amber-600', icon: Clock, sub: 'Pending conversion' },
          { label: 'Inactive Accounts', value: companies.filter(c => c.subscription_status === 'inactive').length, color: 'bg-red-50 text-red-600', icon: UsersIcon, sub: 'Churned' },
        ].map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div key={i} className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.label}</p>
                  <p className="text-3xl font-bold text-gray-900 mt-2">
                    {isLoading ? <span className="animate-pulse">-</span> : stat.value}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">{stat.sub}</p>
                </div>
                <div className={`p-3 rounded-xl ${stat.color}`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">Recent Customers</h2>
          <button
            onClick={() => onNavigate('customers')}
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all"
          >
            View All Customers
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="p-4 border border-gray-100 rounded-xl animate-pulse bg-gray-50 h-16" />)}
          </div>
        ) : companies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No customers yet</p>
            <button onClick={() => onNavigate('customers')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
              Add First Customer
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {companies.slice(0, 5).map(customer => {
              const displayName = customer.customer_type === 'yacht_owner' ? customer.yacht_name : customer.name;
              return (
                <div
                  key={customer.id}
                  className="p-4 border border-gray-200 rounded-xl hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                  onClick={() => onNavigate('customers')}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                        <Building2 className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{displayName}</h3>
                        <p className="text-sm text-gray-600">{customer.contact_name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-500">Vessel Limit</p>
                        <p className="text-lg font-semibold text-blue-600">{customer.vessel_limit}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        customer.subscription_status === 'active' ? 'bg-green-100 text-green-700' :
                        customer.subscription_status === 'trial' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {customer.subscription_status.charAt(0).toUpperCase() + customer.subscription_status.slice(1)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
          <h3 className="text-lg font-bold text-blue-900 mb-2">Quick Actions</h3>
          <p className="text-sm text-blue-700 mb-4">Manage your platform efficiently</p>
          <div className="space-y-2">
            <button onClick={() => onNavigate('customers')} className="w-full px-4 py-3 bg-white text-blue-700 rounded-xl text-sm font-medium hover:shadow-md transition-all text-left">Add New Customer</button>
            <button onClick={() => onNavigate('users')} className="w-full px-4 py-3 bg-white text-blue-700 rounded-xl text-sm font-medium hover:shadow-md transition-all text-left">Create User Account</button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6 border border-gray-200">
          <h3 className="text-lg font-bold text-gray-900 mb-2">Platform Information</h3>
          <p className="text-sm text-gray-600 mb-4">System overview</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Platform Status</span>
              <span className="px-3 py-1 bg-green-500 text-white rounded-lg text-xs font-medium">Operational</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Customer Retention</span>
              <span className="text-sm font-semibold text-gray-900">{isLoading ? '-' : `${retentionPct}%`}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Total Customers</span>
              <span className="text-sm font-semibold text-gray-900">{isLoading ? '-' : companies.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate }) => {
  const { currentUser, selectedVesselId } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [currentVesselName, setCurrentVesselName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentUser?.role === 'master_admin') return;
    loadData();
  }, [currentUser, selectedVesselId]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      if (currentUser.role === 'customer_admin') {
        setTasks(demoMaintenanceTasks.filter(t => currentUser.vessel_ids.includes(t.vessel_id)) as MaintenanceTask[]);
        setInventory(demoInventoryItems.filter(i => currentUser.vessel_ids.includes(i.vessel_id)) as InventoryItem[]);
        setHistory(demoMaintenanceHistory.filter(h => currentUser.vessel_ids.includes(h.vessel_id)) as MaintenanceHistory[]);
      } else {
        setTasks(demoMaintenanceTasks.filter(t => t.vessel_id === selectedVesselId) as MaintenanceTask[]);
        setInventory(demoInventoryItems.filter(i => i.vessel_id === selectedVesselId) as InventoryItem[]);
        setHistory(demoMaintenanceHistory.filter(h => h.vessel_id === selectedVesselId) as MaintenanceHistory[]);
      }
      const vessel = demoVessels.find(v => v.id === selectedVesselId);
      setCurrentVesselName(vessel?.name || '');
      setLoading(false);
      return;
    }

    const [tasksRes, invRes, histRes] = await Promise.all([
      (() => {
        let q = supabase.from('maintenance_tasks').select('*');
        if (currentUser.role === 'standard_user' && selectedVesselId) q = q.eq('vessel_id', selectedVesselId);
        else if (currentUser.company_id) q = q.eq('company_id', currentUser.company_id);
        return q;
      })(),
      (() => {
        let q = supabase.from('inventory_items').select('*');
        if (currentUser.role === 'standard_user' && selectedVesselId) q = q.eq('vessel_id', selectedVesselId);
        else if (currentUser.company_id) q = q.eq('company_id', currentUser.company_id);
        return q;
      })(),
      (() => {
        let q = supabase.from('maintenance_history').select('*').order('completion_date', { ascending: false }).limit(5);
        if (currentUser.role === 'standard_user' && selectedVesselId) q = q.eq('vessel_id', selectedVesselId);
        else if (currentUser.company_id) q = q.eq('company_id', currentUser.company_id);
        return q;
      })(),
    ]);

    setTasks(tasksRes.data || []);
    setInventory(invRes.data || []);
    setHistory(histRes.data || []);

    if (selectedVesselId) {
      const { data: vesselData } = await supabase.from('vessels').select('name').eq('id', selectedVesselId).maybeSingle();
      setCurrentVesselName(vesselData?.name || '');
    }

    setLoading(false);
  };

  if (currentUser?.role === 'master_admin') {
    return <MasterAdminDashboard onNavigate={onNavigate} />;
  }

  const overdueTasks = tasks.filter(t => t.status === 'overdue');
  const dueSoonTasks = tasks.filter(t => t.status === 'due_soon');
  const upcomingTasks = tasks.filter(t => t.status === 'upcoming');
  const lowStockItems = inventory.filter(isLowStock);

  const sortedTasks = sortTasksByUrgency(tasks.filter(t => t.status !== 'completed')).slice(0, 5);
  const totalTasks = tasks.length;
  const criticalCount = overdueTasks.length;
  const dueSoonCount = dueSoonTasks.filter(t => calculateDaysUntilDue(t.next_due_date) <= 2).length;
  const lowStockCritical = lowStockItems.filter(i => i.current_stock === 0).length;

  const maintenanceHealth = totalTasks > 0 ? Math.round(((totalTasks - overdueTasks.length) / totalTasks) * 100) : 100;
  const inventoryHealth = inventory.length > 0 ? Math.round(((inventory.length - lowStockItems.length) / inventory.length) * 100) : 100;
  const overallHealth = Math.round((maintenanceHealth + inventoryHealth) / 2);

  const getHealthStatus = (health: number) => {
    if (health >= 85) return { label: 'Operational', color: 'text-emerald-400', dot: 'bg-emerald-400' };
    if (health >= 70) return { label: 'Attention Needed', color: 'text-amber-400', dot: 'bg-amber-400' };
    return { label: 'Critical', color: 'text-red-400', dot: 'bg-red-400' };
  };

  const healthStatus = getHealthStatus(overallHealth);

  const stats = [
    { label: 'Overdue Tasks', value: overdueTasks.length, icon: AlertTriangle, color: 'bg-red-50 text-red-600', trend: 'Critical', nav: 'maintenance' },
    { label: 'Due Soon', value: dueSoonTasks.length, icon: Clock, color: 'bg-amber-50 text-amber-600', trend: 'This week', nav: 'maintenance' },
    { label: 'Upcoming', value: upcomingTasks.length, icon: Calendar, color: 'bg-blue-50 text-blue-600', trend: 'Scheduled', nav: 'maintenance' },
    { label: 'Low Stock Items', value: lowStockItems.length, icon: Package, color: 'bg-yellow-50 text-yellow-600', trend: 'Reorder needed', nav: 'inventory' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-6">
        <div className="shrink-0">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          <p className="text-gray-500 mt-2 text-base">Advanced vessel systems monitoring and operational analytics</p>
        </div>

        <div
          onClick={() => onNavigate('maintenance')}
          className="hidden lg:block w-2/3 bg-gradient-to-br from-slate-800 via-blue-900 to-slate-900 rounded-xl px-6 py-5 text-white shadow-xl border border-slate-700/50 hover:border-blue-400 transition-all cursor-pointer shrink-0"
        >
          <div className="flex items-center gap-6">
            {/* Semi-circle gauge */}
            <div className="relative shrink-0" style={{ width: 90, height: 50 }}>
              <svg width="90" height="50" viewBox="0 0 90 50">
                {/* Track */}
                <path
                  d="M 5 48 A 40 40 0 0 1 85 48"
                  fill="none"
                  stroke="rgba(255,255,255,0.15)"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Fill */}
                <path
                  d="M 5 48 A 40 40 0 0 1 85 48"
                  fill="none"
                  stroke={overallHealth >= 85 ? '#34d399' : overallHealth >= 70 ? '#fbbf24' : '#f87171'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${(loading ? 0 : overallHealth) * 1.257} 200`}
                  style={{ transition: 'stroke-dasharray 0.6s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex items-end justify-center pb-0.5">
                <span className="text-base font-bold text-white leading-none">
                  {loading ? '-' : `${overallHealth}%`}
                </span>
              </div>
            </div>

            {/* Labels */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-sm font-bold text-white tracking-tight uppercase">Vessel Status</h3>
                <Activity className="w-4 h-4 text-blue-300 shrink-0" />
              </div>
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-2 bg-white/10 rounded-full w-full" />
                  <div className="h-2 bg-white/10 rounded-full w-3/4" />
                </div>
              ) : (
                <div className="flex gap-4">
                  {[
                    { label: 'Maintenance', value: maintenanceHealth, color: 'bg-blue-400' },
                    { label: 'Inventory', value: inventoryHealth, color: 'bg-emerald-400' },
                  ].map(bar => (
                    <div key={bar.label} className="flex-1 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-blue-200 font-medium">{bar.label}</span>
                        <span className="text-xs font-bold text-white">{bar.value}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full ${bar.color} rounded-full transition-all duration-500`} style={{ width: `${bar.value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Status badge */}
            {!loading && (
              <div className="shrink-0 flex flex-col items-center gap-1.5">
                <span className={`text-xs font-bold ${healthStatus.color}`}>{healthStatus.label}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${healthStatus.dot} shadow-lg`} />
              </div>
            )}
          </div>
        </div>
      </div>

      {!loading && (criticalCount > 0 || dueSoonCount > 0 || lowStockCritical > 0) && (
        <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-4 shadow-xl border border-red-500">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-300" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">ACTION REQUIRED</h2>
                <div className="flex items-center gap-4 mt-1">
                  {criticalCount > 0 && <span className="text-sm text-red-100"><span className="font-bold text-white">{criticalCount}</span> Critical</span>}
                  {dueSoonCount > 0 && <span className="text-sm text-red-100"><span className="font-bold text-white">{dueSoonCount}</span> Due 48h</span>}
                  {lowStockCritical > 0 && <span className="text-sm text-red-100"><span className="font-bold text-white">{lowStockCritical}</span> Out Stock</span>}
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('maintenance')}
              className="px-5 py-2 bg-white text-red-700 rounded-lg font-bold text-sm hover:bg-red-50 transition-all shadow-lg shrink-0"
            >
              Resolve Now
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div
              key={index}
              onClick={() => onNavigate(stat.nav)}
              className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${stat.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-gray-900">
                    {loading ? <span className="animate-pulse text-gray-300">-</span> : stat.value}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-1">{stat.label}</p>
                <p className="text-xs text-gray-500">{stat.trend}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Urgent Maintenance</h2>
            <button onClick={() => onNavigate('maintenance')} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">View All</button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            ) : sortedTasks.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">All caught up!</p>
              </div>
            ) : (
              sortedTasks.map(task => {
                const daysUntil = calculateDaysUntilDue(task.next_due_date);
                const isOverdue = daysUntil < 0;
                return (
                  <div
                    key={task.id}
                    className="p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all cursor-pointer border border-transparent hover:border-gray-200"
                    onClick={() => onNavigate('maintenance', { taskId: task.id })}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 text-sm">{task.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">{task.category}</p>
                      </div>
                      <div className="text-right ml-4">
                        <span className={`text-xs font-bold ${isOverdue ? 'text-red-600' : daysUntil <= 3 ? 'text-amber-600' : 'text-blue-600'}`}>
                          {isOverdue ? `${Math.abs(daysUntil)}d overdue` : `${daysUntil}d remaining`}
                        </span>
                        <p className="text-xs text-gray-500 mt-1">{formatDate(task.next_due_date)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold text-gray-900">Low Stock Alerts</h2>
            <button onClick={() => onNavigate('inventory')} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">View All</button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1,2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
              </div>
            ) : lowStockItems.length === 0 ? (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-green-500 mx-auto mb-3" />
                <p className="text-gray-600 font-medium">All items in stock</p>
              </div>
            ) : (
              lowStockItems.slice(0, 5).map(item => (
                <div key={item.id} className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 hover:border-yellow-300 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-sm">{item.name}</h3>
                      <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                    </div>
                    <div className="text-right ml-4">
                      <span className="text-xs font-bold text-red-600">{item.current_stock} {item.unit_of_measure}</span>
                      <p className="text-xs text-gray-500 mt-1">Min: {item.minimum_stock}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-gray-900">Recent Activity</h2>
          <button onClick={() => onNavigate('history')} className="text-sm text-blue-600 hover:text-blue-700 font-semibold">View All</button>
        </div>
        <div className="space-y-3">
          {loading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />)}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No recent activity</p>
            </div>
          ) : (
            history.slice(0, 5).map(record => (
              <div key={record.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all">
                <div className="p-2 bg-green-100 rounded-xl shrink-0">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-sm">{record.task_title}</h3>
                  <p className="text-xs text-gray-500 mt-1">Completed by {record.completed_by_name}</p>
                  <p className="text-xs text-gray-400 mt-1">{formatDate(record.completion_date)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
