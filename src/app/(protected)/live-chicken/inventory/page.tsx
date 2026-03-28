"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Package, Search, Plus, Calendar, User, 
  Egg, Scale, DollarSign, Pencil, Trash2, X, 
  ArrowUpRight, Activity, Box
} from 'lucide-react';

interface LCInventory {
  id: number;
  date: string;
  supplier: string;
  crates: number;
  heads: number;
  kilos: number;
  amount: number;
}

interface LCInventoryFormData {
  date: string;
  supplier: string;
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
  
  const { register, handleSubmit, reset, setValue } = useForm<LCInventoryFormData>();

  const fetchItems = () => {
    api.get<LCInventory[]>('/live-chicken/inventory')
      .then((res) => setItems(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (data: LCInventoryFormData) => {
    setIsLoading(true);
    const payload = {
      ...data,
      crates: Number(data.crates),
      heads: Number(data.heads),
      kilos: Number(data.kilos),
      amount: Number(data.amount),
    };

    try {
      if (editingId) {
        await api.put(`/live-chicken/inventory/${editingId}`, payload);
        showToast('Inventory updated successfully!', 'success');
      } else {
        await api.post('/live-chicken/inventory', payload);
        showToast('Inventory added successfully!', 'success');
      }
      handleCancelEdit();
      fetchItems();
    } catch (error) {
      showToast(editingId ? 'Failed to update.' : 'Failed to add.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this record?")) return;
    try {
      await api.delete(`/live-chicken/inventory/${id}`);
      showToast('Record deleted.', 'success');
      fetchItems();
    } catch (error) {
      showToast('Failed to delete.', 'error');
    }
  };

  const startEdit = (item: LCInventory) => {
    setEditingId(item.id);
    setValue('date', item.date);
    setValue('supplier', item.supplier);
    setValue('crates', item.crates.toString());
    setValue('heads', item.heads.toString());
    setValue('kilos', item.kilos.toString());
    setValue('amount', item.amount.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset();
  };

  const filteredItems = items.filter(item =>
    item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.date.includes(searchTerm)
  );

  // --- KPI CALCULATIONS ---
  const totalHeads = items.reduce((sum, item) => sum + Number(item.heads), 0);
  const totalCrates = items.reduce((sum, item) => sum + Number(item.crates || 0), 0);
  const totalKilos = items.reduce((sum, item) => sum + Number(item.kilos), 0);
  const avgWeight = totalHeads > 0 ? (totalKilos / totalHeads).toFixed(2) : "0.00";

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden selection:bg-amber-100 selection:text-amber-900">
      
      {/* --- TOP NAVBAR & KPIs --- */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 z-20 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-amber-500 rounded-xl shadow-sm border border-amber-600/20">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none mb-1.5">Live Chicken Inventory</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Central Storage Terminal</p>
            </div>
          </div>
        </div>

        {/* --- KPI METRICS --- */}
        <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          {/* Total Crates */}
          <div className="bg-slate-50 min-w-[130px] p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Box className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Total Crates</p>
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{totalCrates.toLocaleString()}</p>
          </div>
          
          {/* Total Heads (Added) */}
          <div className="bg-slate-50 min-w-[130px] p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Egg className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Total Heads</p>
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{totalHeads.toLocaleString()}</p>
          </div>
          
          {/* Total Weight */}
          <div className="bg-slate-50 min-w-[130px] p-4 rounded-2xl border border-slate-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Scale className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Total Weight</p>
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                {totalKilos.toLocaleString()} <span className="text-xs text-slate-400">kg</span>
            </p>
          </div>

          {/* Average Weight */}
          <div className="bg-amber-50 min-w-[130px] p-4 rounded-2xl border border-amber-200 flex flex-col justify-between">
            <div className="flex items-center gap-2 text-amber-700 mb-2">
              <Activity className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Avg Weight</p>
            </div>
            <p className="text-2xl font-black text-amber-600 tabular-nums leading-none">
                {avgWeight} <span className="text-xs font-semibold">kg/b</span>
            </p>
          </div>
        </div>
      </header>

      {/* --- MAIN WORKSPACE --- */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        
        {/* LEFT: ENTRY FORM */}
        <aside className="xl:w-[400px] shrink-0 border-r border-slate-200 bg-white overflow-y-auto z-10 custom-scrollbar">
          <div className="p-6 lg:p-8">
            <div className={`rounded-2xl shadow-sm border transition-all duration-300 ${editingId ? 'border-amber-400 ring-4 ring-amber-50 bg-amber-50/10' : 'border-slate-200 bg-white'}`}>
              <div className={`px-6 py-5 border-b rounded-t-2xl flex items-center justify-between ${editingId ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100'}`}>
                  <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 text-slate-800">
                    {editingId ? <><Pencil className="w-4 h-4 text-amber-600"/> Update Record</> : <><Plus className="w-4 h-4 text-slate-500"/> Register Stock</>}
                  </h2>
                  {editingId && (
                    <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-white rounded-md transition-colors"><X className="w-5 h-5" /></button>
                  )}
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {[
                      { label: 'Date of Entry', icon: Calendar, key: 'date', type: 'date' },
                      { label: 'Supplier Origin', icon: User, key: 'supplier', type: 'text', placeholder: 'Enter supplier name' },
                      { label: 'Crates Count', icon: Box, key: 'crates', type: 'number' },
                      { label: 'Head Count', icon: Egg, key: 'heads', type: 'number' },
                      { label: 'Total Weight (kg)', icon: Scale, key: 'kilos', type: 'number', step: '0.01' },
                      { label: 'Valuation (₱)', icon: DollarSign, key: 'amount', type: 'number', step: '0.01' },
                  ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">{field.label}</label>
                        <div className="relative group">
                          <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                          <input 
                            type={field.type} step={field.step} placeholder={field.placeholder}
                            {...register(field.key as keyof LCInventoryFormData, {required: field.key !== 'supplier'})} 
                            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 outline-none transition-all shadow-sm" 
                          />
                        </div>
                      </div>
                  ))}
                  <div className="pt-4">
                      <button type="submit" disabled={isLoading} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2 ${editingId ? 'bg-amber-500 text-white hover:bg-amber-600' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                          {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{editingId ? 'Save Changes' : 'Post to Ledger'} <ArrowUpRight className="w-4 h-4" /></>}
                      </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </aside>

        {/* RIGHT: DATA TABLE AREA */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
          <div className="shrink-0 px-8 py-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" placeholder="Search by supplier or date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                />
            </div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1.5 rounded-lg">
              {filteredItems.length} Records Found
            </div>
          </div>

          <div className="flex-1 p-8 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-20 shadow-sm">
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Supplier</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Crates</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Heads</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Weight</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center w-24">Manage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.length === 0 ? (
                          <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400">No inventory records found.</td></tr>
                        ) : (
                          filteredItems.map((item) => (
                              <tr key={item.id} className={`hover:bg-slate-50 group h-[60px] ${editingId === item.id ? 'bg-amber-50/40' : ''}`}>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-700 whitespace-nowrap">{item.date}</td>
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-600 truncate max-w-[150px]">{item.supplier || '—'}</td>
                                  <td className="px-6 py-4 text-right text-sm font-bold text-amber-600">{item.crates}</td>
                                  <td className="px-6 py-4 text-right"><span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">{item.heads}</span></td>
                                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-600 tabular-nums">
                                    {item.kilos} <span className="text-[10px] text-slate-400 uppercase">kg</span>
                                  </td>
                                  <td className="px-6 py-4 text-right text-sm font-black text-slate-900">₱{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-amber-600"><Pencil className="w-4 h-4" /></button>
                                      <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                  </td>
                              </tr>
                          ))
                        )}
                    </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>
      </main>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .hide-scrollbar::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}