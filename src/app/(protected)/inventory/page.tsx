"use client";

import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

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
  purchase_price?: number;
  selling_price?: number;
  supplier?: string;
}

// Form Data Types
interface AddStockFormData {
  productId: string;
  quantity: string;
  purchase_price: string;
  selling_price: string;
  supplier: string;
}

export default function InventoryPage() {
  const { user } = useAuth();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const { register, handleSubmit, reset } = useForm<AddStockFormData>();
  const [refresh, setRefresh] = useState(false); // Trigger to re-fetch data

  // Fetch Data
  useEffect(() => {
    if (!user) return;

    const endpoint =
      user.role === 'OWNER' ? '/inventory/owner' : '/inventory/branch';

    api
      .get<InventoryItem[]>(endpoint)
      .then((res) => setInventory(res.data))
      .catch((err) => console.error(err));
  }, [user, refresh]);

  // Owner: Add Stock Function
  const onAddStock = async (data: AddStockFormData) => {
    try {
      await api.post('/inventory/owner/add', {
        productId: Number(data.productId),
        quantity: Number(data.quantity),
        purchase_price: Number(data.purchase_price),
        selling_price: Number(data.selling_price),
        supplier: data.supplier,
      });
      reset();
      setRefresh(!refresh); // Reload table
      alert('Stock added successfully!');
    } catch (error) {
      alert('Failed to add stock. Check console.');
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {user?.role === 'OWNER' ? 'Master Inventory' : 'Branch Inventory'}
        </h1>
      </div>

      {/* Owner Add Stock Form */}
      {user?.role === 'OWNER' && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">
            Add Stock to Master Inventory
          </h2>
          <form
            onSubmit={handleSubmit(onAddStock)}
            className="grid grid-cols-1 md:grid-cols-5 gap-4"
          >
            <input
              {...register('productId')}
              placeholder="Product ID"
              type="number"
              className="border p-2 rounded"
              required
            />
            <input
              {...register('quantity')}
              placeholder="Quantity/Kilos"
              type="number"
              step="0.01"
              className="border p-2 rounded"
              required
            />
            <input
              {...register('purchase_price')}
              placeholder="Purchase Price"
              type="number"
              step="0.01"
              className="border p-2 rounded"
              required
            />
            <input
              {...register('selling_price')}
              placeholder="Selling Price"
              type="number"
              step="0.01"
              className="border p-2 rounded"
              required
            />
            <input
              {...register('supplier')}
              placeholder="Supplier"
              className="border p-2 rounded"
            />
            <button
              type="submit"
              className="bg-blue-600 text-white p-2 rounded hover:bg-blue-700 col-span-1 md:col-span-5"
            >
              Add Stock
            </button>
          </form>
        </div>
      )}

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Product
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Quantity
              </th>
              {user?.role === 'OWNER' && (
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchase Price
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Selling Price
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {inventory.map((item) => (
              <tr key={item.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  {item.product?.name || `ID: ${item.productId}`}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-bold">
                  {item.quantity}
                </td>
                {user?.role === 'OWNER' && (
                  <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                    ${item.purchase_price}
                  </td>
                )}
                <td className="px-6 py-4 whitespace-nowrap text-green-600 font-bold">
                  $
                  {item.selling_price ||
                    item.product?.selling_price ||
                    '-'}
                </td>
              </tr>
            ))}
            {inventory.length === 0 && (
              <tr>
                <td colSpan={4} className="p-4 text-center text-gray-500">
                  No inventory found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}