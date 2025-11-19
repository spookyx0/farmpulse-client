"use client";

import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';

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

  // Fetch Data when Branch Changes
  useEffect(() => {
    if (!selectedBranch || !user) return;

    const loadBranchData = async () => {
      try {
        // We use Promise.all to fetch everything in parallel
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
      }
    };

    loadBranchData();
  }, [selectedBranch, user]);

  if (user?.role !== 'OWNER') {
    return <div className="p-6">Access Denied. Owner only.</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Branch Reports</h1>

      {/* 1. Branch Selector */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Branch to View:</label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {BRANCHES_DATA.map((branch) => (
            <button
              key={branch.id}
              onClick={() => setSelectedBranch(branch.id)}
              className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                selectedBranch === branch.id
                  ? 'bg-indigo-600 text-white shadow-lg'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {branch.name}
            </button>
          ))}
        </div>
      </div>

      {selectedBranch && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* 2. Tabs */}
          <div className="flex border-b">
            <button
              onClick={() => setActiveTab('INVENTORY')}
              className={`flex-1 py-4 text-center font-medium ${activeTab === 'INVENTORY' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Current Inventory
            </button>
            <button
              onClick={() => setActiveTab('SALES')}
              className={`flex-1 py-4 text-center font-medium ${activeTab === 'SALES' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Sales History
            </button>
            <button
              onClick={() => setActiveTab('DELIVERIES')}
              className={`flex-1 py-4 text-center font-medium ${activeTab === 'DELIVERIES' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Incoming Deliveries
            </button>
          </div>

          {/* 3. Content Area */}
          <div className="p-6">
            {activeTab === 'INVENTORY' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Price</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {inventory.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">{item.product.name}</td>
                      <td className="px-6 py-4 font-bold">{item.quantity}</td>
                      <td className="px-6 py-4 text-green-600">${item.product.selling_price}</td>
                    </tr>
                  ))}
                  {inventory.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-500">No stock in this branch.</td></tr>}
                </tbody>
              </table>
            )}

            {activeTab === 'SALES' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {sales.map((sale) => (
                    <tr key={sale.id}>
                      <td className="px-6 py-4">{new Date(sale.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">{sale.staff.username}</td>
                      <td className="px-6 py-4 text-right font-bold text-green-600">${sale.total_amount}</td>
                    </tr>
                  ))}
                  {sales.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-500">No sales recorded.</td></tr>}
                </tbody>
              </table>
            )}

            {activeTab === 'DELIVERIES' && (
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items Summary</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {deliveries.map((del) => (
                    <tr key={del.id}>
                      <td className="px-6 py-4">{new Date(del.created_at).toLocaleDateString()}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${del.status === 'DELIVERED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                          {del.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {del.items.map(i => `${i.product.name} (${i.quantity})`).join(', ')}
                      </td>
                    </tr>
                  ))}
                  {deliveries.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-gray-500">No deliveries found.</td></tr>}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}