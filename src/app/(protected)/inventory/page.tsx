/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { 
  Package, Plus, RefreshCw, Tag, Calendar, Layers, User, Filter, 
  Pencil, Trash2, Search, TrendingUp, AlertTriangle, DollarSign, Download 
} from 'lucide-react';

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
  const quantityLabel = selectedCategory === 'CHICKEN_PART' ? 'Weight (Kg)' : 'Quantity (Units)';

  const editCategory = editForm.watch('category');
  const editQuantityLabel = editCategory === 'CHICKEN_PART' ? 'Weight (Kg)' : 'Quantity (Units)';

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
  }, [user, refresh]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const lowStock = inventory.filter(i => i.quantity < 20).length; 
    const totalValue = inventory.reduce((acc, curr) => {
        const price = Number(curr.purchase_price || 0);
        return acc + (price * curr.quantity);
    }, 0);
    return { totalItems, lowStock, totalValue };
  }, [inventory]);

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
      
      setRefresh(!refresh); 
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
    <div className="flex flex-col h-[calc(90vh-3rem)] gap-4">
      
      {/* --- TOP SECTION (Shrinks to fit content) --- */}
      <div className="shrink-0 space-y-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
                <Package className="w-8 h-8 text-green-600" />
                {user?.role === 'OWNER' ? 'Master Inventory' : 'Branch Stock'}
            </h1>
            <p className="text-slate-500 mt-1">Manage products, prices, and stock levels.</p>
            </div>
            <div className="flex gap-2">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors shadow-sm">
                    <Download className="w-4 h-4" /> Export CSV
                </button>
                <button 
                    onClick={() => setRefresh(!refresh)} 
                    className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-green-600 rounded-lg shadow-sm hover:bg-green-50 transition-all"
                    title="Refresh Data"
                >
                    <RefreshCw className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* KPI Cards */}
        {user?.role === 'OWNER' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Layers className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Items</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.totalItems}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-amber-50 text-amber-600 rounded-full"><AlertTriangle className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Low Stock Alerts</p>
                    <p className="text-2xl font-bold text-amber-600">{stats.lowStock}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-full"><DollarSign className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Est. Stock Value</p>
                    <p className="text-2xl font-bold text-emerald-600">₱{stats.totalValue.toLocaleString()}</p>
                </div>
            </div>
        </div>
        )}
      </div>

      {/* --- CONTENT SECTION --- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start h-full">
        
        {/* --- LEFT COLUMN: Add Stock Form (Owner Only) --- */}
        {user?.role === 'OWNER' && (
          <div className="xl:col-span-4 h-full overflow-y-auto pr-1">
            <Card className="border-t-4 border-t-green-600 shadow-lg sticky top-0">
              <CardHeader title="Add New Item" subtitle="Register new stock entry." />
              <CardContent>
                <form onSubmit={handleSubmit(onAddStock)} className="space-y-4">
                  {/* ... Form Fields ... */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <input {...register('date', { required: true })} type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 transition-colors" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Type</label>
                        <select {...register('category', { required: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 transition-colors cursor-pointer">
                            <option value="FROZEN_ITEM">Frozen Item</option>
                            <option value="CHICKEN_PART">Chicken Part</option>
                        </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Supplier</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input {...register('supplier')} type="text" className="pl-9 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 transition-colors" placeholder="Supplier Name" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input {...register('productName', { required: true })} type="text" className="pl-9 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 transition-colors" placeholder="e.g. Whole Chicken" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1 transition-all">{quantityLabel}</label>
                    <input {...register('quantity', { required: true })} type="number" step="0.01" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-green-500 transition-colors" placeholder="0.00" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purchase ₱</label>
                      <input {...register('purchase_price', { required: true })} type="number" step="0.01" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none focus:border-green-500" placeholder="0.00" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-green-600 uppercase mb-1">Selling ₱</label>
                      <input {...register('selling_price', { required: true })} type="number" step="0.01" className="w-full p-2 bg-white border border-green-200 rounded text-sm outline-none focus:border-green-500 text-green-700 font-bold" placeholder="0.00" />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-lg shadow-md transition-all transform active:scale-95 text-sm font-bold mt-2"
                  >
                    <Plus className="w-4 h-4" /> Add to Inventory
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- RIGHT COLUMN: Inventory List (FIXED HEIGHT ~8 Items) --- */}
        <div className={`${user?.role === 'OWNER' ? 'xl:col-span-8' : 'xl:col-span-12'} h-full`}>
          <Card className="shadow-md flex flex-col border border-slate-200 overflow-hidden h-fit">
            
            {/* Toolbar (Fixed) */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search products..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-100">
                {['ALL', 'FROZEN_ITEM', 'CHICKEN_PART'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat as any)}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                      filterCategory === cat ? 'bg-white text-green-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {cat === 'ALL' ? 'All Items' : cat === 'FROZEN_ITEM' ? 'Frozen' : 'Chicken'}
                  </button>
                ))}
              </div>
            </div>

            {/* Table Area (FIX: Fixed height to show approx 8 items) */}
            <div className="overflow-y-auto h-[600px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-400 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 bg-slate-50">Product Name</th>
                    <th className="px-6 py-4 bg-slate-50 text-center">Stock Level</th>
                    {user?.role === 'OWNER' && (
                      <>
                        <th className="px-6 py-4 bg-slate-50 text-right">Cost</th>
                        <th className="px-6 py-4 bg-slate-50 text-right">Price</th>
                        <th className="px-6 py-4 bg-slate-50 text-center">Actions</th>
                      </>
                    )}
                    {user?.role === 'STAFF' && <th className="px-6 py-4 bg-slate-50 text-right">Price</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-green-50/30 transition-colors group">
                      <td className="px-6 py-4">
                         <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold shadow-sm ${
                            item.product?.category === 'FROZEN_ITEM' ? 'bg-blue-500' : 'bg-amber-500'
                            }`}>
                            {item.product?.name?.charAt(0) || <Package className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-bold text-slate-700">{item.product?.name}</p>
                                <p className="text-xs text-slate-400 font-mono">ID: {item.productId}</p>
                            </div>
                         </div>
                      </td>
                      
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
                          item.quantity > 20 
                            ? 'bg-slate-50 text-slate-600 border-slate-200' 
                            : 'bg-red-50 text-red-600 border-red-100 animate-pulse'
                        }`}>
                          {item.quantity <= 20 && <AlertTriangle className="w-3 h-3" />}
                          {Number(item.quantity)} {item.product?.category === 'CHICKEN_PART' ? 'kg' : 'pcs'}
                        </span>
                      </td>

                      {user?.role === 'OWNER' && (
                        <>
                          <td className="px-6 py-4 text-right font-medium text-slate-500">
                            ₱{Number(item.purchase_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-right font-bold text-slate-800">
                            ₱{Number(item.selling_price || item.product?.selling_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <div className="flex justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => onEditClick(item)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button onClick={() => setDeletingId(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                                <Trash2 className="w-4 h-4" />
                              </button>
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
                      <td colSpan={user?.role === 'OWNER' ? 5 : 3} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center justify-center">
                          <Search className="w-12 h-12 mb-3 opacity-20" />
                          <p className="font-medium">No products found matching your search.</p>
                          <p className="text-sm mt-1">Try adjusting filters or adding new stock.</p>
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

      {/* --- EDIT MODAL --- */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Edit Stock Details">
         <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
            <input {...editForm.register('productName', { required: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                <select {...editForm.register('category')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500">
                <option value="FROZEN_ITEM">Frozen Items</option>
                <option value="CHICKEN_PART">Chicken Parts</option>
                </select>
             </div>
             <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">{editQuantityLabel}</label>
                <input {...editForm.register('quantity')} type="number" step="0.01" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4 p-3 bg-slate-50 rounded-lg">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purchase ₱</label>
              <input {...editForm.register('purchase_price')} type="number" step="0.01" className="w-full p-2 bg-white border border-slate-200 rounded text-sm outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Selling ₱</label>
              <input {...editForm.register('selling_price')} type="number" step="0.01" className="w-full p-2 bg-white border border-blue-200 rounded text-sm outline-none focus:border-blue-500 font-bold text-blue-700" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
             <button type="button" onClick={() => setEditingItem(null)} className="px-4 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
             <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-md transition-colors">Save Changes</button>
          </div>
        </form>
      </Modal>

      {/* --- DELETE CONFIRMATION --- */}
      <ConfirmationModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={onDeleteConfirm}
        title="Delete Inventory Item?"
        message="Are you sure you want to remove this item? This will permanently delete stock records and may affect sales history."
        confirmText="Yes, Delete Item"
        variant="danger"
      />
    </div>
  );
}