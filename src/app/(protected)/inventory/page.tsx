"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext'; // <-- Integrated Toast
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Package, Plus, RefreshCw, Tag } from 'lucide-react';

// --- Types ---
interface InventoryItem {
  id: number;
  productId: number;
  quantity: number;
  // Allow string or number to prevent runtime crashes if DB returns string decimals
  purchase_price?: number | string;
  selling_price?: number | string;
  product?: { name: string; selling_price?: number | string };
}

interface AddStockFormData {
  productId: string;
  quantity: string;
  purchase_price: string;
  selling_price: string;
  supplier: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { showToast } = useToast(); // <-- Use Hook
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { register, handleSubmit, reset } = useForm<AddStockFormData>();
  const [refresh, setRefresh] = useState(false);

  // Fetch Data
  useEffect(() => {
    if (!user) return;
    const endpoint = user.role === 'OWNER' ? '/inventory/owner' : '/inventory/branch';
    
    api.get<InventoryItem[]>(endpoint)
      .then((res) => setInventory(res.data))
      .catch((err) => {
        console.error(err);
        showToast('Failed to load inventory', 'error');
      });
  }, [user, refresh, showToast]);

  // Add Stock Handler (Owner Only)
  const onAddStock = async (data: AddStockFormData) => {
    try {
      await api.post('/inventory/owner/add', {
        productId: Number(data.productId),
        quantity: Number(data.quantity),
        purchase_price: Number(data.purchase_price),
        selling_price: Number(data.selling_price),
        supplier: data.supplier,
      });
      reset();
      setRefresh(!refresh); // Trigger re-fetch
      showToast('Stock updated successfully', 'success'); // <-- Toast Success
    } catch (error) {
      showToast('Failed to update stock. Check Product ID.', 'error'); // <-- Toast Error
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-8 h-8 text-green-600" />
            {user?.role === 'OWNER' ? 'Master Inventory' : 'Branch Stock'}
          </h1>
          <p className="text-slate-500 mt-1">Manage products, prices, and stock levels.</p>
        </div>
        <button 
          onClick={() => setRefresh(!refresh)} 
          className="p-2 text-slate-400 hover:text-green-600 transition-colors rounded-full hover:bg-green-50"
          title="Refresh Data"
        >
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Add Stock Form (Owner Only) */}
      {user?.role === 'OWNER' && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader title="Add Incoming Stock" subtitle="Register new items or update existing stock levels." />
          <CardContent>
            <form onSubmit={handleSubmit(onAddStock)} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
              
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Product ID</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('productId', { required: true })} 
                    type="number" 
                    className="pl-9 w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                    placeholder="ID" 
                  />
                </div>
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Quantity</label>
                <input 
                  {...register('quantity', { required: true })} 
                  type="number" 
                  step="0.01" 
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                  placeholder="0.00" 
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Buy Price</label>
                <input 
                  {...register('purchase_price', { required: true })} 
                  type="number" 
                  step="0.01" 
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                  placeholder="0.00" 
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Sell Price</label>
                <input 
                  {...register('selling_price', { required: true })} 
                  type="number" 
                  step="0.01" 
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                  placeholder="0.00" 
                />
              </div>

              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Supplier</label>
                <input 
                  {...register('supplier')} 
                  type="text" 
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                  placeholder="Optional" 
                />
              </div>

              <button 
                type="submit" 
                className="flex items-center justify-center gap-2 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm"
              >
                <Plus className="w-4 h-4" /> Add Stock
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4 text-center">Stock Level</th>
                {user?.role === 'OWNER' && <th className="px-6 py-4 text-right">Purchase Cost</th>}
                <th className="px-6 py-4 text-right">Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shadow-sm">
                      {item.product?.name?.charAt(0) || '#'}
                    </div>
                    <div className="flex flex-col">
                      <span>{item.product?.name || `Product #${item.productId}`}</span>
                      <span className="text-xs text-slate-400">ID: {item.productId}</span>
                    </div>
                  </td>
                  
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${Number(item.quantity) > 20 ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600'}`}>
                      {Number(item.quantity)} units
                    </span>
                  </td>

                  {user?.role === 'OWNER' && (
                    <td className="px-6 py-4 text-right text-slate-500">
                      ${Number(item.purchase_price || 0).toFixed(2)}
                    </td>
                  )}

                  <td className="px-6 py-4 text-right font-bold text-slate-800">
                    ${Number(item.selling_price || item.product?.selling_price || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              
              {inventory.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <Package className="w-12 h-12 mb-3 opacity-20" />
                      <p>No inventory items found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}