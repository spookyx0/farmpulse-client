/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
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
  AlertCircle
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

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  
  const [ownerSummary, setOwnerSummary] = useState<OwnerSummary | null>(null);
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null);
  const [fvSummary, setFvSummary] = useState<FVSummary | null>(null);
  const [lcSummary, setLcSummary] = useState<LCSummary | null>(null);
  const [recentSales, setRecentSales] = useState<SaleUpdate[]>([]);

  const loadData = useCallback(async () => {
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
    }
  }, [user, logout]);

  useEffect(() => {
    if (user) loadData();
  }, [user, loadData]);

  // Socket Logic
  useEffect(() => {
    if (!socket || !user) return;
    
    const handleUpdate = () => loadData();
    
    const handleNewSale = (saleData: SaleUpdate) => {
        // If owner, or if staff belonging to the branch where sale happened
        // Note: saleData.branch might be an object or ID depending on backend serialization, adjust if needed
        // Assuming backend sends populated branch object based on previous service code
        if (user.role === 'OWNER') {
             setRecentSales((prev) => [saleData, ...prev].slice(0, 10));
             loadData();
        } else if (user.role === 'STAFF') {
             // For staff, we usually just reload data to be safe as they only care about their branch
             loadData();
        }
    };

    socket.on('newSale', handleNewSale); 
    socket.on('deliveryUpdated', handleUpdate);
    socket.on('newDelivery', handleUpdate);     // Listen for new deliveries
    socket.on('inventoryUpdated', handleUpdate); // Listen for inventory changes
    
    return () => { 
        socket.off('newSale', handleNewSale); 
        socket.off('deliveryUpdated', handleUpdate);
        socket.off('newDelivery', handleUpdate);
        socket.off('inventoryUpdated', handleUpdate);
    };
  }, [socket, user, loadData]);

  // --- RENDER: OWNER ---
  if (user?.role === 'OWNER') {
    const chartData = ownerSummary ? [
      { name: 'Branches', Sales: Number(ownerSummary.breakdown.branchSales) },
      { name: 'Freezer Van', Sales: Number(ownerSummary.breakdown.freezerVanSales) },
      { name: 'Live Chicken', Sales: Number(ownerSummary.breakdown.liveChickenSales) },
    ] : [];

    return (
      <div className="space-y-6 animate-in fade-in w-full">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-100">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Executive Overview</h1>
            <p className="text-sm text-slate-500">Real-time enterprise performance.</p>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full border border-green-200 animate-pulse">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            System Online
          </div>
        </div>

        {/* 5-Column KPI Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <KPICard title="Total Revenue" value={`₱${ownerSummary?.totalSales.toFixed(2) || '0'}`} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
          <KPICard title="Total Expenses" value={`₱${ownerSummary?.totalExpenses.toFixed(2) || '0'}`} icon={<TrendingDown className="w-5 h-5" />} color="red" />
          <KPICard title="Net Profit" value={`₱${ownerSummary?.netProfit.toFixed(2) || '0'}`} icon={<DollarSign className="w-5 h-5" />} color={ownerSummary?.netProfit && ownerSummary.netProfit >= 0 ? 'green' : 'red'} />
          <KPICard title="Inventory Items" value={ownerSummary?.totalInventoryItems || 0} icon={<Package className="w-5 h-5" />} color="amber" />
          <KPICard title="Active Deliveries" value={ownerSummary?.pendingDeliveries || 0} icon={<Truck className="w-5 h-5" />} color="purple" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Chart (Takes 2 columns) */}
          <Card className="xl:col-span-2 h-[500px]">
            <CardHeader title="Revenue Distribution" subtitle="Sales performance by business unit" />
            <div className="h-full p-4 pb-12">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barSize={80}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(value) => `₱${value}`} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="Sales" fill="#4f46e5" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Live Feed (Takes 1 column) */}
          <Card className="h-[500px] flex flex-col">
            <CardHeader title="Live Transaction Feed" subtitle="Latest sales across all branches" />
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {recentSales.length > 0 ? (
                recentSales.map((sale, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white border border-slate-100 flex items-center justify-center text-slate-700 shadow-sm">
                        <Activity className="w-5 h-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{sale.branch?.name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          {sale.staff?.username} • {new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block font-mono font-bold text-green-600 text-sm">+₱{Number(sale.total_amount).toFixed(2)}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">SALE</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <Activity className="w-12 h-12 mb-3 opacity-20" />
                  <p className="text-sm">No recent activity</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // --- RENDER: STAFF ---
  if (user?.role === 'STAFF') {
    const staffChartData = staffSummary ? [
      { name: 'Expenses', Amount: staffSummary.dailyExpenses },
      { name: 'Profit', Amount: staffSummary.dailyProfit },
    ] : [];

    return (
      <div className="space-y-6 w-full animate-in fade-in">
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-6 rounded-2xl shadow-lg flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Branch Control Panel</h1>
            <p className="text-slate-300 text-sm mt-1">
              Overview for {new Date().toLocaleDateString(undefined, {weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'})}
            </p>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-lg text-sm font-medium border border-white/20">
            Branch ID: {user.branchId}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard title="Today's Sales" value={`₱${staffSummary?.dailySales.toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} color="green" />
          <KPICard title="Today's Expenses" value={`₱${staffSummary?.dailyExpenses.toFixed(2)}`} icon={<TrendingDown className="w-5 h-5" />} color="red" />
          <KPICard title="Today's Profit" value={`₱${staffSummary?.dailyProfit.toFixed(2)}`} icon={<TrendingUp className="w-5 h-5" />} color="blue" />
          <KPICard title="Stock Count" value={staffSummary?.inventoryCount || 0} icon={<Package className="w-5 h-5" />} color="amber" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
           {/* Recent Sales List */}
           <Card className="lg:col-span-2 h-[400px] flex flex-col">
              <CardHeader title="Recent Sales" subtitle="Transactions recorded today" />
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
                {recentSales.length > 0 ? (
                  recentSales.map((sale) => (
                    <div key={sale.id} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg border-b border-slate-100 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                          <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">Sale #{sale.id}</p>
                          <p className="text-xs text-slate-500">{new Date(sale.created_at).toLocaleTimeString()}</p>
                        </div>
                      </div>
                      <span className="font-bold text-slate-800">₱{Number(sale.total_amount).toFixed(2)}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-slate-400 py-10">No sales yet today.</p>
                )}
              </div>
           </Card>

           {/* Quick Actions */}
           <div className="space-y-6">
              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-700">Pending Deliveries</h3>
                    <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{staffSummary?.pendingDeliveries || 0}</span>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Incoming shipments requiring acceptance.</p>
                  <a href="/deliveries" className="block w-full text-center bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                    View Deliveries
                  </a>
                </CardContent>
              </Card>

              <Card>
                <CardContent>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-slate-700">Inventory Check</h3>
                  </div>
                  <p className="text-sm text-slate-500 mb-4">Update stock levels or verify counts.</p>
                  <a href="/inventory" className="block w-full text-center border border-slate-300 text-slate-700 py-2 rounded-lg hover:bg-slate-50 transition-colors text-sm font-medium">
                    Manage Inventory
                  </a>
                </CardContent>
              </Card>
           </div>
        </div>
      </div>
    );
  }

  // --- FREEZER VAN & LIVE CHICKEN ---
  if (user?.role === 'FREEZER_VAN' && fvSummary) {
    return (
      <div className="space-y-8 animate-in fade-in w-full">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Snowflake className="w-8 h-8 text-blue-500" /> Freezer Van Dashboard
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <Card>
            <CardHeader title="Daily Monitoring" />
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <KPIMini label="Sales" value={fvSummary.daily.sales} color="green" />
                <KPIMini label="Expenses" value={fvSummary.daily.expenses} color="red" />
                <KPIMini label="Profit" value={fvSummary.daily.profit} color="blue" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Monthly Monitoring" />
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <KPIMini label="Sales" value={fvSummary.monthly.sales} color="green" />
                <KPIMini label="Expenses" value={fvSummary.monthly.expenses} color="red" />
                <KPIMini label="Profit" value={fvSummary.monthly.profit} color="blue" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (user?.role === 'LIVE_CHICKEN' && lcSummary) {
     const salesData = [
      { name: 'Net Sales', value: lcSummary.salesReport.netSales },
      { name: 'Cost', value: lcSummary.salesReport.costOfSales },
    ];
     return (
      <div className="space-y-8 animate-in fade-in w-full">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
          <Egg className="w-8 h-8 text-amber-500" /> Live Chicken Dashboard
        </h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <KPICard title="Total Heads" value={lcSummary.inventoryReport.heads} icon={<Package className="w-5 h-5"/>} color="amber" />
           <KPICard title="Total Distributed (Heads)" value={lcSummary.distributionReport.heads} icon={<Truck className="w-5 h-5"/>} color="blue" />
           <KPICard title="Net Sales" value={`₱${lcSummary.salesReport.netSales.toFixed(2)}`} icon={<DollarSign className="w-5 h-5"/>} color="green" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <Card>
             <CardHeader title="Profit Margin Visualization" />
             <div className="h-64">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie data={salesData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                     <Cell fill="#22c55e" />
                     <Cell fill="#ef4444" />
                   </Pie>
                   <Tooltip />
                 </PieChart>
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

// --- SUB-COMPONENTS ---

function KPICard({ title, value, icon, color }: { title: string, value: string | number, icon: any, color: string }) {
  const colorStyles: any = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
    green: { bg: 'bg-green-50', text: 'text-green-600' },
    red: { bg: 'bg-red-50', text: 'text-red-600' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600' },
  };
  const style = colorStyles[color] || colorStyles.blue;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow flex flex-col justify-between h-32">
      <div className="flex justify-between items-start">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`p-2 rounded-lg ${style.bg} ${style.text}`}>
          {icon}
        </div>
      </div>
      <h3 className="text-2xl font-bold text-slate-800">{value}</h3>
    </div>
  );
}

function KPIMini({ label, value, color }: { label: string, value: number, color: string }) {
  const colors: any = { green: 'text-green-600', red: 'text-red-600', blue: 'text-blue-600' };
  return (
    <div className="p-3 bg-slate-50 rounded-lg">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-lg font-bold ${colors[color]}`}>₱{value.toFixed(2)}</p>
    </div>
  );
}