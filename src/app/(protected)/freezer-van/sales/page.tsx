/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Snowflake, Search, Plus, Calendar, MapPin, Scale, 
  DollarSign, Box, Fuel, AlertTriangle, PackageOpen,
  History, Pencil, Trash2, X, RotateCcw, ListFilter,
  ArrowUpRight
} from 'lucide-react';
import DeleteConfirmModal from '../../../components/modals/DeleteConfirmModal';

// --- OPTIONS FOR PARTICULARS ---
const PARTICULARS = [
  "Whole Chicken", "Intestine", "Liver", "Gizzard", "Feet", "Heads", "Butse", "Dugo"
];

// --- INTERFACES ---
interface FVSale {
  id: number;
  date: string;
  customer: string;
  product_name: string;
  kilos: number;
  crates: number;
  price: number;
  travel_expense: number;
}

interface FVInventory {
  id: number;
  particulars: string; 
  kilos: number;
  crates: number;
}

interface FVSaleFormData {
  date: string;
  customer: string;
  product_name: string;
  kilos: string;
  crates: string;
  price: string;
  travel_expense: string;
}

export default function FreezerVanSalesPage() {
  const { showToast } = useToast();
  const [sales, setSales] = useState<FVSale[]>([]);
  const [inventory, setInventory] = useState<FVInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals & Editing State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<number | null>(null);
  const [isLowStockModalOpen, setIsLowStockModalOpen] = useState(false);
  const [lowStockMessage, setLowStockMessage] = useState("");
  
  const { register, handleSubmit, reset, setValue, watch } = useForm<FVSaleFormData>({
    defaultValues: {
      product_name: "Whole Chicken",
      travel_expense: "0",
      crates: "0"
    }
  });

  const selectedParticular = watch('product_name');
  const isWholeChicken = selectedParticular === "Whole Chicken";

  // Logic: Reset and Lock Crates if product is NOT Whole Chicken
  useEffect(() => {
    if (selectedParticular && !isWholeChicken) {
      setValue('crates', '0');
    }
  }, [selectedParticular, isWholeChicken, setValue]);

  const fetchData = async () => {
    try {
      const [salesRes, invRes] = await Promise.all([
        api.get<FVSale[]>('/freezer-van/sales'),
        api.get<FVInventory[]>('/freezer-van/inventory')
      ]);
      setSales(salesRes.data);
      setInventory(invRes.data);
    } catch (err) {
      console.error("Error syncing data:", err);
      showToast('Failed to load data.', 'error');
    }
  };

  useEffect(() => { fetchData(); }, []);

  // --- KPI CALCULATIONS ---
  const totals = useMemo(() => {
    // Financials based on sales
    const gross = sales.reduce((sum, s) => sum + (Number(s.kilos) * Number(s.price)), 0);
    const expenses = sales.reduce((sum, s) => sum + Number(s.travel_expense || 0), 0);
    const net = gross - expenses;

    // Overall Inventory Totals
    const invKilos = inventory.reduce((sum, i) => sum + Number(i.kilos || 0), 0);
    const invCrates = inventory.reduce((sum, i) => sum + Number(i.crates || 0), 0);

    // Overall Sales Totals
    const salesKilos = sales.reduce((sum, s) => sum + Number(s.kilos || 0), 0);
    const salesCrates = sales.reduce((sum, s) => sum + Number(s.crates || 0), 0);

    return {
      net,
      remainingKilos: invKilos - salesKilos,
      remainingCrates: invCrates - salesCrates,
      count: sales.length
    };
  }, [sales, inventory]);

  // --- REAL-TIME AGGREGATED STOCK LIST FOR TABLE ---
  const stockList = useMemo(() => {
    return PARTICULARS.map(particular => {
      const invItems = inventory.filter(i => (i.particulars || "Whole Chicken") === particular);
      const salesItems = sales.filter(s => (s.product_name || "Whole Chicken") === particular);

      const invKilos = invItems.reduce((sum, i) => sum + Number(i.kilos || 0), 0);
      const invCrates = invItems.reduce((sum, i) => sum + Number(i.crates || 0), 0);

      const salesKilos = salesItems.reduce((sum, s) => sum + Number(s.kilos || 0), 0);
      const salesCrates = salesItems.reduce((sum, s) => sum + Number(s.crates || 0), 0);

      const availableKilos = invKilos - salesKilos;
      const availableCrates = invCrates - salesCrates;

      let status = "In Stock";
      if (availableKilos <= 0) status = "Out of Stock";
      else if (particular === "Whole Chicken" && availableCrates <= 5) status = "Low Stock";

      return {
        particular,
        availableCrates,
        availableKilos,
        status
      };
    });
  }, [inventory, sales]);

  const filteredStocks = stockList.filter(stock => 
    stock.particular.toLowerCase().includes(searchTerm.toLowerCase()) ||
    stock.status.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sorting items by ID descending for the history log
  const recentSales = useMemo(() => {
    return [...sales].sort((a, b) => b.id - a.id);
  }, [sales]);

  const handleEdit = (sale: FVSale) => {
    setEditingId(sale.id);
    setValue('date', sale.date);
    setValue('customer', sale.customer);
    setValue('product_name', sale.product_name);
    setValue('kilos', sale.kilos.toString());
    setValue('crates', sale.crates.toString());
    setValue('price', sale.price.toString());
    setValue('travel_expense', sale.travel_expense.toString());
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    reset({ product_name: "Whole Chicken", travel_expense: "0", crates: "0" });
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
      fetchData();
    } catch (err) {
      showToast('Delete failed.', 'error');
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const onSubmit = async (data: FVSaleFormData) => {
    const inputCrates = isWholeChicken ? Number(data.crates) : 0;
    const inputKilos = Number(data.kilos);

    // Get current record if editing to offset available balances
    const currentRecord = sales.find(s => s.id === editingId);
    
    // Check available stocks for the SPECIFIC particular
    const targetStock = stockList.find(s => s.particular === data.product_name);
    const availableKilos = (targetStock?.availableKilos || 0) + (currentRecord?.kilos || 0);
    const availableCrates = (targetStock?.availableCrates || 0) + (currentRecord?.crates || 0);

    // Validate Stocks before proceeding
    let errorMessage = "";

    if (isWholeChicken) {
      if (inputCrates > availableCrates) {
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
      kilos: inputKilos,
      heads: 0, // Fallback for backend DTO if it still expects heads
      crates: inputCrates,
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
      fetchData();
    } catch (error) {
      showToast('Transaction failed.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 flex flex-col overflow-y-auto lg:overflow-hidden">
      
      {/* --- HEADER --- */}
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
          <div className="bg-slate-900 px-4 sm:px-5 py-3 rounded-2xl min-w-[140px] shadow-lg shadow-slate-200 flex flex-col justify-between">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Total Net Income
            </p>
            <p className="text-xl font-black text-white tabular-nums leading-none">₱{totals.net.toLocaleString()}</p>
          </div>

          <div className="bg-indigo-50 border border-indigo-100 px-4 sm:px-5 py-3 rounded-2xl min-w-[120px] flex flex-col justify-between shadow-sm">
            <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <PackageOpen className="w-3 h-3" /> Avail Crates
            </p>
            <p className="text-xl font-black text-indigo-900 tabular-nums leading-none">{totals.remainingCrates.toLocaleString()}</p>
          </div>

          <div className="bg-white border border-slate-200 px-4 sm:px-5 py-3 rounded-2xl min-w-[120px] flex flex-col justify-between shadow-sm">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 flex items-center gap-1">
              <Scale className="w-3 h-3 text-indigo-500" /> Avail Weight
            </p>
            <p className="text-xl font-black text-slate-900 tabular-nums leading-none">
              {totals.remainingKilos.toFixed(2)} <span className="text-xs text-slate-400">kg</span>
            </p>
          </div>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-visible lg:overflow-hidden">
        
        {/* FORM SIDEBAR */}
        <aside className="lg:w-[400px] shrink-0 border-b lg:border-b-0 lg:border-r border-slate-200 bg-white overflow-visible lg:overflow-y-auto custom-scrollbar z-10 flex flex-col">
          <div className="p-4 sm:p-6 pb-2">
            
            {/* REGISTER FORM */}
            <div className={`rounded-2xl border transition-all duration-300 ${editingId ? 'border-indigo-400 ring-4 ring-indigo-50 bg-indigo-50/10' : 'border-slate-200 bg-white shadow-sm'}`}>
              <div className={`px-6 py-5 border-b flex items-center justify-between ${editingId ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                  <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 text-slate-800">
                    {editingId ? <><Pencil className="w-4 h-4 text-indigo-600"/> Edit Delivery</> : <><Plus className="w-4 h-4 text-indigo-600"/> Dispatch Stock</>}
                  </h2>
                  {editingId && (
                    <button onClick={cancelEdit} className="p-1 text-slate-400 hover:text-rose-500 transition-colors"><X className="w-5 h-5" /></button>
                  )}
              </div>

              <div className="p-4 sm:p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Item Particulars</label>
                    <div className="relative group">
                      <ListFilter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <select 
                        {...register('product_name', {required: true})}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none cursor-pointer"
                      >
                        {PARTICULARS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Dispatch Date</label>
                    <div className="relative group">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input type="date" {...register('date', {required: true})} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Customer / Location</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                      <input type="text" {...register('customer', {required: true})} placeholder="Destination store" className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Crates</label>
                      <input 
                        type="number" disabled={!isWholeChicken}
                        {...register('crates')} 
                        className={`w-full px-4 py-2.5 rounded-xl text-sm font-medium border outline-none transition-all ${!isWholeChicken ? 'bg-slate-100 text-slate-400 border-slate-100 cursor-not-allowed' : 'bg-slate-50 border-slate-200 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500'}`} 
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Weight (kg)</label>
                      <input type="number" step="0.01" {...register('kilos', {required: true})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">Unit Price (₱)</label>
                      <input type="number" step="0.01" {...register('price', {required: true})} className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center justify-between mb-1">
                        Travel Exp <span className="text-[8px] bg-red-100 text-red-600 px-1 rounded-full">DEDUCT</span>
                      </label>
                      <div className="relative group">
                        <Fuel className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-red-500 transition-colors" />
                        <input type="number" step="0.01" {...register('travel_expense')} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-red-600 font-bold focus:bg-white focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none transition-all" />
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                      <button type="submit" disabled={isLoading} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2 shadow-lg ${editingId ? 'bg-indigo-600 text-white shadow-indigo-100' : 'bg-slate-900 text-white shadow-slate-200'}`}>
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
                  recentSales.map(item => {
                    const gross = Number(item.kilos) * Number(item.price);
                    const net = gross - Number(item.travel_expense || 0);

                    return (
                      <div key={item.id} className="group relative p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all overflow-hidden">
                        <div className="flex justify-between items-start mb-1">
                          <span className="text-xs font-bold text-slate-700">{item.product_name || "Whole Chicken"}</span>
                          <span className="text-[10px] font-semibold text-slate-400">{item.date}</span>
                        </div>
                        <div className="flex justify-between items-end">
                          <span className="text-[10px] text-slate-500 truncate max-w-[120px]">{item.customer}</span>
                          <div className="flex flex-col items-end">
                            <span className="text-xs font-black text-indigo-600">
                              {item.product_name === "Whole Chicken" ? `-${item.crates}c / -${item.kilos}kg` : `-${item.kilos}kg`}
                            </span>
                            <span className="text-[10px] font-bold text-emerald-600 tracking-tight">₱{net.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                        </div>
                        
                        {/* Action Overlays for Editing/Deleting History Items */}
                        <div className="absolute right-0 top-0 bottom-0 flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-l from-indigo-50 via-indigo-50 to-transparent px-3">
                          <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-indigo-600 bg-white rounded-lg shadow-sm border border-slate-100 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => openDeleteModal(item.id)} className="p-2 text-slate-400 hover:text-rose-600 bg-white rounded-lg shadow-sm border border-slate-100 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

          </div>
        </aside>

        {/* --- REAL-TIME STOCKS TABLE --- */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden min-h-[500px] lg:min-h-0">
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
                      <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest text-right">Available Weight</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredStocks.map((stock, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50/30 transition-colors group h-[60px]">
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight ${stock.particular === 'Whole Chicken' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
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
                          <span className="text-sm font-bold text-indigo-600">
                            {stock.particular === "Whole Chicken" ? stock.availableCrates.toLocaleString() : "-"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm font-bold text-slate-600">
                          {stock.availableKilos.toLocaleString(undefined, {minimumFractionDigits: 2})} <span className="text-[10px] text-slate-400">kg</span>
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
        message="Deleting this sales record will return the weight and crates back to your van's inventory. Proceed?"
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
                You do not have enough supply in your van's inventory to fulfill this distribution. <br/>
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