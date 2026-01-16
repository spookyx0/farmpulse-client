/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { Package, Plus, RefreshCw, Tag, Calendar, Layers, User, Filter, Pencil, Trash2, Search } from 'lucide-react';

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

interface EditStockFormData {
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
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter & Modal States
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'FROZEN_ITEM' | 'CHICKEN_PART'>('ALL');
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Forms
  const { register, handleSubmit, watch, reset } = useForm<AddStockFormData>({
    defaultValues: { date: new Date().toISOString().split('T')[0], category: 'FROZEN_ITEM' }
  });

  const editForm = useForm<EditStockFormData>();

  // Watch category for dynamic labels
  const selectedCategory = watch('category');
  const quantityLabel = selectedCategory === 'CHICKEN_PART' ? 'Kilos' : 'Quantity';

  const editCategory = editForm.watch('category');
  const editQuantityLabel = editCategory === 'CHICKEN_PART' ? 'Kilos' : 'Quantity';

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

  // Edit Handlers
  const onEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    editForm.reset({
      productName: item.product?.name || '',
      category: item.product?.category || 'FROZEN_ITEM',
      quantity: String(item.quantity),
      purchase_price: String(item.purchase_price),
      selling_price: String(item.selling_price || item.product?.selling_price || 0),
    });
  };

  const onSaveEdit = async (data: EditStockFormData) => {
    if (!editingItem) return;
    try {
      await api.patch(`/inventory/owner/${editingItem.id}`, {
        productName: data.productName,
        category: data.category,
        quantity: Number(data.quantity),
        purchase_price: Number(data.purchase_price),
        selling_price: Number(data.selling_price),
      });
      setEditingItem(null);
      setRefresh(!refresh);
      showToast('Item updated successfully', 'success');
    } catch (err) {
      showToast('Failed to update item', 'error');
    }
  };

  const onDeleteConfirm = async () => {
    if (!deletingId) return;
    try {
      await api.delete(`/inventory/owner/${deletingId}`);
      setDeletingId(null);
      setRefresh(!refresh);
      showToast('Item deleted successfully', 'success');
    } catch (err) {
      showToast('Failed to delete item', 'error');
    }
  };

  // Filter Logic
  const filteredInventory = inventory.filter((item) => {
    const matchesCategory = filterCategory === 'ALL' || item.product?.category === filterCategory;
    const term = searchTerm.toLowerCase();
    const matchesSearch = !searchTerm || 
      item.product?.name?.toLowerCase().includes(term) ||
      item.productId.toString().includes(term);
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-8 h-8 text-green-600" />
            {user?.role === 'OWNER' ? 'Master Inventory' : 'Branch Stock'}
          </h1>
          <p className="text-slate-500 mt-1">Manage products, prices, and stock levels.</p>
        </div>
        <div className="flex gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Items</p>
              <p className="text-2xl font-bold text-slate-800">{inventory.length}</p>
           </div>
           <button 
            onClick={() => setRefresh(!refresh)} 
            className="p-2 text-slate-400 hover:text-green-600 transition-colors rounded-full hover:bg-green-50 self-center"
            title="Refresh Data"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Add Stock Form (Owner Only) */}
        {user?.role === 'OWNER' && (
          <div className="xl:col-span-4 space-y-6">
            <Card className="border-t-4 border-t-green-600 shadow-lg sticky top-6">
              <CardHeader title="Add New Item" subtitle="Register stock." />
              <CardContent>
                <form onSubmit={handleSubmit(onAddStock)} className="space-y-4">
                  
                  {/* Date */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        {...register('date', { required: true })} 
                        type="date" 
                        className="pl-9 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                      />
                    </div>
                  </div>

                  {/* Supplier */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Supplier</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        {...register('supplier')} 
                        type="text" 
                        className="pl-9 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                        placeholder="Supplier Name" 
                      />
                    </div>
                  </div>

                  {/* Product Name */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Product Name</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        {...register('productName', { required: true })} 
                        type="text" 
                        className="pl-9 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                        placeholder="e.g. Whole Chicken" 
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                    <div className="relative">
                      <Layers className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <select 
                        {...register('category', { required: true })} 
                        className="pl-9 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none appearance-none"
                      >
                        <option value="FROZEN_ITEM">Frozen Items</option>
                        <option value="CHICKEN_PART">Chicken Parts</option>
                      </select>
                    </div>
                  </div>

                  {/* Quantity / Kilos */}
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1 transition-all">
                      {quantityLabel}
                    </label>
                    <input 
                      {...register('quantity', { required: true })} 
                      type="number" 
                      step="0.01" 
                      className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                      placeholder="0.00" 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Purchase Price */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Purchase Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-sans">₱</span>
                        <input 
                          {...register('purchase_price', { required: true })} 
                          type="number" 
                          step="0.01" 
                          className="pl-7 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Selling Price</label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-slate-400 font-sans">₱</span>
                        <input 
                          {...register('selling_price', { required: true })} 
                          type="number" 
                          step="0.01" 
                          className="pl-7 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none" 
                          placeholder="0.00" 
                        />
                      </div>
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white py-3 rounded-xl shadow-lg shadow-green-200 transition-all transform active:scale-95 text-sm font-bold mt-2"
                  >
                    <Plus className="w-4 h-4" /> Add to Inventory
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* RIGHT COLUMN: Inventory List */}
        <div className={`${user?.role === 'OWNER' ? 'xl:col-span-8' : 'xl:col-span-12'} space-y-6`}>
          <Card className="h-[calc(100vh-240px)] min-h-[500px] shadow-md flex flex-col">
            <CardHeader title="Inventory List" subtitle="Current stock levels." />
            
            {/* Search & Filter Bar */}
            <div className="px-6 pb-4 flex flex-col sm:flex-row gap-4 justify-between items-center">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                <Filter className="w-4 h-4 text-slate-400 hidden sm:block" />
                {['ALL', 'FROZEN_ITEM', 'CHICKEN_PART'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat as any)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                      filterCategory === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    {cat === 'ALL' ? 'All' : cat.replace('_', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4">Product Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Stock Level</th>
                {user?.role === 'OWNER' && (
                  <>
                    <th className="px-6 py-4 text-right">Purchase Price</th>
                    <th className="px-6 py-4 text-right">Selling Price</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </>
                )}
                {user?.role === 'STAFF' && <th className="px-6 py-4 text-right">Selling Price</th>}
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
                    <>
                      <td className="px-6 py-4 text-right text-slate-500">
                        ₱{Number(item.purchase_price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">
                        ₱{Number(item.selling_price || item.product?.selling_price || 0).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => onEditClick(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeletingId(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  )}
                  
                  {user?.role === 'STAFF' && (
                    <td className="px-6 py-4 text-right font-bold text-slate-800">
                      ₱{Number(item.selling_price || item.product?.selling_price || 0).toFixed(2)}
                    </td>
                  )}
                </tr>
              ))}
              
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={user?.role === 'OWNER' ? 7 : 5} className="px-6 py-12 text-center text-slate-400">
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
      </div>

      {/* Edit Modal */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Inventory Item">
        <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Product Name</label>
            <input {...editForm.register('productName', { required: true })} className="w-full border-slate-300 rounded-lg text-sm p-2 border" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
            <select {...editForm.register('category')} className="w-full border-slate-300 rounded-lg text-sm p-2 border">
              <option value="FROZEN_ITEM">Frozen Items</option>
              <option value="CHICKEN_PART">Chicken Parts</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">{editQuantityLabel}</label>
            <input {...editForm.register('quantity')} type="number" step="0.01" className="w-full border-slate-300 rounded-lg text-sm p-2 border" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Purchase Price</label>
              <input {...editForm.register('purchase_price')} type="number" step="0.01" className="w-full border-slate-300 rounded-lg text-sm p-2 border" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Selling Price</label>
              <input {...editForm.register('selling_price')} type="number" step="0.01" className="w-full border-slate-300 rounded-lg text-sm p-2 border" />
            </div>
          </div>
          <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700">Save Changes</button>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={onDeleteConfirm}
        title="Delete Item?"
        message="Are you sure you want to remove this item from inventory? This action cannot be undone."
        confirmText="Delete"
        variant="danger"
      />
    </div>
  );
}