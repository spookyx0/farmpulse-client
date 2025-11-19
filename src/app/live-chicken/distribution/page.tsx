"use client";

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';

interface LCDistribution {
  id: number;
  date: string;
  location: string;
  heads: number;
  kilos: number;
  amount: number;
}

// Define Form Data Interface
interface LCDistributionFormData {
  date: string;
  location: string;
  heads: string;
  kilos: string;
  amount: string;
}

export default function LiveChickenDistributionPage() {
  const [dist, setDist] = useState<LCDistribution[]>([]);
  const { register, handleSubmit, reset } = useForm<LCDistributionFormData>();

  const fetchDist = () => {
    api.get<LCDistribution[]>('/live-chicken/distribution').then((res) => setDist(res.data));
  };

  useEffect(() => { fetchDist(); }, []);

  const onSubmit = async (data: LCDistributionFormData) => {
    await api.post('/live-chicken/distribution', {
      ...data,
      heads: Number(data.heads),
      kilos: Number(data.kilos),
      amount: Number(data.amount),
    });
    reset();
    fetchDist();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Live Chicken Distribution (Sales)</h1>
      
      <div className="bg-white p-6 rounded-lg shadow">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <input type="date" {...register('date')} className="border p-2 rounded" required />
          <input placeholder="Location (e.g., SKK Store)" {...register('location')} className="border p-2 rounded" required />
          <input placeholder="Heads" type="number" {...register('heads')} className="border p-2 rounded" required />
          <input placeholder="Kilos" type="number" step="0.01" {...register('kilos')} className="border p-2 rounded" required />
          <input placeholder="Total Amount" type="number" step="0.01" {...register('amount')} className="border p-2 rounded" required />
          <button type="submit" className="bg-green-600 text-white p-2 rounded col-span-1 md:col-span-5">Record Distribution</button>
        </form>
      </div>

      <div className="bg-white rounded shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 text-left">Date</th>
              <th className="p-3 text-left">Location</th>
              <th className="p-3 text-right">Heads</th>
              <th className="p-3 text-right">Kilos</th>
              <th className="p-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {dist.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="p-3">{d.date}</td>
                <td className="p-3">{d.location}</td>
                <td className="p-3 text-right">{d.heads}</td>
                <td className="p-3 text-right">{d.kilos}</td>
                <td className="p-3 text-right font-bold text-green-600">{d.amount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}