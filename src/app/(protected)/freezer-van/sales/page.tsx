"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Snowflake, Search, Plus, Calendar, User, Scale, DollarSign } from 'lucide-react';

interface FVSale {
  id: number;
  date: string;
  customer: string;
  kilos: number;
  price: number;
  amount: number;
}

// Define Form Data Interface
interface FVSaleFormData {
  date: string;
  customer: string;
  kilos: string;
  price: string;
}

export default function FreezerVanSalesPage() {
  const { showToast } = useToast();
  const [sales, setSales] = useState<FVSale[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<FVSaleFormData>();

  const fetchSales = () => {
    api.get<FVSale[]>('/freezer-van/sales').then((res) => setSales(res.data));
  };

  useEffect(() => { fetchSales(); }, []);

  const onSubmit = async (data: FVSaleFormData) => {
    setIsLoading(true);
    try {
      await api.post('/freezer-van/sales', {
        ...data,
        kilos: Number(data.kilos),
        price: Number(data.price),
      });
      showToast('Sale recorded successfully!', 'success');
      reset();
      fetchSales();
    } catch (error) {
      showToast('Failed to record sale.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredSales = sales.filter(sale => 
    sale.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sale.date.includes(searchTerm)
  );

  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.amount), 0);

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Snowflake className="w-8 h-8 text-blue-600" />
            Freezer Van Sales
          </h1>
          <p className="text-slate-500 mt-1">Record and track sales transactions.</p>
        </div>
        <div className="flex gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-600">₱{totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Add Sale Form */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-blue-600 shadow-lg sticky top-6">
            <CardHeader title="New Sale" subtitle="Record transaction." />
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
                {/* Customer */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Customer</label>
                   <div className="relative">
                     <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input placeholder="Customer Name" {...register('customer')} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                   </div>
                </div>
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
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Price per Kilo</label>
                   <div className="relative">
                     <span className="absolute left-3 top-3.5 text-slate-400 font-sans font-bold">₱</span>
                     <input type="number" step="0.01" placeholder="0.00" {...register('price', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                   </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-4">
                    {isLoading ? 'Saving...' : <><Plus className="w-5 h-5" /> Add Sale</>}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Sales History */}
        <div className="xl:col-span-8 space-y-6">
          <Card className="h-[calc(100vh-240px)] min-h-[500px] shadow-md flex flex-col">
            <CardHeader title="Sales History" subtitle="Recent transactions." />
            <div className="px-6 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search customer or date..." 
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
                            <th className="px-6 py-4">Customer</th>
                            <th className="px-6 py-4 text-center">Kilos</th>
                            <th className="px-6 py-4 text-right">Price</th>
                            <th className="px-6 py-4 text-right">Total Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredSales.map((sale) => (
                            <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-700">{sale.date}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <User className="w-4 h-4 text-slate-400" />
                                    {sale.customer || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-slate-500">
                                    {sale.kilos} kg
                                </td>
                                <td className="px-6 py-4 text-right text-slate-600">
                                    ₱{Number(sale.price).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-blue-600">
                                    ₱{Number(sale.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                        {filteredSales.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center">
                                        <Snowflake className="w-8 h-8 text-slate-300 mb-2" />
                                        <p>{searchTerm ? 'No matching sales found.' : 'No sales records found.'}</p>
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