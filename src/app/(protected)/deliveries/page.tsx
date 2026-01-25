/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from '../../contexts/AuthContext';
import { useSocket } from '../../contexts/SocketContext';
import { useToast } from '../../contexts/ToastContext';
import api from '../../services/api';
import { useEffect, useState, useMemo } from 'react';
import { useForm, useFieldArray, useWatch } from 'react-hook-form';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { ConfirmationModal } from '../../components/ui/ConfirmationModal';
import { 
  Truck, MapPin, CheckCircle, Clock, Plus, Trash2, Package, 
  Layers, AlertCircle, ArrowRight, Search, Printer, Box, Calendar
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'IN_TRANSIT' | 'DELIVERED'>('ALL');
  
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const branches = user?.role === 'OWNER' ? BRANCHES_DATA : [];

  const { register, control, handleSubmit, reset, watch } = useForm<DeliveryFormData>({
    defaultValues: { branchId: '', items: [{ productId: '', quantity: '' }] },
  });
  
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const formItems = watch('items');

  // --- Stats Calculation ---
  const stats = useMemo(() => {
    return {
        pending: deliveries.filter(d => d.status === 'PENDING').length,
        inTransit: deliveries.filter(d => d.status === 'IN_TRANSIT').length,
        delivered: deliveries.filter(d => d.status === 'DELIVERED').length,
    };
  }, [deliveries]);

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
   
  }, [user]);

  useEffect(() => {
    if (!socket) return;
    const handleUpdate = (updatedDelivery: Delivery) => {
        setDeliveries((prev) => {
            const exists = prev.find((d) => d.id === updatedDelivery.id);
            return exists ? prev.map((d) => d.id === updatedDelivery.id ? updatedDelivery : d) : [updatedDelivery, ...prev];
        });
        if (user?.role === 'OWNER' && updatedDelivery.status === 'DELIVERED') {
            showToast(`Delivery #${updatedDelivery.id} received by branch.`, 'success');
        }
    };
    const handleNew = (newDel: Delivery) => {
        setDeliveries((prev) => {
            if (prev.find(d => d.id === newDel.id)) return prev;
            return [newDel, ...prev];
        });
        if (user?.role === 'OWNER') fetchData();
    };

    socket.on('deliveryUpdated', handleUpdate);
    socket.on('newDelivery', handleNew);

    return () => { 
        socket.off('deliveryUpdated', handleUpdate);
        socket.off('newDelivery', handleNew);
    };
  }, [socket, showToast, user]);

  const onCreateDelivery = async (data: DeliveryFormData) => {
    try {
      await api.post('/deliveries', {
        branchId: Number(data.branchId),
        items: data.items.map((i) => ({ productId: Number(i.productId), quantity: Number(i.quantity) })),
      });
      reset();
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
    const matchesSearch = 
      delivery.id.toString().includes(term) ||
      delivery.branch?.name.toLowerCase().includes(term) ||
      delivery.items.some((item) => item.product?.name.toLowerCase().includes(term));
    
    const matchesFilter = statusFilter === 'ALL' || delivery.status === statusFilter;

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex flex-col h-[calc(90vh-3rem)] gap-4">
      
      {/* --- TOP HEADER & KPIs --- */}
      <div className="shrink-0 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-3">
                    <Truck className="w-8 h-8 text-blue-600" />
                    Logistics & Deliveries
                </h1>
                <p className="text-slate-500 mt-1">Manage shipments and track status across branches.</p>
            </div>
            <div className="flex gap-2">
                <button onClick={() => fetchData()} className="p-2 bg-white border border-slate-200 text-slate-400 hover:text-blue-600 rounded-lg shadow-sm hover:bg-blue-50 transition-all">
                   <Clock className="w-5 h-5" />
                </button>
            </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-yellow-50 text-yellow-600 rounded-full"><Package className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Pending</p>
                    <p className="text-2xl font-bold text-slate-800">{stats.pending}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-full"><Truck className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">In Transit</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.inTransit}</p>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-green-50 text-green-600 rounded-full"><CheckCircle className="w-6 h-6" /></div>
                <div>
                    <p className="text-xs font-bold text-slate-400 uppercase">Delivered</p>
                    <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                </div>
            </div>
        </div>
      </div>

      {/* --- MAIN CONTENT (Split View) --- */}
      <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-start h-full">
        
        {/* --- LEFT COLUMN: Create Delivery (Owner Only) --- */}
        {user?.role === 'OWNER' && (
          <div className="xl:col-span-4 h-full overflow-y-auto pr-1">
            <Card className="border-t-4 border-t-blue-600 shadow-lg sticky top-0">
              <CardHeader title="Dispatch New Shipment" subtitle="Create a manifest to send stock." />
              <CardContent>
                <form onSubmit={handleSubmit(onCreateDelivery)} className="space-y-5">
                  
                  {/* Branch Selector */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Destination</label>
                    <div className="relative group">
                      <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                      <select {...register('branchId', { required: true })} className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all cursor-pointer">
                        <option value="">Select Branch...</option>
                        {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                      </select>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-2">
                          <Box className="w-4 h-4 text-blue-600" /> Cargo Manifest
                      </label>
                      <button type="button" onClick={() => append({ productId: '', quantity: '' })} className="text-xs bg-white border border-slate-200 text-blue-600 hover:bg-blue-50 px-2 py-1 rounded shadow-sm font-bold flex items-center gap-1 transition-colors">
                        <Plus className="w-3 h-3" /> Add Item
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {fields.map((field, index) => {
                          const selectedId = Number(formItems[index]?.productId);
                          const inventoryItem = inventory.find(i => i.product.id === selectedId);
                          const selectedProduct = inventoryItem?.product;
                          const quantityLabel = selectedProduct?.category === 'CHICKEN_PART' ? 'kg' : 'pcs';
                          const stockAvailable = Number(inventoryItem?.quantity || 0);

                          return (
                            <div key={field.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm relative group">
                              <div className="grid grid-cols-12 gap-2 items-center">
                                {/* Product Select */}
                                <div className="col-span-7">
                                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Item</label>
                                    <select {...register(`items.${index}.productId` as const, { required: true })} className="w-full p-1.5 bg-slate-50 rounded text-sm border border-transparent focus:bg-white focus:border-blue-300 outline-none transition-colors">
                                        <option value="">Select...</option>
                                        {inventory.map(inv => (
                                            <option key={inv.id} value={inv.product.id}>{inv.product.name} ({inv.quantity})</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity Input */}
                                <div className="col-span-4">
                                    <label className="block text-[10px] text-slate-400 font-bold uppercase mb-0.5">Qty ({quantityLabel})</label>
                                    <input 
                                        {...register(`items.${index}.quantity` as const, { required: true, max: stockAvailable })} 
                                        type="number" step="0.01" 
                                        className="w-full p-1.5 bg-slate-50 rounded text-sm border border-transparent focus:bg-white focus:border-blue-300 outline-none transition-colors"
                                        placeholder="0"
                                    />
                                </div>

                                {/* Remove Action */}
                                <div className="col-span-1 flex justify-end pt-4">
                                    <button type="button" onClick={() => remove(index)} className="text-slate-300 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                              </div>
                              {/* Stock Validation Msg */}
                              {selectedId > 0 && (
                                <div className="mt-1 flex justify-between text-[10px]">
                                    <span className="text-slate-400">{selectedProduct?.category?.replace('_', ' ')}</span>
                                    <span className={stockAvailable > 0 ? "text-green-600 font-medium" : "text-red-500 font-bold"}>
                                        Stock: {stockAvailable}
                                    </span>
                                </div>
                              )}
                            </div>
                          );
                      })}
                    </div>
                  </div>

                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 rounded-lg shadow-lg shadow-slate-200 transition-all transform active:scale-95 flex justify-center items-center gap-2">
                      <Truck className="w-5 h-5" /> Dispatch Truck
                  </button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- RIGHT COLUMN: Delivery History (FIXED HEIGHT for ~5 Items) --- */}
        <div className={`${user?.role === 'OWNER' ? 'xl:col-span-8' : 'xl:col-span-12'}`}>
           <Card className="shadow-md flex flex-col border border-slate-200 overflow-hidden h-fit">
              
              {/* Toolbar */}
              <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center shrink-0">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search delivery ID..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                  />
                </div>
                
                {/* Status Tabs */}
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-100 overflow-x-auto">
                    {['ALL', 'PENDING', 'IN_TRANSIT', 'DELIVERED'].map((status) => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status as any)}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all ${
                                statusFilter === status 
                                ? 'bg-white text-blue-600 shadow-sm' 
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            {status.replace('_', ' ')}
                        </button>
                    ))}
                </div>
              </div>

              {/* Scrollable Table (Limited Height) */}
              <div className="overflow-y-auto h-[600px]">
                  <table className="w-full text-left text-sm text-slate-600">
                      <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase font-bold text-slate-400 sticky top-0 z-10 shadow-sm">
                          <tr>
                              <th className="px-6 py-4 bg-slate-50">Reference</th>
                              <th className="px-6 py-4 bg-slate-50">Details</th>
                              <th className="px-6 py-4 bg-slate-50 text-right">Status</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                          {filteredDeliveries.map((delivery) => (
                              <tr key={delivery.id} className="group hover:bg-blue-50/30 transition-colors">
                                  {/* ID & Date */}
                                  <td className="px-6 py-5 align-top w-48">
                                      <div className="flex items-center gap-2 mb-1">
                                          <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">#{delivery.id}</span>
                                          <button className="text-slate-300 hover:text-blue-600 transition-colors" title="Print Manifest"><Printer className="w-3 h-3" /></button>
                                      </div>
                                      <div className="flex items-center gap-1.5 text-slate-700 font-semibold text-xs mt-2">
                                         <Calendar className="w-3 h-3 text-slate-400" />
                                         {new Date(delivery.created_at).toLocaleDateString()}
                                      </div>
                                      <div className="flex items-center gap-1.5 text-slate-400 text-xs mt-1">
                                         <Clock className="w-3 h-3" />
                                         {new Date(delivery.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                      </div>
                                  </td>
                                  
                                  {/* Details */}
                                  <td className="px-6 py-5 align-top">
                                      <div className="flex items-center gap-2 font-bold text-slate-800 mb-3">
                                          <MapPin className="w-4 h-4 text-blue-500" />
                                          {delivery.branch?.name}
                                      </div>
                                      <div className="flex flex-wrap gap-2">
                                          {delivery.items?.map((item, idx) => (
                                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-600 shadow-sm">
                                                  {item.product?.name || `Product #${item.productId}`} 
                                                  <span className="ml-2 font-bold text-slate-800 bg-slate-100 px-1.5 rounded border border-slate-200">x{item.quantity}</span>
                                              </span>
                                          ))}
                                      </div>
                                  </td>

                                  {/* Status & Action */}
                                  <td className="px-6 py-5 align-top text-right">
                                      <div className="flex flex-col items-end gap-3">
                                          <Badge variant={delivery.status === 'DELIVERED' ? 'success' : delivery.status === 'IN_TRANSIT' ? 'warning' : 'default'}>
                                              {delivery.status.replace('_', ' ')}
                                          </Badge>
                                          
                                          {user?.role === 'STAFF' && delivery.status !== 'DELIVERED' && (
                                              <button onClick={() => setConfirmId(delivery.id)} className="bg-green-600 hover:bg-green-700 text-white pl-2 pr-3 py-1.5 rounded-lg text-xs font-bold shadow-md transition-all active:scale-95 inline-flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2">
                                                  <CheckCircle className="w-3.5 h-3.5" /> Receive
                                              </button>
                                          )}
                                      </div>
                                  </td>
                              </tr>
                          ))}
                          {filteredDeliveries.length === 0 && (
                              <tr>
                                  <td colSpan={3} className="px-6 py-16 text-center text-slate-400 bg-slate-50/50">
                                      <div className="flex flex-col items-center">
                                          <Truck className="w-12 h-12 text-slate-200 mb-3" />
                                          <p className="font-medium">No deliveries found.</p>
                                          <p className="text-xs">Try adjusting your search or filters.</p>
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