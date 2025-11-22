/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AxiosError } from 'axios';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Truck, 
  AlertCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';

// --- Types ---
interface OwnerSummary {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  breakdown: {
    branchSales: number;
    freezerVanSales: number;
    liveChickenSales: number;
  };
}

interface StaffSummary {
  dailySales: number;
  dailyExpenses: number;
  dailyProfit: number;
  inventoryCount: number;
  pendingDeliveries: number;
}

interface SaleUpdate {
  id: number;
  branch: { name: string };
  total_amount: number;
  staff: { username: string };
}

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  
  const [ownerSummary, setOwnerSummary] = useState<OwnerSummary | null>(null);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [recentSales, setRecentSales] = useState<SaleUpdate[]>([]);

  // Fetch Data logic
  const loadData = async () => {
    try {
      if (user?.role === 'OWNER') {
        const res = await api.get<OwnerSummary>('/dashboard/summary');
        setOwnerSummary(res.data);
      } else if (user?.role === 'STAFF') {
        const res = await api.get<StaffSummary>('/dashboard/staff-summary');
        setStaffSummary(res.data);
      }
    } catch (err) {
      console.error('Dashboard Load Error:', err);
      if (err instanceof AxiosError && err.response?.status === 403) {
         logout();
      }
    }
  };

  useEffect(() => {
    if (user) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Real-time Listeners
  useEffect(() => {
    if (!socket || !user) return;

    socket.on('newSale', (saleData: SaleUpdate) => {
      // Update sales feed
      setRecentSales((prev) => [saleData, ...prev].slice(0, 5));
      // Refresh totals immediately
      loadData();
    });

    socket.on('deliveryUpdated', () => {
      loadData();
    });

    return () => {
      socket.off('newSale');
      socket.off('deliveryUpdated');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user]);

  // --- RENDER FOR OWNER ---
  if (user?.role === 'OWNER') {
    const chartData = ownerSummary ? [
      { name: 'Branches', Sales: Number(ownerSummary.breakdown.branchSales) },
      { name: 'Freezer Van', Sales: Number(ownerSummary.breakdown.freezerVanSales) },
      { name: 'Live Chicken', Sales: Number(ownerSummary.breakdown.liveChickenSales) },
    ] : [];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Business Overview</h1>
            <p className="text-slate-500 mt-1">Real-time performance metrics across all units.</p>
          </div>
          <div className="text-sm text-slate-400 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm">
            Live Updates Active ●
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute right-0 top-0 h-full w-1 bg-green-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Revenue</p>
                <h3 className="text-3xl font-bold text-slate-800">${ownerSummary?.totalSales.toFixed(2) || '0.00'}</h3>
              </div>
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <TrendingUp className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute right-0 top-0 h-full w-1 bg-red-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Total Expenses</p>
                <h3 className="text-3xl font-bold text-slate-800">${ownerSummary?.totalExpenses.toFixed(2) || '0.00'}</h3>
              </div>
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <TrendingDown className="w-6 h-6" />
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-shadow">
            <div className="absolute right-0 top-0 h-full w-1 bg-blue-500"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">Net Profit</p>
                <h3 className={`text-3xl font-bold ${ownerSummary?.netProfit && ownerSummary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                  ${ownerSummary?.netProfit.toFixed(2) || '0.00'}
                </h3>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <DollarSign className="w-6 h-6" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">Revenue Breakdown</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={60}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(value) => `$${value}`} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="Sales" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Feed */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Live Transaction Feed</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
              {recentSales.length > 0 ? (
                recentSales.map((sale, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600 font-bold text-xs">
                        $
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{sale.branch?.name}</p>
                        <p className="text-xs text-slate-500">By {sale.staff?.username}</p>
                      </div>
                    </div>
                    <span className="font-mono font-bold text-green-600 text-sm">+${Number(sale.total_amount).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                    <TrendingUp className="w-6 h-6 opacity-20" />
                  </div>
                  <p className="text-sm">Waiting for new transactions...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER FOR STAFF ---
  if (user?.role === 'STAFF') {
    // Data for a simple Staff Chart
    const staffChartData = staffSummary ? [
      { name: 'Expenses', Amount: staffSummary.dailyExpenses },
      { name: 'Profit', Amount: staffSummary.dailyProfit },
    ] : [];

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">Branch Dashboard</h1>
            <p className="text-slate-500 mt-1">Overview for {new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}</p>
          </div>
          <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-sm font-medium border border-blue-100">
            Branch ID: {user.branchId}
          </div>
        </div>

        {/* Staff KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* 1. Daily Sales */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-green-50 rounded-lg text-green-600">
                <DollarSign className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Today</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">${staffSummary?.dailySales.toFixed(2) || '0.00'}</h3>
            <p className="text-sm text-slate-500">Total Sales</p>
          </div>

          {/* 2. Daily Expenses */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-red-50 rounded-lg text-red-600">
                <TrendingDown className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Today</span>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">${staffSummary?.dailyExpenses.toFixed(2) || '0.00'}</h3>
            <p className="text-sm text-slate-500">Total Expenses</p>
          </div>

          {/* 3. Daily Profit */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                <TrendingUp className="w-6 h-6" />
              </div>
              <span className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Today</span>
            </div>
            <h3 className={`text-2xl font-bold ${staffSummary?.dailyProfit && staffSummary.dailyProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ${staffSummary?.dailyProfit.toFixed(2) || '0.00'}
            </h3>
            <p className="text-sm text-slate-500">Net Profit</p>
          </div>

          {/* 4. Inventory Status */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                <Package className="w-6 h-6" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-slate-800">{staffSummary?.inventoryCount || 0}</h3>
            <p className="text-sm text-slate-500">Items in Stock</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Pending Actions */}
          <Card>
            <CardHeader title="Action Required" subtitle="Tasks that need your attention" />
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <Truck className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-semibold text-slate-700">Pending Deliveries</p>
                      <p className="text-sm text-slate-500">Shipments en route to branch</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg text-slate-800">{staffSummary?.pendingDeliveries || 0}</span>
                    <a href="/deliveries" className="text-sm text-blue-600 font-medium hover:underline">View</a>
                  </div>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    <div>
                      <p className="font-semibold text-slate-700">Low Stock Alerts</p>
                      <p className="text-sm text-slate-500">Items needing restock</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-lg text-slate-800">--</span>
                    <a href="/inventory" className="text-sm text-blue-600 font-medium hover:underline">Check</a>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Links / Simple Chart */}
          <Card>
            <CardHeader title="Daily Performance" subtitle="Profit vs Expenses" />
            <div className="h-64 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={staffChartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="Amount" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-96 text-slate-400">
      <div className="animate-pulse">Loading dashboard data...</div>
    </div>
  );
}