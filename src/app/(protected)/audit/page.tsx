/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import api from '@/app/services/api';
import { 
  History, Filter, Eye, ArrowRight, ShieldAlert, X 
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // --- HELPER: Generate Text Description for Table ---
  const getLogDescription = (log: any) => {
    // 1. Priority: Explicit Reason
    if (log.newValues?.reason) {
        return <span className="font-bold text-slate-700">Reason: "{log.newValues.reason}"</span>;
    }

    // 2. Updates: List changed fields
    if (log.action === 'UPDATE' && log.oldValues && log.newValues) {
        const changedKeys = Object.keys(log.newValues).filter(k => 
            log.oldValues[k] !== log.newValues[k] && k !== 'updatedAt' && k !== 'reason'
        );
        
        if (changedKeys.length > 0) {
            return (
                <span>
                    <span className="font-semibold text-slate-600">Updated: </span>
                    {changedKeys.map(k => k.replace(/_/g, ' ')).join(', ')}
                </span>
            );
        }
    }

    // 3. Create/Delete/Other
    if (log.resourceId) {
        return <span className="opacity-80">Resource ID: {log.resourceId}</span>;
    }

    return <span className="italic opacity-50">System Event</span>;
  };

  // --- DIFF HELPER ---
  const renderDiff = (oldVal: any, newVal: any) => {
    if (!oldVal || !newVal) return null;
    const allKeys = Array.from(new Set([...Object.keys(oldVal), ...Object.keys(newVal)]));
    
    return allKeys.map(key => {
      const v1 = oldVal[key];
      const v2 = newVal[key];
      if (key === 'updatedAt' || key === 'date_added') return null; 
      
      if (v1 !== v2) {
        return (
          <div key={key} className="flex items-center justify-between text-sm py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 px-2 rounded">
            <span className="font-semibold text-slate-600 capitalize">{key.replace(/_/g, ' ')}:</span>
            <div className="flex items-center gap-3">
              <span className="text-red-500 bg-red-50 px-2 py-0.5 rounded text-xs line-through decoration-red-500/50 font-mono">
                {v1 !== undefined ? String(v1) : 'N/A'}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-300" />
              <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-xs font-medium font-mono">
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
    <div className="flex flex-col w-full h-[calc(97vh-4rem)] bg-slate-50 overflow-hidden relative">
      
      {/* --- HEADER --- */}
      <div className="flex-none p-6 pb-2 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <History className="text-slate-600 w-6 h-6" /> Audit Trail
            </h1>
            <p className="text-sm text-slate-500 mt-1">Security log of all critical system changes.</p>
          </div>
          
          <div className="flex flex-wrap gap-2 items-center bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm">
             <select 
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 hover:border-slate-300 transition-colors cursor-pointer"
              value={filters.module}
              onChange={e => setFilters({...filters, module: e.target.value})}
            >
              <option value="">All Modules</option>
              <option value="Inventory">Inventory</option>
              <option value="Products">Products</option>
              <option value="Sales">Sales</option>
              <option value="Deliveries">Deliveries</option>
            </select>

            <select 
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-md text-sm outline-none focus:border-emerald-500 hover:border-slate-300 transition-colors cursor-pointer"
              value={filters.action}
              onChange={e => setFilters({...filters, action: e.target.value})}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
            </select>

            <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-md px-2 py-1.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Range</span>
              <input 
                type="date" 
                className="text-sm outline-none text-slate-600 bg-transparent w-28 cursor-pointer"
                value={filters.startDate}
                onChange={e => setFilters({...filters, startDate: e.target.value})}
              />
              <span className="text-slate-300">-</span>
              <input 
                type="date" 
                className="text-sm outline-none text-slate-600 bg-transparent w-28 cursor-pointer"
                value={filters.endDate}
                onChange={e => setFilters({...filters, endDate: e.target.value})}
              />
            </div>

            <button onClick={fetchLogs} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-md text-sm flex items-center gap-2 transition-all active:scale-95 shadow-sm">
              <Filter className="w-4 h-4" /> Filter
            </button>
            
            {(filters.startDate || filters.endDate || filters.module || filters.action) && (
               <button 
                 onClick={() => {
                   setFilters({ module: '', userId: '', action: '', startDate: '', endDate: '' });
                   setTimeout(fetchLogs, 100); 
                 }} 
                 className="px-3 py-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md text-sm transition-colors"
               >
                 Clear
               </button>
            )}
          </div>
        </div>
      </div>

      {/* --- TABLE CONTAINER --- */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar px-6 pb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50/90 backdrop-blur-sm border-b border-slate-200 text-slate-500 font-semibold sticky top-0 z-10 shadow-sm">
              {/* FIX: Removed comments inside tr */}
              <tr>
                <th className="p-4 w-64">Actor</th>
                <th className="p-4 w-32">Action</th>
                <th className="p-4 w-32">Module</th>
                <th className="p-4">Details</th>
                <th className="p-4 w-48">Time</th>
                <th className="p-4 w-20 text-right">Diff</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400 animate-pulse">Scanning audit records...</td></tr>
              ) : logs.map((log: any) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="p-4 align-top">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-slate-100 border border-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600 shadow-sm">
                        {log.user?.username?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-700">{log.user?.username || 'System'}</p>
                        <p className="text-[11px] text-slate-400 uppercase tracking-wide">{log.user?.role || 'Automated'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 align-top">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold border uppercase tracking-wider ${
                      log.action === 'CREATE' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                      log.action === 'DELETE' ? 'bg-red-50 text-red-600 border-red-100' :
                      'bg-amber-50 text-amber-600 border-amber-100'
                    }`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 font-medium align-top">
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                      {log.module}
                    </div>
                  </td>
                  
                  {/* FIX: Removed comments here too */}
                  <td className="p-4 text-slate-500 font-mono text-xs whitespace-normal break-words align-top leading-relaxed">
                     {getLogDescription(log)}
                  </td>

                  <td className="p-4 text-slate-400 text-xs whitespace-nowrap align-top">
                    {new Date(log.createdAt).toLocaleString(undefined, { 
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                    })}
                  </td>
                  <td className="p-4 text-right align-top">
                    <button 
                      onClick={() => setSelectedLog(log)}
                      className="p-2 hover:bg-slate-100 border border-transparent hover:border-slate-200 rounded-full text-slate-400 hover:text-emerald-600 hover:shadow-sm transition-all"
                      title="View Changes"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && logs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
               <ShieldAlert className="w-12 h-12 mb-3 opacity-20" />
               <p>No audit records found matching your filters.</p>
            </div>
          )}
        </div>
      </div>

      {/* --- DIFF VIEWER MODAL --- */}
      {selectedLog && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                Audit Detail <span className="text-slate-300 font-light">|</span> <span className="text-slate-500 font-normal text-sm">ID: {selectedLog.id.slice(0, 8)}...</span>
              </h3>
              <button onClick={() => setSelectedLog(null)} className="p-1.5 hover:bg-red-50 hover:text-red-500 rounded-full text-slate-400 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-start gap-4">
                 <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm text-sm font-bold text-slate-700 border border-slate-100 shrink-0">
                    {selectedLog.user?.username?.[0] || 'S'}
                 </div>
                 <div className="flex-1">
                    <p className="text-sm text-slate-800 leading-relaxed">
                      <span className="font-semibold">{selectedLog.user?.username || 'System'}</span> 
                      <span className="text-slate-500"> performed </span> 
                      <span className="font-bold uppercase text-xs px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-600 mx-1">{selectedLog.action}</span>
                      <span className="text-slate-500"> on </span>
                      <span className="font-semibold text-emerald-700">{selectedLog.module}</span>
                    </p>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                       <span>{new Date(selectedLog.createdAt).toLocaleString()}</span>
                       <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                       <span>IP: {selectedLog.ipAddress || 'Internal'}</span>
                    </p>
                 </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="bg-slate-50/80 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Change Log</h4>
                  <span className="text-[10px] text-slate-400 font-mono">JSON DIFF</span>
                </div>
                <div className="p-2 bg-white min-h-[100px]">
                  {selectedLog.oldValues && selectedLog.newValues ? (
                     <div className="space-y-1">
                        {renderDiff(selectedLog.oldValues, selectedLog.newValues) || (
                           <div className="p-4 text-center text-slate-400 italic text-sm">
                             No explicit field differences found (Metadata update only).
                           </div>
                        )}
                     </div>
                  ) : (
                    <div className="p-4">
                      <div className="bg-slate-900 rounded-lg p-3 overflow-x-auto">
                        <pre className="text-xs font-mono text-emerald-400">
                          {JSON.stringify(selectedLog.newValues || selectedLog.oldValues, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}