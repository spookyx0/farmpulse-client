"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';
import { useToast } from '../../../contexts/ToastContext';
import { Card, CardContent, CardHeader } from '../../../components/ui/Card';
import { Truck, MapPin, Search, Plus, Egg, DollarSign, Calendar, Scale } from 'lucide-react';

interface LCDistribution {
  id: number;
  date: string;
  location: string;
  heads: number;
  kilos: number;
  amount: number;
}

// Define Form Data Interface
interface LCDistributionFormData {
  date: string;
  location: string;
  heads: string;
  kilos: string;
  amount: string;
}

export default function LiveChickenDistributionPage() {
  const { showToast } = useToast();
  const [dist, setDist] = useState<LCDistribution[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { register, handleSubmit, reset } = useForm<LCDistributionFormData>();

  const fetchDist = () => {
    api.get<LCDistribution[]>('/live-chicken/distribution')
      .then((res) => setDist(res.data))
      .catch((err) => console.error(err));
  };

  useEffect(() => { fetchDist(); }, []);

  const onSubmit = async (data: LCDistributionFormData) => {
    setIsLoading(true);
    try {
      await api.post('/live-chicken/distribution', {
        ...data,
        heads: Number(data.heads),
        kilos: Number(data.kilos),
        amount: Number(data.amount),
      });
      showToast('Distribution recorded successfully!', 'success');
      reset();
      fetchDist();
    } catch (error) {
      showToast('Failed to record distribution.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredDist = dist.filter(d => 
    d.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.date.includes(searchTerm)
  );

  const totalSales = dist.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <Truck className="w-8 h-8 text-amber-600" />
            Live Chicken Distribution
          </h1>
          <p className="text-slate-500 mt-1">Track sales and deliveries to stores.</p>
        </div>
        <div className="flex gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Sales</p>
              <p className="text-2xl font-bold text-amber-600">₱{totalSales.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Record Distribution Form */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-amber-600 shadow-lg sticky top-6">
            <CardHeader title="New Distribution" subtitle="Record delivery details." />
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
                {/* Location */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Location</label>
                   <div className="relative">
                     <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                     <input placeholder="e.g. SKK Store" {...register('location', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                   </div>
                </div>
                {/* Heads */}
                <div>
                   <label className="block text-sm font-semibold text-slate-700 mb-2">Heads</label>
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
                     <span className="absolute left-3 top-3.5 text-slate-400 font-sans font-bold">₱</span>
                     <input type="number" step="0.01" placeholder="0.00" {...register('amount', {required: true})} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-amber-500 outline-none transition-all" />
                   </div>
                </div>

                <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-amber-200 transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-4">
                    {isLoading ? 'Saving...' : <><Plus className="w-5 h-5" /> Record Distribution</>}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Distribution History */}
        <div className="xl:col-span-8 space-y-6">
          <Card className="h-[calc(100vh-240px)] min-h-[500px] shadow-md flex flex-col">
            <CardHeader title="Distribution History" subtitle="Recent transactions." />
            <div className="px-6 pb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search location or date..." 
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
                            <th className="px-6 py-4">Location</th>
                            <th className="px-6 py-4 text-center">Heads</th>
                            <th className="px-6 py-4 text-center">Kilos</th>
                            <th className="px-6 py-4 text-right">Amount</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredDist.map((d) => (
                            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
                                <td className="px-6 py-4 font-medium text-slate-700">{d.date}</td>
                                <td className="px-6 py-4 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-slate-400" />
                                    {d.location}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                        {d.heads}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center font-mono text-slate-500">
                                    {d.kilos} kg
                                </td>
                                <td className="px-6 py-4 text-right font-bold text-green-600">
                                    ₱{d.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        ))}
                        {filteredDist.length === 0 && (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    <div className="flex flex-col items-center">
                                        <Truck className="w-8 h-8 text-slate-300 mb-2" />
                                        <p>{searchTerm ? 'No matching records found.' : 'No distribution records found.'}</p>
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