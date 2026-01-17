"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Package, Search, Plus, Calendar, User, Egg, Scale, DollarSign } from 'lucide-react';

interface LCInventory {
  id: number;
  date: string;
  supplier: string;
  heads: number;
  kilos: number;
  amount: number;
}

// Define Form Data Interface
interface LCInventoryFormData {
  date: string;
  supplier: string;
  heads: string;
  kilos: string;
  amount: string;
}

export default function LiveChickenInventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<LCInventory[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<LCInventoryFormData>();

  const fetchItems = () => {
    api.get<LCInventory[]>('/live-chicken/inventory')
      .then((res) => setItems(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (data: LCInventoryFormData) => {
    setIsLoading(true);
    try {
      await api.post('/live-chicken/inventory', {
        ...data,
        heads: Number(data.heads),
        kilos: Number(data.kilos),
        amount: Number(data.amount),
      });
      showToast('Inventory added successfully!', 'success');
      reset();
      fetchItems();
    } catch (error) {
      showToast('Failed to add inventory.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.supplier?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.date.includes(searchTerm)
  );

  const totalHeads = items.reduce((sum, item) => sum + Number(item.heads), 0);

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Package className="w-8 h-8 text-amber-600" />
            Live Chicken Inventory
          </h1>
          <p className="text-slate-500 mt-1">Manage incoming live chicken stock.</p>
        </div>
        <div className="flex gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Heads</p>
              <p className="text-2xl font-bold text-amber-600">{totalHeads.toLocaleString()}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Add Inventory Form */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-amber-600 shadow-lg sticky top-6">
            <CardHeader title="Add Stock" subtitle="Register new delivery." />
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Date */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                   <div className="relative">
                     <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input type="date" {...register('date', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                   </div>
                </div>
                {/* Supplier */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Supplier</label>
                   <div className="relative">
                     <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input placeholder="Supplier Name" {...register('supplier')} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                   </div>
                </div>
                {/* Heads */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Heads (Count)</label>
                   <div className="relative">
                     <Egg className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input type="number" placeholder="0" {...register('heads', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                   </div>
                </div>
                {/* Kilos */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Kilos</label>
                   <div className="relative">
                     <Scale className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input type="number" step="0.01" placeholder="0.00" {...register('kilos', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                   </div>
                </div>
                {/* Amount */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Total Amount</label>
                   <div className="relative">
                     <DollarSign className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input type="number" step="0.01" placeholder="0.00" {...register('amount', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                   </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-200 transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-4">
                    {isLoading ? 'Saving...' : <><Plus className="w-5 h-5" /> Add Inventory</>}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Inventory List */}
        <div className="xl:col-span-8 space-y-6">
          <Card className="h-[calc(100vh-240px)] min-h-[500px] shadow-md flex flex-col">
            <CardHeader title="Inventory History" subtitle="Incoming stock records." />
            <div className="px-6 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search supplier or date..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
                    />
                </div>
            </div>
            <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Supplier</th>
                            <th className="px-6 py-4 text-center">Heads</th>
                            <th className="px-6 py-4 text-center">Kilos</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-700">{item.date}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-400" />
                                    {item.supplier || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                        {item.heads}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-slate-500">
                                    {item.kilos} kg
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-slate-700">
                                    ₱{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center">
                                        <Package className="w-8 h-8 text-slate-300 mb-2" />
                                        <p>{searchTerm ? 'No matching records found.' : 'No inventory records found.'}</p>
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
    </div>
  );
}