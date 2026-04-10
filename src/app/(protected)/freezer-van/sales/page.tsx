/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Snowflake, Search, Plus, Calendar, User, Scale, 
  DollarSign, Box, Fuel, TrendingUp, Info, ShoppingBag,
  Trash2, Pencil, MapPin, Hash, X, RotateCcw
} from 'lucide-react';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal';

const PARTICULARS = ["Whole Chicken", "Intestine", "Liver", "Gizzard", "Spleen", "Feet", "Fats"];

interface FVSale {
  id: number;
  date: string;
  customer: string;
  product_name: string;
  kilos: number;
  heads: number;
  crates: number;
  price: number;
  travel_expense: number;
}

interface FVSaleFormData {
  date: string;
  customer: string;
  product_name: string;
  kilos: string;
  heads: string;
  crates: string;
  price: string;
  travel_expense: string;
}

export default function FreezerVanSalesPage() {
  const { showToast } = useToast();
  const [sales, setSales] = useState<FVSale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<FVSaleFormData>({
    defaultValues: {
      travel_expense: "0",
      heads: "0",
      crates: "0"
    }
  });

  // Watch the product selection to toggle field restrictions
  const selectedParticular = watch('product_name');
  const isWholeChicken = selectedParticular === "Whole Chicken";

  // Logic: Reset and Lock Crates/Heads if product is NOT Whole Chicken
  useEffect(() => {
    if (selectedParticular && !isWholeChicken) {
      setValue('crates', '0');
      setValue('heads', '0');
    }
  }, [selectedParticular, isWholeChicken, setValue]);

  const fetchSales = async () => {
    try {
      const res = await api.get<FVSale[]>('/freezer-van/sales');
      setSales(res.data);
    } catch (err) {
      showToast('Failed to load sales.', 'error');
    }
  };

  useEffect(() => { fetchSales(); }, []);

  const totals = useMemo(() => {
    const gross = sales.reduce((sum, s) => sum + (Number(s.kilos) * Number(s.price)), 0);
    const expenses = sales.reduce((sum, s) => sum + Number(s.travel_expense || 0), 0);
    return {
      net: gross - expenses,
      totalKilos: sales.reduce((sum, s) => sum + Number(s.kilos), 0),
      count: sales.length
    };
  }, [sales]);

  const handleEdit = (sale: FVSale) => {
    setEditingId(sale.id);
    setValue('date', sale.date);
    setValue('customer', sale.customer);
    setValue('product_name', sale.product_name);
    setValue('kilos', sale.kilos.toString());
    setValue('heads', sale.heads.toString());
    setValue('crates', sale.crates.toString());
    setValue('price', sale.price.toString());
    setValue('travel_expense', sale.travel_expense.toString());
    showToast('Editing transaction...', 'info');
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset({ travel_expense: "0", heads: "0", crates: "0" });
  };

  const openDeleteModal = (id: number) => {
    setItemToDelete(id);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;
    try {
      await api.delete(`/freezer-van/sales/${itemToDelete}`);
      showToast('Sale record deleted.', 'success');
      fetchSales();
    } catch (err) {
      showToast('Delete failed.', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const onSubmit = async (data: FVSaleFormData) => {
    setIsLoading(true);
    const payload = {
      ...data,
      kilos: Number(data.kilos),
      // Force 0 for non-chicken items just in case
      heads: isWholeChicken ? Number(data.heads) : 0,
      crates: isWholeChicken ? Number(data.crates) : 0,
      price: Number(data.price),
      travel_expense: Number(data.travel_expense),
    };

    try {
      if (editingId) {
        await api.put(`/freezer-van/sales/${editingId}`, payload);
        showToast('Sale record updated.', 'success');
      } else {
        await api.post('/freezer-van/sales', payload);
        showToast('Sale recorded successfully.', 'success');
      }
      cancelEdit();
      fetchSales();
    } catch (error) {
      showToast('Transaction failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSales = sales.filter(s => 
    s.customer?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.product_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 flex flex-col overflow-y-auto lg:overflow-hidden">
      
      <header className="shrink-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow-indigo-100 shadow-lg">
            <Snowflake className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-800">Van Distribution</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Freezer Van Sales Ledger</p>
          </div>
        </div>

        <div className="flex gap-3 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          <div className="bg-slate-900 px-4 sm:px-5 py-3 rounded-2xl min-w-[140px] shadow-lg shadow-slate-200">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Net Income</p>
            <p className="text-xl font-black text-white tabular-nums">₱{totals.net.toLocaleString()}</p>
          </div>
          <div className="bg-indigo-50 border border-indigo-100 px-4 sm:px-5 py-3 rounded-2xl min-w-[120px]">
            <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Vol. Out (kg)</p>
            <p className="text-xl font-black text-indigo-900 tabular-nums">{totals.totalKilos.toFixed(2)}</p>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden">
        
        <aside className="lg:w-[400px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white overflow-visible lg:overflow-y-auto p-4 sm:p-6 z-10 custom-scrollbar">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${editingId ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">
                  {editingId ? 'Updating Transaction' : 'Record New Sale'}
                </h2>
              </div>
              {editingId && (
                <button type="button" onClick={cancelEdit} className="flex items-center gap-1 text-[10px] text-red-500 font-bold hover:underline">
                  <X className="w-3 h-3" /> CANCEL EDIT
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Transaction Date</label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input type="date" {...register('date', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500" />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Product Description</label>
                <select {...register('product_name', {required: true})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold text-indigo-600 appearance-none">
                  <option value="">Select Particular...</option>
                  {PARTICULARS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Customer / Route</label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input placeholder="Customer Name or Location" {...register('customer')} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Weight (kg)</label>
                  <input type="number" step="0.01" {...register('kilos', {required: true})} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Unit Price</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-3 text-[10px] font-bold text-slate-400">₱</span>
                    <input type="number" step="0.01" {...register('price', {required: true})} className="w-full pl-7 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold" />
                  </div>
                </div>
              </div>

              {/* RESTRICTED SECTION: Only for Whole Chicken */}
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${isWholeChicken ? 'bg-indigo-50/50 border-indigo-100/50' : 'bg-slate-100 border-slate-200 opacity-60'}`}>
                <div>
                  <label className={`text-[10px] font-bold uppercase flex items-center gap-1 mb-1 ${isWholeChicken ? 'text-indigo-400' : 'text-slate-400'}`}>
                    <Hash className="w-3 h-3"/> Heads
                  </label>
                  <input 
                    type="number" 
                    {...register('heads')} 
                    disabled={!isWholeChicken}
                    className={`w-full p-2 rounded-lg text-sm font-bold outline-none transition-all ${isWholeChicken ? 'bg-white border border-indigo-100 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400 cursor-not-allowed'}`} 
                  />
                </div>
                <div>
                  <label className={`text-[10px] font-bold uppercase flex items-center gap-1 mb-1 ${isWholeChicken ? 'text-indigo-400' : 'text-slate-400'}`}>
                    <Box className="w-3 h-3"/> Crates
                  </label>
                  <input 
                    type="number" 
                    {...register('crates')} 
                    disabled={!isWholeChicken}
                    className={`w-full p-2 rounded-lg text-sm font-bold outline-none transition-all ${isWholeChicken ? 'bg-white border border-indigo-100 text-indigo-700' : 'bg-slate-50 border-transparent text-slate-400 cursor-not-allowed'}`} 
                  />
                </div>
                {!isWholeChicken && selectedParticular && (
                   <p className="col-span-2 text-[9px] text-slate-400 font-medium italic mt-2">
                     * Units restricted to Kilos for {selectedParticular}
                   </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center justify-between">
                  Logistics Cost <span className="text-[8px] bg-red-100 text-red-600 px-1.5 rounded-full">DEDUCTIBLE</span>
                </label>
                <div className="relative mt-1">
                  <Fuel className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                  <input type="number" {...register('travel_expense')} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm text-red-600 font-bold" />
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isLoading} 
              className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-all flex justify-center items-center gap-2 transform active:scale-95 ${
                editingId 
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-100 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100 text-white'
              }`}
            >
              {isLoading ? 'Processing...' : editingId ? <><RotateCcw className="w-5 h-5" /> Update Record</> : <><Plus className="w-5 h-5" /> Save Transaction</>}
            </button>
          </form>
        </aside>

        <section className="flex-1 flex flex-col bg-white overflow-hidden min-h-[500px] lg:min-h-0">
          <div className="px-4 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/80 backdrop-blur-md sticky top-0 z-10">
            <div className="flex w-full justify-between items-center gap-4">
              <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search history..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-11 pr-4 py-2 sm:py-2.5 bg-slate-50 border border-slate-200 rounded-full text-xs focus:ring-2 focus:ring-indigo-500 outline-none transition-all focus:bg-white"
                />
              </div>
              <div className="hidden md:flex items-center gap-2 text-slate-400 shrink-0">
                <ShoppingBag className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">{totals.count} Records</span>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto custom-scrollbar">
            <table className="w-full text-left border-separate border-spacing-0 min-w-[700px]">
              <thead className="bg-slate-50/50 sticky top-0 backdrop-blur-md z-10">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-8 py-5 border-b border-slate-100">Date & Logistics</th>
                  <th className="px-8 py-5 border-b border-slate-100 text-center">Volume Details</th>
                  <th className="px-8 py-5 border-b border-slate-100 text-right">Cash Breakdown</th>
                  <th className="px-8 py-5 border-b border-slate-100 text-right">Net Income</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredSales.map((sale) => {
                  const lineGross = Number(sale.kilos) * Number(sale.price);
                  const lineNet = lineGross - Number(sale.travel_expense || 0);
                  
                  return (
                    <tr key={sale.id} className="group hover:bg-indigo-50/30 transition-all duration-200">
                      <td className="px-8 py-5">
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-400 mb-0.5">{sale.date}</span>
                          <span className="text-sm font-black text-slate-800 tracking-tight">{sale.product_name}</span>
                          <span className="flex items-center gap-1 text-[10px] text-indigo-500 font-bold mt-1">
                            <MapPin className="w-3 h-3" /> {sale.customer || 'Store Front'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="inline-flex flex-col items-center bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 group-hover:bg-white transition-colors">
                          <span className="text-sm font-mono font-black text-slate-700">{sale.kilos} kg</span>
                          <span className="text-[9px] font-black text-slate-400 uppercase">
                            {sale.product_name === "Whole Chicken" ? `${sale.heads}H • ${sale.crates}C` : '--'}
                          </span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex flex-col">
                          <span className="text-xs font-mono text-slate-400 line-through">₱{lineGross.toLocaleString()}</span>
                          <span className="text-xs font-black text-red-500">- ₱{sale.travel_expense}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5 text-right">
                         <div className="flex items-center justify-end gap-5">
                            <div className="flex flex-col items-end">
                              <span className="text-sm font-black text-indigo-600 tabular-nums">₱{lineNet.toLocaleString()}</span>
                              <span className="text-[9px] font-bold text-slate-300 uppercase">Settled</span>
                            </div>
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                               <button onClick={() => handleEdit(sale)} className="p-2 hover:bg-indigo-600 hover:text-white rounded-lg text-indigo-600 transition-all shadow-sm bg-white border border-slate-100">
                                 <Pencil className="w-3.5 h-3.5"/>
                               </button>
                               <button onClick={() => openDeleteModal(sale.id)} className="p-2 hover:bg-red-600 hover:text-white rounded-lg text-red-500 transition-all shadow-sm bg-white border border-slate-100">
                                 <Trash2 className="w-3.5 h-3.5"/>
                               </button>
                            </div>
                         </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <DeleteConfirmModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={confirmDelete}
        title="Delete Transaction?"
        message="This action will remove this sale and update the van stock history. This cannot be undone."
      />
    </div>
  );
}