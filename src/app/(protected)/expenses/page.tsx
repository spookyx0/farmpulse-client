"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext'; // <-- Import Toast
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Card, CardContent, CardHeader } from '../../components/ui/Card'; // <-- Import Card
import { DollarSign, Calendar, Tag, FileText } from 'lucide-react'; // <-- Import Icons

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

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
        <DollarSign className="w-8 h-8 text-red-600" />
        Expenses Management
      </h1>

      {/* Add Expense Form */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader title="Record New Expense" subtitle="Log daily operational costs." />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {user?.role === 'OWNER' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <select {...register('category')} className="w-full pl-9 p-2 border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500">
                    <option value="BRANCH">Branch Expense</option>
                    <option value="FREEZER_VAN">Freezer Van</option>
                    <option value="LIVE_CHICKEN">Live Chicken</option>
                  </select>
                </div>
              </div>
            )}

            {user?.role === 'OWNER' && selectedCategory === 'BRANCH' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Branch</label>
                <select {...register('branchId')} className="w-full p-2 border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500">
                  <option value="">Select Branch...</option>
                  {BRANCHES_DATA.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-500">$</span>
                <input 
                  type="number" 
                  step="0.01" 
                  {...register('amount', { required: true })} 
                  className="w-full pl-8 p-2 border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500" 
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="date" 
                  {...register('date', { required: true })} 
                  className="w-full pl-9 p-2 border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500" 
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  {...register('description')} 
                  className="w-full pl-9 p-2 border-slate-300 rounded-lg focus:ring-red-500 focus:border-red-500" 
                  placeholder="e.g., Electricity Bill, Transport, Maintenance"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full bg-red-600 text-white py-2.5 rounded-lg font-medium hover:bg-red-700 shadow-sm transition-colors disabled:bg-slate-400"
              >
                {isLoading ? 'Saving...' : 'Record Expense'}
              </button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">{exp.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {exp.category.replace('_', ' ')}
                    </span>
                    {exp.branch && <div className="text-xs text-slate-400 mt-1">{exp.branch.name}</div>}
                  </td>
                  <td className="px-6 py-4">{exp.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right font-bold text-red-600">
                    -${Number(exp.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && (
                <tr><td colSpan={4} className="p-8 text-center text-slate-400">No expenses recorded.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}