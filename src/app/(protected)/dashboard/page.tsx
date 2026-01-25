/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */

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
  Area,
  AreaChart,
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
  Wallet,
  Clock,
  RefreshCw,
  Loader2,
  Calendar,
  Download,
  Store,
  ChevronRight,
  Filter
} from 'lucide-react';
import { Card, CardContent } from '../../components/ui/Card';

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

type TimePeriod = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';

// --- Constants ---
const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];
const PIE_COLORS = ['#4f46e5', '#0ea5e9', '#f59e0b']; 

// Map ID to Name
const BRANCH_NAMES: Record<number, string> = {
  1: 'San Roque (Main)',
  2: 'Rawis',
  3: 'Mondragon',
  4: 'Catarman',
  5: 'Catubig',
  6: 'San Jose',
};

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const socket = useSocket();
  
  const [ownerSummary, setOwnerSummary] = useState<OwnerSummary | null>(null);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [fvSummary, setFvSummary] = useState<FVSummary | null>(null);
  const [lcSummary, setLcSummary] = useState<LCSummary | null>(null);
  const [recentSales, setRecentSales] = useState<SaleUpdate[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false); // Used for loading state
  
  // Owner Filter State
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('DAILY');

  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      if (user?.role === 'OWNER') {
        // Pass the period param to sync data
        const res = await api.get<OwnerSummary>('/dashboard/summary', {
            params: { period: selectedPeriod }
        });
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
  }, [user, logout, selectedPeriod]); // selectedPeriod dependency ensures sync on change

  const handleManualRefresh = async () => {
    await loadData();
    showToast('Dashboard data synced.', 'success');
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

  // --- REUSABLE HEADER COMPONENT ---
  const DashboardHeader = ({ title, subtitle, badgeText, badgeColor = 'blue', children }: any) => (
    <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 mb-8">
        <div>
            <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
                {badgeText && (
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold bg-${badgeColor}-50 text-${badgeColor}-600 border border-${badgeColor}-100 uppercase tracking-wide`}>
                        {badgeText}
                    </span>
                )}
            </div>
            <p className="text-slate-500 text-sm flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                {subtitle}
            </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
             {/* Filter Controls passed as children */}
             {children}

             <div className="hidden md:flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-xl hover:bg-slate-50 transition-all shadow-sm">
                <Calendar className="w-4 h-4 text-slate-400" /> 
                <span>{new Date().toLocaleDateString()}</span>
            </div>
             
             <button 
                onClick={handleManualRefresh} 
                disabled={isRefreshing}
                className="flex items-center gap-2 px-3 py-2 bg-slate-900 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-all shadow-md shadow-slate-200 disabled:opacity-70 active:scale-95"
                title="Refresh Data"
            >
                {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </button>
        </div>
    </div>
  );

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
      <div className="w-full pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <DashboardHeader 
            title="Executive Overview" 
            subtitle="Real-time financial command center" 
            badgeText="Owner Mode" 
            badgeColor="indigo"
        >
            {/* --- PERIOD FILTER: Located Beside Date --- */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                {(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'] as TimePeriod[]).map((period) => (
                    <button
                        key={period}
                        onClick={() => setSelectedPeriod(period)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            selectedPeriod === period
                            ? 'bg-white text-indigo-600 shadow-sm text-shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                        }`}
                    >
                        {period.charAt(0) + period.slice(1).toLowerCase()}
                    </button>
                ))}
            </div>
        </DashboardHeader>

        {/* --- MAIN CONTENT WRAPPER: Handles Visual Sync State --- */}
        <div className={`transition-opacity duration-200 ${isRefreshing ? 'opacity-60 pointer-events-none grayscale-[0.5]' : 'opacity-100'}`}>
            
            {/* 5-Column KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-5 mb-8">
            <KPICard 
                title={`${selectedPeriod.charAt(0) + selectedPeriod.slice(1).toLowerCase()} Revenue`} 
                value={`₱${ownerSummary?.totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                icon={<TrendingUp className="w-5 h-5" />} 
                color="indigo" 
                trend="Gross" 
            />
            <KPICard 
                title={`${selectedPeriod.charAt(0) + selectedPeriod.slice(1).toLowerCase()} Expenses`} 
                value={`₱${ownerSummary?.totalExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                icon={<TrendingDown className="w-5 h-5" />} 
                color="rose" 
                trend="Total"
                trendDirection='down' 
            />
            <KPICard 
                title={`Net Profit (${selectedPeriod.charAt(0) + selectedPeriod.slice(1).toLowerCase()})`} 
                value={`₱${ownerSummary?.netProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} 
                icon={<Wallet className="w-5 h-5" />} 
                color={ownerSummary?.netProfit && ownerSummary.netProfit >= 0 ? 'emerald' : 'rose'} 
            />
            <KPICard title="Total Inventory" value={ownerSummary?.totalInventoryItems || 0} icon={<Package className="w-5 h-5" />} color="amber" />
            <KPICard title="Pending Deliveries" value={ownerSummary?.pendingDeliveries || 0} icon={<Truck className="w-5 h-5" />} color="sky" />
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
            {/* Revenue Source Bar Chart */}
            <Card className="xl:col-span-8 flex flex-col shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl">
                <div>
                    <h3 className="text-lg font-bold text-slate-800">Revenue Analysis</h3>
                    <p className="text-sm text-slate-500">
                        Performance breakdown ({selectedPeriod.toLowerCase()})
                    </p>
                </div>
                <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors"><Download className="w-4 h-4"/></button>
                </div>
                <div className="p-6 h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} barSize={60}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12, fontWeight: 600}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11}} tickFormatter={(val) => `₱${(val/1000).toFixed(0)}k`} />
                    <Tooltip content={<CustomTooltip />} cursor={{fill: '#f8fafc'}} />
                    <Bar dataKey="Sales" radius={[6, 6, 0, 0]}>
                        {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Bar>
                    </BarChart>
                </ResponsiveContainer>
                </div>
            </Card>

            {/* Income Distribution Pie Chart */}
            <Card className="xl:col-span-4 flex flex-col shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-100 bg-white rounded-t-xl">
                    <h3 className="text-lg font-bold text-slate-800">Distribution</h3>
                    <p className="text-sm text-slate-500">Sales composition ({selectedPeriod.toLowerCase()})</p>
                </div>
                <div className="p-6 h-[400px] relative">
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
                    <Tooltip content={<CustomTooltip />} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                </ResponsiveContainer>
                {/* Center Text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-12">
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Top Source</p>
                    <p className="text-xl font-bold text-slate-800 mt-1">
                    {[...pieData].sort((a,b) => b.value - a.value)[0]?.name || 'N/A'}
                    </p>
                </div>
                </div>
            </Card>

            {/* Live Transactions Feed */}
            <Card className="xl:col-span-12 flex flex-col shadow-sm border border-slate-200">
                <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full animate-ping absolute"></div>
                        <div className="w-2.5 h-2.5 bg-rose-500 rounded-full relative"></div>
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Live Transaction Feed</h3>
                        <p className="text-sm text-slate-500">Real-time sales across all branches</p>
                    </div>
                </div>
                </div>
                <div className="p-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-6 bg-slate-50/50">
                    {recentSales.map((sale, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 group">
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xs">
                                    {sale.staff.username.substring(0,2).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{sale.branch?.name}</p>
                                    <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleTimeString()}</p>
                                </div>
                            </div>
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-1 rounded text-xs font-bold border border-emerald-100">
                                Paid
                            </span>
                        </div>
                        <div className="pt-2 border-t border-slate-50">
                            <p className="text-lg font-mono font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                                ₱{Number(sale.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                            </p>
                        </div>
                    </div>
                    ))}
                    {recentSales.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            <Activity className="w-12 h-12 mx-auto mb-3 opacity-20" />
                            <p>Waiting for live data...</p>
                        </div>
                    )}
                </div>
                </div>
            </Card>
            </div>
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

    // Get branch name from map or fallback to ID
    const branchName = user?.branchId ? (BRANCH_NAMES[user.branchId] || `Branch #${user.branchId}`) : 'Branch';

    return (
      <div className="w-full pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <DashboardHeader 
            title="Branch Operations" 
            subtitle={`Overview of ${branchName}`} 
            badgeText="Staff Portal" 
            badgeColor="emerald" 
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard title="Today's Sales" value={`₱${staffSummary?.dailySales.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<DollarSign className="w-5 h-5" />} color="emerald" />
          <KPICard title="Today's Expenses" value={`₱${staffSummary?.dailyExpenses.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<TrendingDown className="w-5 h-5" />} color="rose" />
          <KPICard title="Today's Profit" value={`₱${staffSummary?.dailyProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}`} icon={<Wallet className="w-5 h-5" />} color="indigo" />
          <KPICard title="Stock Count" value={staffSummary?.inventoryCount || 0} icon={<Package className="w-5 h-5" />} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Recent Sales List */}
           <Card className="lg:col-span-2 shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white rounded-t-xl">
                 <div>
                   <h3 className="text-lg font-bold text-slate-800">Transaction History</h3>
                   <p className="text-sm text-slate-500">Today's local activity</p>
                 </div>
              </div>
              <div className="max-h-[500px] overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Time</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase">Staff</th>
                            <th className="px-6 py-3 text-xs font-bold text-slate-500 uppercase text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {recentSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-6 py-4 text-sm font-medium text-slate-600">{new Date(sale.created_at).toLocaleTimeString()}</td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                                            {sale.staff.username.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="text-sm text-slate-700 font-medium">{sale.staff.username}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <span className="font-mono font-bold text-slate-800">₱{Number(sale.total_amount).toFixed(2)}</span>
                                </td>
                            </tr>
                        ))}
                         {recentSales.length === 0 && (
                            <tr>
                                <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                                    No sales recorded yet today.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
              </div>
           </Card>

           {/* Side Panel */}
           <div className="space-y-6">
              {/* Quick Action */}
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg shadow-indigo-200 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                    <Truck className="w-24 h-24" />
                 </div>
                 <h3 className="text-xl font-bold mb-1 relative z-10">Deliveries</h3>
                 <p className="text-indigo-100 text-sm mb-6 relative z-10 max-w-[80%]">
                    You have <span className="font-bold text-white underline">{staffSummary?.pendingDeliveries || 0} pending</span> shipments requiring acceptance.
                 </p>
                 <a href="/deliveries" className="inline-flex items-center gap-2 bg-white text-indigo-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-indigo-50 transition-colors relative z-10">
                    Manage Shipments <ChevronRight className="w-4 h-4"/>
                 </a>
              </div>

              {/* Mini Chart */}
              <Card className="shadow-sm border border-slate-200">
                 <div className="p-5 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">Profit vs Expenses</h3>
                 </div>
                 <div className="p-5 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={staffChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b'}} />
                          <Tooltip cursor={{fill: '#f8fafc'}} content={<CustomTooltip />}/>
                          <Bar dataKey="Amount" radius={[6, 6, 0, 0]} barSize={40}>
                            {staffChartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.name === 'Profit' ? '#10b981' : '#f43f5e'} />
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
      <div className="w-full pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <DashboardHeader title="Freezer Van Ops" subtitle="Mobile Logistics & Sales" badgeText="Logistics" badgeColor="cyan" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Daily Performance */}
           <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                 <Clock className="w-5 h-5 text-cyan-500" /> Daily Snapshot
              </h2>
              <div className="grid grid-cols-1 gap-4">
                 <MetricRow label="Total Sales" value={fvSummary.daily.sales} color="cyan" icon={<TrendingUp className="w-4 h-4"/>} />
                 <MetricRow label="Expenses" value={fvSummary.daily.expenses} color="rose" icon={<TrendingDown className="w-4 h-4"/>} />
                 <div className="mt-2 pt-4 border-t border-slate-200">
                    <MetricRow label="Net Profit" value={fvSummary.daily.profit} color="emerald" icon={<Wallet className="w-4 h-4"/>} isLarge />
                 </div>
              </div>
           </div>

           {/* Monthly Performance */}
           <div className="space-y-6">
              <h2 className="text-lg font-bold text-slate-700 flex items-center gap-2">
                 <Calendar className="w-5 h-5 text-indigo-500" /> Monthly Aggregate
              </h2>
              <div className="grid grid-cols-1 gap-4">
                 <MetricRow label="Total Sales" value={fvSummary.monthly.sales} color="indigo" icon={<TrendingUp className="w-4 h-4"/>} />
                 <MetricRow label="Expenses" value={fvSummary.monthly.expenses} color="rose" icon={<TrendingDown className="w-4 h-4"/>} />
                 <div className="mt-2 pt-4 border-t border-slate-200">
                    <MetricRow label="Net Profit" value={fvSummary.monthly.profit} color="emerald" icon={<Wallet className="w-4 h-4"/>} isLarge />
                 </div>
              </div>
           </div>
        </div>

        <div className="mt-10">
           <Card className="shadow-sm border border-slate-200">
              <div className="p-6 border-b border-slate-100">
                 <h3 className="font-bold text-slate-800">Performance Trends</h3>
              </div>
              <div className="p-6 h-80">
                 <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                        { name: 'Daily', Sales: fvSummary.daily.sales, Profit: fvSummary.daily.profit },
                        { name: 'Monthly (Avg)', Sales: fvSummary.monthly.sales / 30, Profit: fvSummary.monthly.profit / 30 }, // Visual approximation
                    ]}>
                        <defs>
                            <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} tickFormatter={(val) => `₱${val/1000}k`} />
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="Sales" stroke="#06b6d4" fillOpacity={1} fill="url(#colorSales)" />
                        <Area type="monotone" dataKey="Profit" stroke="#10b981" fillOpacity={1} fill="url(#colorProfit)" />
                    </AreaChart>
                 </ResponsiveContainer>
              </div>
           </Card>
        </div>
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
      <div className="w-full pb-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <DashboardHeader title="Live Chicken Ops" subtitle="Inventory & Distribution" badgeText="Logistics" badgeColor="amber" />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <KPICard title="Total Inventory" value={`${lcSummary.inventoryReport.heads} Heads`} icon={<Package className="w-5 h-5"/>} color="amber" subtitle={`${lcSummary.inventoryReport.kilos.toFixed(2)} kg`} />
            <KPICard title="Distributed" value={`${lcSummary.distributionReport.heads} Heads`} icon={<Truck className="w-5 h-5"/>} color="blue" subtitle={`${lcSummary.distributionReport.kilos.toFixed(2)} kg`} />
            <KPICard title="Net Sales" value={`₱${lcSummary.salesReport.netSales.toLocaleString()}`} icon={<DollarSign className="w-5 h-5"/>} color="emerald" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <Card className="flex flex-col shadow-sm border border-slate-200">
               <div className="p-6 border-b border-slate-100">
                  <h3 className="font-bold text-slate-800">Financial Ratio</h3>
                  <p className="text-sm text-slate-500">Sales vs Cost of Goods</p>
               </div>
               <div className="p-6 h-80 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie 
                            data={salesData} 
                            cx="50%" cy="50%" 
                            innerRadius={80} 
                            outerRadius={100} 
                            paddingAngle={5} 
                            dataKey="value"
                        >
                            <Cell fill="#10b981" strokeWidth={0} /> 
                            <Cell fill="#f43f5e" strokeWidth={0} /> 
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                     <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Margin</p>
                     <p className="text-2xl font-bold text-slate-800 mt-1">
                       {lcSummary.salesReport.totalSales > 0 
                         ? ((lcSummary.salesReport.netSales / lcSummary.salesReport.totalSales) * 100).toFixed(1) 
                         : 0}%
                     </p>
                  </div>
               </div>
            </Card>

            <Card className="flex flex-col shadow-sm border border-slate-200">
               <div className="p-6 border-b border-slate-100 bg-amber-50/30">
                  <h3 className="font-bold text-slate-800">Operational Report</h3>
               </div>
               <div className="p-6 space-y-6">
                  <div className="flex justify-between items-center p-4 bg-slate-50 rounded-xl border border-slate-100">
                     <div className="flex items-center gap-3">
                        <Package className="text-slate-400 w-5 h-5" />
                        <span className="text-slate-600 font-medium">Inventory Weight</span>
                     </div>
                     <span className="font-bold text-slate-800 text-lg">{lcSummary.inventoryReport.kilos.toFixed(2)} kg</span>
                  </div>
                  
                  <div className="space-y-3 pt-2">
                     <div className="flex justify-between items-center">
                        <span className="text-slate-500">Gross Sales</span>
                        <span className="font-bold text-slate-800">₱{lcSummary.salesReport.totalSales.toLocaleString()}</span>
                     </div>
                     <div className="flex justify-between items-center">
                        <span className="text-slate-500">Cost of Sales</span>
                        <span className="font-bold text-rose-500">-₱{lcSummary.salesReport.costOfSales.toLocaleString()}</span>
                     </div>
                     <div className="h-px bg-slate-100 my-2"></div>
                     <div className="flex justify-between items-center">
                        <span className="text-slate-800 font-bold">Net Profit</span>
                        <span className="font-bold text-emerald-600 text-xl">₱{lcSummary.salesReport.netSales.toLocaleString()}</span>
                     </div>
                  </div>
               </div>
            </Card>
        </div>
      </div>
    );
  }

  // Loading State
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-slate-400 gap-4">
       <Loader2 className="w-10 h-10 animate-spin text-slate-300" />
       <p className="text-sm font-medium animate-pulse">Synchronizing dashboard data...</p>
    </div>
  );
}

