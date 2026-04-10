/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import React, { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Modal } from '../../components/ui/Modal';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { 
  Package, Plus, RefreshCw, Tag, Layers, User, 
  Pencil, Trash2, Search, TrendingDown, AlertTriangle, DollarSign, Download, ClipboardList, CheckCircle2
} from 'lucide-react';

// --- Constants ---
const PARTICULARS = [
  "Intestine", "Liver", "Gizzard", "Spleen", "Feet", "Fats", 
  "Chicken Drumstick", "Chicken Wings", "Chicken Breast", 
  "Chicken Thigh", "Chicken Back", "Chicken Neck"
];

// --- Types ---
interface InventoryItem {
  id: number;
  productId: number;
  quantity: number;
  heads?: number;
  purchase_price?: number | string;
  selling_price?: number | string;
  product?: { name: string; selling_price?: number | string; category?: 'FROZEN_ITEM' | 'CHICKEN_PART' };
}

interface LossRecord {
  id: number;
  date: string;
  productName: string;
  heads: number;
  kilos: number;
  reason: string;
  branchName?: string; // Added to interface
}

interface AddStockFormData {
  date: string;
  supplier: string;
  productName: string;
  heads?: string;
  kilos?: string;
  quantity?: string;
  purchase_price: string;
  selling_price: string;
}

interface EditStockFormData {
  productName: string;
  heads?: string;
  kilos?: string;
  quantity?: string;
  purchase_price: string;
  selling_price: string;
}

interface LossFormData {
  heads?: string;
  kilos?: string;
  reason: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  // States
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [lossRecords, setLossRecords] = useState<LossRecord[]>([]);
  const [refresh, setRefresh] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'INVENTORY' | 'LOSSES'>('INVENTORY');
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Modals & Filters
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'FROZEN_ITEM' | 'CHICKEN_PART'>('ALL');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [lossItem, setLossItem] = useState<InventoryItem | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Forms
  const { register, handleSubmit, watch, reset } = useForm<AddStockFormData>({
    defaultValues: { date: new Date().toISOString().split('T')[0] }
  });
  const editForm = useForm<EditStockFormData>();
  const lossForm = useForm<LossFormData>();

  // Watch product names for dynamic inputs
  const watchAddProductName = watch('productName') || '';
  const isAddDressedChicken = watchAddProductName === 'Dressed Chicken';
  const isAddParticular = PARTICULARS.includes(watchAddProductName);

  const watchEditProductName = editForm.watch('productName') || '';
  const isEditDressedChicken = watchEditProductName === 'Dressed Chicken';
  const isEditParticular = PARTICULARS.includes(watchEditProductName);

  const isLossDressedChicken = lossItem?.product?.name === 'Dressed Chicken';

  // Fetch Data (Cleaned up duplicate useEffect)
  const fetchData = async (isManualSync = false) => {
    if (!user) return;
    
    if (isManualSync) setIsSyncing(true);
    
    try {
      const endpoint = user.role === 'OWNER' ? '/inventory/owner' : '/inventory/branch';
      
      // Use Promise.all to fetch inventory and losses concurrently
      const inventoryPromise = api.get<InventoryItem[]>(endpoint);
      const lossesPromise = user.role === 'OWNER' ? api.get<LossRecord[]>('/inventory/losses') : Promise.resolve({ data: [] });

      const [inventoryRes, lossesRes] = await Promise.all([inventoryPromise, lossesPromise]);

      setInventory(inventoryRes.data);
      if (user.role === 'OWNER') {
        setLossRecords(lossesRes.data);
      }

      if (isManualSync) {
        showToast('Inventory synced successfully', 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to load inventory', 'error');
    } finally {
      if (isManualSync) setIsSyncing(false);
    }
  };

  // Run on mount and whenever `refresh` is toggled by mutations
  useEffect(() => {
    fetchData(false);
  }, [user, refresh]);

  // Handler for the Sync Button
  const handleManualSync = () => {
    fetchData(true);
  };

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const totalItems = inventory.length;
    const lowStock = inventory.filter(i => i.quantity <= 20).length; 
    const totalValue = inventory.reduce((acc, curr) => {
        const price = Number(curr.purchase_price || 0);
        return acc + (price * curr.quantity);
    }, 0);
    return { totalItems, lowStock, totalValue };
  }, [inventory]);

