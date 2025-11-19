"use client";

import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { AxiosError } from 'axios';

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

  // Watch form values to calculate estimated total UI
  const formItems = watch('items');

  // Fetch Data (Inventory & Sales History)
  const fetchData = async () => {
    if (!user) return;
    try {
      // 1. Get Inventory (to populate dropdowns)
      const invRes = await api.get<InventoryItem[]>('/inventory/branch');
      setInventory(invRes.data);

      // 2. Get Sales History
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
      // Format data for API
      const formattedData = {
        items: data.items.map((item) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity),
        })),
      };

      await api.post('/sales', formattedData);
      
      alert('Sale recorded successfully!');
      reset(); // Clear form
      fetchData(); // Refresh list and inventory
    } catch (err) {
      console.error(err);
      let msg = 'Failed to record sale.';
      
      // Fix for "Unexpected any" error by type checking
      if (err instanceof AxiosError && err.response?.data?.message) {
        msg = err.response.data.message;
      }
      
      alert(`Error: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to calculate estimated total for the UI
  const calculateEstimatedTotal = () => {
    return formItems.reduce((total, item) => {
      const invItem = inventory.find((i) => i.productId === Number(item.productId));
      // Note: Price comes from Owner Inventory setting, usually passed down to branch or product
      // For MVP, we use the selling_price found in the inventory object
      const price = invItem?.selling_price || invItem?.product?.selling_price || 0;
      return total + (Number(item.quantity) || 0) * price;
    }, 0);
  };

  if (user?.role !== 'STAFF') {
    return <div className="p-6">Access Denied. Only Staff can record sales.</div>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Sales Register</h1>

      {/* --- New Sale Form --- */}
      <div className="bg-white p-6 rounded-lg shadow-md border-t-4 border-green-600">
        <h2 className="text-xl font-semibold mb-4">Record New Sale</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-3">
            <label className="block font-medium text-gray-700">Items Sold:</label>
            
            {fields.map((field, index) => {
              // Find selected inventory item to show available stock/price
              const currentProductId = Number(formItems[index]?.productId);
              const selectedInv = inventory.find(i => i.productId === currentProductId);

              return (
                <div key={field.id} className="flex flex-col md:flex-row gap-3 p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex-1">
                    <select
                      {...register(`items.${index}.productId` as const, { required: true })}
                      className="w-full border p-2 rounded"
                    >
                      <option value="">Select Product...</option>
                      {inventory.map((inv) => (
                        <option key={inv.id} value={inv.productId}>
                          {inv.product?.name} (Stock: {inv.quantity})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-full md:w-32">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="Qty"
                      {...register(`items.${index}.quantity` as const, { required: true, min: 0.01 })}
                      className="w-full border p-2 rounded"
                    />
                  </div>

                  <div className="flex items-center text-sm text-gray-500 w-full md:w-32">
                     {selectedInv ? `$${selectedInv.selling_price || selectedInv.product?.selling_price || 0} / unit` : '-'}
                  </div>

                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-500 font-bold px-2 hover:text-red-700"
                    title="Remove Item"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          <div className="flex justify-between items-center pt-2">
            <button
              type="button"
              onClick={() => append({ productId: '', quantity: '' })}
              className="text-blue-600 hover:underline text-sm font-medium"
            >
              + Add Another Item
            </button>
            <div className="text-xl font-bold">
              Total: <span className="text-green-600">${calculateEstimatedTotal().toFixed(2)}</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={`w-full py-3 rounded text-white font-bold text-lg ${
              isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {isLoading ? 'Processing...' : 'Complete Sale'}
          </button>
        </form>
      </div>

      {/* --- Sales History --- */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Recent Sales History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{sale.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {new Date(sale.created_at).toLocaleDateString()} {new Date(sale.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    <ul className="list-disc list-inside">
                      {sale.items.map((item) => (
                        <li key={item.id}>
                          {item.product?.name} x {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-green-600">
                    ${sale.total_amount}
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}