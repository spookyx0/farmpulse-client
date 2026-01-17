"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext'; // <-- Import Toast
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Card, CardContent, CardHeader } from '../../components/ui/Card'; // <-- Import Card
import { ShoppingCart, Plus, Trash2, Tag, Calculator, Search } from 'lucide-react'; // <-- Import Icons

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
  const [searchTerm, setSearchTerm] = useState('');

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

  const filteredSales = sales.filter((sale) => 
    sale.id.toString().includes(searchTerm) ||
    sale.staff.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    new Date(sale.created_at).toLocaleDateString().includes(searchTerm)
  );

  const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.total_amount), 0);

  if (user?.role !== 'STAFF') {
    return <div className="p-6">Access Denied. Only Staff can record sales.</div>;
  }

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
            <ShoppingCart className="w-8 h-8 text-green-600" />
            Sales Register
          </h1>
          <p className="text-slate-500 mt-1">Process transactions and view history.</p>
        </div>
        <div className="flex gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Revenue</p>
              <p className="text-2xl font-bold text-green-600">₱{totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: New Sale Form */}
        <div className="xl:col-span-4 space-y-6">
          <Card className="border-t-4 border-t-green-600 shadow-lg sticky top-6">
            <CardHeader title="New Transaction" subtitle="Add items to cart." />
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Cart Items</label>
                  
                  {fields.map((field, index) => {
                    const currentProductId = Number(formItems[index]?.productId);
                    const selectedInv = inventory.find(i => i.productId === currentProductId);

                    return (
                      <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                        <div className="space-y-3">
                          <div className="relative">
                            <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <select
                              {...register(`items.${index}.productId` as const, { required: true })}
                              className="w-full pl-9 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                            >
                              <option value="">Select Product...</option>
                              {inventory.map((inv) => (
                                <option key={inv.id} value={inv.productId}>
                                  {inv.product?.name} (Stock: {inv.quantity})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-2">
                            <div className="flex-1">
                              <input
                                type="number"
                                step="0.01"
                                placeholder="Qty"
                                {...register(`items.${index}.quantity` as const, { required: true, min: 0.01 })}
                                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                              />
                            </div>
                            <div className="flex items-center justify-end text-xs font-medium text-slate-500 bg-slate-100 px-3 rounded-lg border border-slate-200 min-w-[80px]">
                               {selectedInv ? `₱${selectedInv.selling_price || selectedInv.product?.selling_price || 0}` : '-'}
                            </div>
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Remove Item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={() => append({ productId: '', quantity: '' })}
                    className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-dashed border-blue-200 rounded-lg font-medium flex items-center justify-center gap-1 transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Item
                  </button>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Calculator className="w-5 h-5" />
                    <span className="text-sm font-medium">Total</span>
                  </div>
                  <div className="text-2xl font-bold text-slate-800">
                    <span className="text-green-600">₱</span>{calculateEstimatedTotal().toFixed(2)}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3.5 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-95 ${
                    isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-green-200'
                  }`}
                >
                  {isLoading ? 'Processing...' : 'Complete Sale'}
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
                  placeholder="Search by ID, Date or Staff..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                />
              </div>
            </div>

            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-4">ID & Date</th>
                    <th className="px-6 py-4">Items Sold</th>
                    <th className="px-6 py-4 text-right">Total Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-center gap-2 mb-1">
                           <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">#{sale.id}</span>
                        </div>
                        <div className="font-medium text-slate-900">{new Date(sale.created_at).toLocaleDateString()}</div>
                        <div className="text-xs text-slate-400 flex items-center gap-1">
                          {new Date(sale.created_at).toLocaleTimeString()} • {sale.staff.username}
                        </div>
                      </td>
                      <td className="px-6 py-4 align-top">
                        <ul className="space-y-1">
                          {sale.items.map((item) => (
                            <li key={item.id} className="text-xs flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-green-400"></div>
                              <span className="font-medium text-slate-700">{item.product?.name}</span> 
                              <span className="text-slate-400 bg-slate-50 px-1.5 rounded border border-slate-100">x{item.quantity}</span>
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-green-600 align-top">
                        ₱{Number(sale.total_amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-12 text-center text-slate-400">
                        <div className="flex flex-col items-center">
                          <ShoppingCart className="w-8 h-8 text-slate-300 mb-2" />
                          <p>{searchTerm ? 'No matching sales found.' : 'No sales recorded yet.'}</p>
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