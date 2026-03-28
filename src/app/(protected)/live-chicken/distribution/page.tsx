/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { 
  Truck, MapPin, Search, Plus, Egg, DollarSign, 
   
  Calendar, Scale, ArrowUpRight, TrendingDown,
  Box, Pencil, Trash2, X, AlertTriangle
} from 'lucide-react';

interface LCDistribution {
  id: number;
  date: string;
  location: string;
  crates: number;
  heads: number;
  kilos: number;
  amount: number;
}

interface LCInventory {
  id: number;
  heads: number;
  kilos: number;
  crates: number;
}

interface LCDistributionFormData {
  date: string;
  location: string;
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
  
  const { register, handleSubmit, reset, setValue } = useForm<LCDistributionFormData>();

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
      totalSales
    };
  }, [inventory, dist]);

  // --- LOW STOCK NOTIFICATION TRIGGER ---
  useEffect(() => {
    if (totals.remainingHeads > 0 && totals.remainingHeads <= 50) {
      showToast(`Attention: Inventory is running out! Only ${totals.remainingHeads} heads left.`, 'error');
    }
  }, [totals.remainingHeads]);

  const onSubmit = async (data: LCDistributionFormData) => {
    const inputHeads = Number(data.heads);
    const inputKilos = Number(data.kilos);

    // --- STOCK EXCEED VALIDATION ---
    // Calculate what's available plus the current record (if editing)
    const currentRecord = dist.find(d => d.id === editingId);
    const availableHeads = totals.remainingHeads + (currentRecord?.heads || 0);
    const availableKilos = totals.remainingKilos + (currentRecord?.kilos || 0);

    if (inputHeads > availableHeads) {
      showToast(`Cannot proceed. Available Heads: ${availableHeads}`, 'error');
      return;
    }

    if (inputKilos > availableKilos) {
      showToast(`Weight exceeds stock! Available: ${availableKilos.toFixed(2)}kg`, 'error');
      return;
    }

    setIsLoading(true);
    const payload = {
      ...data,
      crates: Number(data.crates),
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

  const onDelete = async (id: number) => {
    if (!confirm("Delete this distribution record?")) return;
    try {
      await api.delete(`/live-chicken/distribution/${id}`);
      showToast('Deleted successfully.', 'success');
      fetchData();
    } catch (error) {
      showToast('Delete failed.', 'error');
    }
  };

  const startEdit = (item: LCDistribution) => {
    setEditingId(item.id);
    setValue('date', item.date);
    setValue('location', item.location);
    setValue('crates', item.crates.toString());
    setValue('heads', item.heads.toString());
    setValue('kilos', item.kilos.toString());
    setValue('amount', item.amount.toString());
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    reset();
  };

  const filteredDist = dist.filter(d => 
    d.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.date.includes(searchTerm)
  );

  return (
    <div className="h-screen w-full bg-slate-50 text-slate-900 font-sans flex flex-col overflow-hidden">
      
      {/* --- TOP NAVBAR --- */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-6 py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 z-20 shadow-sm">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-sm">
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 leading-none mb-1.5">Distribution Ledger</h1>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Outbound Stock Management
                {totals.remainingHeads <= 50 && (
                  <span className="flex items-center gap-1 text-red-600 animate-pulse font-bold">
                    <AlertTriangle className="w-3 h-3" /> LOW STOCK
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* --- SYNCED KPI DATA --- */}
        <div className="flex gap-4 overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
          <div className="bg-slate-900 min-w-[150px] p-4 rounded-2xl flex flex-col justify-between">
            <div className="flex items-center gap-2 text-slate-400 mb-2">
              <DollarSign className="w-4 h-4" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Total Sales</p>
            </div>
            <p className="text-xl font-black text-white tabular-nums leading-none">₱{totals.totalSales.toLocaleString()}</p>
          </div>
          
          <div className="bg-white min-w-[140px] p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Egg className="w-4 h-4 text-blue-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Remaining Heads</p>
            </div>
            <p className={`text-2xl font-black tabular-nums leading-none ${totals.remainingHeads <= 50 ? 'text-red-600' : 'text-slate-900'}`}>
                {totals.remainingHeads.toLocaleString()}
            </p>
          </div>

          <div className="bg-white min-w-[140px] p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Scale className="w-4 h-4 text-blue-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Remaining Weight</p>
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">
                {totals.remainingKilos.toFixed(2)} <span className="text-xs text-slate-400">kg</span>
            </p>
          </div>

          <div className="bg-white min-w-[140px] p-4 rounded-2xl border border-slate-200 flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Box className="w-4 h-4 text-blue-500" />
              <p className="text-[10px] font-bold uppercase tracking-widest">Remaining Crates</p>
            </div>
            <p className="text-2xl font-black text-slate-900 tabular-nums leading-none">{totals.remainingCrates}</p>
          </div>
        </div>
      </header>

      {/* --- MAIN CONTENT --- */}
      <main className="flex-1 flex flex-col xl:flex-row overflow-hidden">
        <aside className="xl:w-[400px] shrink-0 border-r border-slate-200 bg-white overflow-y-auto z-10 custom-scrollbar">
          <div className="p-6 lg:p-8">
            <div className={`rounded-2xl border transition-all duration-300 ${editingId ? 'border-blue-400 ring-4 ring-blue-50 bg-blue-50/10' : 'border-slate-200 bg-white shadow-sm'}`}>
              <div className={`px-6 py-5 border-b flex items-center justify-between ${editingId ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                  <h2 className="text-sm font-bold tracking-wide flex items-center gap-2 text-slate-800">
                    {editingId ? <><Pencil className="w-4 h-4 text-blue-600"/> Edit Delivery</> : <><Plus className="w-4 h-4 text-blue-600"/> Dispatch Stock</>}
                  </h2>
                  {editingId && (
                    <button onClick={handleCancelEdit} className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"><X className="w-5 h-5" /></button>
                  )}
              </div>

              <div className="p-6">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                  {[
                      { label: 'Date', icon: Calendar, key: 'date', type: 'date' },
                      { label: 'Location', icon: MapPin, key: 'location', type: 'text', placeholder: 'Destination store' },
                      { label: 'Crates Out', icon: Box, key: 'crates', type: 'number' },
                      { label: 'Heads Out', icon: Egg, key: 'heads', type: 'number' },
                      { label: 'Total Weight (kg)', icon: Scale, key: 'kilos', type: 'number', step: '0.01' },
                      { label: 'Total Amount (₱)', icon: DollarSign, key: 'amount', type: 'number', step: '0.01' },
                  ].map((field) => (
                      <div key={field.key}>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-tight mb-1">{field.label}</label>
                        <div className="relative group">
                          <field.icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                          <input 
                            type={field.type} step={field.step} placeholder={field.placeholder}
                            {...register(field.key as keyof LCDistributionFormData, {required: true})} 
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" 
                          />
                        </div>
                      </div>
                  ))}
                  <div className="pt-4">
                      <button type="submit" disabled={isLoading} className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex justify-center items-center gap-2 ${editingId ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
                          {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{editingId ? 'Update Record' : 'Post Delivery'} <ArrowUpRight className="w-4 h-4" /></>}
                      </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </aside>

        <section className="flex-1 flex flex-col min-w-0 bg-slate-50/50 overflow-hidden">
          <div className="shrink-0 px-8 py-5 border-b border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 z-10">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                    type="text" placeholder="Search location or date..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm font-medium outline-none focus:ring-2 focus:ring-slate-200 transition-all"
                />
            </div>
          </div>

          <div className="flex-1 p-8 overflow-hidden">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full">
              <div className="overflow-y-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-slate-50 z-20 shadow-sm border-b border-slate-100">
                        <tr>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest">Location</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Crates</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Heads</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Weight</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Amount</th>
                            <th className="px-6 py-4 text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center w-24">Manage</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDist.length === 0 ? (
                          <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-400">No distribution records found.</td></tr>
                        ) : (
                          filteredDist.map((item) => (
                              <tr key={item.id} className={`hover:bg-blue-50/40 group h-[60px] ${editingId === item.id ? 'bg-blue-50/60' : ''}`}>
                                  <td className="px-6 py-4 text-sm font-bold text-slate-700">{item.date}</td>
                                  <td className="px-6 py-4 text-sm font-semibold text-slate-600 truncate max-w-[150px]">{item.location}</td>
                                  <td className="px-6 py-4 text-right text-sm font-bold text-blue-600">{item.crates}</td>
                                  <td className="px-6 py-4 text-right"><span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-100 text-slate-700">{item.heads}</span></td>
                                  <td className="px-6 py-4 text-right text-sm font-bold text-slate-600 tabular-nums">{item.kilos} <span className="text-[10px] text-slate-400 uppercase">kg</span></td>
                                  <td className="px-6 py-4 text-right text-sm font-black text-slate-900">₱{item.amount.toLocaleString()}</td>
                                  <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button onClick={() => startEdit(item)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors"><Pencil className="w-4 h-4" /></button>
                                      <button onClick={() => onDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
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