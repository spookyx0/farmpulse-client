"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext'; 
import api from '../../services/api';
import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Store, Package, ShoppingCart, Truck, Search, ArrowRight, MapPin } from 'lucide-react';

// --- Types ---
interface Branch { id: number; name: string; }
// Updated InventoryItem to include selling_price at root level (merged by backend)
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
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'SALES' | 'DELIVERIES'>('INVENTORY');
  const [isLoading, setIsLoading] = useState(false);

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

  // Initial Load
  useEffect(() => {
    if (selectedBranch && user) {
      loadBranchData();
    }
  }, [selectedBranch, user, loadBranchData]);

  // Real-time Listeners
  useEffect(() => {
    if (!socket || !selectedBranch) return;

    const handleUpdate = () => {
      // Reload data to get fresh stock/sales/prices
      loadBranchData();
    };

    socket.on('newSale', handleUpdate); 
    socket.on('deliveryUpdated', handleUpdate);
    
    return () => { 
      socket.off('newSale', handleUpdate); 
      socket.off('deliveryUpdated', handleUpdate);
    };
  }, [socket, selectedBranch, loadBranchData]);

  if (user?.role !== 'OWNER') {
    return <div className="p-6 text-center text-slate-500">Access Denied. Owner permissions required.</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Store className="w-8 h-8 text-indigo-600" />
                Branch Reports
            </h1>
            <p className="text-slate-500 mt-1">View detailed inventory, sales, and delivery reports.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Branch Selection */}
        <div className="xl:col-span-4 space-y-6">
            <Card className="border-t-4 border-t-indigo-600 shadow-lg sticky top-6">
                <CardHeader title="Select Branch" subtitle="Choose a location." />
                <div className="p-2">
                    <div className="flex flex-col space-y-1">
                        {BRANCHES_DATA.map((branch) => (
                            <button
                                key={branch.id}
                                onClick={() => setSelectedBranch(branch.id)}
                                className={`w-full text-left px-4 py-3 rounded-lg flex items-center justify-between transition-all duration-200 ${
                                    selectedBranch === branch.id 
                                    ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm ring-1 ring-indigo-200' 
                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                }`}
                            >
                                <span className="flex items-center gap-3">
                                    <div className={`p-2 rounded-full ${selectedBranch === branch.id ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                                        <MapPin className="w-4 h-4" />
                                    </div>
                                    {branch.name}
                                </span>
                                {selectedBranch === branch.id && <ArrowRight className="w-4 h-4" />}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>
        </div>

        {/* RIGHT COLUMN: Reports */}
        <div className="xl:col-span-8 space-y-6">
            <Card className="h-[calc(100vh-240px)] min-h-[500px] shadow-md flex flex-col">
                 {selectedBranch ? (
                    <>
                        <div className="px-6 pt-6 pb-0 flex justify-between items-start">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">
                                    {BRANCHES_DATA.find(b => b.id === selectedBranch)?.name}
                                </h2>
                                <p className="text-sm text-slate-500">Branch ID: #{selectedBranch}</p>
                            </div>
                            {/* Tabs */}
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button
                                  onClick={() => setActiveTab('INVENTORY')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                    activeTab === 'INVENTORY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Inventory
                                </button>
                                <button
                                  onClick={() => setActiveTab('SALES')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                    activeTab === 'SALES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Sales
                                </button>
                                <button
                                  onClick={() => setActiveTab('DELIVERIES')}
                                  className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                                    activeTab === 'DELIVERIES' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                                  }`}
                                >
                                  Deliveries
                                </button>
                            </div>
                        </div>

                        <div className="overflow-auto flex-1 mt-4">
                             {isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-400 animate-pulse">
                                  <Search className="w-8 h-8 mb-2 opacity-50" />
                                  Loading data...
                                </div>
                              ) : (
                                <>
                                  {/* INVENTORY TAB */}
                                  {activeTab === 'INVENTORY' && (
                                      <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                                          <tr>
                                            <th className="px-6 py-3">Product</th>
                                            <th className="px-6 py-3 text-center">Stock</th>
                                            <th className="px-6 py-3 text-right">Selling Price</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {inventory.map((item) => (
                                            <tr key={item.id} className="hover:bg-slate-50">
                                              <td className="px-6 py-4 font-medium text-slate-800 flex items-center gap-2">
                                                  <Package className="w-4 h-4 text-slate-400" />
                                                  {item.product.name}
                                              </td>
                                              <td className="px-6 py-4 text-center">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${item.quantity > 20 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                  {item.quantity}
                                                </span>
                                              </td>
                                              <td className="px-6 py-4 text-right font-bold text-slate-700">
                                                {/* Display merged selling price */}
                                                ₱{Number(item.selling_price || item.product.selling_price || 0).toFixed(2)}
                                              </td>
                                            </tr>
                                          ))}
                                          {inventory.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No stock found.</td></tr>}
                                        </tbody>
                                      </table>
                                  )}

                                  {/* SALES TAB */}
                                  {activeTab === 'SALES' && (
                                      <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                                          <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Staff</th>
                                            <th className="px-6 py-3 text-right">Total Amount</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {sales.map((sale) => (
                                            <tr key={sale.id} className="hover:bg-slate-50">
                                              <td className="px-6 py-4">
                                                <div className="font-medium text-slate-700">{new Date(sale.created_at).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleTimeString()}</div>
                                              </td>
                                              <td className="px-6 py-4 font-medium text-slate-700">{sale.staff.username}</td>
                                              <td className="px-6 py-4 text-right font-bold text-green-600">+₱{Number(sale.total_amount).toFixed(2)}</td>
                                            </tr>
                                          ))}
                                          {sales.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No sales recorded.</td></tr>}
                                        </tbody>
                                      </table>
                                  )}

                                  {/* DELIVERIES TAB */}
                                  {activeTab === 'DELIVERIES' && (
                                      <table className="w-full text-left text-sm text-slate-600">
                                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                                          <tr>
                                            <th className="px-6 py-3">Date</th>
                                            <th className="px-6 py-3">Status</th>
                                            <th className="px-6 py-3">Items</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                          {deliveries.map((del) => (
                                            <tr key={del.id} className="hover:bg-slate-50">
                                              <td className="px-6 py-4 text-slate-500">{new Date(del.created_at).toLocaleDateString()}</td>
                                              <td className="px-6 py-4">
                                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                  del.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 
                                                  del.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                  {del.status}
                                                </span>
                                              </td>
                                              <td className="px-6 py-4 text-slate-700 max-w-md truncate">
                                                {del.items.map(i => `${i.product.name} (${i.quantity})`).join(', ')}
                                              </td>
                                            </tr>
                                          ))}
                                          {deliveries.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No deliveries found.</td></tr>}
                                        </tbody>
                                      </table>
                                  )}
                                </>
                              )}
                        </div>
                    </>
                 ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400">
                        <div className="bg-slate-50 p-4 rounded-full mb-3">
                            <Store className="w-8 h-8 text-slate-300" />
                        </div>
                        <p>Select a branch from the list to view details.</p>
                    </div>
                 )}
            </Card>
        </div>
      </div>
    </div>
  );
}