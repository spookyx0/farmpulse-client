"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';

interface LCInventory {
  id: number;
  date: string;
  supplier: string;
  heads: number;
  kilos: number;
  amount: number;
}

// Define Form Data Interface
interface LCInventoryFormData {
  date: string;
  supplier: string;
  heads: string;
  kilos: string;
  amount: string;
}

export default function LiveChickenInventoryPage() {
  const [items, setItems] = useState<LCInventory[]>([]);
  const { register, handleSubmit, reset } = useForm<LCInventoryFormData>();

  const fetchItems = () => {
    api.get<LCInventory[]>('/live-chicken/inventory').then((res) => setItems(res.data));
  };

  useEffect(() => { fetchItems(); }, []);

  const onSubmit = async (data: LCInventoryFormData) => {
    await api.post('/live-chicken/inventory', {
      ...data,
      heads: Number(data.heads),
      kilos: Number(data.kilos),
      amount: Number(data.amount),
    });
    reset();
    fetchItems();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Live Chicken Inventory</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <input type="date" {...register('date')} className="border p-2 rounded" required />
          <input placeholder="Supplier" {...register('supplier')} className="border p-2 rounded" />
          <input placeholder="Heads (Count)" type="number" {...register('heads')} className="border p-2 rounded" required />
          <input placeholder="Kilos" type="number" step="0.01" {...register('kilos')} className="border p-2 rounded" required />
          <input placeholder="Total Amount" type="number" step="0.01" {...register('amount')} className="border p-2 rounded" required />
          <button type="submit" className="bg-blue-600 text-white p-2 rounded col-span-2 md:col-span-5">Add Inventory</button>
        </form>
      </div>

      <div className="bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Supplier</th>
              <th className="p-3 text-right">Heads</th>
              <th className="p-3 text-right">Kilos</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t">
                <td className="p-3">{item.date}</td>
                <td className="p-3">{item.supplier}</td>
                <td className="p-3 text-right">{item.heads}</td>
                <td className="p-3 text-right">{item.kilos}</td>
                <td className="p-3 text-right font-bold">{item.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}