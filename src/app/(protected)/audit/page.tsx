/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import api from '@/app/services/api';
import { 
  History, Filter, Eye, ArrowRight, ShieldAlert, X 
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  // Added specific filters
  const [filters, setFilters] = useState({ 
    module: '', 
    userId: '', 
    action: '',
    startDate: '', 
    endDate: '' 
  });
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      // Clean empty filters before sending
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const params = new URLSearchParams(cleanFilters as any);
      const { data } = await api.get(`/audit-logs?${params.toString()}`);
      setLogs(data.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // --- DIFF HELPER: Compare two objects and return only changes ---
  const renderDiff = (oldVal: any, newVal: any) => {
    if (!oldVal || !newVal) return null;
    
    // Find keys that exist in both or either
    const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
    
    return allKeys.map(key => {
      const v1 = oldVal[key];
      const v2 = newVal[key];

      // If generic object (like timestamps), skip or simplify
      if (key === 'updatedAt') return null; 
      
      // If values are different, show them
      if (v1 !== v2) {
        return (
          <div key={key} className="flex items-center justify-between text-sm py-1 border-b border-slate-100 last:border-0">
            <span className="font-semibold text-slate-600 capitalize">{key}:</span>
            <div className="flex items-center gap-2">
              <span className="text-red-500 bg-red-50 px-1 rounded line-through decoration-red-500/50">
                {v1 !== undefined ? String(v1) : 'N/A'}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-emerald-600 bg-emerald-50 px-1 rounded font-medium">
                {v2 !== undefined ? String(v2) : 'N/A'}
              </span>
            </div>
          </div>
        );
      }
      return null;
    });
  };

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-slate-600" /> Audit Trail
          </h1>
          <p className="text-sm text-slate-500">Security log of all critical system changes.</p>
        </div>
        
        {/* --- SMART FILTERS --- */}
        <div className="flex flex-wrap gap-2 bg-white p-2 rounded-lg shadow-sm border border-slate-200">
           {/* Module Filter */}
           <select 
            className="p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 bg-white"
            value={filters.module}
            onChange={e => setFilters({...filters, module: e.target.value})}
          >
            <option value="">All Modules</option>
            <option value="Inventory">Inventory</option>
            <option value="Products">Products</option>
            <option value="Users">Staff</option>
            <option value="Delivery">Delivery</option>
          </select>

          {/* Action Filter */}
          <select 
            className="p-2 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 bg-white"
            value={filters.action}
            onChange={e => setFilters({...filters, action: e.target.value})}
          >
            <option value="">All Actions</option>
            <option value="CREATE">Create</option>
            <option value="UPDATE">Update</option>
            <option value="DELETE">Delete</option>
          </select>

          {/* FIX: Start Date Input */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-md px-2 bg-white">
            <span className="text-xs text-slate-400 font-medium uppercase">From:</span>
            <input 
              type="date" 
              className="p-1 text-sm outline-none text-slate-600"
              value={filters.startDate}
              onChange={e => setFilters({...filters, startDate: e.target.value})}
            />
          </div>

          {/* FIX: End Date Input */}
          <div className="flex items-center gap-1 border border-slate-200 rounded-md px-2 bg-white">
             <span className="text-xs text-slate-400 font-medium uppercase">To:</span>
             <input 
              type="date" 
              className="p-1 text-sm outline-none text-slate-600"
              value={filters.endDate}
              onChange={e => setFilters({...filters, endDate: e.target.value})}
            />
          </div>

          <button onClick={fetchLogs} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-sm flex items-center gap-2 transition-colors">
            <Filter className="w-4 h-4" /> Filter Logs
          </button>
          
          {/* Reset Button */}
          {(filters.startDate || filters.endDate || filters.module || filters.action) && (
             <button 
               onClick={() => {
                 setFilters({ module: '', userId: '', action: '', startDate: '', endDate: '' });
                 // Trigger a fetch immediately after clearing state requires useEffect dependency or manual call.
                 // Ideally, just clearing state and letting the user click 'Filter' again is safer, 
                 // but we can force a reload by wrapping fetchLogs in a useEffect dependent on a trigger, 
                 // or just letting the user click "Filter" to refresh the clean slate.
               }} 
               className="px-3 py-2 text-slate-500 hover:bg-slate-100 rounded-md text-sm transition-colors"
             >
               Clear
             </button>
          )}
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="p-4">Actor</th>
              <th className="p-4">Action</th>
              <th className="p-4">Module</th>
              <th className="p-4">Details</th>
              <th className="p-4">Time</th>
              <th className="p-4 text-right">View Diff</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading trail...</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {log.user?.username?.[0]?.toUpperCase() || 'S'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{log.user?.username || 'System'}</p>
                    <p className="text-xs text-slate-400">{log.user?.role || 'Automated'}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold border uppercase tracking-wide ${
                    log.action === 'CREATE' ? 'bg-green-50 text-green-600 border-green-100' :
                    log.action === 'DELETE' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-orange-50 text-orange-600 border-orange-100'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-4 text-slate-600 font-medium">{log.module}</td>
                <td className="p-4 text-slate-500 truncate max-w-[200px]">
                   {/* Smart Description Logic */}
                   {log.newValues?.reason ? `Reason: "${log.newValues.reason}"` : 
                    log.action === 'UPDATE' ? 'Updated properties...' : 
                    `Resource ID: ${log.resourceId}`}
                </td>
                <td className="p-4 text-slate-500 text-xs whitespace-nowrap">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => setSelectedLog(log)}
                    className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && logs.length === 0 && (
          <div className="p-8 text-center text-slate-400">No logs found matching your filters.</div>
        )}
      </div>

      {/* --- DIFF VIEWER MODAL --- */}
    {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/80">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
                Audit Detail
              </h3>
              <button onClick={() => setSelectedLog(null)} className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              {/* Context Header */}
              <div className="mb-6 flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-sm font-bold text-slate-700">
                    {selectedLog.user?.username?.[0] || 'S'}
                 </div>
                 <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {selectedLog.user?.username || 'System'} 
                      <span className="font-normal text-slate-500"> performed </span> 
                      {selectedLog.action}
                    </p>
                    {/* FIX: Changed 'log.module' to 'selectedLog.module' below */}
                    <p className="text-xs text-slate-400">on {selectedLog.module} • {new Date(selectedLog.createdAt).toLocaleString()}</p>
                 </div>
              </div>

              {/* The Actual Diff */}
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Changes Detected</h4>
              <div className="space-y-1">
                {selectedLog.oldValues && selectedLog.newValues ? (
                   renderDiff(selectedLog.oldValues, selectedLog.newValues) || <p className="text-sm text-slate-500 italic">No specific field changes recorded.</p>
                ) : (
                  <div className="bg-slate-50 p-3 rounded text-sm text-slate-600 border border-slate-100">
                    <span className="font-semibold block mb-1">Payload Data:</span>
                    <pre className="text-xs font-mono whitespace-pre-wrap">
                      {JSON.stringify(selectedLog.newValues || selectedLog.oldValues, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-[10px] text-center text-slate-400 font-mono">
              LOG ID: {selectedLog.id} • IP: {selectedLog.ipAddress || 'Internal'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}