// --- SUB-COMPONENTS & STYLES ---

// 1. Modern KPI Card
function KPICard({ title, value, icon, color, subtitle, trend, trendDirection = 'up' }: any) {
  const styles: any = {
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'hover:border-indigo-300', ring: 'group-hover:ring-indigo-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'hover:border-emerald-300', ring: 'group-hover:ring-emerald-100' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'hover:border-rose-300', ring: 'group-hover:ring-rose-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'hover:border-amber-300', ring: 'group-hover:ring-amber-100' },
    sky: { bg: 'bg-sky-50', text: 'text-sky-600', border: 'hover:border-sky-300', ring: 'group-hover:ring-sky-100' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'hover:border-cyan-300', ring: 'group-hover:ring-cyan-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'hover:border-blue-300', ring: 'group-hover:ring-blue-100' },
  };
  const theme = styles[color] || styles.indigo;

  return (
    <div className={`bg-white p-5 rounded-2xl border border-slate-100 shadow-sm transition-all duration-300 group ${theme.border} hover:shadow-md relative overflow-hidden`}>
      <div className="flex justify-between items-start mb-4">
        <div className={`p-3 rounded-xl ${theme.bg} ${theme.text} transition-colors`}>
          {icon}
        </div>
        {trend && (
            <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trendDirection === 'up' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {trend}
            </div>
        )}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 tracking-tight font-mono">{value}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-1 font-medium">{subtitle}</p>}
      </div>
    </div>
  );
}

