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

// --- Types ---
interface DashboardSummary {
  totalSales: number;
  totalExpenses: number;
  netProfit: number;
  breakdown: {
    branchSales: number;
    freezerVanSales: number;
    liveChickenSales: number;
  };
}

interface SaleUpdate {
  id: number;
  branch: { name: string };
  total_amount: number;
  staff: { username: string };
}

export default function DashboardPage() {
  const { user } = useAuth();
  const socket = useSocket();
  
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [recentSales, setRecentSales] = useState<SaleUpdate[]>([]);

  // Fetch Initial Data
  const fetchSummary = async () => {
    if (user?.role === 'OWNER') {
      try {
        const res = await api.get<DashboardSummary>('/dashboard/summary');
        setSummary(res.data);
      } catch (err) {
        console.error('Failed to load dashboard summary', err);
      }
    }
  };

  useEffect(() => {
    if (user) {
      fetchSummary();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Real-time Listeners
  useEffect(() => {
    if (!socket || user?.role !== 'OWNER') return;

    // When a new sale happens, refresh the summary numbers
    socket.on('newSale', (saleData: SaleUpdate) => {
      setRecentSales((prev) => [saleData, ...prev].slice(0, 5));
      fetchSummary(); // Re-fetch totals to stay accurate
    });

    return () => {
      socket.off('newSale');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, user]);

  // --- RENDER FOR OWNER ---
  if (user?.role === 'OWNER') {
    const chartData = summary ? [
      { name: 'Branches', Sales: summary.breakdown.branchSales },
      { name: 'Freezer Van', Sales: summary.breakdown.freezerVanSales },
      { name: 'Live Chicken', Sales: summary.breakdown.liveChickenSales },
    ] : [];

    return (
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-gray-800">Owner Dashboard</h1>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500">
            <h2 className="text-gray-500 font-medium">Total Sales</h2>
            <p className="text-3xl font-bold text-gray-900">
              ${summary?.totalSales.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-red-500">
            <h2 className="text-gray-500 font-medium">Total Expenses</h2>
            <p className="text-3xl font-bold text-gray-900">
              ${summary?.totalExpenses.toFixed(2) || '0.00'}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500">
            <h2 className="text-gray-500 font-medium">Net Profit</h2>
            <p className={`text-3xl font-bold ${summary?.netProfit && summary.netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              ${summary?.netProfit.toFixed(2) || '0.00'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Chart */}
          <div className="bg-white p-6 rounded-lg shadow-md h-96">
            <h3 className="text-xl font-semibold mb-4">Sales Breakdown</h3>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Sales" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Recent Activity */}
          <div className="bg-white p-6 rounded-lg shadow-md h-96 overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">Live Sales Feed</h3>
            {recentSales.length > 0 ? (
              <ul className="space-y-3">
                {recentSales.map((sale, idx) => (
                  <li key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{sale.branch?.name}</p>
                      <p className="text-sm text-gray-500">By: {sale.staff?.username}</p>
                    </div>
                    <span className="font-bold text-green-600">+${sale.total_amount}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-500 mt-10">
                <p>Waiting for sales...</p>
                <p className="text-xs">Sales made by staff will appear here instantly.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER FOR STAFF ---
  if (user?.role === 'STAFF') {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Staff Dashboard</h1>
        <div className="bg-white p-8 rounded-lg shadow-md">
           <h2 className="text-2xl mb-4">Welcome, {user.username}</h2>
           <p className="text-gray-600">
             You are logged into <strong>Branch ID: {user.branchId}</strong>.
           </p>
           <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 border rounded hover:bg-gray-50">
                <h3 className="font-bold text-lg">Quick Action</h3>
                <p>Go to <a href="/sales" className="text-blue-600 hover:underline">Sales Register</a> to record a new transaction.</p>
              </div>
              <div className="p-4 border rounded hover:bg-gray-50">
                <h3 className="font-bold text-lg">Stock Check</h3>
                <p>Check <a href="/inventory" className="text-blue-600 hover:underline">Inventory</a> to see current stock levels.</p>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return <div className="p-8">Loading dashboard role...</div>;
}