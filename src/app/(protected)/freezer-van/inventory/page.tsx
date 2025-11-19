"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';

interface FVInventoryItem {
  id: number;
  date: string;
  particulars: string;
  kilos: number;
  price: number;
  amount: number;
  travel_expense: number;
  other_expense: number;
  total_amount: number;
}

// Define Form Data Interface
interface FVInventoryFormData {
  date: string;
  supplier: string;
  particulars: string;
  kilos: string;
  price: string;
  travel_expense: string;
  other_expense: string;
}

export default function FreezerVanInventoryPage() {
  const [items, setItems] = useState<FVInventoryItem[]>([]);
  const { register, handleSubmit, reset } = useForm<FVInventoryFormData>();

  const fetchItems = () => {
    api.get<FVInventoryItem[]>('/freezer-van/inventory').then((res) => setItems(res.data));
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (data: FVInventoryFormData) => {
    await api.post('/freezer-van/inventory', {
      ...data,
      kilos: Number(data.kilos),
      price: Number(data.price),
      amount: Number(data.kilos) * Number(data.price),
      travel_expense: Number(data.travel_expense),
      other_expense: Number(data.other_expense),
    });
    reset();
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Freezer Van Inventory & Monitoring</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <input type="date" {...register('date')} className="border p-2 rounded" required />
          <input placeholder="Supplier" {...register('supplier')} className="border p-2 rounded" />
          <input placeholder="Particulars (Item Name)" {...register('particulars')} className="border p-2 rounded" required />
          <input placeholder="Kilos" type="number" step="0.01" {...register('kilos')} className="border p-2 rounded" required />
          <input placeholder="Price" type="number" step="0.01" {...register('price')} className="border p-2 rounded" required />
          <input placeholder="Travel Expense" type="number" step="0.01" {...register('travel_expense')} className="border p-2 rounded" />
          <input placeholder="Other Expense" type="number" step="0.01" {...register('other_expense')} className="border p-2 rounded" />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded col-span-2 md:col-span-1">Add Record</button>
        </form>
      </div>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Particulars</th>
              <th className="p-3 text-right">Kilos</th>
              <th className="p-3 text-right">Amount</th>
              <th className="p-3 text-right">Expenses</th>
              <th className="p-3 text-right">Total Cost</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">{item.date}</td>
                <td className="p-3">{item.particulars}</td>
                <td className="p-3 text-right">{item.kilos}</td>
                <td className="p-3 text-right">{item.amount}</td>
                <td className="p-3 text-right text-red-500">{(Number(item.travel_expense) + Number(item.other_expense)).toFixed(2)}</td>
                <td className="p-3 text-right font-bold">{item.total_amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}