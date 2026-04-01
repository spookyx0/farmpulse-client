/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Package, Search, Plus, Calendar, User, 
  Egg, Scale, DollarSign, Pencil, Trash2, X, 
  ArrowUpRight, Activity, Box, ListFilter
} from 'lucide-react';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal';

// --- OPTIONS FOR PARTICULARS ---
const PARTICULARS_OPTIONS = [
  "Whole Chicken", "Intestine", "Liver", "Gizzard", "Spleen", "Feet", "Fats"
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
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<LCInventoryFormData>({
    defaultValues: { particulars: "Whole Chicken" }
  });

  // Watch particulars to handle "Heads" and "Crates" logic
  const selectedParticular = watch("particulars");
  const isParticular = selectedParticular !== "Whole Chicken";

  const fetchItems = () => {
    api.get<LCInventory[]>('/live-chicken/inventory')
      .then((res) => setItems(res.data))
      .catch((err) => console.error("Fetch Error:", err));
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
    setIsLoading(true);

    // Logic: If it's a part, both heads and crates are forced to 0
    const payload = {
      date: data.date,
      supplier: data.supplier || "Direct",
      particulars: data.particulars,
      crates: isParticular ? 0 : Number(data.crates),
      heads: isParticular ? 0 : Number(data.heads),
      kilos: Number(data.kilos),
      amount: Number(data.amount),
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

  const filteredItems = items.filter(item =>
    item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.particulars?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.date.includes(searchTerm)
  );

  const stats = useMemo(() => {
    const heads = items.reduce((sum, item) => sum + Number(item.heads || 0), 0);
    const kilos = items.reduce((sum, item) => sum + Number(item.kilos || 0), 0);
    const crates = items.reduce((sum, item) => sum + Number(item.crates || 0), 0);
    const avg = heads > 0 ? (kilos / heads).toFixed(2) : "0.00";
    return { heads, kilos, crates, avg };
  }, [items]);

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden selection:bg-amber-100 selection:text-amber-900">
      
      {/* --- HEADER --- */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 rounded-xl shadow-sm border border-amber-600/20">
            <Package className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none mb-1.5">Live Chicken Inventory</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Inventory & Particulars Terminal</p>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          {[
            { label: 'Total Crates', val: stats.crates, icon: Box, color: 'text-slate-900' },
            { label: 'Total Heads', val: stats.heads, icon: Egg, color: 'text-slate-900' },
            { label: 'Total Weight', val: `${stats.kilos.toLocaleString()} kg`, icon: Scale, color: 'text-slate-900' },
            { label: 'Avg Weight', val: `${stats.avg} kg/b`, icon: Activity, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' }
          ].map((kpi, i) => (
            <div key={i} className={`${kpi.bg || 'bg-slate-50'} min-w-[130px] p-4 rounded-2xl border ${kpi.border || 'border-slate-200'} flex flex-col justify-between shadow-sm`}>
              <div className="flex items-center gap-2 text-slate-500 mb-2">
                <kpi.icon className="w-4 h-4" />
                <p className="text-[10px] font-bold uppercase tracking-widest">{kpi.label}</p>
              </div>
              <p className={`text-2xl font-black ${kpi.color} tabular-nums leading-none`}>{kpi.val}</p>
            </div>
          ))}
        </div>
      </header>

      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        {/* FORM SIDEBAR */}
        <aside className="xl:w-[400px] shrink-0 border-r border-slate-200 bg-white overflow-y-auto custom-scrollbar z-10">
          <div className="p-6">
            <div className={`rounded-2xl border transition-all duration-300 ${editingId ? 'border-amber-400 ring-4 ring-amber-50 bg-amber-50/10' : 'border-slate-200 bg-white'} shadow-sm`}>
              <div className={`px-6 py-5 border-b flex items-center justify-between ${editingId ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 text-slate-800">
                  {editingId ? <><Pencil className="w-4 h-4 text-amber-600"/> Update Record</> : <><Plus className="w-4 h-4 text-slate-500"/> Register Stock</>}
                </h2>
                {editingId && (
                  <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                )}
              </div>

              <div className="p-6">
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

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Crates Count</label>
                      <div className="relative group">
                        <Box className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
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
                        <Egg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input 
                          type="number" 
                          disabled={isParticular}
                          {...register('heads')} 
                          className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm font-medium border transition-all ${isParticular ? 'bg-slate-100 border-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none'}`} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
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
                        <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                        <input type="number" step="0.01" {...register('amount', {required: true})} className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  <button type="submit" disabled={isLoading} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-95 flex justify-center items-center gap-2 mt-4 shadow-lg ${editingId ? 'bg-amber-500 text-white shadow-amber-100' : 'bg-slate-900 text-white shadow-slate-200'}`}>
                    {isLoading ? 'Processing...' : <>{editingId ? 'Save Changes' : 'Post to Ledger'} <ArrowUpRight className="w-4 h-4" /></>}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </aside>

        {/* TABLE SECTION */}
        <section className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden">
          <div className="shrink-0 px-8 py-5 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
            <div className="relative w-full max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" placeholder="Search supplier, particulars or date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-slate-200 outline-none transition-all"
              />
            </div>
          </div>

          <div className="flex-1 p-8 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Particulars</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Supplier</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Crates</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Heads</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Weight</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Amount</th>
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-amber-50/30 transition-colors group h-[60px]">
                        <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.date}</td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${item.particulars === 'Whole Chicken' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                            {item.particulars || "Whole Chicken"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-600 truncate max-w-[150px]">{item.supplier}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-bold text-amber-600">
                            {item.particulars === "Whole Chicken" ? item.crates : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="px-2.5 py-1 rounded-md text-xs font-black bg-slate-100 text-slate-700">
                            {item.particulars === "Whole Chicken" ? item.heads : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-600">
                          {item.kilos} <span className="text-[10px] text-slate-400">kg</span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-black text-slate-900">
                          ₱{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button onClick={() => startEdit(item)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-amber-600 transition-all"><Pencil className="w-4 h-4" /></button>
                            <button onClick={() => openDeleteModal(item.id)} className="p-2 hover:bg-white hover:shadow-sm rounded-lg text-slate-400 hover:text-rose-600 transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
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