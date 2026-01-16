/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { 
  Truck, 
  MapPin, 
  CheckCircle, 
  Clock, 
  Plus, 
  Trash2, 
  Package, 
  Layers, 
  AlertCircle,
  ArrowRight,
  Search
} from 'lucide-react';

// --- Types ---
interface Branch { id: number; name: string; }
interface Product { id: number; name: string; category: string; }
interface InventoryItem { id: number; productId: number; product: Product; quantity: number; } 
interface DeliveryItem { productId: number; quantity: number; product?: Product }
interface Delivery { id: number; branchId: number; branch?: Branch; status: 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'; items: DeliveryItem[]; created_at: string; }

interface DeliveryFormItem { productId: string; quantity: string; }
interface DeliveryFormData { branchId: string; items: DeliveryFormItem[]; }

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
  const { showToast } = useToast();
  
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]); 
  const [searchTerm, setSearchTerm] = useState('');
  
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const branches = user?.role === 'OWNER' ? BRANCHES_DATA : [];

  const { register, control, handleSubmit, reset, watch } = useForm<DeliveryFormData>({
    defaultValues: { branchId: '', items: [{ productId: '', quantity: '' }] },
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const formItems = watch('items');

  const fetchData = async () => {
    try {
      const endpoint = user?.role === 'OWNER' ? '/deliveries/owner' : '/deliveries/branch';
      const delRes = await api.get<Delivery[]>(endpoint);
      setDeliveries(delRes.data);

      if (user?.role === 'OWNER') {
        const invRes = await api.get<InventoryItem[]>('/inventory/owner');
        setInventory(invRes.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    socket.on('deliveryUpdated', (updatedDelivery: Delivery) => {
      setDeliveries((prev) => {
        const exists = prev.find((d) => d.id === updatedDelivery.id);
        return exists ? prev.map((d) => d.id === updatedDelivery.id ? updatedDelivery : d) : [updatedDelivery, ...prev];
      });
      
      if (user?.role === 'OWNER' && updatedDelivery.status === 'DELIVERED') {
         showToast(`Delivery #${updatedDelivery.id} received by branch.`, 'success');
      }
    });

    socket.on('newDelivery', (newDel: Delivery) => {
        setDeliveries((prev) => {
            if (prev.find(d => d.id === newDel.id)) return prev;
            return [newDel, ...prev];
        });
        // If owner created a delivery, update inventory counts locally or re-fetch
        if (user?.role === 'OWNER') fetchData();
    });

    return () => { 
        socket.off('deliveryUpdated');
        socket.off('newDelivery');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, showToast, user]);

  const onCreateDelivery = async (data: DeliveryFormData) => {
    try {
      await api.post('/deliveries', {
        branchId: Number(data.branchId),
        items: data.items.map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity) })),
      });
      reset();
      // No need to fetch manually if socket handles it, but safe to keep for instant feedback
      // fetchData(); 
      showToast('Delivery dispatched successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to create delivery', 'error');
    }
  };

  const onConfirmReceive = async () => {
    if (!confirmId) return;
    setIsProcessing(true);
    try { 
        await api.patch(`/deliveries/${confirmId}/deliver`); 
        showToast('Goods received and inventory updated!', 'success');
        setConfirmId(null); 
    } catch (err) { 
        showToast('Failed to update delivery status', 'error');
    } finally {
        setIsProcessing(false);
    }
  };

  const filteredDeliveries = deliveries.filter((delivery) => {
    const term = searchTerm.toLowerCase();
    return (
      delivery.id.toString().includes(term) ||
      delivery.branch?.name.toLowerCase().includes(term) ||
      delivery.status.toLowerCase().includes(term) ||
      delivery.items.some((item) => item.product?.name.toLowerCase().includes(term))
    );
  });

  return (
    <div className="w-full space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
        <div>
            <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                <Truck className="w-8 h-8 text-blue-600" />
                Logistics & Deliveries
            </h1>
            <p className="text-slate-500 mt-1">Manage shipments and track status across branches.</p>
        </div>
        <div className="flex gap-3">
           <div className="text-right hidden md:block">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Active Shipments</p>
              <p className="text-2xl font-bold text-slate-800">{deliveries.filter(d => d.status !== 'DELIVERED').length}</p>
           </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Create Delivery Form (Owner Only) - Takes 5/12 width on large screens */}
        {user?.role === 'OWNER' && (
          <div className="xl:col-span-5 space-y-6">
            <Card className="border-t-4 border-t-blue-600 shadow-lg sticky top-6">
              <CardHeader title="Dispatch New Shipment" subtitle="Create a manifest to send stock." />
              <CardContent>
                <form onSubmit={handleSubmit(onCreateDelivery)} className="space-y-6">
                  
                  {/* Branch Selector */}
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Destination</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-3.5 w-5 h-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <select {...register('branchId', { required: true })} className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all">
                        <option value="">Select Branch...</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-slate-50 p-5 rounded-xl border border-slate-200/60 space-y-4">
                    <div className="flex justify-between items-center">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                          <Package className="w-4 h-4 text-blue-600" /> Cargo Manifest
                      </label>
                      <button type="button" onClick={() => append({ productId: '', quantity: '' })} className="text-xs bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1.5 rounded-full font-medium flex items-center gap-1 transition-colors">
                        <Plus className="w-3 h-3" /> Add Item
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {fields.map((field, index) => {
                          const selectedId = Number(formItems[index]?.productId);
                          const inventoryItem = inventory.find(i => i.product.id === selectedId);
                          const selectedProduct = inventoryItem?.product;
                          const quantityLabel = selectedProduct?.category === 'CHICKEN_PART' ? 'Kilos' : 'Quantity';
                          const stockAvailable = Number(inventoryItem?.quantity || 0);

                          return (
                            <div key={field.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative group">
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {/* Product Select */}
                                <div className="sm:col-span-2">
                                    <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Item</label>
                                    <select {...register(`items.${index}.productId` as const, { required: true })} className="w-full p-2 border-b border-slate-200 bg-transparent text-sm focus:border-blue-500 outline-none transition-colors">
                                        <option value="">Select Product...</option>
                                        {inventory.map(inv => (
                                            <option key={inv.id} value={inv.product.id}>{inv.product.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Available Stock Indicator */}
                                <div className="sm:col-span-2 flex justify-between items-center text-xs bg-slate-50 px-2 py-1 rounded">
                                   <span className="text-slate-500 flex items-center gap-1">
                                     <Layers className="w-3 h-3" />
                                     {selectedProduct?.category?.replace('_', ' ') || 'Category'}
                                   </span>
                                   <span className={`font-medium ${stockAvailable > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                     Available: {stockAvailable} {quantityLabel === 'Kilos' ? 'kg' : 'units'}
                                   </span>
                                </div>

                                {/* Quantity Input */}
                                <div>
                                    <label className="block text-xs text-slate-400 mb-1 uppercase font-bold tracking-wider">Send Amount</label>
                                    <div className="relative">
                                        <input 
                                          {...register(`items.${index}.quantity` as const, { required: true, max: stockAvailable })} 
                                          type="number" 
                                          step="0.01" 
                                          className="w-full p-2 bg-slate-50 rounded-md text-sm border border-slate-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" 
                                          placeholder="0" 
                                        />
                                        <span className="absolute right-2 top-2 text-xs text-slate-400">{quantityLabel === 'Kilos' ? 'kg' : 'pcs'}</span>
                                    </div>
                                </div>

                                {/* Remove Action */}
                                <div className="flex items-end justify-end">
                                    <button type="button" onClick={() => remove(index)} className="text-slate-300 hover:text-red-500 p-2 transition-colors" title="Remove Item">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                              </div>
                            </div>
                          );
                      })}
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-200 transition-all transform active:scale-95 flex justify-center items-center gap-2">
                      <Truck className="w-5 h-5" /> Dispatch Shipment
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* RIGHT COLUMN: Delivery History - Takes 7/12 width on large screens */}
        <div className={`${user?.role === 'OWNER' ? 'xl:col-span-7' : 'xl:col-span-12'} space-y-6`}>
           <Card className="h-[calc(100vh-240px)] min-h-[500px] shadow-md flex flex-col">
              <CardHeader 
                title="Recent Shipments" 
                subtitle={user?.role === 'OWNER' ? "Tracking all outbound logistics." : "Incoming shipments for your branch."} 
              />
              <div className="px-6 pb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by ID, Branch, Status or Product..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
              </div>
              <div className="overflow-auto flex-1">
                  <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-semibold text-slate-500 sticky top-0 z-10">
                          <tr>
                              <th className="px-6 py-4">ID & Date</th>
                              <th className="px-6 py-4">Details</th>
                              <th className="px-6 py-4 text-right">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredDeliveries.map((delivery) => (
                              <tr key={delivery.id} className="group hover:bg-slate-50 transition-colors">
                                  {/* ID & Date Column */}
                                  <td className="px-6 py-5 align-top">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">#{delivery.id}</span>
                                      </div>
                                      <div className="text-slate-900 font-medium">{new Date(delivery.created_at).toLocaleDateString()}</div>
                                      <div className="text-xs text-slate-400">{new Date(delivery.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                                  </td>
                                  
                                  {/* Details Column */}
                                  <td className="px-6 py-5 align-top">
                                      <div className="flex items-center gap-2 font-semibold text-slate-800 mb-2">
                                          <MapPin className="w-4 h-4 text-blue-500" />
                                          {delivery.branch?.name}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                          {delivery.items?.map((item, idx) => (
                                              <span key={idx} className="inline-flex items-center px-2.5 py-1 rounded-md bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">
                                                  {item.product?.name || `ID:${item.productId}`} 
                                                  <span className="ml-1.5 font-bold text-slate-800 bg-slate-100 px-1 rounded">x{item.quantity}</span>
                                              </span>
                                          ))}
                                      </div>
                                  </td>

                                  {/* Status & Action Column */}
                                  <td className="px-6 py-5 align-top text-right">
                                      <div className="flex flex-col items-end gap-3">
                                        <Badge variant={delivery.status === 'DELIVERED' ? 'success' : 'warning'}>
                                            {delivery.status}
                                        </Badge>
                                        
                                        {user?.role === 'STAFF' && delivery.status !== 'DELIVERED' && (
                                            <button onClick={() => setConfirmId(delivery.id)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-xs font-bold shadow-sm transition-colors inline-flex items-center gap-1.5 animate-in fade-in">
                                                <CheckCircle className="w-3 h-3" /> Receive Goods
                                            </button>
                                        )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredDeliveries.length === 0 && (
                              <tr>
                                  <td colSpan={3} className="px-6 py-12 text-center text-slate-400 bg-slate-50/30">
                                      <div className="flex flex-col items-center">
                                        <div className="bg-slate-100 p-4 rounded-full mb-3">
                                           <Truck className="w-8 h-8 text-slate-300" />
                                        </div>
                                        <p>{searchTerm ? 'No matching shipments found.' : 'No delivery records found.'}</p>
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

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!confirmId}
        onClose={() => setConfirmId(null)}
        onConfirm={onConfirmReceive}
        title="Receive Shipment?"
        message="Confirming this will immediately add the items to your branch inventory. Ensure all physical goods are accounted for."
        confirmText="Yes, Confirm Receipt"
        isLoading={isProcessing}
        variant="primary"
      />
    </div>
  );
}