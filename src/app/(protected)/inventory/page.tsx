/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/incompatible-library */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Package, Plus, RefreshCw, Tag, Calendar, Layers, User, Filter } from 'lucide-react';

// --- Types ---
interface InventoryItem {
  id: number;
  productId: number;
  quantity: number;
  purchase_price?: number | string;
  selling_price?: number | string;
  product?: { name: string; selling_price?: number | string; category?: 'FROZEN_ITEM' | 'CHICKEN_PART' };
}

interface AddStockFormData {
  date: string;
  supplier: string;
  productName: string;
  category: 'FROZEN_ITEM' | 'CHICKEN_PART';
  quantity: string;
  purchase_price: string;
  selling_price: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [refresh, setRefresh] = useState(false);
  
  // Filter State
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'FROZEN_ITEM' | 'CHICKEN_PART'>('ALL');

  const { register, handleSubmit, watch, reset } = useForm<AddStockFormData>({
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      category: 'FROZEN_ITEM' // Default
    }
  });

  // Watch category to change label dynamically in the form
  const selectedCategory = watch('category');
  const quantityLabel = selectedCategory === 'CHICKEN_PART' ? 'Kilos' : 'Quantity';

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
        ...data,
        // Convert strings to numbers for backend
        quantity: Number(data.quantity),
        purchase_price: Number(data.purchase_price),
        selling_price: Number(data.selling_price),
      });
      
      reset({
        date: new Date().toISOString().split('T')[0],
        category: 'FROZEN_ITEM',
        supplier: '',
        productName: '',
        quantity: '',
        purchase_price: '',
        selling_price: ''
      });
      
      setRefresh(!refresh); // Trigger re-fetch
      showToast('Item added to inventory successfully', 'success');
    } catch (error) {
      showToast('Failed to add item. Please check all fields.', 'error');
    }
  };

  // Filter Logic
  const filteredInventory = inventory.filter((item) => {
    if (filterCategory === 'ALL') return true;
    return item.product?.category === filterCategory;
  });

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
          <CardHeader title="Add Items to Inventory" subtitle="Register new products or add stock to existing ones." />
          <CardContent>
            <form onSubmit={handleSubmit(onAddStock)} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              
              {/* Date */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('date', { required: true })} 
                    type="date" 
                    className="pl-9 w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                  />
                </div>
              </div>

              {/* Supplier */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Supplier</label>
                <div className="relative">
                  <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('supplier')} 
                    type="text" 
                    className="pl-9 w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                    placeholder="Supplier Name" 
                  />
                </div>
              </div>

              {/* Product Name */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Product Name</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    {...register('productName', { required: true })} 
                    type="text" 
                    className="pl-9 w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                    placeholder="e.g. Whole Chicken, Hotdogs" 
                  />
                </div>
              </div>

              {/* Category */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <div className="relative">
                  <Layers className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select 
                    {...register('category', { required: true })} 
                    className="pl-9 w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="FROZEN_ITEM">Frozen Items</option>
                    <option value="CHICKEN_PART">Chicken Parts</option>
                  </select>
                </div>
              </div>

              {/* Quantity / Kilos (Dynamic Label) */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1 transition-all">
                  {quantityLabel}
                </label>
                <input 
                  {...register('quantity', { required: true })} 
                  type="number" 
                  step="0.01" 
                  className="w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                  placeholder="0.00" 
                />
              </div>

              {/* Purchase Price */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Purchase Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-sans">₱</span>
                  <input 
                    {...register('purchase_price', { required: true })} 
                    type="number" 
                    step="0.01" 
                    className="pl-7 w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              {/* Selling Price */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Selling Price</label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-sans">₱</span>
                  <input 
                    {...register('selling_price', { required: true })} 
                    type="number" 
                    step="0.01" 
                    className="pl-7 w-full border-slate-300 rounded-lg text-sm focus:ring-green-500 focus:border-green-500" 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm col-span-1 md:col-span-4 mt-2"
              >
                <Plus className="w-4 h-4" /> Add to Inventory
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-3 pb-2">
        <Filter className="w-5 h-5 text-slate-400" />
        <span className="text-sm font-medium text-slate-600 mr-2">Filter by Category:</span>
        
        <button
          onClick={() => setFilterCategory('ALL')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterCategory === 'ALL'
              ? 'bg-slate-800 text-white shadow-md'
              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilterCategory('FROZEN_ITEM')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterCategory === 'FROZEN_ITEM'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Frozen Items
        </button>
        <button
          onClick={() => setFilterCategory('CHICKEN_PART')}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
            filterCategory === 'CHICKEN_PART'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Chicken Parts
        </button>
      </div>

      {/* Inventory Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Stock Level</th>
                {user?.role === 'OWNER' && <th className="px-6 py-4 text-right">Purchase Price</th>}
                <th className="px-6 py-4 text-right">Selling Price</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold shadow-sm ${
                      item.product?.category === 'FROZEN_ITEM' ? 'bg-blue-500' : 'bg-amber-500'
                    }`}>
                      {item.product?.name?.charAt(0) || '#'}
                    </div>
                    <div className="flex flex-col">
                      <span>{item.product?.name || `Product #${item.productId}`}</span>
                      {item.product?.category && (
                        <span className="text-[10px] text-slate-400 hidden sm:inline">ID: {item.productId}</span>
                      )}
                    </div>
                  </td>
                  
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded border ${
                      item.product?.category === 'FROZEN_ITEM' 
                        ? 'bg-blue-50 text-blue-700 border-blue-100' 
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}>
                      {item.product?.category?.replace('_', ' ') || 'N/A'}
                    </span>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${Number(item.quantity) > 20 ? 'bg-slate-100 text-slate-600' : 'bg-red-100 text-red-600'}`}>
                      {Number(item.quantity)} {item.product?.category === 'CHICKEN_PART' ? 'kg' : 'units'}
                    </span>
                  </td>

                  {user?.role === 'OWNER' && (
                    <td className="px-6 py-4 text-right text-slate-500">
                      ₱{Number(item.purchase_price || 0).toFixed(2)}
                    </td>
                  )}

                  <td className="px-6 py-4 text-right font-bold text-slate-800">
                    ₱{Number(item.selling_price || item.product?.selling_price || 0).toFixed(2)}
                  </td>
                </tr>
              ))}
              
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
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