// 2. Metric Row for side-by-side stats
function MetricRow({ label, value, color, icon, isLarge }: any) {
    const colors: any = { 
        cyan: 'text-cyan-600 bg-cyan-50', 
        rose: 'text-rose-600 bg-rose-50', 
        indigo: 'text-indigo-600 bg-indigo-50',
        emerald: 'text-emerald-600 bg-emerald-50' 
    };
    const c = colors[color];

    return (
        <div className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c}`}>{icon}</div>
                <span className={`text-slate-600 ${isLarge ? 'font-bold' : 'font-medium text-sm'}`}>{label}</span>
            </div>
            <span className={`font-mono font-bold text-slate-800 ${isLarge ? 'text-xl' : 'text-base'}`}>
                ₱{value.toLocaleString(undefined, {minimumFractionDigits: 2})}
            </span>
        </div>
    )
}

// 3. Custom Chart Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border border-slate-100 shadow-xl rounded-xl ring-1 ring-black/5 z-50">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">{label || 'Metric'}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mb-1 last:mb-0">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
              <span className="text-xs text-slate-500 font-medium w-20">{entry.name}:</span>
              <span className="text-sm font-bold text-slate-800 font-mono">
                 {typeof entry.value === 'number' ? `₱${entry.value.toLocaleString()}` : entry.value}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
};