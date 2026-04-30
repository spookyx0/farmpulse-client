/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Package, Search, Plus, Calendar, User, 
  Egg, Scale, DollarSign, ArrowUpRight, 
  Activity, Box, ListFilter, PackageOpen,
  History, Pencil, Trash2, X
} from 'lucide-react';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal';

// --- OPTIONS FOR PARTICULARS ---
const PARTICULARS_OPTIONS = [
  "Whole Chicken", "Intestine", "Liver", "Gizzard", "Feet", "Heads", "Butse", "Dugo"
];

// --- INTERFACES ---
interface LCInventory {
  id: number;
  date: string;
  supplier: string;
  particulars: string;
  crates: number;
  heads: number;
  kilos: number;
  amount: number;
}

interface LCDistribution {
  id: number;
  crates: number;
  heads: number;
  kilos: number;
  particulars: string;
}

interface LCInventoryFormData {
  date: string;
  supplier: string;
  particulars: string;
  crates: string;
  heads: string;
  kilos: string;
  amount: string;
}

export default function LiveChickenInventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<LCInventory[]>([]);
  const [dist, setDist] = useState<LCDistribution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Edit & Delete States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);

  const { register, handleSubmit, reset, setValue, watch } = useForm<LCInventoryFormData>({
    defaultValues: { particulars: "Whole Chicken" }
  });

  const selectedParticular = watch("particulars");
  const isParticular = selectedParticular !== "Whole Chicken";

  const fetchItems = async () => {
    try {
      const [invRes, distRes] = await Promise.all([
        api.get<LCInventory[]>('/live-chicken/inventory'),
        api.get<LCDistribution[]>('/live-chicken/distribution')
      ]);
      setItems(invRes.data);
      setDist(distRes.data);
    } catch (err) {
      console.error("Fetch Error:", err);
      showToast("Failed to sync data", "error");
    }
  };

  useEffect(() => { fetchItems(); }, []);

  // --- DELETE LOGIC ---
  const openDeleteModal = (id: number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    try {
      await api.delete(`/live-chicken/inventory/${itemToDelete}`);
      showToast('Inventory record permanently removed.', 'success');
      fetchItems();
    } catch (error) {
      showToast('Failed to remove record.', 'error');
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  // --- FORM SUBMISSION ---
  const onSubmit = async (data: LCInventoryFormData) => {
    // Manual validation ensures RHF doesn't block submission for particulars
    if (!isParticular && (!data.amount || Number(data.amount) <= 0)) {
      showToast('Please enter the Total Cost for Whole Chicken.', 'error');
      return;
    }

    setIsLoading(true);

    const payload = {
      date: data.date,
      supplier: data.supplier || "Direct",
      particulars: data.particulars,
      crates: isParticular ? 0 : Number(data.crates || 0),
      heads: isParticular ? 0 : Number(data.heads || 0),
      kilos: Number(data.kilos || 0),
      amount: isParticular ? 0 : Number(data.amount || 0),
    };

    try {
      if (editingId) {
        await api.put(`/live-chicken/inventory/${editingId}`, payload);
        showToast('Stock record updated!', 'success');
      } else {
        await api.post('/live-chicken/inventory', payload);
        showToast('New stock posted to ledger!', 'success');
      }
      handleCancelEdit();
      fetchItems();
    } catch (error) {
      showToast(editingId ? 'Update failed.' : 'Post failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (item: LCInventory) => {
    setEditingId(item.id);
    setValue('date', item.date);
    setValue('supplier', item.supplier);
    setValue('particulars', item.particulars || "Whole Chicken");
    setValue('crates', item.crates.toString());
    setValue('heads', item.heads.toString());
    setValue('kilos', item.kilos.toString());
    setValue('amount', item.amount.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset({ particulars: "Whole Chicken" });
  };

  // --- OVERALL KPI CALCULATIONS ---
  const stats = useMemo(() => {
    const invHeads = items.reduce((sum, item) => sum + Number(item.heads || 0), 0);
    const invKilos = items.reduce((sum, item) => sum + Number(item.kilos || 0), 0);
    const invCrates = items.reduce((sum, item) => sum + Number(item.crates || 0), 0);

    const distHeads = dist.reduce((sum, d) => sum + Number(d.heads || 0), 0);
    const distKilos = dist.reduce((sum, d) => sum + Number(d.kilos || 0), 0);
    const distCrates = dist.reduce((sum, d) => sum + Number(d.crates || 0), 0);

    const availableHeads = invHeads - distHeads;
    const availableKilos = invKilos - distKilos;
    const availableCrates = invCrates - distCrates;

    const avg = invHeads > 0 ? (invKilos / invHeads).toFixed(2) : "0.00";
    
    return { availableHeads, availableKilos, availableCrates, distCrates, avg };
  }, [items, dist]);

  // --- REAL-TIME AGGREGATED STOCK LIST FOR TABLE ---
  const stockList = useMemo(() => {
    return PARTICULARS_OPTIONS.map(particular => {
      const invItems = items.filter(i => (i.particulars || "Whole Chicken") === particular);
      const distItems = dist.filter(d => (d.particulars || "Whole Chicken") === particular);

      const invHeads = invItems.reduce((sum, i) => sum + Number(i.heads || 0), 0);
      const invKilos = invItems.reduce((sum, i) => sum + Number(i.kilos || 0), 0);
      const invCrates = invItems.reduce((sum, i) => sum + Number(i.crates || 0), 0);

      const distHeads = distItems.reduce((sum, d) => sum + Number(d.heads || 0), 0);
      const distKilos = distItems.reduce((sum, d) => sum + Number(d.kilos || 0), 0);
      const distCrates = distItems.reduce((sum, d) => sum + Number(d.crates || 0), 0);

      const availableHeads = invHeads - distHeads;
      const availableKilos = invKilos - distKilos;
      const availableCrates = invCrates - distCrates;

      const avg = availableHeads > 0 ? (availableKilos / availableHeads).toFixed(2) : "0.00";

      let status = "In Stock";
      if (availableKilos <= 0) status = "Out of Stock";
      else if (particular === "Whole Chicken" && availableHeads <= 50) status = "Low Stock";

      return {
        particular,
        availableCrates,
        availableHeads,
        availableKilos,
        avg,
        status
      };
    });
  }, [items, dist]);

  const filteredStocks = stockList.filter(stock => 
    stock.particular.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting items by ID descending for the history log
  const recentItems = useMemo(() => {
    return [...items].sort((a, b) => b.id - a.id);
  }, [items]);

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-y-auto xl:overflow-hidden selection:bg-amber-100 selection:text-amber-900">
      
      {/* --- HEADER --- */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl shadow-sm border border-amber-600/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none mb-1.5">Live Chicken Inventory</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Inventory & Particulars Terminal</p>
          </div>
        </div>

        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
          <div className="bg-amber-50 min-w-[130px] sm:min-w-[150px] p-3 sm:p-4 rounded-2xl border border-amber-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <PackageOpen className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Available Crates</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-amber-700 tabular-nums leading-none">
              {stats.availableCrates.toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-50 min-w-[130px] sm:min-w-[150px] p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Box className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Total Sold Crates</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
              {stats.distCrates.toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-50 min-w-[130px] sm:min-w-[150px] p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Egg className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Available Heads</p>
            </div>
            <p className={`text-xl sm:text-2xl font-black tabular-nums leading-none ${stats.availableHeads <= 50 ? 'text-red-600' : 'text-slate-900'}`}>
              {stats.availableHeads.toLocaleString()}
            </p>
          </div>

          <div className="bg-slate-50 min-w-[130px] sm:min-w-[150px] p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Scale className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Available Weight</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
              {stats.availableKilos.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-sm">kg</span>
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row overflow-visible xl:overflow-hidden">
        {/* FORM SIDEBAR */}
        <aside className="xl:w-[400px] shrink-0 border-b xl:border-b-0 xl:border-r border-slate-200 bg-white overflow-visible xl:overflow-y-auto custom-scrollbar z-10 flex flex-col">
          <div className="p-4 sm:p-6 pb-2">
            
            {/* REGISTER FORM */}
            <div className={`rounded-2xl border transition-all duration-300 ${editingId ? 'border-amber-400 ring-4 ring-amber-50 bg-amber-50/10' : 'border-slate-200 bg-white'} shadow-sm`}>
              <div className={`px-6 py-5 border-b flex items-center justify-between ${editingId ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 text-slate-800">
                  {editingId ? <><Pencil className="w-4 h-4 text-amber-600"/> Update Record</> : <><Plus className="w-4 h-4 text-slate-500"/> Register Stock</>}
                </h2>
                {editingId && (
                  <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                )}
              </div>

              <div className="p-4 sm:p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {/* Particulars Select */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Particulars</label>
                    <div className="relative group">
                      <ListFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                      <select 
                        {...register('particulars')}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {PARTICULARS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Date of Entry</label>
                    <div className="relative group">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                      <input type="date" {...register('date', {required: true})} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Supplier Origin</label>
                    <div className="relative group">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                      <input type="text" {...register('supplier')} placeholder="Source farm/supplier" className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Crates Count</label>
                      <div className="relative group">
                        <Box className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isParticular ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-amber-500'}`} />
                        <input 
                          type="number" 
                          disabled={isParticular}
                          {...register('crates')} 
                          className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm font-medium border transition-all ${isParticular ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none'}`} 
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Head Count</label>
                      <div className="relative group">
                        <Egg className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isParticular ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-amber-500'}`} />
                        <input 
                          type="number" 
                          disabled={isParticular}
                          {...register('heads')} 
                          className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm font-medium border transition-all ${isParticular ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none'}`} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Total Weight (kg)</label>
                      <div className="relative group">
                        <Scale className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input type="number" step="0.01" {...register('kilos', {required: true})} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Total Cost (₱)</label>
                      <div className="relative group">
                        <DollarSign className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${isParticular ? 'text-slate-300' : 'text-slate-400 group-focus-within:text-amber-500'}`} />
                        <input 
                          type="number" 
                          step="0.01" 
                          disabled={isParticular}
                          {...register('amount')} 
                          className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm font-medium border transition-all ${isParticular ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none'}`} 
                        />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex justify-center items-center gap-2 mt-4 shadow-lg ${editingId ? 'bg-amber-500 text-white shadow-amber-100' : 'bg-slate-900 text-white shadow-slate-200'}`}>
                    {isLoading ? 'Processing...' : <>{editingId ? 'Save Changes' : 'Post to Ledger'} <ArrowUpRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </div>
            </div>

            {/* RECENT HISTORY LOGS */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b bg-slate-50 border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 text-slate-800">
                  <History className="w-4 h-4 text-slate-500"/> Recent Entries
                </h2>
              </div>
              <div className="p-3 overflow-y-auto custom-scrollbar max-h-[300px] space-y-2">
                {recentItems.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 italic">No history found.</p>
                ) : (
                  recentItems.map(item => (
                    <div key={item.id} className="group relative p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-amber-200 hover:bg-amber-50/50 transition-all overflow-hidden">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-700">{item.particulars || "Whole Chicken"}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{item.date}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{item.supplier}</span>
                        <span className="text-xs font-black text-amber-600">
                          {item.particulars === "Whole Chicken" ? `+${item.crates}c / +${item.heads}h` : `+${item.kilos}kg`}
                        </span>
                      </div>
                      
                      {/* Action Overlays for Editing/Deleting History Items */}
                      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-amber-50 via-amber-50 to-transparent px-3">
                        <button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-amber-600 bg-white rounded-lg shadow-sm border border-slate-100 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => openDeleteModal(item.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white rounded-lg shadow-sm border border-slate-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </aside>

        {/* --- REAL-TIME STOCKS TABLE --- */}
        <section className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden min-h-[500px] xl:min-h-0">
          <div className="shrink-0 px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" placeholder="Search particulars or status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-8 overflow-hidden flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="overflow-y-auto overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Particulars</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Available Crates</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Available Heads</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Available Weight</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Avg Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStocks.map((stock, idx) => (
                      <tr key={idx} className="hover:bg-amber-50/30 transition-colors group h-[60px]">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${stock.particular === 'Whole Chicken' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {stock.particular}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest ${
                            stock.status === 'Out of Stock' ? 'bg-rose-100 text-rose-600' :
                            stock.status === 'Low Stock' ? 'bg-amber-100 text-amber-600' :
                            'bg-emerald-100 text-emerald-600'
                          }`}>
                            {stock.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-sm font-bold text-amber-600">
                            {stock.particular === "Whole Chicken" ? stock.availableCrates.toLocaleString() : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2.5 py-1 rounded-md text-sm font-black bg-slate-100 text-slate-700">
                            {stock.particular === "Whole Chicken" ? stock.availableHeads.toLocaleString() : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-600">
                          {stock.availableKilos.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-slate-400">kg</span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-500">
                          {stock.particular === "Whole Chicken" ? `${stock.avg} kg/b` : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Chicken Stock Entry?"
        message="This will permanently remove these records from your total inventory count. This cannot be undone."
        isLoading={isLoading}
      />
    </div>
  );
}