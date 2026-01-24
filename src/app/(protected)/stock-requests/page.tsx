/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState, useEffect } from 'react';
import api from '@/app/services/api';
import { useAuth } from '@/app/contexts/AuthContext';
import { useToast } from '@/app/contexts/ToastContext';
import { 
  ClipboardList, Plus, Trash2, Send, CheckCircle, 
  XCircle, Clock, MapPin, Package 
} from 'lucide-react';
import { Modal } from '@/app/components/ui/Modal';

// --- TYPES ---
interface StockItem {
  name: string;
  qty: number;
  unit: string;
}

interface StockRequest {
  id: number;
  branch: { name: string };
  requestedBy: { username: string; fullName: string };
  items: StockItem[];
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'COMPLETED';
  createdAt: string;
  adminNote?: string;
}

export default function StockRequestPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [requests, setRequests] = useState<StockRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // STAFF STATE: Creating a Request
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItems, setCurrentItems] = useState<StockItem[]>([]);
  const [newItem, setNewItem] = useState<StockItem>({ name: '', qty: 1, unit: 'pcs' });

  // OWNER STATE: Approving/Rejecting
  const [actionModal, setActionModal] = useState<{ id: number; action: 'APPROVED' | 'REJECTED' } | null>(null);
  const [adminNote, setAdminNote] = useState('');

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      setLoading(true);
      // Different endpoint based on Role
      const endpoint = user?.role === 'OWNER' ? '/stock-requests/all' : '/stock-requests/my-branch';
      const res = await api.get(endpoint);
      setRequests(res.data);
    } catch (error) {
      console.error(error);
      showToast("Failed to load requests", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // --- STAFF HANDLERS ---
  const addItemToList = () => {
    if (!newItem.name) return;
    setCurrentItems([...currentItems, newItem]);
    setNewItem({ name: '', qty: 1, unit: 'pcs' }); // Reset form
  };

  const removeItemFromList = (index: number) => {
    const updated = [...currentItems];
    updated.splice(index, 1);
    setCurrentItems(updated);
  };

  const submitRequest = async () => {
    if (currentItems.length === 0) {
      showToast("Please add at least one item", "error");
      return;
    }

    try {
      await api.post('/stock-requests', { items: currentItems });
      showToast("Request submitted successfully", "success");
      setIsModalOpen(false);
      setCurrentItems([]);
      fetchData();
    } catch (error) {
      showToast("Failed to submit request", "error");
    }
  };

  // --- OWNER HANDLERS ---
  const handleStatusUpdate = async () => {
    if (!actionModal) return;

    try {
      await api.patch(`/stock-requests/${actionModal.id}/status`, {
        status: actionModal.action,
        note: adminNote
      });
      showToast(`Request ${actionModal.action.toLowerCase()}`, "success");
      setActionModal(null);
      setAdminNote('');
      fetchData();
    } catch (error) {
      showToast("Operation failed", "error");
    }
  };

  // --- RENDER HELPERS ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-700 border-green-200';
      case 'REJECTED': return 'bg-red-100 text-red-700 border-red-200';
      case 'COMPLETED': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-slate-600" /> Stock Requests
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {user?.role === 'OWNER' 
              ? 'Manage and approve inventory requests from all branches.' 
              : 'Request inventory replenishment for your branch.'}
          </p>
        </div>
        
        {user?.role !== 'OWNER' && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-sm font-semibold transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> New Request
          </button>
        )}
      </div>

      {/* REQUESTS LIST */}
      <div className="grid gap-4">
        {loading ? (
          <p className="text-center text-slate-400 py-10">Loading requests...</p>
        ) : requests.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-dashed border-slate-300">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-slate-600">No requests found</h3>
            <p className="text-slate-400 text-sm">Requests will appear here once created.</p>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              
              {/* Request Info */}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(req.status)}`}>
                    {req.status}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {new Date(req.createdAt).toLocaleDateString()}
                  </span>
                </div>
                
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                   <MapPin className="w-4 h-4 text-slate-400" /> 
                   {req.branch?.name || 'Unknown Branch'}
                </h3>
                <p className="text-sm text-slate-500">Requested by: <span className="font-medium text-slate-700">{req.requestedBy?.fullName}</span></p>

                {/* Items List */}
                <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <p className="text-xs font-bold text-slate-400 uppercase mb-2">Items Requested:</p>
                  <ul className="text-sm text-slate-700 space-y-1">
                    {req.items.map((item, idx) => (
                      <li key={idx} className="flex justify-between border-b border-slate-200 last:border-0 pb-1 last:pb-0">
                        <span>{item.name}</span>
                        <span className="font-mono font-bold text-slate-500">x{item.qty} {item.unit}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {req.adminNote && (
                  <div className="mt-2 text-xs bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-100">
                    <strong>Admin Note:</strong> {req.adminNote}
                  </div>
                )}
              </div>

              {/* Owner Actions */}
              {user?.role === 'OWNER' && req.status === 'PENDING' && (
                <div className="flex gap-2">
                  <button 
                    onClick={() => setActionModal({ id: req.id, action: 'APPROVED' })}
                    className="flex items-center gap-1 px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-bold transition-colors"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button 
                    onClick={() => setActionModal({ id: req.id, action: 'REJECTED' })}
                    className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* --- MODAL: NEW REQUEST (STAFF) --- */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Stock Request">
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 space-y-3">
             <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                   <label className="text-xs font-bold text-slate-500 uppercase">Item Name</label>
                   <input 
                      type="text" 
                      className="w-full p-2 border rounded text-sm" 
                      placeholder="e.g. Whole Chicken"
                      value={newItem.name}
                      onChange={(e) => setNewItem({...newItem, name: e.target.value})}
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Quantity</label>
                   <input 
                      type="number" 
                      className="w-full p-2 border rounded text-sm" 
                      min="1"
                      value={newItem.qty}
                      onChange={(e) => setNewItem({...newItem, qty: Number(e.target.value)})}
                   />
                </div>
                <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Unit</label>
                   <select 
                      className="w-full p-2 border rounded text-sm"
                      value={newItem.unit}
                      onChange={(e) => setNewItem({...newItem, unit: e.target.value})}
                   >
                      <option value="pcs">Pieces</option>
                      <option value="kg">Kilograms</option>
                      <option value="box">Boxes</option>
                      <option value="tray">Trays</option>
                   </select>
                </div>
             </div>
             <button 
                onClick={addItemToList}
                className="w-full py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-sm font-bold flex justify-center items-center gap-2"
             >
                <Plus className="w-4 h-4" /> Add Item
             </button>
          </div>

          {/* List Preview */}
          <div className="max-h-40 overflow-y-auto border rounded-lg">
             {currentItems.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">No items added yet.</p>
             ) : (
                <table className="w-full text-sm text-left">
                   <thead className="bg-slate-100 text-slate-500 text-xs uppercase">
                      <tr>
                         <th className="p-2">Item</th>
                         <th className="p-2">Qty</th>
                         <th className="p-2">Action</th>
                      </tr>
                   </thead>
                   <tbody>
                      {currentItems.map((item, idx) => (
                         <tr key={idx} className="border-t border-slate-100">
                            <td className="p-2">{item.name}</td>
                            <td className="p-2">{item.qty} {item.unit}</td>
                            <td className="p-2">
                               <button onClick={() => removeItemFromList(idx)} className="text-red-500 hover:text-red-700">
                                  <Trash2 className="w-4 h-4" />
                               </button>
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             )}
          </div>

          <button 
             onClick={submitRequest}
             className="w-full py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 flex justify-center gap-2"
          >
             <Send className="w-4 h-4" /> Submit Request
          </button>
        </div>
      </Modal>

      {/* --- MODAL: APPROVE/REJECT (OWNER) --- */}
      <Modal 
        isOpen={!!actionModal} 
        onClose={() => setActionModal(null)} 
        title={actionModal?.action === 'APPROVED' ? 'Approve Request' : 'Reject Request'}
      >
         <div className="space-y-4">
            <p className="text-slate-600">
               Are you sure you want to <strong>{actionModal?.action.toLowerCase()}</strong> this request?
            </p>
            <div>
               <label className="text-xs font-bold text-slate-500 uppercase">Optional Note</label>
               <textarea 
                  className="w-full p-2 border rounded-lg text-sm h-24"
                  placeholder="Add a reason or delivery instruction..."
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
               />
            </div>
            <div className="flex justify-end gap-3">
               <button onClick={() => setActionModal(null)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">Cancel</button>
               <button 
                  onClick={handleStatusUpdate}
                  className={`px-4 py-2 text-white font-bold rounded shadow-md ${
                     actionModal?.action === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                  }`}
               >
                  Confirm {actionModal?.action === 'APPROVED' ? 'Approval' : 'Rejection'}
               </button>
            </div>
         </div>
      </Modal>

    </div>
  );
}