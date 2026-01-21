/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import api from '@/app/services/api';
import { 
  History, Filter, Eye, ArrowRight, 
  Calendar, User as UserIcon, ShieldAlert 
} from 'lucide-react';

export default function AuditLogsPage() {
  const [logs, setLogs] = useState([]);
  const [filters, setFilters] = useState({ module: '', userId: '', startDate: '', endDate: '' });
  const [selectedLog, setSelectedLog] = useState<any>(null); // For Modal
  const [loading, setLoading] = useState(true);

  // Fetch Logs
  const fetchLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams(filters as any);
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
  }, [filters]); // Refetch when filters change

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-slate-600" /> Audit Trail
          </h1>
          <p className="text-sm text-slate-500">Track all sensitive changes in the system.</p>
        </div>
        
        {/* Simple Filter Bar */}
        <div className="flex gap-2">
          <select 
            className="p-2 border rounded-lg text-sm"
            onChange={e => setFilters({...filters, module: e.target.value})}
          >
            <option value="">All Modules</option>
            <option value="Inventory">Inventory</option>
            <option value="Users">Staff</option>
            <option value="Sales">Sales</option>
          </select>
          <button onClick={fetchLogs} className="p-2 bg-slate-800 text-white rounded-lg text-sm flex items-center gap-1">
            <Filter className="w-4 h-4" /> Filter
          </button>
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
              <th className="p-4">Description</th>
              <th className="p-4">Time</th>
              <th className="p-4"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-slate-400">Loading trail...</td></tr>
            ) : logs.map((log: any) => (
              <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                <td className="p-4 flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                    {log.user?.username?.[0] || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-slate-700">{log.user?.username || 'Unknown'}</p>
                    <p className="text-xs text-slate-400">{log.user?.role}</p>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold border ${
                    log.action === 'CREATE' ? 'bg-green-50 text-green-600 border-green-100' :
                    log.action === 'DELETE' ? 'bg-red-50 text-red-600 border-red-100' :
                    'bg-orange-50 text-orange-600 border-orange-100'
                  }`}>
                    {log.action}
                  </span>
                </td>
                <td className="p-4 text-slate-600">{log.module}</td>
                <td className="p-4 text-slate-600 max-w-xs truncate">
                  Changed Resource #{log.resourceId}
                </td>
                <td className="p-4 text-slate-500 text-xs">
                  {new Date(log.createdAt).toLocaleString()}
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => setSelectedLog(log)}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- DIFF VIEWER MODAL --- */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-orange-500" />
                Change Details
              </h3>
              <button onClick={() => setSelectedLog(null)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-6">
              {/* Before */}
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-100">
                <h4 className="text-xs font-bold text-red-600 uppercase mb-3">Before (Old Values)</h4>
                {selectedLog.oldValues ? (
                  <pre className="text-xs text-red-800 whitespace-pre-wrap font-mono">
                    {JSON.stringify(selectedLog.oldValues, null, 2)}
                  </pre>
                ) : (
                  <p className="text-xs text-slate-400 italic">No previous data (New Entry)</p>
                )}
              </div>

              {/* After */}
              <div className="bg-green-50/50 p-4 rounded-xl border border-green-100">
                <h4 className="text-xs font-bold text-green-600 uppercase mb-3">After (New Values)</h4>
                <pre className="text-xs text-green-800 whitespace-pre-wrap font-mono">
                  {JSON.stringify(selectedLog.newValues, null, 2)}
                </pre>
              </div>
            </div>

            <div className="p-4 bg-slate-50 text-xs text-center text-slate-400 border-t border-slate-100">
              Request ID: {selectedLog.id} • IP: {selectedLog.ipAddress}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}