"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';

// --- Types ---
interface Branch {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
}

interface DeliveryItem {
  productId: number;
  quantity: number;
  product?: Product;
}

interface Delivery {
  id: number;
  branchId: number;
  branch?: Branch;
  status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED';
  items: DeliveryItem[];
}

// Form Data Types (Strings because inputs are text/number inputs)
interface DeliveryFormItem {
  productId: string;
  quantity: string;
}

interface DeliveryFormData {
  branchId: string;
  items: DeliveryFormItem[];
}

// Static Data (Moved outside component to avoid useEffect issues)
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

  // Derive branches directly instead of using state/effect
  const branches = user?.role === 'OWNER' ? BRANCHES_DATA : [];

  // Form setup
  const { register, control, handleSubmit, reset } = useForm<DeliveryFormData>({
    defaultValues: {
      branchId: '',
      items: [{ productId: '', quantity: '' }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  });

  // 1. Fetch Data
  const fetchDeliveries = () => {
    const endpoint =
      user?.role === 'OWNER' ? '/deliveries/owner' : '/deliveries/branch';
    api.get<Delivery[]>(endpoint).then((res) => setDeliveries(res.data));
  };

  useEffect(() => {
    if (!user) return;
    fetchDeliveries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // 2. Real-time Listener
  useEffect(() => {
    if (!socket) return;

    socket.on('deliveryUpdated', (updatedDelivery: Delivery) => {
      setDeliveries((prev) => {
        const exists = prev.find((d) => d.id === updatedDelivery.id);
        if (exists) {
          return prev.map((d) =>
            d.id === updatedDelivery.id ? updatedDelivery : d,
          );
        }
        return [updatedDelivery, ...prev];
      });
    });

    return () => {
      socket.off('deliveryUpdated');
    };
  }, [socket]);

  // 3. Create Delivery (Owner)
  const onCreateDelivery = async (data: DeliveryFormData) => {
    try {
      const formattedData = {
        branchId: Number(data.branchId),
        items: data.items.map((i) => ({
          productId: Number(i.productId),
          quantity: Number(i.quantity),
        })),
      };
      await api.post('/deliveries', formattedData);
      reset();
      fetchDeliveries();
      alert('Delivery created!');
    } catch (err) {
      alert('Error creating delivery. Check stock.');
      console.error(err);
    }
  };

  // 4. Mark as Delivered (Staff)
  const onReceive = async (id: number) => {
    if (
      !confirm('Confirm receipt of goods? This will add to your inventory.')
    )
      return;
    try {
      await api.patch(`/deliveries/${id}/deliver`);
      // No need to manually update state, socket will handle it!
    } catch (err) {
      alert('Error updating status.');
      console.error(err);
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Deliveries Management</h1>

      {/* OWNER: Create Delivery Form */}
      {user?.role === 'OWNER' && (
        <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-600">
          <h2 className="text-xl font-semibold mb-4">Send Stock to Branch</h2>
          <form onSubmit={handleSubmit(onCreateDelivery)} className="space-y-4">
            <select
              {...register('branchId')}
              className="w-full border p-2 rounded"
              required
            >
              <option value="">Select Branch</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <div className="space-y-2">
              <label className="font-medium">Items:</label>
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <input
                    {...register(`items.${index}.productId` as const)}
                    placeholder="Product ID"
                    type="number"
                    className="border p-2 rounded flex-1"
                    required
                  />
                  <input
                    {...register(`items.${index}.quantity` as const)}
                    placeholder="Quantity"
                    type="number"
                    className="border p-2 rounded flex-1"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => remove(index)}
                    className="text-red-500 px-2"
                  >
                    X
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ productId: '', quantity: '' })}
                className="text-sm text-blue-600 hover:underline"
              >
                + Add another item
              </button>
            </div>
            <button
              type="submit"
              className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              Create Delivery
            </button>
          </form>
        </div>
      )}

      {/* List of Deliveries */}
      <div className="grid gap-4">
        {deliveries.map((delivery) => (
          <div
            key={delivery.id}
            className="bg-white p-4 rounded shadow flex justify-between items-center"
          >
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg">#{delivery.id}</span>
                <span className="text-gray-600">
                  To: {delivery.branch?.name}
                </span>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    delivery.status === 'DELIVERED'
                      ? 'bg-green-100 text-green-800'
                      : delivery.status === 'IN_TRANSIT'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {delivery.status}
                </span>
              </div>
              <div className="text-sm text-gray-500 mt-1">
                Items:{' '}
                {delivery.items
                  ?.map(
                    (i) =>
                      `${i.product?.name || i.productId} (x${i.quantity})`,
                  )
                  .join(', ')}
              </div>
            </div>

            {/* Staff Action Button */}
            {user?.role === 'STAFF' && delivery.status !== 'DELIVERED' && (
              <button
                onClick={() => onReceive(delivery.id)}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Receive Goods
              </button>
            )}
          </div>
        ))}
        {deliveries.length === 0 && (
          <p className="text-gray-500 text-center">
            No delivery records found.
          </p>
        )}
      </div>
    </div>
  );
}