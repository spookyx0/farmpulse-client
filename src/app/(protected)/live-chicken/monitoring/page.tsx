/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState } from 'react';
import { useToast } from '@/app/contexts/ToastContext';
import api from '@/app/services/api'; // Re-enabled API
import { 
  Egg, TrendingDown, Activity, AlertTriangle, 
  RefreshCw, Download, MapPin, Scale, DollarSign
} from 'lucide-react';

interface LocationItem {
  id: number;
  name: string;
  handler: string;
  heads: number;
  status: string;
}

interface MortalityLogItem {
  date: string;
  location: string;
  headsLost: number;
  reason: string;
}

interface LiveChickenSummary {
  totalSalesToday: number;
  totalAliveHeads: number;
  totalMortalityToday: number;
  totalEstimatedKilos: number;
  locations: LocationItem[];
  mortalityLog: MortalityLogItem[];
}

export default function LiveChickenMonitoringPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<LiveChickenSummary | null>(null);

  const fetchLiveChickenData = async () => {
    setLoading(true);
    try {
      // Fetching REAL-TIME data from your NestJS backend
      const res = await api.get('/dashboard/owner/live-chicken');
      setSummary(res.data);
    } catch {
      showToast("Failed to load live chicken data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveChickenData();
  }, []);

  return (
    <div className="p-2 md:p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <Egg className="w-8 h-8 text-amber-500" /> Live Chicken Operations
          </h1>
          <p className="text-sm text-slate-500 mt-1">Global monitoring for coops, mobile units, and mortality rates.</p>
        </div>
        <div className="flex gap-3">
          <button className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-4 h-4" /> Export Report
          </button>
          <button onClick={fetchLiveChickenData} className="p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-amber-600 rounded-xl shadow-sm transition-all">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between group">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sales (Today)</p>
            <p className="text-3xl font-black text-slate-900 mt-1">₱{summary?.totalSalesToday.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><DollarSign className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Alive Heads</p>
            <p className="text-3xl font-black text-amber-600 mt-1">{summary?.totalAliveHeads || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center text-amber-600"><Activity className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Est. Total Weight</p>
            <p className="text-3xl font-black text-blue-600 mt-1">{summary?.totalEstimatedKilos || 0} kg</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Scale className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mortality (Today)</p>
            <p className="text-3xl font-black text-red-600 mt-1">{summary?.totalMortalityToday || 0}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600"><TrendingDown className="w-6 h-6" /></div>
        </div>
      </div>

      {/* TABLES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Active Locations Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><MapPin className="w-4 h-4 text-amber-600" /> Active Locations & Coops</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Location / Unit</th>
                <th className="px-5 py-3">Handler</th>
                <th className="px-5 py-3 text-center">Head Count</th>
                <th className="px-5 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.locations && summary.locations.length > 0 ? summary.locations.map(loc => (
                <tr key={loc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-800">{loc.name}</td>
                  <td className="px-5 py-4 text-slate-600">{loc.handler}</td>
                  <td className="px-5 py-4 text-center font-bold text-amber-600">{loc.heads}</td>
                  <td className="px-5 py-4 text-center">
                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${loc.status === 'Stable' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                      {loc.status}
                    </span>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No active locations found.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mortality Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-red-600" /> Mortality & Loss Log (Today)</h3>
          </div>
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-5 py-3">Time</th>
                <th className="px-5 py-3">Location</th>
                <th className="px-5 py-3 text-center">Heads Lost</th>
                <th className="px-5 py-3">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {summary?.mortalityLog && summary.mortalityLog.length > 0 ? summary.mortalityLog.map((log, idx) => (
                <tr key={idx} className="hover:bg-red-50/30 transition-colors">
                  <td className="px-5 py-4 text-slate-500 font-medium">{new Date(log.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-5 py-4 font-bold text-slate-800">{log.location}</td>
                  <td className="px-5 py-4 text-center font-black text-red-600">{log.headsLost}</td>
                  <td className="px-5 py-4 text-slate-500 italic">{log.reason}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={4} className="px-5 py-12 text-center text-slate-400">No mortality recorded today.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}