/* eslint-disable @typescript-eslint/no-unused-vars */
 
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { AxiosError } from 'axios';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { 
  ShoppingCart, Plus, Trash2, Tag, Calculator, Search, 
  CreditCard, Receipt, TrendingUp, Package, User 
} from 'lucide-react';

// --- Types ---
interface Product {
  id: number;
  name: string;
  selling_price?: number | string;
}

interface InventoryItem {
  id: number;
  productId: number;
  product?: Product;
  quantity: number;
  selling_price?: number | string;
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
  const { showToast } = useToast();
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
      
      showToast('Sale recorded successfully!', 'success');
      reset();
      fetchData();
    } catch (err) {
      console.error(err);
      let msg = 'Failed to record sale.';
      if (err instanceof AxiosError && err.response?.data?.message) {
        msg = err.response.data.message;
      }
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateEstimatedTotal = () => {
    return formItems.reduce((total, item) => {
      const invItem = inventory.find((i) => i.productId === Number(item.productId));
      const rawPrice = invItem?.selling_price || invItem?.product?.selling_price || 0;
      const price = Number(rawPrice);
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
    return (
        <div className="h-[50vh] flex flex-col items-center justify-center text-slate-400">
            <CreditCard className="w-12 h-12 mb-4 opacity-50"/>
            <p className="text-lg font-medium">Access Restricted</p>
            <p className="text-sm">Only authorized staff can access the POS terminal.</p>
        </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(90vh-3rem)] gap-4">
      
      {/* --- HEADER --- */}
      <div className="shrink-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
                    <ShoppingCart className="w-8 h-8" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">POS Terminal</h1>
                    <p className="text-sm text-slate-500">Record transactions & manage register.</p>
                </div>
            </div>
            
            <div className="flex items-center gap-6 px-6 py-2 bg-slate-50 rounded-lg border border-slate-100">
               <div className="text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session Revenue</p>
                  <p className="text-2xl font-bold text-emerald-600 font-mono">
                    ₱{totalRevenue.toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </p>
               </div>
               <div className="hidden md:block w-px h-10 bg-slate-200"></div>
               <div className="hidden md:block text-right">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Transactions</p>
                  <p className="text-xl font-bold text-slate-700">{sales.length}</p>
               </div>
            </div>
        </div>
      </div>

      {/* --- MAIN CONTENT (Split View) --- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start h-full">
        
        {/* --- LEFT COLUMN: POS Register Form --- */}
        <div className="xl:col-span-4 h-full overflow-y-auto pr-1">
          <Card className="border-t-4 border-t-emerald-500 shadow-lg sticky top-0 h-fit flex flex-col">
            <CardHeader 
                title="New Transaction" 
                subtitle="Build the customer cart." 
                icon={<Receipt className="w-5 h-5 text-emerald-600"/>}
            />
            <CardContent className="flex flex-col gap-4">
              <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
                
                {/* Cart Items Area - FIXED HEIGHT SCROLLABLE (~5 Items) */}
                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-200 space-y-3 h-[410px] overflow-y-auto">
                  {fields.map((field, index) => {
                    const currentProductId = Number(formItems[index]?.productId);
                    const selectedInv = inventory.find(i => i.productId === currentProductId);
                    const rawPrice = selectedInv?.selling_price || selectedInv?.product?.selling_price || 0;
                    const price = Number(rawPrice);

                    return (
                      <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm group hover:border-emerald-200 transition-colors animate-in fade-in slide-in-from-bottom-2">
                        <div className="space-y-3">
                          
                          {/* Product Select */}
                          <div className="relative">
                            <Package className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                            <select
                              {...register(`items.${index}.productId` as const, { required: true })}
                              className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer"
                            >
                              <option value="">Scan / Select Product...</option>
                              {inventory.map((inv) => (
                                <option key={inv.id} value={inv.productId}>
                                  {inv.product?.name} (Stock: {inv.quantity})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-2 items-center">
                            {/* Quantity Input */}
                            <div className="flex-1 relative">
                                <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">Qty</span>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="0"
                                    {...register(`items.${index}.quantity` as const, { required: true, min: 0.01 })}
                                    className="w-full pl-10 p-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                                />
                            </div>
                            
                            {/* Price Badge */}
                            <div className="flex items-center justify-center h-full px-3 bg-slate-100 rounded-lg border border-slate-200 min-w-[80px]">
                                <span className="text-xs font-mono font-bold text-slate-600">
                                   ₱{price.toFixed(2)}
                                </span>
                            </div>

                            {/* Remove Button */}
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
                    className="w-full py-3 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border border-dashed border-emerald-200 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
                  >
                    <Plus className="w-4 h-4" /> Add Item Line
                  </button>
                </div>

                {/* Total & Action Area */}
                <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center bg-slate-800 text-white p-4 rounded-xl shadow-lg">
                        <div className="flex items-center gap-2">
                            <Calculator className="w-5 h-5 text-emerald-400" />
                            <span className="text-sm font-bold uppercase tracking-wider opacity-80">Total Due</span>
                        </div>
                        <div className="text-3xl font-bold font-mono tracking-tight">
                            <span className="text-emerald-400 mr-1">₱</span>
                            {calculateEstimatedTotal().toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg transition-all transform active:scale-95 ${
                        isLoading 
                            ? 'bg-slate-400 cursor-not-allowed' 
                            : 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 shadow-emerald-200'
                        }`}
                    >
                        {isLoading ? (
                            <span className="flex items-center justify-center gap-2">Processing...</span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <CreditCard className="w-5 h-5" /> Complete Transaction
                            </span>
                        )}
                    </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* --- RIGHT COLUMN: Sales History --- */}
        <div className="xl:col-span-8 h-full">
          <Card className="h-fit shadow-md flex flex-col border border-slate-200 overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search receipt ID, staff or date..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    />
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Real-time Log</span>
                </div>
            </div>

            {/* Table Area - FIXED HEIGHT SCROLLABLE (~5 Items) */}
            <div className="overflow-y-auto h-[650px]">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-400 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-4 bg-slate-50">Receipt Info</th>
                    <th className="px-6 py-4 bg-slate-50">Items Purchased</th>
                    <th className="px-6 py-4 bg-slate-50 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-emerald-50/30 transition-colors group cursor-default">
                      {/* ID & Date */}
                      <td className="px-6 py-4 align-top w-56">
                        <div className="flex items-center gap-2 mb-1.5">
                           <Receipt className="w-4 h-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                           <span className="font-mono text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 group-hover:border-emerald-200 transition-colors">#{sale.id}</span>
                        </div>
                        <div className="font-bold text-slate-800 text-sm mb-0.5">{new Date(sale.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-400">
                           <span>{new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                           <span>•</span>
                           <span className="flex items-center gap-1"><User className="w-3 h-3"/> {sale.staff.username}</span>
                        </div>
                      </td>
                      
                      {/* Items List */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {sale.items.map((item) => (
                            <div key={item.id} className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs shadow-sm">
                              <span className="font-semibold text-slate-700">{item.product?.name}</span> 
                              <span className="text-slate-400">|</span>
                              <span className="font-mono font-bold text-slate-600">x{item.quantity}</span>
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total Amount */}
                      <td className="px-6 py-4 align-top text-right">
                        <div className="font-mono font-bold text-lg text-emerald-600">
                            ₱{Number(sale.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-emerald-400 mt-1">Paid</div>
                      </td>
                    </tr>
                  ))}

                  {filteredSales.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-20 text-center text-slate-400 bg-slate-50/50">
                        <div className="flex flex-col items-center">
                          <div className="bg-slate-100 p-4 rounded-full mb-3">
                              <Search className="w-8 h-8 text-slate-300" />
                          </div>
                          <p className="font-medium text-slate-600">No transactions found.</p>
                          <p className="text-xs mt-1">Transactions will appear here once recorded.</p>
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