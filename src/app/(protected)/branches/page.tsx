/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react/no-unescaped-entities */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext'; 
import api from '../../services/api';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Store, Package, ShoppingCart, Truck, Search, ArrowRight, 
  MapPin, TrendingUp, AlertTriangle, RefreshCw, Download, ChevronRight, DollarSign 
} from 'lucide-react';

// --- Types ---
interface Branch { id: number; name: string; }
interface InventoryItem { 
  id: number; 
  quantity: number; 
  selling_price?: number; 
  product: { name: string; selling_price: number }; 
}
interface Sale { id: number; total_amount: number; created_at: string; staff: { username: string }; }
interface Delivery { id: number; status: string; created_at: string; items: { quantity: number; product: { name: string } }[]; }

const BRANCHES_DATA: Branch[] = [
  { id: 1, name: 'San Roque (Main)' },
  { id: 2, name: 'Rawis' },
  { id: 3, name: 'Mondragon' },
  { id: 4, name: 'Catarman' },
  { id: 5, name: 'Catubig' },
  { id: 6, name: 'San Jose' },
];

export default function BranchesPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  
  // Data State
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'SALES' | 'DELIVERIES'>('INVENTORY');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Data Fetching ---
  const loadBranchData = useCallback(async () => {
    if (!selectedBranch) return;
    setIsLoading(true);
    try {
      const [invRes, salesRes, delRes] = await Promise.all([
        api.get<InventoryItem[]>(`/inventory/branch/${selectedBranch}`),
        api.get<Sale[]>(`/sales/branch/${selectedBranch}`),
        api.get<Delivery[]>(`/deliveries/branch/${selectedBranch}`),
      ]);

      setInventory(invRes.data);
      setSales(salesRes.data);
      setDeliveries(delRes.data);
    } catch (err) {
      console.error("Failed to load branch data", err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedBranch]);

  // Initial Load & Real-time Listeners
  useEffect(() => {
    if (selectedBranch && user) loadBranchData();
  }, [selectedBranch, user, loadBranchData]);

  useEffect(() => {
    if (!socket || !selectedBranch) return;
    const handleUpdate = () => loadBranchData();
    socket.on('newSale', handleUpdate); 
    socket.on('deliveryUpdated', handleUpdate);
    return () => { 
      socket.off('newSale', handleUpdate); 
      socket.off('deliveryUpdated', handleUpdate);
    };
  }, [socket, selectedBranch, loadBranchData]);

  // --- Derived State (Stats & Filtering) ---
  const stats = useMemo(() => {
    const totalSales = sales.reduce((acc, curr) => acc + Number(curr.total_amount), 0);
    const lowStockCount = inventory.filter(i => i.quantity < 20).length;
    const pendingDeliveries = deliveries.filter(d => d.status !== 'DELIVERED').length;
    return { totalSales, lowStockCount, pendingDeliveries };
  }, [sales, inventory, deliveries]);

  const filteredData = useMemo(() => {
    const lowerQuery = searchQuery.toLowerCase();
    if (activeTab === 'INVENTORY') {
      return inventory.filter(i => i.product.name.toLowerCase().includes(lowerQuery));
    }
    if (activeTab === 'SALES') {
      return sales.filter(s => s.staff.username.toLowerCase().includes(lowerQuery) || s.id.toString().includes(lowerQuery));
    }
    if (activeTab === 'DELIVERIES') {
      return deliveries.filter(d => d.status.toLowerCase().includes(lowerQuery) || d.items.some(i => i.product.name.toLowerCase().includes(lowerQuery)));
    }
    return [];
  }, [searchQuery, activeTab, inventory, sales, deliveries]);

  if (user?.role !== 'OWNER') {
    return <div className="h-screen flex items-center justify-center text-slate-500 font-medium">Access Denied. Owner permissions required.</div>;
  }

  return (
    <div className="flex h-[calc(100vh-2rem)] bg-slate-50 rounded-2xl overflow-hidden shadow-xl border border-slate-200">
      
      {/* --- SIDEBAR: Branch List --- */}
      <div className="w-72 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-5 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Locations</h2>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Filter branches..." 
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          {BRANCHES_DATA.map((branch) => (
            <button
              key={branch.id}
              onClick={() => { setSelectedBranch(branch.id); setSearchQuery(''); }}
              className={`w-full text-left px-3 py-3 rounded-xl flex items-center justify-between group transition-all duration-200 ${
                selectedBranch === branch.id 
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${selectedBranch === branch.id ? 'bg-white text-indigo-600' : 'bg-slate-100 text-slate-400 group-hover:bg-white group-hover:text-slate-600'}`}>
                  <Store className="w-5 h-5" />
                </div>
                <span className="font-semibold text-sm">{branch.name}</span>
              </div>
              {selectedBranch === branch.id && <ChevronRight className="w-4 h-4" />}
            </button>
          ))}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-slate-50/50">
          <p className="text-xs text-center text-slate-400">System Status: <span className="text-green-600 font-bold">● Online</span></p>
        </div>
      </div>

      {/* --- MAIN CONTENT --- */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/30">
        
        {selectedBranch ? (
          <>
            {/* Header & Stats */}
            <div className="bg-white border-b border-slate-200 p-6 shadow-sm z-10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                    {BRANCHES_DATA.find(b => b.id === selectedBranch)?.name}
                    <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold border border-green-200">Active</span>
                  </h1>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" /> Branch ID: #{selectedBranch}
                  </p>
                </div>
                <div className="flex gap-2">
                   <button onClick={loadBranchData} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Refresh Data">
                      <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin text-indigo-600' : ''}`} />
                   </button>
                   <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors">
                      <Download className="w-4 h-4" /> Export Report
                   </button>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl flex items-center gap-4">
                   <div className="p-3 bg-white rounded-full text-indigo-600 shadow-sm"><DollarSign className="w-6 h-6" /></div>
                   <div>
                      <p className="text-xs font-bold text-indigo-400 uppercase">Today's Sales</p>
                      <p className="text-2xl font-bold text-indigo-900">₱{stats.totalSales.toLocaleString()}</p>
                   </div>
                </div>
                <div className="bg-orange-50/50 border border-orange-100 p-4 rounded-xl flex items-center gap-4">
                   <div className="p-3 bg-white rounded-full text-orange-600 shadow-sm"><AlertTriangle className="w-6 h-6" /></div>
                   <div>
                      <p className="text-xs font-bold text-orange-400 uppercase">Low Stock Items</p>
                      <p className="text-2xl font-bold text-orange-900">{stats.lowStockCount}</p>
                   </div>
                </div>
                <div className="bg-blue-50/50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                   <div className="p-3 bg-white rounded-full text-blue-600 shadow-sm"><Truck className="w-6 h-6" /></div>
                   <div>
                      <p className="text-xs font-bold text-blue-400 uppercase">Pending Inbound</p>
                      <p className="text-2xl font-bold text-blue-900">{stats.pendingDeliveries}</p>
                   </div>
                </div>
              </div>
            </div>

            {/* Toolbar */}
            <div className="px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
              {/* Tabs */}
              <div className="flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                 {(['INVENTORY', 'SALES', 'DELIVERIES'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                      className={`px-4 py-2 text-sm font-bold rounded-md transition-all ${
                        activeTab === tab 
                          ? 'bg-indigo-600 text-white shadow-md' 
                          : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                       {tab.charAt(0) + tab.slice(1).toLowerCase()}
                    </button>
                 ))}
              </div>

              {/* Local Search */}
              <div className="relative w-full md:w-72">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder={`Search ${activeTab.toLowerCase()}...`}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-sm"
                 />
              </div>
            </div>

            {/* Data Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {isLoading ? (
                   <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                      <RefreshCw className="w-8 h-8 animate-spin mb-2 opacity-50" />
                      Loading live data...
                   </div>
                ) : filteredData.length === 0 ? (
                   <div className="p-16 text-center text-slate-400 flex flex-col items-center bg-slate-50/50">
                      <Search className="w-12 h-12 mb-3 opacity-20" />
                      <p className="text-lg font-medium text-slate-600">No results found</p>
                      <p className="text-sm">Try adjusting your search query.</p>
                   </div>
                ) : (
                   <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-500 tracking-wider">
                         <tr>
                            {activeTab === 'INVENTORY' && (
                              <>
                                <th className="px-6 py-4">Product Name</th>
                                <th className="px-6 py-4 text-center">Stock Level</th>
                                <th className="px-6 py-4 text-right">Price</th>
                              </>
                            )}
                            {activeTab === 'SALES' && (
                              <>
                                <th className="px-6 py-4">Transaction Date</th>
                                <th className="px-6 py-4">Staff Member</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                              </>
                            )}
                            {activeTab === 'DELIVERIES' && (
                              <>
                                <th className="px-6 py-4">Arrival Date</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Contents</th>
                              </>
                            )}
                         </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                         {/* DYNAMIC RENDERING BASED ON TAB */}
                         {activeTab === 'INVENTORY' && (filteredData as InventoryItem[]).map(item => (
                            <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                               <td className="px-6 py-4 font-semibold text-slate-700 flex items-center gap-3">
                                  <div className="p-2 bg-slate-100 rounded-lg text-slate-400"><Package className="w-4 h-4" /></div>
                                  {item.product.name}
                               </td>
                               <td className="px-6 py-4 text-center">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                                     item.quantity > 20 
                                     ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                     : 'bg-red-50 text-red-700 border-red-100'
                                  }`}>
                                     <span className={`w-1.5 h-1.5 rounded-full ${item.quantity > 20 ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                     {item.quantity} Units
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-right font-bold text-slate-700">
                                  ₱{Number(item.selling_price || item.product.selling_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                               </td>
                            </tr>
                         ))}

                         {activeTab === 'SALES' && (filteredData as Sale[]).map(sale => (
                            <tr key={sale.id} className="hover:bg-indigo-50/30 transition-colors">
                               <td className="px-6 py-4">
                                  <div className="font-bold text-slate-700">{new Date(sale.created_at).toLocaleDateString()}</div>
                                  <div className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleTimeString()}</div>
                               </td>
                               <td className="px-6 py-4">
                                  <div className="flex items-center gap-2">
                                     <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
                                        {sale.staff.username[0].toUpperCase()}
                                     </div>
                                     {sale.staff.username}
                                  </div>
                               </td>
                               <td className="px-6 py-4 text-right font-bold text-emerald-600">
                                  +₱{Number(sale.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                               </td>
                            </tr>
                         ))}

                         {activeTab === 'DELIVERIES' && (filteredData as Delivery[]).map(del => (
                            <tr key={del.id} className="hover:bg-indigo-50/30 transition-colors">
                               <td className="px-6 py-4 text-slate-600">{new Date(del.created_at).toLocaleDateString()}</td>
                               <td className="px-6 py-4">
                                  <span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold border uppercase tracking-wider ${
                                     del.status === 'DELIVERED' ? 'bg-slate-100 text-slate-600 border-slate-200' : 
                                     del.status === 'IN_TRANSIT' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'
                                  }`}>
                                     {del.status.replace('_', ' ')}
                                  </span>
                               </td>
                               <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={del.items.map(i => `${i.product.name} (${i.quantity})`).join(', ')}>
                                  {del.items.map(i => `${i.product.name} (${i.quantity})`).join(', ')}
                               </td>
                            </tr>
                         ))}
                      </tbody>
                   </table>
                )}
              </div>
            </div>
          </>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
             <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 animate-pulse">
                <Store className="w-10 h-10 text-indigo-200" />
             </div>
             <h3 className="text-xl font-bold text-slate-700 mb-2">Select a Branch</h3>
             <p className="max-w-md text-center text-slate-500">
                Choose a location from the sidebar to view real-time inventory, sales performance, and delivery schedules.
             </p>
          </div>
        )}
      </div>
    </div>
  );
}