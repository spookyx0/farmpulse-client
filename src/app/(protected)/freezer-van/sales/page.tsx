"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../../services/api';

interface FVSale {
  id: number;
  date: string;
  customer: string;
  kilos: number;
  price: number;
  amount: number;
}

// Define Form Data Interface
interface FVSaleFormData {
  date: string;
  customer: string;
  kilos: string;
  price: string;
}

export default function FreezerVanSalesPage() {
  const [sales, setSales] = useState<FVSale[]>([]);
  const { register, handleSubmit, reset } = useForm<FVSaleFormData>();

  const fetchSales = () => {
    api.get<FVSale[]>('/freezer-van/sales').then((res) => setSales(res.data));
  };

  useEffect(() => { fetchSales(); }, []);

  const onSubmit = async (data: FVSaleFormData) => {
    await api.post('/freezer-van/sales', {
      ...data,
      kilos: Number(data.kilos),
      price: Number(data.price),
    });
    reset();
    fetchSales();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Freezer Van Sales</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input type="date" {...register('date')} className="border p-2 rounded" required />
          <input placeholder="Customer Name" {...register('customer')} className="border p-2 rounded" />
          <input placeholder="Kilos" type="number" step="0.01" {...register('kilos')} className="border p-2 rounded" required />
          <input placeholder="Price per Kilo" type="number" step="0.01" {...register('price')} className="border p-2 rounded" required />
          <button type="submit" className="bg-green-600 text-white p-2 rounded">Add Sale</button>
        </form>
      </div>

      <div className="bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Customer</th>
              <th className="p-3 text-right">Kilos</th>
              <th className="p-3 text-right">Price</th>
              <th className="p-3 text-right">Total Amount</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((sale) => (
              <tr key={sale.id} className="border-t">
                <td className="p-3">{sale.date}</td>
                <td className="p-3">{sale.customer}</td>
                <td className="p-3 text-right">{sale.kilos}</td>
                <td className="p-3 text-right">{sale.price}</td>
                <td className="p-3 text-right font-bold text-green-600">{sale.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}