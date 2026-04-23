import React, { useState, useEffect } from 'react';
import {
  Fuel as FuelIcon,
  Droplets,
  Plus,
  Minus,
  ChevronDown,
  Filter,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  FileDown,
  History,
  Pencil,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { demoFuelResources, demoFuelLog, demoVessels, demoUsers } from '../data/demoData';
import { FuelResource, FuelLogEntry, ResourceType } from '../types';
import { LogFuelEntryModal } from '../components/Fuel/LogFuelEntryModal';
import { AddResourceModal, NewResourceData } from '../components/Fuel/AddResourceModal';
import { EditResourceModal } from '../components/Fuel/EditResourceModal';

interface FuelProps {
  onNavigate: (page: string, params?: any) => void;
}

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

const RESOURCE_LABELS: Record<ResourceType, string> = {
  diesel_main: 'Diesel (Main Engines)',
  diesel_generator: 'Diesel (Generator)',
  fresh_water: 'Fresh Water',
  engine_oil: 'Engine Oil',
  hydraulic_oil: 'Hydraulic Oil',
  grey_water: 'Grey Water',
  black_water: 'Black Water',
  other: 'Other',
};

const RESOURCE_ICONS: Record<ResourceType, React.ReactNode> = {
  diesel_main: <FuelIcon className="w-5 h-5" />,
  diesel_generator: <FuelIcon className="w-5 h-5" />,
  fresh_water: <Droplets className="w-5 h-5" />,
  engine_oil: <FuelIcon className="w-5 h-5" />,
  hydraulic_oil: <FuelIcon className="w-5 h-5" />,
  grey_water: <Droplets className="w-5 h-5" />,
  black_water: <Droplets className="w-5 h-5" />,
  other: <FuelIcon className="w-5 h-5" />,
};

const RESOURCE_COLORS: Record<ResourceType, { bg: string; icon: string; bar: string; low: string }> = {
  diesel_main:      { bg: 'bg-blue-50',   icon: 'text-blue-600',   bar: 'bg-blue-500',   low: 'bg-red-500' },
  diesel_generator: { bg: 'bg-sky-50',    icon: 'text-sky-600',    bar: 'bg-sky-500',    low: 'bg-red-500' },
  fresh_water:      { bg: 'bg-cyan-50',   icon: 'text-cyan-600',   bar: 'bg-cyan-500',   low: 'bg-red-500' },
  engine_oil:       { bg: 'bg-amber-50',  icon: 'text-amber-600',  bar: 'bg-amber-500',  low: 'bg-red-500' },
  hydraulic_oil:    { bg: 'bg-orange-50', icon: 'text-orange-600', bar: 'bg-orange-500', low: 'bg-red-500' },
  grey_water:       { bg: 'bg-slate-50',  icon: 'text-slate-600',  bar: 'bg-slate-400',  low: 'bg-slate-600' },
  black_water:      { bg: 'bg-gray-50',   icon: 'text-gray-600',   bar: 'bg-gray-500',   low: 'bg-gray-700' },
  other:            { bg: 'bg-teal-50',   icon: 'text-teal-600',   bar: 'bg-teal-500',   low: 'bg-red-500' },
};

export const Fuel: React.FC<FuelProps> = () => {
  const { currentUser, selectedVesselId } = useAuth();
  const [resources, setResources] = useState<FuelResource[]>([]);
  const [log, setLog] = useState<FuelLogEntry[]>([]);
  const [vessels, setVessels] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterVessel, setFilterVessel] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [logResource, setLogResource] = useState<FuelResource | null>(null);
  const [forceEntryType, setForceEntryType] = useState<'refill' | 'consumption' | null>(null);
  const [showAddResource, setShowAddResource] = useState(false);
  const [editResource, setEditResource] = useState<FuelResource | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'history'>('overview');

  useEffect(() => { loadData(); }, [currentUser, selectedVesselId]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      let resFiltered = demoFuelResources;
      let logFiltered = demoFuelLog;

      if (currentUser.role === 'standard_user') {
        resFiltered = resFiltered.filter(r => r.vessel_id === selectedVesselId);
        logFiltered = logFiltered.filter(l => l.vessel_id === selectedVesselId);
      } else if (currentUser.role === 'customer_admin') {
        resFiltered = resFiltered.filter(r => currentUser.vessel_ids.includes(r.vessel_id));
        logFiltered = logFiltered.filter(l => currentUser.vessel_ids.includes(l.vessel_id));
      }

      setResources(resFiltered);
      setLog(logFiltered.sort((a, b) => b.log_date.localeCompare(a.log_date)));

      const userVessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setVessels(userVessels.map(v => ({ id: v.id, name: v.name })));

      setLoading(false);
      return;
    }

    const { data: resData } = await supabase.from('fuel_resources').select('*').order('name');
    const { data: logData } = await supabase.from('fuel_log').select('*').order('log_date', { ascending: false });
    const { data: vesselData } = await supabase.from('vessels').select('id, name');

    setResources(resData || []);
    setLog(logData || []);
    setVessels(vesselData || []);
    setLoading(false);
  };

  const handleSaveEntry = async (entry: {
    entry_type: 'refill' | 'consumption';
    quantity: number;
    price_per_unit: number | null;
    total_cost: number | null;
    currency: string;
    supplier: string;
    location: string;
    engine_hours: number | null;
    notes: string;
    log_date: string;
  }) => {
    if (!logResource || !currentUser) return;

    const newLevel =
      entry.entry_type === 'refill'
        ? Math.min(logResource.capacity, logResource.current_level + entry.quantity)
        : Math.max(0, logResource.current_level - entry.quantity);

    if (isDemoUser(currentUser.email)) {
      const newEntry: FuelLogEntry = {
        id: `fl-demo-${Date.now()}`,
        resource_id: logResource.id,
        vessel_id: logResource.vessel_id,
        company_id: logResource.company_id,
        logged_by_id: currentUser.id,
        logged_by_name: currentUser.full_name,
        ...entry,
        created_at: new Date().toISOString(),
      };
      setResources(prev =>
        prev.map(r => r.id === logResource.id ? { ...r, current_level: newLevel } : r)
      );
      setLog(prev => [newEntry, ...prev]);
      setLogResource(null);
      return;
    }

    await supabase.from('fuel_log').insert({
      resource_id: logResource.id,
      vessel_id: logResource.vessel_id,
      company_id: logResource.company_id,
      logged_by_id: currentUser.id,
      logged_by_name: currentUser.full_name,
      ...entry,
    });
    await supabase
      .from('fuel_resources')
      .update({ current_level: newLevel, updated_at: new Date().toISOString() })
      .eq('id', logResource.id);

    setLogResource(null);
    loadData();
  };

  const handleAddResource = async (data: NewResourceData) => {
    if (!currentUser) return;

    if (isDemoUser(currentUser.email)) {
      const newRes: FuelResource = {
        id: `res-demo-${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...data,
      };
      setResources(prev => [...prev, newRes]);
      setShowAddResource(false);
      return;
    }

    await supabase.from('fuel_resources').insert({
      ...data,
      company_id: currentUser.company_id,
    });
    setShowAddResource(false);
    loadData();
  };

  const handleUpdateResource = async (updated: Partial<FuelResource>) => {
    if (!editResource || !currentUser) return;

    if (isDemoUser(currentUser.email)) {
      setResources(prev =>
        prev.map(r => r.id === editResource.id ? { ...r, ...updated, updated_at: new Date().toISOString() } : r)
      );
      setEditResource(null);
      return;
    }

    await supabase
      .from('fuel_resources')
      .update({ ...updated, updated_at: new Date().toISOString() })
      .eq('id', editResource.id);
    setEditResource(null);
    loadData();
  };

  const handleDeleteResource = async () => {
    if (!editResource || !currentUser) return;

    if (isDemoUser(currentUser.email)) {
      setResources(prev => prev.filter(r => r.id !== editResource.id));
      setLog(prev => prev.filter(l => l.resource_id !== editResource.id));
      setEditResource(null);
      return;
    }

    await supabase.from('fuel_resources').delete().eq('id', editResource.id);
    setEditResource(null);
    loadData();
  };

  const filteredResources = resources.filter(r => {
    if (filterVessel !== 'all' && r.vessel_id !== filterVessel) return false;
    if (filterType !== 'all' && r.resource_type !== filterType) return false;
    return true;
  });

  const filteredLog = log.filter(l => {
    const res = resources.find(r => r.id === l.resource_id);
    if (!res) return false;
    if (filterVessel !== 'all' && l.vessel_id !== filterVessel) return false;
    if (filterType !== 'all' && res.resource_type !== filterType) return false;
    return true;
  });

  const totalRefillCost = filteredLog
    .filter(l => l.entry_type === 'refill' && l.total_cost)
    .reduce((sum, l) => sum + (l.total_cost || 0), 0);

  const alertResources = filteredResources.filter(
    r => r.current_level <= r.low_level_alert && r.low_level_alert > 0
  );

  const getVesselName = (vesselId: string) =>
    vessels.find(v => v.id === vesselId)?.name || 'Unknown';

  const handleExportPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

    const rows = filteredLog.map(entry => {
      const res = resources.find(r => r.id === entry.resource_id);
      const isRefill = entry.entry_type === 'refill';
      return `
        <tr>
          <td>${new Date(entry.log_date).toLocaleDateString('en-GB')}</td>
          <td>${res?.name || '—'}</td>
          <td>${getVesselName(entry.vessel_id)}</td>
          <td class="${isRefill ? 'refill' : 'consume'}">${isRefill ? '+ Refill' : '− Consumption'}</td>
          <td class="num">${entry.quantity.toLocaleString()} ${res?.unit || ''}</td>
          <td>${entry.location || '—'}</td>
          <td>${entry.supplier || '—'}</td>
          <td class="num">${entry.total_cost ? `${entry.currency} ${entry.total_cost.toLocaleString()}` : '—'}</td>
          <td>${entry.logged_by_name}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<title>Fuel & Consumables Report</title>
<style>
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;font-size:11px;}
.header{background:#1e3a5f;color:#fff;padding:24px 28px;}
.header h1{font-size:20px;font-weight:700;margin-bottom:3px;}
.header p{font-size:11px;opacity:.75;}
.alerts{margin:16px 28px;padding:12px 16px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;color:#92400e;}
.alerts strong{display:block;margin-bottom:6px;}
.summary{display:flex;gap:12px;padding:12px 28px;}
.sc{flex:1;padding:10px 14px;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;}
.sc .num{font-size:22px;font-weight:700;color:#1d4ed8;}
.sc .lbl{font-size:10px;color:#6b7280;}
.tw{padding:8px 28px 28px;}
table{width:100%;border-collapse:collapse;table-layout:fixed;}
th{background:#f8fafc;text-align:left;padding:8px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.3px;color:#4b5563;border-bottom:2px solid #e5e7eb;}
td{padding:7px 8px;border-bottom:1px solid #f0f0f0;vertical-align:top;word-wrap:break-word;}
.refill{color:#15803d;font-weight:600;}
.consume{color:#d97706;font-weight:600;}
.num{text-align:right;}
.footer{margin-top:20px;padding:10px 28px;border-top:1px solid #e5e7eb;font-size:9px;color:#9ca3af;text-align:center;}
@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="header"><h1>Fuel & Consumables Report</h1><p>Generated ${dateStr}</p></div>
${alertResources.length ? `<div class="alerts"><strong>Low Level Alerts (${alertResources.length})</strong>${alertResources.map(r => `${r.name}: ${r.current_level.toLocaleString()} / ${r.capacity.toLocaleString()} ${r.unit}`).join(' &bull; ')}</div>` : ''}
<div class="summary">
  <div class="sc"><div class="num">${filteredLog.length}</div><div class="lbl">Total Log Entries</div></div>
  <div class="sc"><div class="num">${filteredLog.filter(l => l.entry_type === 'refill').length}</div><div class="lbl">Refills</div></div>
  <div class="sc"><div class="num">${filteredLog.filter(l => l.entry_type === 'consumption').length}</div><div class="lbl">Consumption Events</div></div>
  <div class="sc"><div class="num" style="color:#15803d">EUR ${totalRefillCost.toLocaleString(undefined,{maximumFractionDigits:0})}</div><div class="lbl">Total Refill Cost</div></div>
</div>
<div class="tw"><table>
<thead><tr><th>Date</th><th>Resource</th><th>Vessel</th><th>Type</th><th style="text-align:right">Qty</th><th>Location</th><th>Supplier</th><th style="text-align:right">Cost</th><th>Logged By</th></tr></thead>
<tbody>${rows}</tbody>
</table></div>
<div class="footer">YachtOps &mdash; Fuel &amp; Consumables Report &mdash; ${dateStr}</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuel-report-${now.toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Fuel & Consumables</h1>
          <p className="text-gray-500 mt-2 text-base">Track fuel, water and operational fluid levels</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddResource(true)}
            className="flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold transition-all shadow-sm"
          >
            <Plus className="w-5 h-5" />
            Add Resource
          </button>
          <button
            onClick={handleExportPDF}
            disabled={filteredLog.length === 0}
            className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <FileDown className="w-5 h-5" />
            Export PDF
          </button>
        </div>
      </div>

      {/* Low level alerts */}
      {alertResources.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-2xl p-5">
          <div className="flex items-center gap-3 mb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="font-bold text-amber-900">Low Level Alerts</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertResources.map(r => (
              <div key={r.id} className="flex items-center justify-between bg-white border border-amber-200 rounded-xl px-4 py-3">
                <span className="text-sm font-medium text-amber-900">{r.name}</span>
                <span className="text-sm font-bold text-amber-700">
                  {r.current_level.toLocaleString()} {r.unit}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-base font-bold text-gray-900">Filters</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <select
              value={filterVessel}
              onChange={e => setFilterVessel(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Vessels</option>
              {vessels.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Resource Types</option>
              {(Object.keys(RESOURCE_LABELS) as ResourceType[]).map(k => (
                <option key={k} value={k}>{RESOURCE_LABELS[k]}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 rounded-2xl w-fit">
        {(['overview', 'history'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'overview' ? <FuelIcon className="w-4 h-4" /> : <History className="w-4 h-4" />}
            {tab === 'overview' ? 'Resource Overview' : 'Log History'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {[1, 2, 3].map(i => <div key={i} className="h-44 bg-gray-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : activeTab === 'overview' ? (
        /* OVERVIEW TAB */
        <>
          {filteredResources.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <FuelIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No resources found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredResources.map(resource => {
                const pct = resource.capacity > 0
                  ? Math.min(100, (resource.current_level / resource.capacity) * 100)
                  : 0;
                const isLow = resource.current_level <= resource.low_level_alert && resource.low_level_alert > 0;
                const colors = RESOURCE_COLORS[resource.resource_type];
                const vessel = vessels.find(v => v.id === resource.vessel_id);
                const recentLogs = log.filter(l => l.resource_id === resource.id).slice(0, 3);
                const lastConsumption = log.find(l => l.resource_id === resource.id && l.entry_type === 'consumption');
                const lastRefill = log.find(l => l.resource_id === resource.id && l.entry_type === 'refill');

                return (
                  <div
                    key={resource.id}
                    className={`bg-white rounded-2xl border ${isLow ? 'border-amber-300' : 'border-gray-200'} p-6 hover:shadow-md transition-all`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 ${colors.bg} rounded-xl ${colors.icon}`}>
                          {RESOURCE_ICONS[resource.resource_type]}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900">{resource.name}</h3>
                          <p className="text-xs text-gray-500">{vessel?.name || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {isLow && (
                          <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 rounded-lg text-xs font-semibold">
                            <AlertTriangle className="w-3 h-3" />
                            Low
                          </span>
                        )}
                        <button
                          onClick={() => setEditResource(resource)}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Edit resource"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Level bar */}
                    <div className="mb-4">
                      <div className="flex items-end justify-between mb-1.5">
                        <span className="text-2xl font-bold text-gray-900">
                          {resource.current_level.toLocaleString()}
                          <span className="text-base font-normal text-gray-400 ml-1">{resource.unit}</span>
                        </span>
                        <span className="text-sm text-gray-500">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${isLow ? colors.low : colors.bar}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-xs text-gray-400">0</span>
                        <span className="text-xs text-gray-400">{resource.capacity.toLocaleString()} {resource.unit}</span>
                      </div>
                    </div>

                    {/* Last movements */}
                    <div className="space-y-1.5 mb-5">
                      {lastRefill && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <TrendingUp className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                          <span>Last refill: <strong className="text-gray-700">+{lastRefill.quantity.toLocaleString()} {resource.unit}</strong> — {new Date(lastRefill.log_date).toLocaleDateString('en-GB')}</span>
                        </div>
                      )}
                      {lastConsumption && (
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <TrendingDown className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />
                          <span>Last use: <strong className="text-gray-700">{lastConsumption.quantity.toLocaleString()} {resource.unit}</strong> — {new Date(lastConsumption.log_date).toLocaleDateString('en-GB')}</span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => { setForceEntryType('refill'); setLogResource(resource); }}
                        className="flex items-center justify-center gap-1.5 py-2.5 bg-green-50 hover:bg-green-100 text-green-700 rounded-xl text-sm font-semibold transition-all border border-green-200"
                      >
                        <Plus className="w-4 h-4" />
                        Refill
                      </button>
                      <button
                        onClick={() => { setForceEntryType('consumption'); setLogResource(resource); }}
                        className="flex items-center justify-center gap-1.5 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-xl text-sm font-semibold transition-all border border-orange-200"
                      >
                        <Minus className="w-4 h-4" />
                        Consume
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* HISTORY TAB */
        <div className="bg-white rounded-2xl border border-gray-200">
          {/* Summary strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-gray-100 border-b border-gray-200">
            {[
              { label: 'Total entries', value: filteredLog.length, color: 'text-gray-900' },
              { label: 'Refills', value: filteredLog.filter(l => l.entry_type === 'refill').length, color: 'text-green-700' },
              { label: 'Consumption events', value: filteredLog.filter(l => l.entry_type === 'consumption').length, color: 'text-orange-600' },
              { label: 'Total refill cost', value: `EUR ${totalRefillCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-blue-700' },
            ].map(s => (
              <div key={s.label} className="p-5">
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>

          {filteredLog.length === 0 ? (
            <div className="text-center py-16">
              <History className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No log entries found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredLog.map(entry => {
                const res = resources.find(r => r.id === entry.resource_id);
                const isRefill = entry.entry_type === 'refill';

                return (
                  <div key={entry.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`mt-0.5 p-2 rounded-lg ${isRefill ? 'bg-green-100' : 'bg-orange-100'}`}>
                        {isRefill
                          ? <TrendingUp className="w-4 h-4 text-green-600" />
                          : <TrendingDown className="w-4 h-4 text-orange-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold text-gray-900">{res?.name || '—'}</span>
                              <span className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                                isRefill ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                              }`}>
                                {isRefill ? '+ Refill' : '− Consumption'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-0.5">{getVesselName(entry.vessel_id)}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className={`font-bold text-base ${isRefill ? 'text-green-700' : 'text-orange-600'}`}>
                              {isRefill ? '+' : '−'}{entry.quantity.toLocaleString()} {res?.unit}
                            </p>
                            {entry.total_cost && (
                              <p className="text-xs text-gray-500">{entry.currency} {entry.total_cost.toLocaleString()}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
                          <span>{new Date(entry.log_date).toLocaleDateString('en-GB')}</span>
                          {entry.location && <span>{entry.location}</span>}
                          {entry.supplier && <span>{entry.supplier}</span>}
                          {entry.engine_hours && <span>{entry.engine_hours.toLocaleString()} h</span>}
                          <span>{entry.logged_by_name}</span>
                        </div>
                        {entry.notes && (
                          <p className="mt-1.5 text-xs text-gray-500 italic">{entry.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Log entry modal */}
      {logResource && (
        <LogFuelEntryModal
          resource={logResource}
          initialEntryType={forceEntryType ?? undefined}
          onClose={() => { setLogResource(null); setForceEntryType(null); }}
          onSave={handleSaveEntry}
        />
      )}

      {showAddResource && (
        <AddResourceModal
          onClose={() => setShowAddResource(false)}
          onSave={handleAddResource}
        />
      )}

      {editResource && (
        <EditResourceModal
          resource={editResource}
          vesselName={vessels.find(v => v.id === editResource.vessel_id)?.name || ''}
          onClose={() => setEditResource(null)}
          onSave={handleUpdateResource}
          onDelete={handleDeleteResource}
        />
      )}
    </div>
  );
};
