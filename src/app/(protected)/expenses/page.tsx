"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext'; // <-- Import Toast
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Card, CardContent, CardHeader } from '../../components/ui/Card'; // <-- Import Card
import { DollarSign, Calendar, Tag, FileText, Search, Filter } from 'lucide-react'; // <-- Import Icons

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
  const { showToast } = useToast(); // <-- Use Hook
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

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

  const onSubmit = async (data: ExpenseFormData) => {
    setIsLoading(true);
    try {
      await api.post('/expenses', {
        ...data,
        amount: Number(data.amount),
        branchId: data.branchId ? Number(data.branchId) : undefined,
      });
      showToast('Expense recorded successfully', 'success'); // <-- Toast Success
      reset({ date: new Date().toISOString().split('T')[0], category: 'BRANCH' });
      fetchExpenses();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Error';
      showToast(`Failed to add expense: ${msg}`, 'error'); // <-- Toast Error
    } finally {
      setIsLoading(false);
    }
  };

  const filteredExpenses = expenses.filter((exp) => 
    exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    exp.amount.toString().includes(searchTerm) ||
    (exp.branch?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    exp.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAmount = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-red-600" />
            Expenses Management
          </h1>
          <p className="text-slate-500 mt-1">Track and manage operational costs.</p>
        </div>
        <div className="flex gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">₱{totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Add Expense Form */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-red-600 shadow-lg sticky top-6">
            <CardHeader title="Record New Expense" subtitle="Log daily operational costs." />
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                
                {user?.role === 'OWNER' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                      <select {...register('category')} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all">
                        <option value="BRANCH">Branch Expense</option>
                        <option value="FREEZER_VAN">Freezer Van</option>
                        <option value="LIVE_CHICKEN">Live Chicken</option>
                      </select>
                    </div>
                  </div>
                )}

                {user?.role === 'OWNER' && selectedCategory === 'BRANCH' && (
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Branch</label>
                    <select {...register('branchId')} className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all">
                      <option value="">Select Branch...</option>
                      {BRANCHES_DATA.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-3.5 text-slate-400 font-sans font-bold">₱</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      {...register('amount', { required: true })} 
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="date" 
                      {...register('date', { required: true })} 
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                  <div className="relative">
                    <FileText className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                    <input 
                      type="text" 
                      {...register('description')} 
                      className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-red-500 outline-none transition-all" 
                      placeholder="e.g., Electricity Bill"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-red-200 transition-all transform active:scale-95 flex justify-center items-center gap-2 mt-4"
                >
                  {isLoading ? 'Saving...' : 'Record Expense'}
                </button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Expenses List */}
        <div className="xl:col-span-8 space-y-6">
          <Card className="h-[calc(100vh-240px)] min-h-[500px] shadow-md flex flex-col">
            <CardHeader title="Expense History" subtitle="Recent operational costs." />
            
            <div className="px-6 pb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search expenses..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                />
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Category</th>
                    <th className="px-6 py-4">Description</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-700">{exp.date}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                          {exp.category.replace('_', ' ')}
                        </span>
                        {exp.branch && <div className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Tag className="w-3 h-3"/> {exp.branch.name}</div>}
                      </td>
                      <td className="px-6 py-4 text-slate-600">{exp.description || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-red-600">
                        -₱{Number(exp.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center">
                          <DollarSign className="w-8 h-8 text-slate-300 mb-2" />
                          <p>{searchTerm ? 'No matching expenses found.' : 'No expenses recorded.'}</p>
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