  // Add Stock Handler
  const onAddStock = async (data: AddStockFormData) => {
    try {
      const inferredCategory = (isAddDressedChicken || isAddParticular) ? 'CHICKEN_PART' : 'FROZEN_ITEM';
      const finalQuantity = isAddDressedChicken || isAddParticular ? Number(data.kilos || 0) : Number(data.quantity || 0);

      await api.post('/inventory/owner/add', {
        ...data,
        category: inferredCategory,
        quantity: finalQuantity,
        heads: isAddDressedChicken ? Number(data.heads || 0) : undefined,
        purchase_price: Number(data.purchase_price), 
        selling_price: Number(data.selling_price),
      });
      
      reset({
        date: new Date().toISOString().split('T')[0],
        supplier: '',
        productName: '',
        heads: '',
        kilos: '',
        quantity: '',
        purchase_price: '',
        selling_price: ''
      });
      
      setIsAddModalOpen(false);
      setRefresh(!refresh); 
      showToast('Item added to inventory successfully', 'success');
    } catch (error) {
      showToast('Failed to add item. Please check all fields.', 'error');
    }
  };

  // Edit Handlers
  const onEditClick = (item: InventoryItem) => {
    setEditingItem(item);
    const itemName = item.product?.name || '';
    const isDressed = itemName === 'Dressed Chicken';
    const isPart = PARTICULARS.includes(itemName);

    editForm.reset({
      productName: itemName,
      heads: isDressed ? String(item.heads || 0) : '',
      kilos: isDressed || isPart ? String(item.quantity || 0) : '',
      quantity: !isDressed && !isPart ? String(item.quantity || 0) : '',
      purchase_price: String(item.purchase_price ?? 0),
      selling_price: String(item.selling_price || item.product?.selling_price || 0),
    });
  };

