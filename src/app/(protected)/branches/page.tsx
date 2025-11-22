"use client";

import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Store, Package, ShoppingCart, Truck, Search } from 'lucide-react';

// --- Types ---
interface Branch {
  id: number;
  name: string;
}

interface InventoryItem {
  id: number;
  quantity: number;
  product: { name: string; selling_price: number };
}

interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  staff: { username: string };
}

interface Delivery {
  id: number;
  status: string;
  created_at: string;
  items: { quantity: number; product: { name: string } }[];
}

// Static Branches
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
  const [selectedBranch, setSelectedBranch] = useState<number | null>(null);
  
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'SALES' | 'DELIVERIES'>('INVENTORY');
  const [isLoading, setIsLoading] = useState(false);

  // Fetch Data when Branch Changes
  useEffect(() => {
    if (!selectedBranch || !user) return;

    const loadBranchData = async () => {
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
    };

    loadBranchData();
  }, [selectedBranch, user]);

  if (user?.role !== 'OWNER') {
    return <div className="p-6 text-center text-slate-500">Access Denied. Owner permissions required.</div>;
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
        <Store className="w-8 h-8 text-indigo-600" />
        Branch Reports
      </h1>

      {/* 1. Branch Selector */}
      <Card>
        <CardHeader title="Select Branch" subtitle="Choose a location to view detailed reports." />
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {BRANCHES_DATA.map((branch) => (
              <button
                key={branch.id}
                onClick={() => setSelectedBranch(branch.id)}
                className={`p-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                  selectedBranch === branch.id
                    ? 'bg-indigo-600 text-white shadow-md transform scale-105'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {branch.name}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedBranch && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Card>
            {/* 2. Tabs Header */}
            <div className="border-b border-slate-100 bg-slate-50/50 px-6 pt-2">
              <div className="flex space-x-6">
                <button
                  onClick={() => setActiveTab('INVENTORY')}
                  className={`pb-3 pt-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'INVENTORY' 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Package className="w-4 h-4" /> Current Inventory
                </button>
                <button
                  onClick={() => setActiveTab('SALES')}
                  className={`pb-3 pt-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'SALES' 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <ShoppingCart className="w-4 h-4" /> Sales History
                </button>
                <button
                  onClick={() => setActiveTab('DELIVERIES')}
                  className={`pb-3 pt-2 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
                    activeTab === 'DELIVERIES' 
                      ? 'border-indigo-600 text-indigo-600' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Truck className="w-4 h-4" /> Incoming Deliveries
                </button>
              </div>
            </div>

            {/* 3. Content Area */}
            <div className="p-0">
              {isLoading ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center animate-pulse">
                  <Search className="w-8 h-8 mb-2 opacity-50" />
                  Loading branch data...
                </div>
              ) : (
                <>
                  {activeTab === 'INVENTORY' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
                          <tr>
                            <th className="px-6 py-3">Product</th>
                            <th className="px-6 py-3 text-center">Stock</th>
                            <th className="px-6 py-3 text-right">Selling Price</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {inventory.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50">
                              <td className="px-6 py-4 font-medium text-slate-800">{item.product.name}</td>
                              <td className="px-6 py-4 text-center">
                                <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${item.quantity > 20 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                  {item.quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right font-bold text-slate-700">₱{Number(item.product.selling_price).toFixed(2)}</td>
                            </tr>
                          ))}
                          {inventory.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No stock found in this branch.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'SALES' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
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
                                <div>{new Date(sale.created_at).toLocaleDateString()}</div>
                                <div className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleTimeString()}</div>
                              </td>
                              <td className="px-6 py-4 font-medium text-slate-700">{sale.staff.username}</td>
                              <td className="px-6 py-4 text-right font-bold text-green-600">+₱{Number(sale.total_amount).toFixed(2)}</td>
                            </tr>
                          ))}
                          {sales.length === 0 && <tr><td colSpan={3} className="p-8 text-center text-slate-400">No sales recorded.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {activeTab === 'DELIVERIES' && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
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
                    </div>
                  )}
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}