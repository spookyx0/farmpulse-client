"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext'; // <-- Import Toast
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Card, CardContent, CardHeader } from '../../components/ui/Card'; // <-- Import Card
import { ShoppingCart, Plus, Trash2, Tag, Calculator } from 'lucide-react'; // <-- Import Icons

// --- Types ---
interface Product {
  id: number;
  name: string;
  selling_price?: number;
}

interface InventoryItem {
  id: number;
  productId: number;
  product?: Product;
  quantity: number;
  selling_price?: number;
}

interface SaleItem {
  id: number;
  product?: Product;
  quantity: number;
  price_at_sale: number;
}

interface Sale {
  id: number;
  total_amount: number;
  created_at: string;
  staff: { username: string };
  items: SaleItem[];
}

// Form Data Types
interface SaleFormItem {
  productId: string;
  quantity: string;
}

interface SaleFormData {
  items: SaleFormItem[];
}

export default function SalesPage() {
  const { user } = useAuth();
  const { showToast } = useToast(); // <-- Use Hook
  const [sales, setSales] = useState<Sale[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Setup Form
  const { register, control, handleSubmit, watch, reset } = useForm<SaleFormData>({
    defaultValues: {
      items: [{ productId: '', quantity: '' }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  const formItems = watch('items');

  // Fetch Data
  const fetchData = async () => {
    if (!user) return;
    try {
      const invRes = await api.get<InventoryItem[]>('/inventory/branch');
      setInventory(invRes.data);
      const salesRes = await api.get<Sale[]>('/sales');
      setSales(salesRes.data);
    } catch (err) {
      console.error('Error fetching data:', err);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Handle Submit
  const onSubmit = async (data: SaleFormData) => {
    setIsLoading(true);
    try {
      const formattedData = {
        items: data.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        })),
      };

      await api.post('/sales', formattedData);
      
      showToast('Sale recorded successfully!', 'success'); // <-- Toast Success
      reset();
      fetchData();
    } catch (err) {
      console.error(err);
      let msg = 'Failed to record sale.';
      if (err instanceof AxiosError && err.response?.data?.message) {
        msg = err.response.data.message;
      }
      showToast(msg, 'error'); // <-- Toast Error
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEstimatedTotal = () => {
    return formItems.reduce((total, item) => {
      const invItem = inventory.find((i) => i.productId === Number(item.productId));
      const price = invItem?.selling_price || invItem?.product?.selling_price || 0;
      return total + (Number(item.quantity) || 0) * price;
    }, 0);
  };

  if (user?.role !== 'STAFF') {
    return <div className="p-6">Access Denied. Only Staff can record sales.</div>;
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
        <ShoppingCart className="w-8 h-8 text-green-600" />
        Sales Register
      </h1>

      {/* --- New Sale Form --- */}
      <Card className="border-t-4 border-t-green-600">
        <CardHeader title="Record New Transaction" subtitle="Add items to cart and complete sale." />
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-3 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <label className="block text-sm font-medium text-slate-700 mb-2">Items in Cart</label>
              
              {fields.map((field, index) => {
                const currentProductId = Number(formItems[index]?.productId);
                const selectedInv = inventory.find(i => i.productId === currentProductId);

                return (
                  <div key={field.id} className="flex flex-col md:flex-row gap-3 items-start md:items-center bg-white p-3 rounded border border-slate-200 shadow-sm">
                    <div className="flex-1 w-full">
                      <div className="relative">
                        <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <select
                          {...register(`items.${index}.productId` as const, { required: true })}
                          className="w-full pl-10 p-2 border-slate-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="">Select Product...</option>
                          {inventory.map((inv) => (
                            <option key={inv.id} value={inv.productId}>
                              {inv.product?.name} (Stock: {inv.quantity})
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="w-full md:w-32">
                      <input
                        type="number"
                        step="0.01"
                        placeholder="Qty"
                        {...register(`items.${index}.quantity` as const, { required: true, min: 0.01 })}
                        className="w-full p-2 border-slate-300 rounded-md text-sm focus:ring-green-500 focus:border-green-500"
                      />
                    </div>

                    <div className="flex items-center text-sm text-slate-500 w-full md:w-32 justify-end md:justify-start">
                       {selectedInv ? `₱${selectedInv.selling_price || selectedInv.product?.selling_price || 0} / unit` : '-'}
                    </div>

                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="text-slate-400 hover:text-red-600 transition-colors p-1"
                      title="Remove Item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
              
              <button
                type="button"
                onClick={() => append({ productId: '', quantity: '' })}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-2"
              >
                <Plus className="w-4 h-4" /> Add Another Item
              </button>
            </div>

            <div className="flex justify-between items-center pt-2 border-t border-slate-100">
              <div className="flex items-center gap-2 text-slate-600">
                <Calculator className="w-5 h-5" />
                <span className="text-sm">Estimated Total</span>
              </div>
              <div className="text-2xl font-bold text-slate-800">
                <span className="text-green-600">₱</span>{calculateEstimatedTotal().toFixed(2)}
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 rounded-lg text-white font-semibold text-lg shadow-md transition-all ${
                isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
              }`}
            >
              {isLoading ? 'Processing Transaction...' : 'Complete Sale'}
            </button>
          </form>
        </CardContent>
      </Card>

      {/* --- Sales History --- */}
      <Card>
        <CardHeader title="Recent Sales History" subtitle="Transactions recorded by this branch." />
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500">
              <tr>
                <th className="px-6 py-3">ID</th>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Items Sold</th>
                <th className="px-6 py-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 font-mono text-xs text-slate-400">#{sale.id}</td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900">{new Date(sale.created_at).toLocaleDateString()}</div>
                    <div className="text-xs text-slate-400">{new Date(sale.created_at).toLocaleTimeString()}</div>
                  </td>
                  <td className="px-6 py-4">
                    <ul className="list-disc list-inside text-xs space-y-1">
                      {sale.items.map((item) => (
                        <li key={item.id}>
                          <span className="font-medium text-slate-700">{item.product?.name}</span> 
                          <span className="text-slate-400 ml-1">x{item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-green-600">
                    ₱{Number(sale.total_amount).toFixed(2)}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-slate-400">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}