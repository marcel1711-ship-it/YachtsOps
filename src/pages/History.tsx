import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Search, CheckCircle, Calendar, User, Filter, ChevronDown, FileDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { demoMaintenanceHistory, demoVessels, demoEquipment, demoUsers } from '../data/demoData';
import { supabase } from '../lib/supabase';
import { formatDate } from '../utils/helpers';
import { MaintenanceHistory } from '../types';

interface HistoryProps {
  onNavigate: (page: string, params?: any) => void;
}

interface VesselOption { id: string; name: string; }
interface EquipmentOption { id: string; name: string; }

const isDemoUser = (email: string) => demoUsers.some(u => u.email === email);

export const History: React.FC<HistoryProps> = ({ onNavigate }) => {
  const { currentUser, selectedVesselId } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterVessel, setFilterVessel] = useState<string>('all');
  const [filterDateRange, setFilterDateRange] = useState<string>('all');
  const [history, setHistory] = useState<MaintenanceHistory[]>([]);
  const [vessels, setVessels] = useState<VesselOption[]>([]);
  const [equipmentMap, setEquipmentMap] = useState<Record<string, EquipmentOption>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [currentUser, selectedVesselId]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);

    if (isDemoUser(currentUser.email)) {
      let filtered = demoMaintenanceHistory;
      if (currentUser.role === 'customer_admin') {
        filtered = filtered.filter(h => currentUser.vessel_ids.includes(h.vessel_id));
      } else if (currentUser.role === 'standard_user') {
        filtered = filtered.filter(h => h.vessel_id === selectedVesselId);
      }
      setHistory(filtered as MaintenanceHistory[]);

      const userVessels = currentUser.role === 'master_admin'
        ? demoVessels
        : demoVessels.filter(v => currentUser.vessel_ids.includes(v.id));
      setVessels(userVessels.map(v => ({ id: v.id, name: v.name })));

      const eqMap: Record<string, EquipmentOption> = {};
      demoEquipment.forEach(e => { eqMap[e.id] = { id: e.id, name: e.name }; });
      setEquipmentMap(eqMap);

      setLoading(false);
      return;
    }

    let query = supabase.from('maintenance_history').select('*');
    if (currentUser.role === 'standard_user' && selectedVesselId) {
      query = query.eq('vessel_id', selectedVesselId);
    } else if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      query = query.eq('company_id', currentUser.company_id);
    }
    const { data } = await query.order('completion_date', { ascending: false });
    setHistory(data || []);

    let vesselQuery = supabase.from('vessels').select('id, name');
    if (currentUser.role === 'customer_admin' && currentUser.company_id) {
      vesselQuery = vesselQuery.eq('company_id', currentUser.company_id);
    } else if (currentUser.role === 'standard_user' && currentUser.vessel_ids.length > 0) {
      vesselQuery = vesselQuery.in('id', currentUser.vessel_ids);
    }
    const { data: vesselData } = await vesselQuery;
    setVessels(vesselData || []);

    const { data: eqData } = await supabase.from('equipment').select('id, name');
    const eqMap: Record<string, EquipmentOption> = {};
    (eqData || []).forEach((e: EquipmentOption) => { eqMap[e.id] = e; });
    setEquipmentMap(eqMap);

    setLoading(false);
  };

  const getFilteredHistory = () => {
    let filtered = history;

    if (searchTerm) {
      filtered = filtered.filter(h =>
        h.task_title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        h.completed_by_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterVessel !== 'all') {
      filtered = filtered.filter(h => h.vessel_id === filterVessel);
    }

    if (filterDateRange !== 'all') {
      const now = new Date();
      const filterDate = new Date();
      if (filterDateRange === 'week') filterDate.setDate(now.getDate() - 7);
      else if (filterDateRange === 'month') filterDate.setMonth(now.getMonth() - 1);
      else if (filterDateRange === 'quarter') filterDate.setMonth(now.getMonth() - 3);
      else if (filterDateRange === 'year') filterDate.setFullYear(now.getFullYear() - 1);
      filtered = filtered.filter(h => new Date(h.completion_date) >= filterDate);
    }

    return filtered.sort((a, b) =>
      new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime()
    );
  };

  const filtered = getFilteredHistory();

  const handleExportPDF = () => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

    const vesselLabel = filterVessel !== 'all'
      ? vessels.find(v => v.id === filterVessel)?.name || 'All Vessels'
      : 'All Vessels';

    const dateLabel: Record<string, string> = {
      all: 'All Time', week: 'Last Week', month: 'Last Month', quarter: 'Last Quarter', year: 'Last Year',
    };

    const issueCount = filtered.filter(h => h.issues_detected).length;

    const rows = filtered.map(record => {
      const vessel = vessels.find(v => v.id === record.vessel_id);
      const equipment = record.equipment_id ? equipmentMap[record.equipment_id] : null;
      const partsUsed = Array.isArray(record.parts_used) ? record.parts_used : [];
      const partsStr = partsUsed.length > 0
        ? partsUsed.map((p: any) => `${p.name || p.inventory_id} (x${p.quantity})`).join(', ')
        : '—';
      const hasIssue = !!record.issues_detected;

      return `
        <tr class="${hasIssue ? 'has-issue' : ''}">
          <td>
            <strong>${record.task_title}</strong>
            ${equipment ? `<br/><small>Equip: ${equipment.name}</small>` : ''}
            ${vessel ? `<br/><small>Vessel: ${vessel.name}</small>` : ''}
          </td>
          <td>${record.due_date ? new Date(record.due_date).toLocaleDateString('en-GB') : '—'}</td>
          <td>${new Date(record.completion_date).toLocaleDateString('en-GB')}</td>
          <td>${record.completed_by_name}</td>
          <td>${partsStr}</td>
          <td class="${hasIssue ? 'issue-yes' : 'issue-no'}">${hasIssue ? record.issues_detected! : 'None'}</td>
          <td class="comments-cell">${record.comments || '—'}</td>
        </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Maintenance History Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; background: #fff; font-size: 12px; }
    .header { background: #1e3a5f; color: #fff; padding: 28px 32px 24px; }
    .header h1 { font-size: 22px; font-weight: 700; letter-spacing: -0.3px; margin-bottom: 4px; }
    .header p { font-size: 12px; opacity: 0.75; }
    .meta { display: flex; gap: 32px; padding: 14px 32px; background: #f4f7fa; border-bottom: 1px solid #dde3eb; flex-wrap: wrap; }
    .meta-item { display: flex; flex-direction: column; gap: 2px; }
    .meta-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
    .meta-value { font-size: 13px; font-weight: 600; color: #1a1a1a; }
    .summary { display: flex; gap: 16px; padding: 16px 32px; }
    .summary-card { flex: 1; padding: 12px 16px; border-radius: 8px; border: 1px solid #e5e7eb; }
    .summary-card.total { border-color: #bfdbfe; background: #eff6ff; }
    .summary-card.issue { border-color: #fde68a; background: #fffbeb; }
    .summary-card.ok { border-color: #bbf7d0; background: #f0fdf4; }
    .summary-card .num { font-size: 26px; font-weight: 700; }
    .summary-card.total .num { color: #1d4ed8; }
    .summary-card.issue .num { color: #d97706; }
    .summary-card.ok .num { color: #15803d; }
    .summary-card .lbl { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .table-wrap { padding: 8px 32px 32px; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; table-layout: fixed; }
    col.c1 { width: 22%; }
    col.c2 { width: 9%; }
    col.c3 { width: 9%; }
    col.c4 { width: 13%; }
    col.c5 { width: 15%; }
    col.c6 { width: 16%; }
    col.c7 { width: 16%; }
    th { background: #f8fafc; text-align: left; padding: 10px 10px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.4px; color: #4b5563; border-bottom: 2px solid #e5e7eb; }
    td { padding: 9px 10px; border-bottom: 1px solid #f0f0f0; vertical-align: top; word-wrap: break-word; }
    td small { color: #6b7280; font-size: 10px; }
    tr.has-issue { background: #fffbeb; }
    .issue-yes { color: #b45309; font-weight: 500; }
    .issue-no { color: #15803d; }
    .comments-cell { color: #6b7280; font-style: italic; }
    .footer { margin-top: 24px; padding: 12px 32px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <div class="header">
    <h1>Maintenance History Report</h1>
    <p>Generated on ${dateStr} at ${timeStr}</p>
  </div>
  <div class="meta">
    <div class="meta-item"><span class="meta-label">Vessel</span><span class="meta-value">${vesselLabel}</span></div>
    <div class="meta-item"><span class="meta-label">Period</span><span class="meta-value">${dateLabel[filterDateRange]}</span></div>
    ${searchTerm ? `<div class="meta-item"><span class="meta-label">Search</span><span class="meta-value">"${searchTerm}"</span></div>` : ''}
  </div>
  <div class="summary">
    <div class="summary-card total"><div class="num">${filtered.length}</div><div class="lbl">Total Records</div></div>
    <div class="summary-card ok"><div class="num">${filtered.length - issueCount}</div><div class="lbl">No Issues</div></div>
    <div class="summary-card issue"><div class="num">${issueCount}</div><div class="lbl">Issues Detected</div></div>
  </div>
  <div class="table-wrap">
    <table>
      <colgroup>
        <col class="c1"/><col class="c2"/><col class="c3"/><col class="c4"/>
        <col class="c5"/><col class="c6"/><col class="c7"/>
      </colgroup>
      <thead>
        <tr>
          <th>Task</th>
          <th>Due Date</th>
          <th>Completed</th>
          <th>Completed By</th>
          <th>Parts Used</th>
          <th>Issues Detected</th>
          <th>Comments</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </div>
  <div class="footer">YachtMaint &mdash; Maintenance History Report &mdash; ${dateStr}</div>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-history-${now.toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Maintenance History</h1>
          <p className="text-gray-500 mt-2 text-base">Complete audit trail of all maintenance activities</p>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={filtered.length === 0}
          className="flex items-center gap-2 px-5 py-3 bg-white border border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <FileDown className="w-5 h-5" />
          Export PDF
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-7">
        <div className="flex items-center gap-3 mb-6">
          <Filter className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-bold text-gray-900">Filters</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-7">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search history..."
              className="w-full pl-11 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            />
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

          <div className="relative">
            <select
              value={filterDateRange}
              onChange={(e) => setFilterDateRange(e.target.value)}
              className="w-full appearance-none px-4 py-3 pr-10 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
            >
              <option value="all">All Time</option>
              <option value="week">Last Week</option>
              <option value="month">Last Month</option>
              <option value="quarter">Last Quarter</option>
              <option value="year">Last Year</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            Showing <span className="font-semibold text-gray-900">{filtered.length}</span> {filtered.length === 1 ? 'record' : 'records'}
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-gray-50 rounded-2xl animate-pulse" />)}
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.length === 0 ? (
              <div className="text-center py-12">
                <HistoryIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">No maintenance history found</p>
              </div>
            ) : (
              filtered.map(record => {
                const vessel = vessels.find(v => v.id === record.vessel_id);
                const equipment = record.equipment_id ? equipmentMap[record.equipment_id] : null;
                const partsUsed = Array.isArray(record.parts_used) ? record.parts_used : [];

                return (
                  <div
                    key={record.id}
                    className="p-6 border border-gray-200 rounded-2xl hover:border-blue-300 hover:shadow-md transition-all"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 rounded-xl">
                        <CheckCircle className="w-6 h-6 text-green-600" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-900">{record.task_title}</h3>
                            {equipment && (
                              <p className="text-sm text-gray-600 mt-1">Equipment: {equipment.name}</p>
                            )}
                            {vessel && (
                              <p className="text-sm text-gray-600">Vessel: {vessel.name}</p>
                            )}
                          </div>
                          <span className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm font-medium">
                            Completed
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                          {record.due_date && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Calendar className="w-4 h-4" />
                              <span>Due: {formatDate(record.due_date)}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="w-4 h-4" />
                            <span>Completed: {formatDate(record.completion_date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <User className="w-4 h-4" />
                            <span>{record.completed_by_name}</span>
                          </div>
                        </div>

                        {record.comments && (
                          <div className="bg-gray-50 rounded-xl p-4 mb-3">
                            <p className="text-sm font-medium text-gray-700 mb-1">Comments:</p>
                            <p className="text-sm text-gray-600">{record.comments}</p>
                          </div>
                        )}

                        {partsUsed.length > 0 && (
                          <div className="bg-blue-50 rounded-xl p-4">
                            <p className="text-sm font-medium text-blue-900 mb-2">Parts Used:</p>
                            <div className="space-y-1">
                              {partsUsed.map((part: any, index: number) => (
                                <p key={index} className="text-sm text-blue-800">
                                  {part.name ? `• ${part.name} - Quantity: ${part.quantity}` : `• Part ID: ${part.inventory_id} - Qty: ${part.quantity}`}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}

                        {record.issues_detected && (
                          <div className="bg-yellow-50 rounded-xl p-4 mt-3">
                            <p className="text-sm font-medium text-yellow-900 mb-1">Issues Detected:</p>
                            <p className="text-sm text-yellow-800">{record.issues_detected}</p>
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
