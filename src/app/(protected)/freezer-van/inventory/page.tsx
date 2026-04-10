/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Snowflake, Search, Plus, Calendar, User, Tag, 
  Scale, DollarSign, Truck, FileText, ArrowUpRight,
  TrendingUp, Layers, Archive, Filter, ShoppingCart,
  Pencil, Trash2, XCircle
} from 'lucide-react';
import DeleteConfirmModal from '@/app/components/modals/DeleteConfirmModal';

// --- INTERFACES ---
interface FVInventoryItem {
  id: number;
  date: string;
  supplier: string;
  particulars: string;
  kilos: number;
  crates: number;
  price: number;
  amount: number;
  travel_expense: number;
  other_expense: number;
  total_amount: number;
}

interface FVInventoryFormData {
  date: string;
  supplier: string;
  particulars: string;
  kilos: string;
  crates: string;
  price: string;
  travel_expense: string;
  other_expense: string;
}

const STOCK_OPTIONS = ["Intestine", "Liver", "Gizzard", "Spleen", "Feet", "Fats", "Whole Chicken", "Choice Cuts"];

export default function FreezerVanInventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<FVInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  
  // --- STATE FOR EDITING ---
  const [editingId, setEditingId] = useState<number | null>(null);

  const { register, handleSubmit, reset, watch } = useForm<FVInventoryFormData>();

  const fetchItems = () => {
    api.get<FVInventoryItem[]>('/freezer-van/inventory')
      .then((res) => setItems(res.data))
      .catch((err) => console.error("Fetch Error:", err));
  };

  const openDeleteModal = (id: number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    setIsLoading(true);
    try {
      await api.delete(`/freezer-van/inventory/${itemToDelete}`);
      showToast('Record removed successfully', 'success');
      fetchItems();
    } catch (error) {
      showToast('Delete failed', 'error');
    } finally {
      setIsLoading(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  // --- KPI CALCULATIONS ---
  const stats = useMemo(() => {
    const totalKilos = items.reduce((sum, item) => sum + Number(item.kilos || 0), 0);
    const totalCrates = items.reduce((sum, item) => sum + Number(item.crates || 0), 0);
    const totalNetValue = items.reduce((sum, item) => sum + Number(item.total_amount || 0), 0);
    
    return { totalKilos, totalCrates, totalNetValue };
  }, [items]);

  // --- EDIT HANDLER ---
  const handleEdit = (item: FVInventoryItem) => {
    setEditingId(item.id);
    reset({
      date: item.date,
      supplier: item.supplier || "Walk-in",
      particulars: item.particulars,
      kilos: String(item.kilos),
      crates: String(item.crates),
      price: String(item.price),
      travel_expense: String(item.travel_expense),
      other_expense: String(item.other_expense),
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // --- FORM SUBMISSION (CREATE & UPDATE) ---
  const onSubmit = async (data: any) => {
    setIsLoading(true);
    try {
      const cleanData = {
        date: data.date,
        supplier: data.supplier || "Walk-in",
        particulars: data.particulars,
        kilos: Number(data.kilos),
        crates: Number(data.crates || 0),
        price: Number(data.price),
        travel_expense: Number(data.travel_expense || 0),
        other_expense: Number(data.other_expense || 0),
      };

      if (editingId) {
        await api.patch(`/freezer-van/inventory/${editingId}`, cleanData);
        showToast('Inventory updated successfully', 'success');
        setEditingId(null);
      } else {
        await api.post('/freezer-van/inventory', cleanData);
        showToast('Inventory saved successfully', 'success');
      }
      
      reset();
      fetchItems();
    } catch (error) {
      console.error("Submission Error:", error);
      showToast('Error processing request', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.date.includes(searchTerm)
  );

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-y-auto xl:overflow-hidden">
      
      {/* --- HEADER --- */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sm:py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 lg:gap-6 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-cyan-600 rounded-xl shadow-sm">
            <Snowflake className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none mb-1.5">Freezer Van Ops</h1>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Cold Chain & Profit Tracking</p>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          <div className="bg-slate-900 min-w-[160px] sm:min-w-[180px] p-3 sm:p-4 rounded-2xl flex flex-col justify-between shadow-lg">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">Total Net Value</p>
            <p className="text-lg sm:text-xl font-black text-white tabular-nums leading-none">
              ₱{stats.totalNetValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="bg-white min-w-[130px] sm:min-w-[140px] p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Stock Volume</p>
            <p className="text-lg sm:text-xl font-black text-slate-900 tabular-nums leading-none">
              {stats.totalKilos.toLocaleString()} <span className="text-xs text-slate-400">kg</span>
            </p>
          </div>
          <div className="bg-white min-w-[120px] sm:min-w-[130px] p-3 sm:p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Crates On-Hand</p>
            <p className="text-lg sm:text-xl font-black text-cyan-600 tabular-nums leading-none">{stats.totalCrates}</p>
          </div>
        </div>
      </header>

      {/* --- MAIN LAYOUT --- */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-visible xl:overflow-hidden">
        
        <aside className="xl:w-[400px] shrink-0 border-b xl:border-b-0 xl:border-r border-slate-200 bg-white overflow-visible xl:overflow-y-auto custom-scrollbar z-10">
          <div className="p-4 sm:p-6">
            <div className={`rounded-2xl border ${editingId ? 'border-amber-200 bg-amber-50/10' : 'border-slate-200 bg-white'} shadow-sm overflow-hidden transition-colors`}>
              <div className="px-4 sm:px-6 py-4 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Archive className={`w-4 h-4 ${editingId ? 'text-amber-600' : 'text-cyan-600'}`} />
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    {editingId ? 'Edit Record' : 'Stock Inbound'}
                  </h2>
                </div>
                {editingId && (
                  <button 
                    onClick={() => { setEditingId(null); reset(); }}
                    className="text-[10px] font-bold text-rose-500 flex items-center gap-1 hover:underline"
                  >
                    <XCircle className="w-3 h-3" /> CANCEL
                  </button>
                )}
              </div>

              <div className="p-4 sm:p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Stock Item</label>
                    <select 
                      {...register('particulars', {required: true})} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-cyan-500/20 outline-none"
                    >
                      <option value="">Select Category...</option>
                      {STOCK_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Date</label>
                      <input type="date" {...register('date', {required: true})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                    </div>
                    
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kilos (kg)</label>
                      <input type="number" step="0.01" {...register('kilos', {required: true})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Crates</label>
                      <input type="number" {...register('crates')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unit Price</label>
                      <input type="number" step="0.01" {...register('price', {required: true})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                    </div>

                    <div>
                       <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Travel Exp.</label>
                       <input type="number" step="0.01" {...register('travel_expense')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Other Overhead Expenses</label>
                      <input type="number" step="0.01" {...register('other_expense')} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                    </div>
                  </div>

                  <button 
                    type="submit" 
                    disabled={isLoading} 
                    className={`w-full ${editingId ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100' : 'bg-cyan-600 hover:bg-cyan-700 shadow-cyan-100'} text-white font-bold py-3.5 rounded-xl shadow-lg flex justify-center items-center gap-2 transition-all active:scale-95 mt-2`}
                  >
                    {isLoading ? 'Processing...' : (
                      editingId ? <><Pencil className="w-4 h-4" /> Update Record</> : <><Plus className="w-4 h-4" /> Add to Inventory</>
                    )}
                  </button>
                </form>
              </div>
            </div>

            <div className="mt-8 p-6 bg-slate-900 rounded-2xl text-white shadow-xl">
               <div className="flex items-center gap-2 mb-4">
                  <ShoppingCart className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-sm font-bold uppercase tracking-widest">Quick Stock Peek</h3>
               </div>
               <div className="space-y-3">
                  {items.slice(0, 4).map(inv => (
                    <div key={inv.id} className="flex justify-between items-center border-b border-white/10 pb-2">
                       <span className="text-xs font-medium text-slate-300">{inv.particulars}</span>
                       <span className="text-xs font-black text-cyan-400">{inv.kilos} kg</span>
                    </div>
                  ))}
                  <p className="text-[10px] text-slate-500 text-center pt-2 italic">Real-time inventory levels</p>
               </div>
            </div>
          </div>
        </aside>

        {/* --- HISTORY TABLE --- */}
        <section className="flex-1 flex flex-col bg-slate-50/50 overflow-hidden min-h-[500px] xl:min-h-0">
          <div className="shrink-0 px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by date or item..." 
                value={searchTerm} 
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 p-4 sm:p-8 overflow-hidden flex flex-col">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="overflow-y-auto overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full text-left min-w-[800px]">
                  <thead className="sticky top-0 bg-slate-50 z-20 border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Record Date</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Particulars</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Qty / Crates</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Base Amount</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Expenses</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-right">Net Profit</th>
                      <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-cyan-50/30 transition-colors group">
                        <td className="px-6 py-4 text-sm font-bold text-slate-600">{item.date}</td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-black text-slate-900">{item.particulars}</span>
                            <span className="text-[10px] text-slate-400 font-bold uppercase">System ID: {item.id}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-black text-slate-700">{item.kilos} kg</span>
                            <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-500 font-bold uppercase tracking-tighter">
                              {item.crates || 0} Crates
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-600">
                          ₱{Number(item.amount).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-xs font-bold text-rose-500">-₱{(Number(item.travel_expense) + Number(item.other_expense)).toLocaleString()}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className="text-base font-black text-cyan-600">
                            ₱{Number(item.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                            <button 
                              onClick={() => handleEdit(item)}
                              className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-colors shadow-sm bg-white border border-slate-100"
                              title="Edit Entry"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => openDeleteModal(item.id)}
                              className="p-2 hover:bg-rose-50 text-rose-600 rounded-lg transition-colors shadow-sm bg-white border border-slate-100"
                              title="Delete Entry"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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
      title="Delete Inventory Batch?"
      message="This will permanently remove this stock entry from your records. This action cannot be undone."
      isLoading={isLoading}
    />

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}