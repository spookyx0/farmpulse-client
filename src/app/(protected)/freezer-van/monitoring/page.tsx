/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import React, { useEffect, useState } from 'react';
import { useToast } from '@/app/contexts/ToastContext';
import api from '@/app/services/api'; // Re-enabled the API
import { 
  Truck, Snowflake, TrendingUp, AlertTriangle, 
  RefreshCw, Download, MapPin, Package, DollarSign
} from 'lucide-react';

interface VanItem {
  id: number;
  name: string;
  driver: string;
  sales: number;
  status: string;
}

interface InventoryItem {
  name: string;
  totalKilos: number;
  value: number;
}

interface FleetSummary {
  totalSalesToday: number;
  activeVans: number;
  totalInventoryValue: number;
  lowStockAlerts: number;
  vans: VanItem[];
  consolidatedInventory: InventoryItem[];
}

export default function FreezerVanMonitoringPage() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<FleetSummary | null>(null);

  const fetchFleetData = async () => {
    setLoading(true);
    try {
      // Fetching REAL-TIME data from your NestJS backend
      const res = await api.get('/dashboard/owner/freezer-vans');
      setSummary(res.data);
    } catch {
      showToast("Failed to load fleet data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFleetData();
  }, []);

  return (
    <div className="p-2 md:p-6 space-y-6 bg-slate-50 min-h-screen">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2 sm:gap-3">
            <Snowflake className="w-8 h-8 text-cyan-500" /> Freezer Van Fleet
          </h1>
          <p className="text-sm text-slate-500 mt-1">Master monitoring for all mobile cold-storage units.</p>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 transition-all shadow-sm">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export Report</span><span className="sm:hidden">Export</span>
          </button>
          <button onClick={fetchFleetData} className="flex justify-center items-center p-2.5 bg-white border border-slate-200 text-slate-400 hover:text-cyan-600 rounded-xl shadow-sm transition-all">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start group">
          <div className="overflow-hidden pr-2">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Fleet Sales (Today)</p>
            <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1 truncate">₱{summary?.totalSalesToday.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-cyan-50 flex items-center justify-center text-cyan-600"><TrendingUp className="w-5 h-5 sm:w-6 sm:h-6" /></div>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div className="overflow-hidden pr-2">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Active Vans</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 mt-1 truncate">{summary?.activeVans || 0}</p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Truck className="w-5 h-5 sm:w-6 sm:h-6" /></div>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div className="overflow-hidden pr-2">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Stock Value</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-600 mt-1 truncate">₱{summary?.totalInventoryValue.toLocaleString(undefined, { minimumFractionDigits: 2 }) || '0.00'}</p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><DollarSign className="w-5 h-5 sm:w-6 sm:h-6" /></div>
        </div>
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-start">
          <div className="overflow-hidden pr-2">
            <p className="text-[10px] sm:text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Low Stock Alerts</p>
            <p className="text-2xl sm:text-3xl font-black text-orange-600 mt-1 truncate">{summary?.lowStockAlerts || 0}</p>
          </div>
          <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0 rounded-full bg-orange-50 flex items-center justify-center text-orange-600"><AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6" /></div>
        </div>
      </div>

      {/* TABLES SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Van Status Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><MapPin className="w-4 h-4 text-cyan-600" /> Active Fleet Status</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left min-w-[500px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Van / Route</th>
                  <th className="px-5 py-3">Driver</th>
                  <th className="px-5 py-3 text-right">Today&apos;s Sales</th>
                  <th className="px-5 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.vans && summary.vans.length > 0 ? summary.vans.map(van => (
                  <tr key={van.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{van.name}</td>
                    <td className="px-5 py-4 text-slate-600">{van.driver}</td>
                    <td className="px-5 py-4 text-right font-bold text-emerald-600">₱{van.sales.toLocaleString()}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${van.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {van.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-5 py-8 text-center text-slate-400">No active vans found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Consolidated Inventory Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/50">
            <h3 className="font-bold text-slate-800 flex items-center gap-2"><Package className="w-4 h-4 text-blue-600" /> Consolidated Fleet Inventory</h3>
          </div>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm text-left min-w-[400px]">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3">Product Name</th>
                  <th className="px-5 py-3 text-center">Total Volume</th>
                  <th className="px-5 py-3 text-right">Est. Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {summary?.consolidatedInventory && summary.consolidatedInventory.length > 0 ? summary.consolidatedInventory.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4 font-bold text-slate-800">{item.name}</td>
                    <td className="px-5 py-4 text-center font-medium text-slate-600">{item.totalKilos}</td>
                    <td className="px-5 py-4 text-right font-bold text-blue-600">₱{item.value.toLocaleString()}</td>
                  </tr>
                )) : (
                  <tr><td colSpan={3} className="px-5 py-8 text-center text-slate-400">No inventory data available.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}