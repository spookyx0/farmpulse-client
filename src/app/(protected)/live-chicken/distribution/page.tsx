/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Truck, MapPin, Search, Plus, Egg, DollarSign, 
  Calendar, Scale, ArrowUpRight, Box, Pencil, 
  Trash2, X, AlertTriangle, ListFilter, PackageOpen, History
} from 'lucide-react';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal';

// --- OPTIONS FOR PARTICULARS ---
const PARTICULARS_OPTIONS = [
  "Whole Chicken", "Intestine", "Liver", "Gizzard", "Feet", "Heads", "Butse", "Dugo"
];

interface LCDistribution {
  id: number;
  date: string;
  location: string;
  particulars: string; 
  crates: number;
  heads: number;
  kilos: number;
  amount: number;
}

interface LCInventory {
  id: number;
  particulars: string; 
  heads: number;
  kilos: number;
  crates: number;
}

interface LCDistributionFormData {
  date: string;
  location: string;
  particulars: string; 
  crates: string;
  heads: string;
  kilos: string;
  amount: string;
}

export default function LiveChickenDistributionPage() {
  const { showToast } = useToast();
  const [dist, setDist] = useState<LCDistribution[]>([]);
  const [inventory, setInventory] = useState<LCInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Modals state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [lowStockMessage, setLowStockMessage] = useState("");
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<LCDistributionFormData>({
    defaultValues: { particulars: "Whole Chicken" }
  });

  const selectedParticular = watch("particulars");
  const isParticular = selectedParticular !== "Whole Chicken";

  const fetchData = async () => {
    try {
      const [distRes, invRes] = await Promise.all([
        api.get<LCDistribution[]>('/live-chicken/distribution'),
        api.get<LCInventory[]>('/live-chicken/inventory')
      ]);
      setDist(distRes.data);
      setInventory(invRes.data);
    } catch (err) {
      console.error("Error syncing data:", err);
      showToast('Failed to sync inventory data.', 'error');
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- SYNCED KPI CALCULATIONS ---
  const totals = useMemo(() => {
    const totalInvHeads = inventory.reduce((sum, i) => sum + Number(i.heads || 0), 0);
    const totalInvKilos = inventory.reduce((sum, i) => sum + Number(i.kilos || 0), 0);
    const totalInvCrates = inventory.reduce((sum, i) => sum + Number(i.crates || 0), 0);

    const totalDistHeads = dist.reduce((sum, d) => sum + Number(d.heads || 0), 0);
    const totalDistKilos = dist.reduce((sum, d) => sum + Number(d.kilos || 0), 0);
    const totalDistCrates = dist.reduce((sum, d) => sum + Number(d.crates || 0), 0);
    const totalSales = dist.reduce((sum, d) => sum + Number(d.amount || 0), 0);

    return {
      remainingHeads: totalInvHeads - totalDistHeads,
      remainingKilos: totalInvKilos - totalDistKilos,
      remainingCrates: totalInvCrates - totalDistCrates,
      totalDistCrates, 
      totalSales
    };
  }, [inventory, dist]);

  // --- REAL-TIME AGGREGATED STOCK LIST FOR TABLE ---
  const stockList = useMemo(() => {
    return PARTICULARS_OPTIONS.map(particular => {
      const invItems = inventory.filter(i => (i.particulars || "Whole Chicken") === particular);
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
  }, [inventory, dist]);

  const filteredStocks = stockList.filter(stock => 
    stock.particular.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting items by ID descending for the history log
  const recentSales = useMemo(() => {
    return [...dist].sort((a, b) => b.id - a.id);
  }, [dist]);

  const openDeleteModal = (id: number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    try {
      await api.delete(`/live-chicken/distribution/${itemToDelete}`);
      showToast('Distribution record removed.', 'success');
      fetchData();
    } catch (error) {
      showToast('Delete failed.', 'error');
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const onSubmit = async (data: LCDistributionFormData) => {
    const inputHeads = isParticular ? 0 : Number(data.heads);
    const inputCrates = isParticular ? 0 : Number(data.crates);
    const inputKilos = Number(data.kilos);

    // Get current record if editing to offset available balances
    const currentRecord = dist.find(d => d.id === editingId);
    
    // Check available stocks for the SPECIFIC particular
    const targetStock = stockList.find(s => s.particular === data.particulars);
    const availableHeads = (targetStock?.availableHeads || 0) + (currentRecord?.heads || 0);
    const availableKilos = (targetStock?.availableKilos || 0) + (currentRecord?.kilos || 0);
    const availableCrates = (targetStock?.availableCrates || 0) + (currentRecord?.crates || 0);

    // Validate Stocks before proceeding
    let errorMessage = "";

    if (!isParticular) {
      if (inputHeads > availableHeads) {
        errorMessage = `You are trying to sell ${inputHeads} heads, but you only have ${availableHeads} available.`;
      } else if (inputCrates > availableCrates) {
        errorMessage = `You are trying to sell ${inputCrates} crates, but you only have ${availableCrates} available.`;
      }
    }
    
    if (!errorMessage && inputKilos > availableKilos) {
      errorMessage = `You are trying to sell ${inputKilos} kg, but you only have ${availableKilos.toFixed(2)} kg available.`;
    }

    if (errorMessage) {
      setLowStockMessage(errorMessage);
      setIsLowStockModalOpen(true);
      return; 
    }

    setIsLoading(true);
    const payload = {
      ...data,
      particulars: data.particulars,
      crates: inputCrates,
      heads: inputHeads,
      kilos: inputKilos,
      amount: Number(data.amount),
    };

    try {
      if (editingId) {
        await api.put(`/live-chicken/distribution/${editingId}`, payload);
        showToast('Distribution updated!', 'success');
      } else {
        await api.post('/live-chicken/distribution', payload);
        showToast('Distribution recorded!', 'success');
      }
      handleCancelEdit();
      fetchData();
    } catch (error) {
      showToast('Operation failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const startEdit = (item: LCDistribution) => {
    setEditingId(item.id);
    setValue('date', item.date);
    setValue('location', item.location);
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

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-y-auto xl:overflow-hidden selection:bg-blue-100">
      
      {/* --- HEADER --- */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5 flex flex-col xl:flex-row xl:items-center justify-between gap-4 xl:gap-6 z-20 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-sm">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none mb-1.5">Distribution Ledger</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Outbound Stock & Particulars
                {totals.remainingHeads <= 50 && (
                  <span className="flex items-center gap-1 text-red-600 animate-pulse font-bold">
                    <AlertTriangle className="w-3 h-3" /> LOW STOCK
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 xl:pb-0 hide-scrollbar">
          {/* Total Sales */}
          <div className="bg-slate-900 min-w-[140px] sm:min-w-[150px] p-3 sm:p-4 rounded-2xl flex flex-col justify-between shadow-lg shadow-slate-200">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Total Sales</p>
            </div>
            <p className="text-lg sm:text-xl font-black text-white tabular-nums leading-none">₱{totals.totalSales.toLocaleString()}</p>
          </div>

          {/* Total Sold Crates */}
          <div className="bg-blue-50 min-w-[130px] sm:min-w-[140px] p-3 sm:p-4 rounded-2xl border border-blue-100 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-blue-600 mb-2">
              <Box className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Total Sold Crates</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-blue-900 tabular-nums leading-none">
                {totals.totalDistCrates.toLocaleString()}
            </p>
          </div>

          {/* Available Crates */}
          <div className="bg-white min-w-[130px] sm:min-w-[140px] p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <PackageOpen className="w-4 h-4 text-blue-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Available Crates</p>
            </div>
            <p className={`text-xl sm:text-2xl font-black tabular-nums leading-none ${totals.remainingCrates <= 10 ? 'text-red-600' : 'text-slate-900'}`}>
                {totals.remainingCrates.toLocaleString()}
            </p>
          </div>
          
          {/* Available Heads */}
          <div className="bg-white min-w-[130px] sm:min-w-[140px] p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Egg className="w-4 h-4 text-blue-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Available Heads</p>
            </div>
            <p className={`text-xl sm:text-2xl font-black tabular-nums leading-none ${totals.remainingHeads <= 50 ? 'text-red-600' : 'text-slate-900'}`}>
                {totals.remainingHeads.toLocaleString()}
            </p>
          </div>

          {/* Available Weight */}
          <div className="bg-white min-w-[130px] sm:min-w-[140px] p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Scale className="w-4 h-4 text-blue-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Available Weight</p>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 tabular-nums leading-none">
                {totals.remainingKilos.toFixed(2)} <span className="text-xs text-slate-400">kg</span>
            </p>
          </div>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-visible xl:overflow-hidden">
        
        {/* FORM SIDEBAR */}
        <aside className="xl:w-[400px] shrink-0 border-b xl:border-b-0 xl:border-r border-slate-200 bg-white overflow-visible xl:overflow-y-auto z-10 custom-scrollbar flex flex-col">
          <div className="p-4 sm:p-6 pb-2">
            
            {/* REGISTER FORM */}
            <div className={`rounded-2xl border transition-all duration-300 ${editingId ? 'border-blue-400 ring-4 ring-blue-50 bg-blue-50/10' : 'border-slate-200 bg-white shadow-sm'}`}>
              <div className={`px-6 py-5 border-b flex items-center justify-between ${editingId ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                  <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 text-slate-800">
                    {editingId ? <><Pencil className="w-4 h-4 text-blue-600"/> Edit Delivery</> : <><Plus className="w-4 h-4 text-blue-600"/> Dispatch Stock</>}
                  </h2>
                  {editingId && (
                    <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                  )}
              </div>

              <div className="p-4 sm:p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Item Particulars</label>
                    <div className="relative group">
                      <ListFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <select 
                        {...register('particulars')}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {PARTICULARS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Dispatch Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input type="date" {...register('date', {required: true})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Delivery Location</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <input type="text" {...register('location', {required: true})} placeholder="Destination store" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Crates</label>
                      <input 
                        type="number" disabled={isParticular}
                        {...register('crates')} 
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${isParticular ? 'bg-slate-100 text-slate-400 border-slate-100' : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Heads</label>
                      <input 
                        type="number" disabled={isParticular}
                        {...register('heads')} 
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${isParticular ? 'bg-slate-100 text-slate-400 border-slate-100' : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500'}`} 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Weight (kg)</label>
                      <input type="number" step="0.01" {...register('kilos', {required: true})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Sales (₱)</label>
                      <input type="number" step="0.01" {...register('amount', {required: true})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="pt-4">
                      <button type="submit" disabled={isLoading} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-lg ${editingId ? 'bg-blue-600 text-white shadow-blue-100' : 'bg-slate-900 text-white shadow-slate-200'}`}>
                          {isLoading ? 'Processing...' : <>{editingId ? 'Save Changes' : 'Post Delivery'} <ArrowUpRight className="w-4 h-4" /></>}
                      </button>
                  </div>
                </form>
              </div>
            </div>

            {/* RECENT SALES LOGS */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
              <div className="px-5 py-4 border-b bg-slate-50 border-slate-100 flex items-center justify-between">
                <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 text-slate-800">
                  <History className="w-4 h-4 text-slate-500"/> Recent Sales
                </h2>
              </div>
              <div className="p-3 overflow-y-auto custom-scrollbar max-h-[300px] space-y-2">
                {recentSales.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-6 italic">No sales history found.</p>
                ) : (
                  recentSales.map(item => (
                    <div key={item.id} className="group relative p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all overflow-hidden">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-xs font-bold text-slate-700">{item.particulars || "Whole Chicken"}</span>
                        <span className="text-[10px] font-semibold text-slate-400">{item.date}</span>
                      </div>
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{item.location}</span>
                        <span className="text-xs font-black text-blue-600">
                          {item.particulars === "Whole Chicken" ? `-${item.crates}c / -${item.heads}h` : `-${item.kilos}kg`}
                        </span>
                      </div>
                      
                      {/* Action Overlays for Editing/Deleting History Items */}
                      <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-blue-50 via-blue-50 to-transparent px-3">
                        <button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 bg-white rounded-lg shadow-sm border border-slate-100 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
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
        <section className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden min-h-[500px] xl:min-h-0">
          <div className="shrink-0 px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-200 bg-white flex items-center justify-between gap-4 z-10">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" placeholder="Search particulars or status..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all"
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
                      <tr key={idx} className="hover:bg-blue-50/30 transition-colors group h-[60px]">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${stock.particular === 'Whole Chicken' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
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
                          <span className="text-sm font-bold text-blue-600">
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

      {/* DELETE CONFIRM MODAL */}
      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Dispatch Entry?"
        message="Deleting this distribution record will add the heads, weight, and crates back to your available inventory. Proceed?"
        isLoading={isLoading}
      />

      {/* LOW STOCK WARNING MODAL */}
      {isLowStockModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-red-100">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Stocks Cannot Be Sold!</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                You do not have enough supply in your inventory to fulfill this distribution. <br/>
                <span className="font-semibold text-slate-800 block mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                  {lowStockMessage}
                </span>
              </p>
              <button 
                onClick={() => setIsLowStockModalOpen(false)}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white font-bold rounded-xl transition-all"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}