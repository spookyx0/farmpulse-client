"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Truck, MapPin, CheckCircle, Clock, Plus, Trash2 } from 'lucide-react';

// ... (Keep your existing Interfaces/Types here: Branch, Product, etc.) ...
// Assuming you kept the interfaces from the previous code block I gave you.
// If you need them again, let me know, but for brevity I will assume they are there.

// --- INSERT INTERFACES FROM PREVIOUS STEP HERE ---
interface Branch { id: number; name: string; }
interface DeliveryItem { productId: number; quantity: number; product?: { name: string } }
interface Delivery { id: number; branchId: number; branch?: Branch; status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'; items: DeliveryItem[]; }
interface DeliveryFormData { branchId: string; items: { productId: string; quantity: string }[]; }

const BRANCHES_DATA: Branch[] = [
  { id: 1, name: 'San Roque (Main)' },
  { id: 2, name: 'Rawis' },
  { id: 3, name: 'Mondragon' },
  { id: 4, name: 'Catarman' },
  { id: 5, name: 'Catubig' },
  { id: 6, name: 'San Jose' },
];

export default function DeliveriesPage() {
  const { user } = useAuth();
  const socket = useSocket();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const branches = user?.role === 'OWNER' ? BRANCHES_DATA : [];

  const { register, control, handleSubmit, reset } = useForm<DeliveryFormData>({
    defaultValues: { branchId: '', items: [{ productId: '', quantity: '' }] },
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const fetchDeliveries = () => {
    const endpoint = user?.role === 'OWNER' ? '/deliveries/owner' : '/deliveries/branch';
    api.get<Delivery[]>(endpoint).then((res) => setDeliveries(res.data));
  };

  useEffect(() => {
    if (!user) return;
    fetchDeliveries();
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('deliveryUpdated', (updatedDelivery: Delivery) => {
      setDeliveries((prev) => {
        const exists = prev.find((d) => d.id === updatedDelivery.id);
        return exists ? prev.map((d) => d.id === updatedDelivery.id ? updatedDelivery : d) : [updatedDelivery, ...prev];
      });
    });
    return () => { socket.off('deliveryUpdated'); };
  }, [socket]);

  const getErrorMessage = (error: unknown) => {
    if (typeof error === 'string') return error;
    if (error instanceof Error) return error.message;
    const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
    return typeof message === 'string' ? message : 'Failed';
  };

  const onCreateDelivery = async (data: DeliveryFormData) => {
    try {
      await api.post('/deliveries', {
        branchId: Number(data.branchId),
        items: data.items.map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity) })),
      });
      reset();
      fetchDeliveries();
      alert('Delivery dispatched!');
    } catch (err: unknown) {
      alert(`Error: ${getErrorMessage(err)}`);
    }
  };

  const onReceive = async (id: number) => {
    if (!confirm('Confirm receipt of goods?')) return;
    try {
      await api.patch(`/deliveries/${id}/deliver`);
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
        <Truck className="w-8 h-8 text-blue-600" />
        Logistics & Deliveries
      </h1>

      {/* Create Delivery Form */}
      {user?.role === 'OWNER' && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader title="Dispatch New Delivery" subtitle="Select a branch and add items to send." />
          <CardContent>
            <form onSubmit={handleSubmit(onCreateDelivery)} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Destination Branch</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                  <select {...register('branchId')} className="w-full pl-10 p-2.5 border-slate-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" required>
                    <option value="">Select a branch...</option>
                    {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-medium text-slate-700 mb-3">Cargo Manifest</label>
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-3 mb-3">
                    <input {...register(`items.${index}.productId` as const)} placeholder="Product ID" type="number" className="flex-1 border-slate-300 rounded-md text-sm" required />
                    <input {...register(`items.${index}.quantity` as const)} placeholder="Qty" type="number" className="w-32 border-slate-300 rounded-md text-sm" required />
                    <button type="button" onClick={() => remove(index)} className="text-red-500 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => append({ productId: '', quantity: '' })} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1 mt-2">
                  <Plus className="w-4 h-4" /> Add another item
                </button>
              </div>

              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2">
                <Truck className="w-5 h-5" /> Dispatch Delivery
              </button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Delivery List */}
      <div className="grid gap-4">
        {deliveries.map((delivery) => (
          <Card key={delivery.id} className="hover:shadow-md transition-shadow">
            <div className="p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-full ${delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                  {delivery.status === 'DELIVERED' ? <CheckCircle className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-slate-800">Delivery #{delivery.id}</h3>
                    <Badge variant={delivery.status === 'DELIVERED' ? 'success' : 'warning'}>{delivery.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> To: {delivery.branch?.name}
                  </p>
                  <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded inline-block">
                    <span className="font-semibold">Items:</span> {delivery.items?.map((i) => `${i.product?.name || `Prod #${i.productId}`} (x${i.quantity})`).join(', ')}
                  </p>
                </div>
              </div>

              {user?.role === 'STAFF' && delivery.status !== 'DELIVERED' && (
                <button onClick={() => onReceive(delivery.id)} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2.5 rounded-lg font-medium shadow-sm transition-colors flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" /> Receive Goods
                </button>
              )}
            </div>
          </Card>
        ))}
        {deliveries.length === 0 && <p className="text-center text-slate-400 py-10">No deliveries on record.</p>}
      </div>
    </div>
  );
}