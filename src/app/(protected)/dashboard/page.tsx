/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { AxiosError } from 'axios';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Package, 
  Truck, 
  Activity,
  Snowflake,
  Egg,
  AlertCircle,
  ArrowUpRight,
  Wallet,
  Clock,
  RefreshCw,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';

// --- Types ---
interface SaleUpdate {
  id: number;
  branch: { name: string };
  total_amount: number;
  staff: { username: string };
  created_at: string;
}

interface OwnerSummary {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  totalInventoryItems: number;
  pendingDeliveries: number;
  recentTransactions: SaleUpdate[];
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
  recentTransactions: SaleUpdate[];
}

interface FVSummary {
  daily: { sales: number; expenses: number; profit: number };
  monthly: { sales: number; expenses: number; profit: number };
}

interface LCSummary {
  inventoryReport: { heads: number; kilos: number };
  distributionReport: { heads: number; kilos: number };
  salesReport: { totalSales: number; costOfSales: number; netSales: number };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];
const PIE_COLORS = ['#6366f1', '#3b82f6', '#0ea5e9', '#bae6fd'];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const socket = useSocket();
  
  const [ownerSummary, setOwnerSummary] = useState<OwnerSummary | null>(null);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [fvSummary, setFvSummary] = useState<FVSummary | null>(null);
  const [lcSummary, setLcSummary] = useState<LCSummary | null>(null);
  const [recentSales, setRecentSales] = useState<SaleUpdate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (user?.role === 'OWNER') {
        const res = await api.get<OwnerSummary>('/dashboard/summary');
        setOwnerSummary(res.data);
        setRecentSales(res.data.recentTransactions);
      } else if (user?.role === 'STAFF') {
        const res = await api.get<StaffSummary>('/dashboard/staff-summary');
        setStaffSummary(res.data);
        setRecentSales(res.data.recentTransactions);
      } else if (user?.role === 'FREEZER_VAN') {
        const res = await api.get<FVSummary>('/dashboard/freezer-van-summary');
        setFvSummary(res.data);
      } else if (user?.role === 'LIVE_CHICKEN') {
        const res = await api.get<LCSummary>('/dashboard/live-chicken-summary');
        setLcSummary(res.data);
      }
    } catch (err) {
      console.error('Dashboard Load Error:', err);
      if (err instanceof AxiosError && err.response?.status === 403) {
         logout();
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [user, logout]);

  const handleManualRefresh = async () => {
    await loadData();
    showToast('Dashboard updated.', 'success');
  };

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  useEffect(() => {
    if (!socket || !user) return;
    
    const handleUpdate = () => loadData();
    
    const handleNewSale = (saleData: SaleUpdate) => {
        if (user.role === 'OWNER' || (user.role === 'STAFF' && user.branchId === Number(saleData.branch))) {
             setRecentSales((prev) => [saleData, ...prev].slice(0, 10));
        }
        loadData();
    };

    socket.on('newSale', handleNewSale); 
    socket.on('deliveryUpdated', handleUpdate);
    socket.on('newDelivery', handleUpdate);
    socket.on('inventoryUpdated', handleUpdate);
    socket.on('newExpense', handleUpdate);
    
    return () => { 
        socket.off('newSale', handleNewSale); 
        socket.off('deliveryUpdated', handleUpdate);
        socket.off('newDelivery', handleUpdate);
        socket.off('inventoryUpdated', handleUpdate);
        socket.off('newExpense', handleUpdate);
    };
  }, [socket, user, loadData]);

  // --- RENDER: OWNER UI ---
  if (user?.role === 'OWNER') {
    const barData = ownerSummary ? [
      { name: 'Branches', Sales: Number(ownerSummary.breakdown.branchSales) },
      { name: 'Freezer Van', Sales: Number(ownerSummary.breakdown.freezerVanSales) },
      { name: 'Live Chicken', Sales: Number(ownerSummary.breakdown.liveChickenSales) },
    ] : [];

    const pieData = ownerSummary ? [
      { name: 'Branches', value: Number(ownerSummary.breakdown.branchSales) },
      { name: 'Freezer Van', value: Number(ownerSummary.breakdown.freezerVanSales) },
      { name: 'Live Chicken', value: Number(ownerSummary.breakdown.liveChickenSales) },
    ] : [];

    return (
      <div className="space-y-6 animate-in fade-in w-full pb-10">
        <div className="flex justify-between items-center bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Executive Command Center</h1>
            <p className="text-sm text-slate-500 flex items-center gap-2 mt-1">
               <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
               System Status: Operational
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleManualRefresh} 
              disabled={isRefreshing}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Data"
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-200 text-sm text-slate-600 font-medium flex items-center gap-2">
              <Clock className="w-4 h-4" /> {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>

        {/* 5-Column KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="Total Revenue" value={`₱${ownerSummary?.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
          <KPICard title="Total Expenses" value={`₱${ownerSummary?.totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={<TrendingDown className="w-5 h-5" />} color="red" />
          <KPICard title="Net Profit" value={`₱${ownerSummary?.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`} icon={<Wallet className="w-5 h-5" />} color={ownerSummary?.netProfit && ownerSummary.netProfit >= 0 ? 'green' : 'red'} />
          <KPICard title="Total Inventory" value={ownerSummary?.totalInventoryItems || 0} icon={<Package className="w-5 h-5" />} color="amber" />
          <KPICard title="Active Deliveries" value={ownerSummary?.pendingDeliveries || 0} icon={<Truck className="w-5 h-5" />} color="purple" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mt-8">
          {/* Revenue Source Bar Chart (4 cols) */}
          <Card className="xl:col-span-4 h-[530px] flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Revenue by Source</h3>
                <p className="text-sm text-slate-500 mt-1">Performance across business units</p>
              </div>
              <div className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                FY {new Date().getFullYear()}
              </div>
            </div>
            <div className="flex-1 p-6 min-h-0 bg-white w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} 
                    dy={10} 
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11}} 
                    tickFormatter={(val) => `₱${(val/1000).toFixed(0)}k`} 
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc', opacity: 0.8}}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                            <p className="text-xl font-bold text-slate-800">
                              ₱{Number(payload[0].value).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar 
                    dataKey="Sales" 
                    radius={[6, 6, 0, 0]} 
                    barSize={50}
                    animationDuration={1000}
                  >
                    {barData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={['#4f46e5', '#0ea5e9', '#f59e0b'][index % 3]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Income Distribution Pie Chart (3 cols) */}
          <Card className="xl:col-span-3 h-[530px] flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
               <div>
                 <h3 className="text-lg font-bold text-slate-800">Income Distribution</h3>
                 <p className="text-sm text-slate-500 mt-1">Sales composition</p>
               </div>
               <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                 Live
               </div>
             </div>
             <div className="flex-1 p-6 min-h-0 bg-white relative w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                    data={pieData} 
                    cx="50%" cy="50%" 
                    innerRadius={80} 
                    outerRadius={110} 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                     {pieData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} strokeWidth={0} />
                     ))}
                   </Pie>
                   <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }}></div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{data.name}</p>
                            </div>
                            <p className="text-lg font-bold text-slate-800">
                              ₱{Number(data.value).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                   />
                   <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-slate-600 font-medium ml-1">{value}</span>}
                   />
                 </PieChart>
               </ResponsiveContainer>
               
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Top Source</p>
                 <p className="text-lg font-bold text-slate-800 mt-1">
                   {[...pieData].sort((a,b) => b.value - a.value)[0]?.name || 'N/A'}
                 </p>
               </div>
             </div>
          </Card>

          {/* Live Feed (5 cols) */}
          <Card className="xl:col-span-5 h-[530px] flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
               <div>
                 <h3 className="text-lg font-bold text-slate-800">Live Transactions</h3>
                 <p className="text-sm text-slate-500 mt-1">Real-time sales feed across all branches</p>
               </div>
               <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100 flex items-center gap-2">
                 <Activity className="w-3 h-3 animate-pulse" /> Live
               </div>
            </div>
            <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
              {recentSales.length > 0 ? (
                <div className="divide-y divide-slate-50">
                  {recentSales.map((sale, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                          <DollarSign className="w-5 h-5" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800">{sale.branch?.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            By {sale.staff?.username}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="block font-mono font-bold text-green-600 text-sm">+₱{Number(sale.total_amount).toFixed(2)}</span>
                        <span className="text-[10px] text-slate-400">{new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Activity className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">Waiting for live transactions...</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- RENDER: STAFF UI ---
  if (user?.role === 'STAFF') {
    const staffChartData = staffSummary ? [
      { name: 'Expenses', Amount: staffSummary.dailyExpenses },
      { name: 'Profit', Amount: staffSummary.dailyProfit },
    ] : [];

    return (
      <div className="space-y-6 w-full animate-in fade-in">
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Branch Dashboard</h1>
            <p className="text-slate-500 text-sm mt-1">
              Overview for {new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleManualRefresh} 
              disabled={isRefreshing}
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Refresh Data"
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
            <div className="bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 flex items-center gap-2">
              <Truck className="w-4 h-4 text-slate-400" />
              Branch ID: {user.branchId}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Today's Sales" value={`₱${staffSummary?.dailySales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<DollarSign className="w-5 h-5" />} color="green" />
          <KPICard title="Today's Expenses" value={`₱${staffSummary?.dailyExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<TrendingDown className="w-5 h-5" />} color="red" />
          <KPICard title="Today's Profit" value={`₱${staffSummary?.dailyProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
          <KPICard title="Stock Count" value={staffSummary?.inventoryCount || 0} icon={<Package className="w-5 h-5" />} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Recent Sales List (2 cols) */}
           <Card className="lg:col-span-2 h-[525px] flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
              <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Today&apos;s Transactions</h3>
                  <p className="text-sm text-slate-500 mt-1">Recent sales recorded at this branch</p>
                </div>
                <div className="bg-green-50 text-green-600 px-3 py-1 rounded-full text-xs font-bold border border-green-100 flex items-center gap-2">
                  <Activity className="w-3 h-3" /> Live
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-0 custom-scrollbar bg-white">
                {recentSales.length > 0 ? (
                  <div className="divide-y divide-slate-50">
                    {recentSales.map((sale) => (
                      <div key={sale.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-100">
                            <DollarSign className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-800">Sale #{sale.id}</p>
                            <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleTimeString()}</p>
                          </div>
                        </div>
                        <span className="font-bold text-slate-800 font-mono">₱{Number(sale.total_amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <p>No sales recorded today.</p>
                  </div>
                )}
              </div>
           </Card>

           {/* Quick Actions Panel (1 col) */}
           <div className="space-y-6">
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-none shadow-lg shadow-blue-200">
                <CardContent>
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Truck className="w-5 h-5 text-blue-200" /> Deliveries
                    </h3>
                    <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-3 py-1 rounded-full border border-white/10">
                      {staffSummary?.pendingDeliveries || 0} Pending
                    </span>
                  </div>
                  <p className="text-blue-100 text-sm mb-6 leading-relaxed">
                    Incoming shipments from HQ requiring your acceptance and inventory verification.
                  </p>
                  <a href="/deliveries" className="flex items-center justify-center w-full bg-white text-blue-600 py-3 rounded-xl hover:bg-blue-50 transition-all transform active:scale-95 text-sm font-bold shadow-sm">
                    View Deliveries <ArrowUpRight className="w-4 h-4 ml-2" />
                  </a>
                </CardContent>
              </Card>

              <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                 <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                    <div>
                      <h3 className="text-lg font-bold text-slate-800">Daily Performance</h3>
                      <p className="text-sm text-slate-500 mt-1">Sales vs Expenses</p>
                    </div>
                    <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                      Metrics
                    </div>
                 </div>
                 <div className="h-56 p-6 bg-white w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={staffChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 500}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `₱${(val/1000).toFixed(0)}k`} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc', opacity: 0.8}}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5">
                                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                                  <p className="text-lg font-bold text-slate-800">₱{Number(payload[0].value).toLocaleString()}</p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="Amount" radius={[6, 6, 0, 0]} barSize={40} animationDuration={1000}>
                          {staffChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'Profit' ? '#10b981' : '#ef4444'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                 </div>
              </Card>
           </div>
        </div>
      </div>
    );
  }

  // --- RENDER: FREEZER VAN ---
  if (user?.role === 'FREEZER_VAN' && fvSummary) {
    return (
      <div className="space-y-8 animate-in fade-in w-full">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-4">
             <div className="p-4 bg-blue-50 rounded-full text-blue-600 border border-blue-100">
                <Snowflake className="w-8 h-8" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-slate-800">Freezer Van Operations</h1>
               <p className="text-slate-500 text-sm mt-1">Daily and Monthly Performance Monitoring</p>
             </div>
           </div>
           <button 
             onClick={handleManualRefresh} 
             disabled={isRefreshing}
             className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             title="Refresh Data"
           >
             {isRefreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
           </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Daily Card */}
          <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Daily Performance</h3>
                  <p className="text-sm text-slate-500 mt-1">Today's financial snapshot</p>
                </div>
                <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">
                  {new Date().toLocaleDateString()}
                </div>
            </div>
            <div className="p-6 bg-white space-y-6">
               <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                     <div className="p-2 bg-green-100 text-green-600 rounded-lg mb-2"><TrendingUp className="w-5 h-5"/></div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sales</p>
                     <p className="text-lg font-bold text-slate-700 mt-1">₱{fvSummary.daily.sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-red-200 transition-colors">
                     <div className="p-2 bg-red-100 text-red-600 rounded-lg mb-2"><TrendingDown className="w-5 h-5"/></div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</p>
                     <p className="text-lg font-bold text-slate-700 mt-1">₱{fvSummary.daily.expenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                     <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mb-2"><Wallet className="w-5 h-5"/></div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profit</p>
                     <p className={`text-lg font-bold mt-1 ${fvSummary.daily.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>₱{fvSummary.daily.profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
               </div>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-semibold text-slate-500">Net Profit Margin</span>
                  <span className={`text-xl font-bold ${fvSummary.daily.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fvSummary.daily.sales > 0 ? ((fvSummary.daily.profit / fvSummary.daily.sales) * 100).toFixed(1) : 0}%
                  </span>
               </div>
            </div>
          </Card>

          {/* Monthly Card */}
          <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Monthly Performance</h3>
                  <p className="text-sm text-slate-500 mt-1">Current month aggregates</p>
                </div>
                <div className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-bold border border-purple-100">
                  {new Date().toLocaleDateString(undefined, {month: 'long'})}
                </div>
            </div>
            <div className="p-6 bg-white space-y-6">
               <div className="grid grid-cols-3 gap-4">
                  <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-green-200 transition-colors">
                     <div className="p-2 bg-green-100 text-green-600 rounded-lg mb-2"><TrendingUp className="w-5 h-5"/></div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sales</p>
                     <p className="text-lg font-bold text-slate-700 mt-1">₱{fvSummary.monthly.sales.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-red-200 transition-colors">
                     <div className="p-2 bg-red-100 text-red-600 rounded-lg mb-2"><TrendingDown className="w-5 h-5"/></div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Expenses</p>
                     <p className="text-lg font-bold text-slate-700 mt-1">₱{fvSummary.monthly.expenses.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="flex flex-col items-center p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors">
                     <div className="p-2 bg-blue-100 text-blue-600 rounded-lg mb-2"><Wallet className="w-5 h-5"/></div>
                     <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Profit</p>
                     <p className={`text-lg font-bold mt-1 ${fvSummary.monthly.profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>₱{fvSummary.monthly.profit.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
               </div>
               <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-sm font-semibold text-slate-500">Net Profit Margin</span>
                  <span className={`text-xl font-bold ${fvSummary.monthly.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fvSummary.monthly.sales > 0 ? ((fvSummary.monthly.profit / fvSummary.monthly.sales) * 100).toFixed(1) : 0}%
                  </span>
               </div>
            </div>
          </Card>
        </div>

        <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
          <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
             <div>
               <h3 className="text-lg font-bold text-slate-800">Performance Analytics</h3>
               <p className="text-sm text-slate-500 mt-1">Daily vs Monthly Comparison</p>
             </div>
             <div className="bg-purple-50 text-purple-600 px-3 py-1 rounded-full text-xs font-bold border border-purple-100">
               Metrics
             </div>
          </div>
          <div className="h-96 p-6 bg-white w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Sales', Daily: fvSummary.daily.sales, Monthly: fvSummary.monthly.sales },
                { name: 'Expenses', Daily: fvSummary.daily.expenses, Monthly: fvSummary.monthly.expenses },
              ]} barSize={60}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 500}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₱${val}`} tick={{fill: '#94a3b8', fontSize: 11}} />
                <Tooltip 
                  cursor={{fill: '#f8fafc', opacity: 0.8}}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5">
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</p>
                          {payload.map((entry: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                              <span className="text-xs text-slate-500 font-medium w-16">{entry.name}:</span>
                              <span className="text-sm font-bold text-slate-800">₱{Number(entry.value).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ paddingBottom: '20px' }} />
                <Bar dataKey="Daily" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Daily Total" />
                <Bar dataKey="Monthly" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Monthly Total" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    );
  }

  // --- RENDER: LIVE CHICKEN ---
  if (user?.role === 'LIVE_CHICKEN' && lcSummary) {
     const salesData = [
      { name: 'Net Sales', value: lcSummary.salesReport.netSales },
      { name: 'Cost', value: lcSummary.salesReport.costOfSales },
    ];
     return (
      <div className="space-y-8 animate-in fade-in w-full">
        <div className="flex justify-between items-center bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <div className="flex items-center gap-4">
             <div className="p-4 bg-amber-50 rounded-full text-amber-600 border border-amber-100">
                <Egg className="w-8 h-8" />
             </div>
             <div>
               <h1 className="text-2xl font-bold text-slate-800">Live Chicken Operations</h1>
               <p className="text-slate-500 text-sm mt-1">Inventory and Distribution Tracking</p>
             </div>
           </div>
           <button 
             onClick={handleManualRefresh} 
             disabled={isRefreshing}
             className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-lg border border-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
             title="Refresh Data"
           >
             {isRefreshing ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
           </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <KPICard title="Total Inventory" value={`${lcSummary.inventoryReport.heads} Heads`} icon={<Package className="w-5 h-5"/>} color="amber" />
           <KPICard title="Total Distributed" value={`${lcSummary.distributionReport.heads} Heads`} icon={<Truck className="w-5 h-5"/>} color="blue" />
           <KPICard title="Net Sales" value={`₱${lcSummary.salesReport.netSales.toLocaleString()}`} icon={<DollarSign className="w-5 h-5"/>} color="green" />
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Profit Margin Visualization</h3>
                  <p className="text-sm text-slate-500 mt-1">Net Sales vs Cost Analysis</p>
                </div>
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full text-xs font-bold border border-emerald-100">
                  Financials
                </div>
             </div>
             <div className="h-80 flex flex-col items-center justify-center bg-white p-6 relative w-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie 
                    data={salesData} 
                    cx="50%" cy="50%" 
                    innerRadius={80} 
                    outerRadius={110} 
                    fill="#8884d8" 
                    paddingAngle={5} 
                    dataKey="value"
                  >
                     <Cell fill="#10b981" strokeWidth={0} /> {/* Net Sales */}
                     <Cell fill="#ef4444" strokeWidth={0} /> {/* Cost */}
                   </Pie>
                   <Tooltip 
                    cursor={{fill: 'transparent'}}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: payload[0].color }}></div>
                              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">{data.name}</p>
                            </div>
                            <p className="text-lg font-bold text-slate-800">
                              ₱{Number(data.value).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                   />
                   <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(value) => <span className="text-slate-600 font-medium ml-1">{value}</span>}
                   />
                 </PieChart>
               </ResponsiveContainer>
               <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Margin</p>
                 <p className="text-lg font-bold text-slate-800 mt-1">
                   {lcSummary.salesReport.totalSales > 0 
                     ? ((lcSummary.salesReport.netSales / lcSummary.salesReport.totalSales) * 100).toFixed(1) 
                     : 0}%
                 </p>
               </div>
             </div>
           </Card>

           <Card className="flex flex-col overflow-hidden shadow-sm hover:shadow-md transition-shadow">
             <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-white">
                <div>
                  <h3 className="text-lg font-bold text-slate-800">Detailed Breakdown</h3>
                  <p className="text-sm text-slate-500 mt-1">Weight and Financial Metrics</p>
                </div>
                <div className="bg-slate-50 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">
                  Report
                </div>
             </div>
             <CardContent>
               <div className="space-y-5">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium">Total Inventory Weight</span>
                    <span className="font-bold text-slate-800 text-lg">{lcSummary.inventoryReport.kilos.toFixed(2)} kg</span>
                  </div>
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-slate-600 font-medium">Total Distributed Weight</span>
                    <span className="font-bold text-slate-800 text-lg">{lcSummary.distributionReport.kilos.toFixed(2)} kg</span>
                  </div>
                  
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500">Gross Sales</span>
                        <span className="font-bold text-slate-800 text-lg">₱{lcSummary.salesReport.totalSales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500">Cost of Sales</span>
                        <span className="font-bold text-red-500 text-lg">-₱{lcSummary.salesReport.costOfSales.toLocaleString()}</span>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl flex justify-between items-center mt-2 border border-green-100">
                        <span className="text-green-700 font-bold">Net Profit</span>
                        <span className="font-extrabold text-green-700 text-xl">₱{lcSummary.salesReport.netSales.toLocaleString()}</span>
                    </div>
                  </div>
               </div>
             </CardContent>
           </Card>
        </div>
      </div>
     );
  }

  return (
    <div className="flex items-center justify-center h-screen text-slate-400">
      <div className="flex flex-col items-center gap-3 animate-pulse">
        <div className="w-12 h-12 bg-slate-200 rounded-full"></div>
        <div className="text-sm font-medium">Loading dashboard data...</div>
      </div>
    </div>
  );
}

// --- STYLES ---
const tooltipStyle = {
    borderRadius: '12px', 
    border: 'none', 
    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: '12px'
};

// --- SUB-COMPONENTS ---
function KPICard({ title, value, icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  const colorStyles: any = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' },
  };
  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div className={`bg-white p-6 rounded-xl shadow-sm border ${style.border} hover:shadow-md transition-all duration-200 flex flex-col justify-between h-36`}>
      <div className="flex justify-between items-start">
        <p className="text-sm font-semibold text-slate-500">{title}</p>
        <div className={`p-2.5 rounded-xl ${style.bg} ${style.text}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
    </div>
  );
}

function KPIMini({ label, value, color }: { label: string, value: number, color: string }) {
  const colors: any = { green: 'text-green-600', red: 'text-red-600', blue: 'text-blue-600' };
  return (
    <div className="flex flex-col items-center">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-xl font-bold ${colors[color]}`}>₱{value.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
    </div>
  );
}