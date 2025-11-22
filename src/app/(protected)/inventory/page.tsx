/* eslint-disable react-hooks/incompatible-library */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal'; // Import generic Modal
import { ConfirmationModal } from '../../components/ui/ConfirmationModal'; // Import Confirmation
import { Package, Plus, RefreshCw, Tag, Calendar, Layers, User, Filter, Pencil, Trash2 } from 'lucide-react';

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
      .catch((err) => { console.error(err); showToast('Failed to load inventory', 'error'); });
  }, [user, refresh, showToast]);

  // Handlers
  const onAddStock = async (data: AddStockFormData) => {
    try {
      await api.post('/inventory/owner/add', {
        ...data,
        quantity: Number(data.quantity),
        purchase_price: Number(data.purchase_price),
        selling_price: Number(data.selling_price),
      });
      reset({ date: new Date().toISOString().split('T')[0], category: 'FROZEN_ITEM', supplier: '', productName: '', quantity: '', purchase_price: '', selling_price: '' });
      setRefresh(!refresh);
      showToast('Item added successfully', 'success');
    } catch (error) {
      showToast('Failed to add item', 'error');
    }
  };

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
    if (filterCategory === 'ALL') return true;
    return item.product?.category === filterCategory;
  });

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <Package className="w-8 h-8 text-green-600" />
            {user?.role === 'OWNER' ? 'Master Inventory' : 'Branch Stock'}
          </h1>
          <p className="text-slate-500 mt-1">Manage products, prices, and stock levels.</p>
        </div>
        <button onClick={() => setRefresh(!refresh)} className="p-2 text-slate-400 hover:text-green-600 transition-colors rounded-full hover:bg-green-50">
          <RefreshCw className="w-5 h-5" />
        </button>
      </div>

      {/* Add Stock Form (Owner Only) */}
      {user?.role === 'OWNER' && (
        <Card className="border-l-4 border-l-green-500">
          <CardHeader title="Add Items to Inventory" subtitle="Register new products or add stock." />
          <CardContent>
            <form onSubmit={handleSubmit(onAddStock)} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Date</label>
                <input {...register('date', { required: true })} type="date" className="w-full border-slate-300 rounded-lg text-sm" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Supplier</label>
                <input {...register('supplier')} type="text" className="w-full border-slate-300 rounded-lg text-sm" placeholder="Supplier Name" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-500 mb-1">Product Name</label>
                <input {...register('productName', { required: true })} type="text" className="w-full border-slate-300 rounded-lg text-sm" placeholder="Item Name" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Category</label>
                <select {...register('category', { required: true })} className="w-full border-slate-300 rounded-lg text-sm">
                  <option value="FROZEN_ITEM">Frozen Items</option>
                  <option value="CHICKEN_PART">Chicken Parts</option>
                </select>
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">{quantityLabel}</label>
                <input {...register('quantity', { required: true })} type="number" step="0.01" className="w-full border-slate-300 rounded-lg text-sm" placeholder="0.00" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Purchase Price</label>
                <input {...register('purchase_price', { required: true })} type="number" step="0.01" className="w-full border-slate-300 rounded-lg text-sm" placeholder="0.00" />
              </div>
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-slate-500 mb-1">Selling Price</label>
                <input {...register('selling_price', { required: true })} type="number" step="0.01" className="w-full border-slate-300 rounded-lg text-sm" placeholder="0.00" />
              </div>
              <button type="submit" className="flex items-center justify-center gap-2 bg-green-600 text-white py-2.5 px-4 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium shadow-sm col-span-1 md:col-span-4 mt-2">
                <Plus className="w-4 h-4" /> Add to Inventory
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-3 pb-2">
        <Filter className="w-5 h-5 text-slate-400" />
        <span className="text-sm font-medium text-slate-600 mr-2">Filter:</span>
        {['ALL', 'FROZEN_ITEM', 'CHICKEN_PART'].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat as any)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              filterCategory === cat ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat === 'ALL' ? 'All' : cat.replace('_', ' ')}
          </button>
        ))}
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
                    <div>{item.product?.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2 py-1 rounded border bg-slate-100 text-slate-600">
                      {item.product?.category?.replace('_', ' ') || 'N/A'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center font-bold text-slate-700">
                    {Number(item.quantity)} {item.product?.category === 'CHICKEN_PART' ? 'kg' : 'units'}
                  </td>
                  {user?.role === 'OWNER' && (
                    <>
                      <td className="px-6 py-4 text-right text-slate-500">₱{Number(item.purchase_price || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-right font-bold text-slate-800">₱{Number(item.selling_price || 0).toFixed(2)}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button onClick={() => onEditClick(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded"><Pencil className="w-4 h-4" /></button>
                          <button onClick={() => setDeletingId(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </>
                  )}
                  {user?.role === 'STAFF' && (
                    <td className="px-6 py-4 text-right font-bold text-slate-800">₱{Number(item.selling_price || item.product?.selling_price || 0).toFixed(2)}</td>
                  )}
                </tr>
              ))}
              {filteredInventory.length === 0 && <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400">No items found.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

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