"use client";

import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AxiosError } from 'axios';

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

// Static Branches (Same as Deliveries Page)
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
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { register, handleSubmit, watch, reset } = useForm<ExpenseFormData>({
    defaultValues: {
      category: 'BRANCH',
      date: new Date().toISOString().split('T')[0], // Today's date
    },
  });

  const selectedCategory = watch('category');

  // Fetch Expenses
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
      alert('Expense added!');
      reset({ date: new Date().toISOString().split('T')[0], category: 'BRANCH' });
      fetchExpenses();
    } catch (err) {
      const msg = err instanceof AxiosError ? err.response?.data?.message : 'Error';
      alert(`Failed: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Expenses Management</h1>

      {/* Add Expense Form */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Record Expense</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Owner can choose category */}
          {user?.role === 'OWNER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Category</label>
              <select {...register('category')} className="w-full border p-2 rounded mt-1">
                <option value="BRANCH">Branch Expense</option>
                <option value="FREEZER_VAN">Freezer Van</option>
                <option value="LIVE_CHICKEN">Live Chicken</option>
              </select>
            </div>
          )}

          {/* Branch Selection (Only for Owner if Category is BRANCH) */}
          {user?.role === 'OWNER' && selectedCategory === 'BRANCH' && (
            <div>
              <label className="block text-sm font-medium text-gray-700">Branch</label>
              <select {...register('branchId')} className="w-full border p-2 rounded mt-1">
                <option value="">Select Branch...</option>
                {BRANCHES_DATA.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Amount</label>
            <input 
              type="number" 
              step="0.01" 
              {...register('amount', { required: true })} 
              className="w-full border p-2 rounded mt-1" 
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Date</label>
            <input 
              type="date" 
              {...register('date', { required: true })} 
              className="w-full border p-2 rounded mt-1" 
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <input 
              type="text" 
              {...register('description')} 
              className="w-full border p-2 rounded mt-1" 
              placeholder="e.g., Electricity Bill, Transport"
            />
          </div>

          <div className="md:col-span-2">
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 disabled:bg-gray-400"
            >
              {isLoading ? 'Saving...' : 'Add Expense'}
            </button>
          </div>
        </form>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Category</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {expenses.map((exp) => (
              <tr key={exp.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{exp.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {exp.category} 
                  {exp.branch && <span className="text-xs block text-blue-600">{exp.branch.name}</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">{exp.description || '-'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                  ${Number(exp.amount).toFixed(2)}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr><td colSpan={4} className="p-4 text-center text-gray-500">No expenses recorded.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}