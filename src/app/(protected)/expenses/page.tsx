/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { 
  DollarSign, Calendar, Tag, FileText, Search, Filter, 
  TrendingDown, Building2, Truck, AlertCircle, Plus 
} from 'lucide-react';

// --- Types ---
interface Branch {
  id: number;
  name: string;
}

interface Expense {
  id: number;
  category: 'FREEZER_VAN' | 'LIVE_CHICKEN' | 'BRANCH';
  amount: number;
  description: string;
  date: string;
  branch?: Branch;
}

interface ExpenseFormData {
  category: 'FREEZER_VAN' | 'LIVE_CHICKEN' | 'BRANCH';
  branchId?: string;
  amount: string;
  description: string;
  date: string;
}

const BRANCHES_DATA: Branch[] = [
  { id: 1, name: 'San Roque (Main)' },
  { id: 2, name: 'Rawis' },
  { id: 3, name: 'Mondragon' },
  { id: 4, name: 'Catarman' },
  { id: 5, name: 'Catubig' },
  { id: 6, name: 'San Jose' },
];

export default function ExpensesPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'BRANCH' | 'LOGISTICS'>('ALL');

  const { register, handleSubmit, watch, reset } = useForm<ExpenseFormData>({
    defaultValues: {
      category: 'BRANCH',
      date: new Date().toISOString().split('T')[0], 
    },
  });

  const selectedCategory = watch('category');

  const fetchExpenses = async () => {
    if (!user) return;
    const endpoint = user.role === 'OWNER' ? '/expenses/owner' : '/expenses/branch';
    try {
      const res = await api.get<Expense[]>(endpoint);
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExpenses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- STATS CALCULATION ---
  const stats = useMemo(() => {
    const total = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const branchTotal = expenses
        .filter(e => e.category === 'BRANCH')
        .reduce((sum, exp) => sum + Number(exp.amount), 0);
    const logisticsTotal = expenses
        .filter(e => e.category !== 'BRANCH')
        .reduce((sum, exp) => sum + Number(exp.amount), 0);
    
    return { total, branchTotal, logisticsTotal };
  }, [expenses]);

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    try {
      await api.post('/expenses', {
        ...data,
        amount: Number(data.amount),
        branchId: data.branchId ? Number(data.branchId) : undefined,
      });
      showToast('Expense recorded successfully', 'success');
      reset({ date: new Date().toISOString().split('T')[0], category: 'BRANCH' });
      fetchExpenses();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Error';
      showToast(`Failed to add expense: ${msg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((exp) => {
    const matchesSearch = 
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.amount.toString().includes(searchTerm) ||
        (exp.branch?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = 
        categoryFilter === 'ALL' || 
        (categoryFilter === 'BRANCH' && exp.category === 'BRANCH') ||
        (categoryFilter === 'LOGISTICS' && exp.category !== 'BRANCH');

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="flex flex-col h-[calc(90vh-3rem)] gap-4">
      
      {/* --- TOP SECTION (Header + KPIs) --- */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-rose-600" />
                Expenses Management
            </h1>
            <p className="text-slate-500 mt-1">Track and manage operational costs and overheads.</p>
            </div>
        </div>

        {/* Financial Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-rose-50 text-rose-600 rounded-full"><TrendingDown className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Total Expenses</p>
                    <p className="text-2xl font-bold text-rose-600 font-mono">₱{stats.total.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-slate-50 text-slate-600 rounded-full"><Building2 className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Branch Ops</p>
                    <p className="text-2xl font-bold text-slate-800 font-mono">₱{stats.branchTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Truck className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Logistics (Van/Live)</p>
                    <p className="text-2xl font-bold text-slate-800 font-mono">₱{stats.logisticsTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
                </div>
            </div>
        </div>
      </div>

      {/* --- MAIN CONTENT (Split View) --- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start h-full">
        
        {/* --- LEFT COLUMN: Expense Form --- */}
        <div className="xl:col-span-4 h-full overflow-y-auto pr-1">
          <Card className="border-t-4 border-t-rose-600 shadow-lg sticky top-0">
            <CardHeader title="Record New Expense" subtitle="Log a new operational cost." />
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {/* Category & Branch Row */}
                <div className="space-y-4">
                    {user?.role === 'OWNER' && (
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Expense Category</label>
                        <div className="relative">
                            <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <select {...register('category')} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none transition-all cursor-pointer">
                                <option value="BRANCH">Branch Expense</option>
                                <option value="FREEZER_VAN">Freezer Van</option>
                                <option value="LIVE_CHICKEN">Live Chicken</option>
                            </select>
                        </div>
                    </div>
                    )}

                    {user?.role === 'OWNER' && selectedCategory === 'BRANCH' && (
                    <div className="animate-in fade-in slide-in-from-top-2">
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Branch</label>
                        <select {...register('branchId')} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none transition-all cursor-pointer">
                            <option value="">Select Branch...</option>
                            {BRANCHES_DATA.map((b) => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                    )}
                </div>

                {/* Amount & Date Row */}
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Date</label>
                        <div className="relative">
                             <input 
                                type="date" 
                                {...register('date', { required: true })} 
                                className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none transition-all" 
                             />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-2.5 text-rose-500 font-bold font-sans">₱</span>
                            <input 
                                type="number" 
                                step="0.01" 
                                {...register('amount', { required: true })} 
                                className="w-full pl-8 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none transition-all" 
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description / Note</label>
                    <div className="relative">
                        <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            {...register('description')} 
                            className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none transition-all" 
                            placeholder="e.g., Electricity Bill, Van Gas..."
                        />
                    </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-lg shadow-slate-200 transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-2"
                >
                  {isLoading ? 'Saving...' : <><Plus className="w-4 h-4"/> Record Expense</>}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* --- RIGHT COLUMN: Expenses List (Scrollable ~7 Items) --- */}
        <div className="xl:col-span-8 h-full">
          {/* Card height fits content, but Table container handles scroll */}
          <Card className="h-fit shadow-md flex flex-col border border-slate-200 overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search expenses..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition-all"
                    />
                </div>
                
                {/* Filter Tabs */}
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100">
                    {['ALL', 'BRANCH', 'LOGISTICS'].map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setCategoryFilter(cat as any)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                                categoryFilter === cat 
                                ? 'bg-white text-rose-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {cat === 'ALL' ? 'All' : cat === 'BRANCH' ? 'Branch' : 'Logistics'}
                        </button>
                    ))}
                </div>
            </div>

            {/* FIXED HEIGHT CONTAINER: Shows approx 7-8 items before scrolling */}
            <div className="overflow-y-auto h-[600px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-400 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 bg-slate-50">Date</th>
                    <th className="px-6 py-4 bg-slate-50">Category</th>
                    <th className="px-6 py-4 bg-slate-50">Description</th>
                    <th className="px-6 py-4 bg-slate-50 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-rose-50/30 transition-colors">
                      {/* Date Column with Styling */}
                      <td className="px-6 py-4 whitespace-nowrap">
                         <div className="flex flex-col">
                             <span className="font-bold text-slate-700">{new Date(exp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}</span>
                             <span className="text-xs text-slate-400">{new Date(exp.date).getFullYear()}</span>
                         </div>
                      </td>
                      
                      {/* Category Badge */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold border ${
                            exp.category === 'BRANCH' 
                            ? 'bg-slate-100 text-slate-600 border-slate-200' 
                            : 'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {exp.category.replace('_', ' ')}
                        </span>
                        {exp.branch && (
                             <div className="flex items-center gap-1 mt-1.5 text-xs text-slate-500 font-medium">
                                 <Building2 className="w-3 h-3 text-slate-400"/> {exp.branch.name}
                             </div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-slate-600 font-medium">{exp.description || '-'}</td>
                      
                      {/* Amount with Mono Font */}
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-rose-600 font-mono">
                        -₱{Number(exp.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                      </td>
                    </tr>
                  ))}
                  
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center">
                          <DollarSign className="w-12 h-12 text-slate-200 mb-3" />
                          <p className="font-medium">No expenses found.</p>
                          <p className="text-xs mt-1">Try changing filters or adding a new record.</p>
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