  const onSaveEdit = async (data: EditStockFormData) => {
    if (!editingItem) return;
    try {
      const finalQuantity = isEditDressedChicken || isEditParticular ? Number(data.kilos || 0) : Number(data.quantity || 0);

      await api.patch(`/inventory/owner/${editingItem.id}`, {
        productName: data.productName,
        quantity: finalQuantity,
        heads: isEditDressedChicken ? Number(data.heads || 0) : undefined,
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

  // Loss Handler (UPDATED FOR DYNAMIC ROLE ROUTING)
  const onSaveLoss = async (data: LossFormData) => {
    if (!lossItem) return;
    try {
      const endpoint = user?.role === 'OWNER' 
        ? `/inventory/owner/${lossItem.id}/loss`
        : `/inventory/branch/${lossItem.id}/loss`;

      await api.post(endpoint, {
        heads: isLossDressedChicken ? Number(data.heads || 0) : 0,
        kilos: Number(data.kilos || 0),
        reason: data.reason || 'General Loss/Spoilage'
      });
      setLossItem(null);
      lossForm.reset();
      setRefresh(!refresh);
      showToast('Product loss recorded successfully', 'success');
    } catch (err) {
      showToast('Failed to record product loss', 'error');
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
    <div className="flex flex-col h-[calc(90vh-3rem)] gap-6 p-2">
      
      {/* --- PREMIUM HEADER --- */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Inventory Management</h1>
          <p className="text-sm text-slate-500 mt-1">Control stock levels, pricing, and monitor product loss across operations.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full md:w-auto">
          <button className="flex-1 md:flex-none justify-center flex items-center gap-2 px-3 sm:px-4 py-2.5 bg-white border border-slate-200 text-slate-600 text-sm font-bold rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
            <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export CSV</span><span className="sm:hidden">Export</span>
          </button>
        <button 
          onClick={handleManualSync} 
          disabled={isSyncing}
          className={`flex justify-center items-center p-2.5 bg-white border border-slate-200 rounded-xl shadow-sm transition-all ${
            isSyncing 
              ? 'text-cyan-600 border-cyan-200 cursor-not-allowed opacity-80' 
              : 'text-slate-400 hover:text-cyan-600 hover:border-cyan-200'
          }`}
          title="Sync Data"
          >
          <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
        </button>
          {user?.role === 'OWNER' && (
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex-1 md:flex-none justify-center flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
            >
              <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add New Stock</span><span className="sm:hidden">Add Stock</span>
            </button>
          )}
        </div>
      </div>

      {/* --- KPI SUMMARY CARDS --- */}
      {user?.role === 'OWNER' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-colors">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Items</p>
              <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalItems}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
              <Layers className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-rose-200 transition-colors">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Low Stock Alerts</p>
              <p className="text-3xl font-black text-rose-600 mt-1">{stats.lowStock}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition-colors">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Est. Stock Value</p>
              <p className="text-3xl font-black text-emerald-600 mt-1">₱{stats.totalValue.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-110 transition-transform">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </div>
      )}

      {/* --- MAIN CONTENT AREA (FULL WIDTH TABLE) --- */}
      <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col h-full">
        
        {/* TABS */}
        <div className="flex bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <button 
            onClick={() => setActiveTab('INVENTORY')}
            className={`flex items-center gap-2 px-4 sm:px-8 py-3 sm:py-4 text-sm font-bold transition-colors relative whitespace-nowrap ${activeTab === 'INVENTORY' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Package className="w-4 h-4" /> Active Stock
            {activeTab === 'INVENTORY' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-t-full" />}
          </button>
          
          {/* ONLY OWNER CAN SEE THE LOSS TAB */}
          {user?.role === 'OWNER' && (
            <button 
              onClick={() => setActiveTab('LOSSES')}
              className={`flex items-center gap-2 px-4 sm:px-8 py-3 sm:py-4 text-sm font-bold transition-colors relative whitespace-nowrap ${activeTab === 'LOSSES' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <ClipboardList className="w-4 h-4" /> Loss Monitoring
              {activeTab === 'LOSSES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-orange-600 rounded-t-full" />}
            </button>
          )}
        </div>

        {/* INVENTORY TOOLBAR */}
        {activeTab === 'INVENTORY' && (
          <div className="p-4 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white border-b border-slate-100 shrink-0">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search products by name or ID..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
              />
            </div>

            <div className="flex w-full sm:w-auto overflow-x-auto bg-slate-100 p-1 rounded-xl">
              {['ALL', 'FROZEN_ITEM', 'CHICKEN_PART'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat as any)}
                  className={`flex-1 sm:flex-none whitespace-nowrap px-3 sm:px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    filterCategory === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {cat === 'ALL' ? 'All Items' : cat === 'FROZEN_ITEM' ? 'Frozen' : 'Chicken'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TABLE WRAPPER */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'INVENTORY' && (
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
              <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Product Details</th>
                  <th className="px-6 py-4 text-center">Stock Level</th>
                  {user?.role === 'OWNER' && (
                    <>
                      <th className="px-6 py-4 text-right">Purchase (Cost)</th>
                      <th className="px-6 py-4 text-right">Selling Price</th>
                      <th className="px-6 py-4 text-center">Manage</th>
                    </>
                  )}
                  {user?.role === 'STAFF' && (
                    <>
                      <th className="px-6 py-4 text-right">Price</th>
                      <th className="px-6 py-4 text-center">Manage</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInventory.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-sm ${
                          item.product?.category === 'FROZEN_ITEM' ? 'bg-blue-500' : 'bg-amber-500'
                          }`}>
                            {item.product?.name?.charAt(0) || <Package className="w-5 h-5" />}
                          </div>
                          <div>
                              <p className="font-bold text-slate-900">{item.product?.name}</p>
                              <p className="text-xs text-slate-400 font-mono mt-0.5">SKU-{item.productId}</p>
                          </div>
                        </div>
                    </td>
                    
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                          item.quantity > 20 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                        }`}>
                          {item.quantity <= 20 && <AlertTriangle className="w-3 h-3" />}
                          {Number(item.quantity)} {item.product?.category === 'CHICKEN_PART' ? 'kg' : 'pcs'}
                        </span>
                        {item.product?.name === 'Dressed Chicken' && item.heads !== undefined && (
                          <span className="text-[10px] font-bold text-slate-400 mt-1 uppercase">{item.heads} Heads</span>
                        )}
                      </div>
                    </td>

                    {/* OWNER TABLE VIEW */}
                    {user?.role === 'OWNER' && (
                      <>
                        <td className="px-6 py-4 text-right">
                          <span className="font-medium text-slate-500">₱{Number(item.purchase_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="font-bold text-slate-900">₱{Number(item.selling_price || item.product?.selling_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setLossItem(item)} className="p-2 text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 hover:border-orange-300 rounded-lg transition-all shadow-sm" title="Report Loss">
                              <TrendingDown className="w-4 h-4" />
                            </button>
                            <button onClick={() => onEditClick(item)} className="p-2 text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 hover:border-blue-300 rounded-lg transition-all shadow-sm" title="Edit Item">
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button onClick={() => setDeletingId(item.id)} className="p-2 text-rose-600 bg-white border border-rose-200 hover:bg-rose-50 hover:border-rose-300 rounded-lg transition-all shadow-sm" title="Delete Item">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                    
                    {/* STAFF TABLE VIEW */}
                    {user?.role === 'STAFF' && (
                      <>
                        <td className="px-6 py-4 text-right font-bold text-slate-900">
                          ₱{Number(item.selling_price || item.product?.selling_price || 0).toFixed(2)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={() => setLossItem(item)} className="p-2 text-orange-600 bg-white border border-orange-200 hover:bg-orange-50 hover:border-orange-300 rounded-lg transition-all shadow-sm" title="Report Loss">
                              <TrendingDown className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                
                {filteredInventory.length === 0 && (
                  <tr>
                    <td colSpan={user?.role === 'OWNER' ? 5 : 3} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                          <Search className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="font-bold text-slate-600 text-lg">No products found</p>
                        <p className="text-sm mt-1">Try adjusting your filters or search term.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}

          {/* LOSS MONITORING TABLE */}
          {activeTab === 'LOSSES' && (
            <table className="w-full text-left text-sm whitespace-nowrap min-w-[700px]">
              <thead className="bg-white sticky top-0 z-10 shadow-[0_1px_0_0_#e2e8f0]">
                <tr className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-6 py-4">Date Recorded</th>
                  <th className="px-6 py-4">Source / Branch</th>
                  <th className="px-6 py-4">Product Name</th>
                  <th className="px-6 py-4 text-center">Total Lost</th>
                  <th className="px-6 py-4">Reason / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lossRecords.length > 0 ? (
                  lossRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-orange-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-500">{new Date(record.date).toLocaleDateString()}</td>
                      
                      <td className="px-6 py-4">
                        {record.branchName ? (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            {record.branchName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Master Inventory
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 font-bold text-slate-900">{record.productName}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-700">
                          {record.kilos > 0 && `${record.kilos} kg `}
                          {record.heads > 0 && `(${record.heads} heads)`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 italic max-w-xs truncate">{record.reason}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-400">
                        <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4">
                          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                        </div>
                        <p className="font-bold text-slate-600 text-lg">Inventory is Healthy</p>
                        <p className="text-sm mt-1">No product losses have been recorded across operations.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ========================================= */}
      {/* MODALS                      */}
      {/* ========================================= */}

      {/* --- ADD NEW STOCK MODAL --- */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Register New Stock">
        <form onSubmit={handleSubmit(onAddStock)} className="space-y-5 mt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date Received</label>
              <input {...register('date', { required: true })} type="date" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white transition-all" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Supplier</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input {...register('supplier')} type="text" className="pl-9 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white transition-all" placeholder="Optional" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Identity</label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <select 
                {...register('productName', { required: true })} 
                className="pl-9 w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white transition-all cursor-pointer font-medium"
              >
                <option value="">-- Select Product Category --</option>
                <option value="Dressed Chicken" className="font-bold text-slate-900">Dressed Chicken</option>
                <optgroup label="Chicken Particulars">
                  {PARTICULARS.map(part => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </optgroup>
                <optgroup label="Other Frozen Goods">
                  <option value="Generic Frozen Item">Other Frozen Item</option>
                </optgroup>
              </select>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quantity Details</h4>
            
            {isAddDressedChicken && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Head Count</label>
                  <input {...register('heads', { required: true, min: 0 })} type="number" step="1" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm" placeholder="0" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Total Weight (KG)</label>
                  <input {...register('kilos', { required: true, min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm" placeholder="0.00" />
                </div>
              </div>
            )}

            {isAddParticular && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Total Weight (KG)</label>
                <input {...register('kilos', { required: true, min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm" placeholder="0.00" />
              </div>
            )}

            {!isAddDressedChicken && !isAddParticular && watchAddProductName !== '' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Units or Weight</label>
                <input {...register('quantity', { required: true, min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500 shadow-sm" placeholder="0.00" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purchase Cost (₱)</label>
              <input {...register('purchase_price', { required: true, min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white transition-all font-medium text-slate-700" placeholder="0.00" />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Selling Price (₱)</label>
              <input {...register('selling_price', { required: true, min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-sm outline-none focus:border-emerald-500 focus:bg-white transition-all font-bold text-emerald-700" placeholder="0.00" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
              <Plus className="w-4 h-4" /> Save to Inventory
            </button>
          </div>
        </form>
      </Modal>

      {/* --- EDIT MODAL --- */}
      <Modal isOpen={!!editingItem} onClose={() => setEditingItem(null)} title="Update Stock Details">
         <form onSubmit={editForm.handleSubmit(onSaveEdit)} className="space-y-5 mt-2">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Product Name</label>
            <select {...editForm.register('productName', { required: true })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-medium cursor-pointer">
              <option value="Dressed Chicken" className="font-bold">Dressed Chicken</option>
              <optgroup label="Particulars">
                {PARTICULARS.map(part => (
                  <option key={part} value={part}>{part}</option>
                ))}
              </optgroup>
              <optgroup label="Other Items">
                <option value="Generic Frozen Item">Other Frozen Item</option>
              </optgroup>
            </select>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4">
            {isEditDressedChicken && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Heads</label>
                  <input {...editForm.register('heads', { min: 0 })} type="number" step="1" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kilos (KG)</label>
                  <input {...editForm.register('kilos', { min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
                </div>
              </div>
            )}

            {isEditParticular && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Kilos (KG)</label>
                <input {...editForm.register('kilos', { min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
              </div>
            )}

            {!isEditDressedChicken && !isEditParticular && (
               <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Quantity (Units)</label>
                  <input {...editForm.register('quantity', { min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-500" />
               </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Purchase (₱)</label>
              <input {...editForm.register('purchase_price', { min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 font-medium" />
            </div>
            <div>
              <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Selling (₱)</label>
              <input {...editForm.register('selling_price', { min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm outline-none focus:border-blue-500 font-bold text-blue-700" />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
             <button type="button" onClick={() => setEditingItem(null)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
             <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center">Update Changes</button>
          </div>
        </form>
      </Modal>

      {/* --- REPORT LOSS MODAL --- */}
      <Modal isOpen={!!lossItem} onClose={() => { setLossItem(null); lossForm.reset(); }} title="Report Product Loss">
        <form onSubmit={lossForm.handleSubmit(onSaveLoss)} className="space-y-5 mt-2">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold text-orange-900">{lossItem?.product?.name}</p>
              <p className="text-xs text-orange-700 mt-0.5">Deduct spoiled, damaged, or lost inventory.</p>
            </div>
          </div>

          {isLossDressedChicken && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Heads Lost</label>
                <input {...lossForm.register('heads', { required: true, min: 0 })} type="number" step="1" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 shadow-sm" placeholder="0" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kilos Lost</label>
                <input {...lossForm.register('kilos', { required: true, min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 shadow-sm" placeholder="0.00" />
              </div>
            </div>
          )}

          {(!isLossDressedChicken) && (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Amount Lost (KG/Units)</label>
              <input {...lossForm.register('kilos', { required: true, min: 0 })} type="number" step="0.01" className="w-full p-2.5 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 shadow-sm" placeholder="0.00" />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason for Loss</label>
            <textarea {...lossForm.register('reason', { required: true })} rows={3} className="w-full p-3 bg-white border border-slate-200 rounded-xl text-sm outline-none focus:border-orange-500 shadow-sm" placeholder="e.g. Spoilage, transit damage..." />
          </div>

          <div className="pt-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row justify-end gap-3">
            <button type="button" onClick={() => { setLossItem(null); lossForm.reset(); }} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl shadow-md transition-all active:scale-95 flex justify-center items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Confirm Loss
            </button>
          </div>
        </form>
      </Modal>

      {/* --- DELETE CONFIRMATION --- */}
      <ConfirmationModal
        isOpen={!!deletingId}
        onClose={() => setDeletingId(null)}
        onConfirm={onDeleteConfirm}
        title="Delete Inventory Record?"
        message="Are you sure you want to permanently remove this item from the database? This action cannot be undone."
        confirmText="Yes, Delete Record"
        variant="danger"
      />
    </div>
  );
}