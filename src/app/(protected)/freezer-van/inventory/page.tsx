"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Snowflake, Search, Plus, Calendar, User, Tag, Scale, DollarSign, Truck, FileText } from 'lucide-react';

interface FVInventoryItem {
  id: number;
  date: string;
  particulars: string;
  kilos: number;
  price: number;
  amount: number;
  travel_expense: number;
  other_expense: number;
  total_amount: number;
}

// Define Form Data Interface
interface FVInventoryFormData {
  date: string;
  supplier: string;
  particulars: string;
  kilos: string;
  price: string;
  travel_expense: string;
  other_expense: string;
}

export default function FreezerVanInventoryPage() {
  const { showToast } = useToast();
  const [items, setItems] = useState<FVInventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<FVInventoryFormData>();

  const fetchItems = () => {
    api.get<FVInventoryItem[]>('/freezer-van/inventory')
      .then((res) => setItems(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (data: FVInventoryFormData) => {
    setIsLoading(true);
    try {
      await api.post('/freezer-van/inventory', {
        ...data,
        kilos: Number(data.kilos),
        price: Number(data.price),
        amount: Number(data.kilos) * Number(data.price),
        travel_expense: Number(data.travel_expense),
        other_expense: Number(data.other_expense),
      });
      showToast('Record added successfully!', 'success');
      reset();
      fetchItems();
    } catch (error) {
      showToast('Failed to add record.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredItems = items.filter(item =>
    item.particulars.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.date.includes(searchTerm)
  );

  const totalValue = items.reduce((sum, item) => sum + Number(item.total_amount), 0);

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Snowflake className="w-8 h-8 text-blue-600" />
            Freezer Van Inventory
          </h1>
          <p className="text-slate-500 mt-1">Track inventory, expenses, and monitoring.</p>
        </div>
        <div className="flex gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Value</p>
              <p className="text-2xl font-bold text-blue-600">₱{totalValue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Add Record Form */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-blue-600 shadow-lg sticky top-6">
            <CardHeader title="Add Record" subtitle="New inventory entry." />
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Date */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                   <div className="relative">
                     <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input type="date" {...register('date', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                   </div>
                </div>
                {/* Supplier */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Supplier</label>
                   <div className="relative">
                     <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input placeholder="Supplier Name" {...register('supplier')} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                   </div>
                </div>
                {/* Particulars */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Particulars</label>
                   <div className="relative">
                     <Tag className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input placeholder="Item Name" {...register('particulars', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                    {/* Kilos */}
                    <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-2">Kilos</label>
                       <div className="relative">
                         <Scale className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                         <input type="number" step="0.01" placeholder="0.00" {...register('kilos', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                       </div>
                    </div>
                    {/* Price */}
                    <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-2">Price</label>
                       <div className="relative">
                         <span className="absolute left-3 top-3.5 text-slate-400 font-sans font-bold">₱</span>
                         <input type="number" step="0.01" placeholder="0.00" {...register('price', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                       </div>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {/* Travel Expense */}
                    <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-2">Travel Exp.</label>
                       <div className="relative">
                         <Truck className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                         <input type="number" step="0.01" placeholder="0.00" {...register('travel_expense')} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                       </div>
                    </div>
                    {/* Other Expense */}
                    <div>
                       <label className="block text-sm font-semibold text-slate-700 mb-2">Other Exp.</label>
                       <div className="relative">
                         <FileText className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                         <input type="number" step="0.01" placeholder="0.00" {...register('other_expense')} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                       </div>
                    </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-4">
                    {isLoading ? 'Saving...' : <><Plus className="w-5 h-5" /> Add Record</>}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Inventory List */}
        <div className="xl:col-span-8 space-y-6">
          <Card className="h-[calc(100vh-240px)] min-h-[500px] shadow-md flex flex-col">
            <CardHeader title="Inventory History" subtitle="Recent records." />
            <div className="px-6 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search particulars or date..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
            </div>
            <div className="overflow-auto flex-1">
                <table className="w-full text-left text-sm text-slate-600">
                    <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4">Date</th>
                            <th className="px-6 py-4">Particulars</th>
                            <th className="px-6 py-4 text-center">Kilos</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                            <th className="px-6 py-4 text-right">Expenses</th>
                            <th className="px-6 py-4 text-right">Total Cost</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredItems.map((item) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-700">{item.date}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-slate-400" />
                                    {item.particulars}
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-slate-500">
                                    {item.kilos} kg
                                </td>
                                <td className="px-6 py-4 text-right text-slate-600">
                                    ₱{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-6 py-4 text-right text-red-500">
                                    ₱{(Number(item.travel_expense) + Number(item.other_expense)).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600">
                                    ₱{Number(item.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                        {filteredItems.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center">
                                        <Snowflake className="w-8 h-8 text-slate-300 mb-2" />
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