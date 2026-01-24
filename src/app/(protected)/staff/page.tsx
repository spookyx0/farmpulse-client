/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from 'react';
import api from '@/app/services/api';
import { 
  Users, UserPlus, MapPin, Truck,  
  Power, Search, Lock, Briefcase, Filter, X, Edit
} from 'lucide-react';
import { useToast } from '@/app/contexts/ToastContext';
import { Modal } from '@/app/components/ui/Modal'; 

// --- TYPES ---
interface Branch {
  id: number;
  name: string;
}

interface User {
  id: number;
  username: string;
  fullName: string;
  role: 'OWNER' | 'STAFF' | 'LIVE_CHICKEN' | 'FREEZER_VAN';
  branchId?: number; // Maps to branch_id in backend
  branch?: Branch;
  isActive: boolean;
  lastLogin?: string;
}

export default function StaffManagementPage() {
  const { showToast } = useToast();
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter State
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    fullName: '',
    role: 'STAFF',
    branchId: '', 
  });

  // --- FETCH DATA ---
  const fetchData = async () => {
    try {
      setLoading(true);
      // We pass branch_id as a query param if a specific branch is selected
      const userParams = filterBranch !== 'ALL' ? { branch_id: filterBranch } : {};
      
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/users', { params: userParams }),
        api.get('/branches')
      ]);
      
      setUsers(usersRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error(error);
      showToast("Failed to load staff data", "error");
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch when branch filter changes
  useEffect(() => {
    fetchData();
  }, [filterBranch]);

  // --- HANDLERS ---
  const handleOpenModal = (user?: User) => {
    if (user) {
      setIsEditMode(true);
      setSelectedUser(user);
      setFormData({
        username: user.username,
        password: '', // Empty means no change for Patch
        fullName: user.fullName || '',
        role: user.role,
        // Backend uses branch_id, but JS object uses branchId
        branchId: user.branchId ? String(user.branchId) : (branches[0]?.id.toString() || ''),
      });
    } else {
      setIsEditMode(false);
      setSelectedUser(null);
      setFormData({
        username: '',
        password: '',
        fullName: '',
        role: 'STAFF',
        branchId: branches[0]?.id.toString() || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Logic: Explicitly map branch_id for the backend
      const payload: any = { 
        username: formData.username,
        fullName: formData.fullName,
        role: formData.role,
        password: formData.password,
        branch_id: formData.role === 'OWNER' ? null : Number(formData.branchId) 
      };
      
      if (isEditMode && selectedUser) {
        // Only send password if user typed a new one
        if (!payload.password || payload.password.trim() === '') delete payload.password;
        
        await api.patch(`/users/${selectedUser.id}`, payload);
        showToast("Staff updated successfully", "success");
      } else {
        if (!payload.password) {
            showToast("Password is required for new users", "error");
            return;
        }
        await api.post('/users', payload);
        showToast("New staff created successfully", "success");
      }
      setIsModalOpen(false);
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Operation failed", "error");
    }
  };

  const toggleStatus = async (user: User) => {
    // THE KILL SWITCH
    const action = user.isActive ? 'DEACTIVATE' : 'ACTIVATE';
    if (!confirm(`SECURITY OVERRIDE: Are you sure you want to ${action} account "${user.username}"?`)) return;
    
    try {
      await api.patch(`/users/${user.id}/status`);
      showToast(`Account successfully ${user.isActive ? 'suspended' : 'enabled'}`, "success");
      fetchData();
    } catch (error) {
      showToast("Failed to toggle account status", "error");
    }
  };

  // Client-side search filtering
  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      
      {/* 1. HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-600" /> Staff Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Owner Control Center: Assign branches and manage security status.
          </p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-slate-800 hover:bg-slate-700 text-white px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all shadow-sm active:scale-95 text-sm font-semibold"
        >
          <UserPlus className="w-4 h-4" /> Add New Staff
        </button>
      </div>

      {/* 2. FILTERS BAR */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by name or username..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500/20"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
                className="p-2 pr-8 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none cursor-pointer w-full md:w-48"
                value={filterBranch}
                onChange={e => setFilterBranch(e.target.value)}
            >
                <option value="ALL">All Branches</option>
                {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                ))}
            </select>
        </div>
      </div>

      {/* 3. STAFF TABLE */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4">Staff Member</th>
              <th className="p-4">System Role</th>
              <th className="p-4">Assigned Branch</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               <tr><td colSpan={5} className="p-12 text-center text-slate-400">Loading directory...</td></tr>
            ) : filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${user.isActive ? 'bg-slate-800' : 'bg-slate-300'}`}>
                        {user.username[0].toUpperCase()}
                    </div>
                    <div>
                        <p className={`font-bold ${user.isActive ? 'text-slate-700' : 'text-slate-400'}`}>
                            {user.fullName || user.username}
                        </p>
                        <p className="text-xs text-slate-400">@{user.username}</p>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border ${
                    user.role === 'OWNER' ? 'bg-slate-800 text-white border-slate-800' :
                    user.role === 'STAFF' ? 'bg-green-50 text-green-700 border-green-100' :
                    'bg-blue-50 text-blue-700 border-blue-100'
                  }`}>
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="p-4">
                    {user.role === 'OWNER' ? (
                        <span className="text-slate-400 italic text-xs">Global Access</span>
                    ) : (
                        <div className="flex items-center gap-1.5 text-slate-700 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {user.branch?.name || <span className="text-red-400">Unassigned</span>}
                        </div>
                    )}
                </td>
                <td className="p-4">
                   <div className="flex items-center gap-1.5">
                       <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                       <span className={`text-xs font-medium ${user.isActive ? 'text-emerald-700' : 'text-red-600'}`}>
                          {user.isActive ? 'Active' : 'Suspended'}
                       </span>
                   </div>
                </td>
                <td className="p-4 text-right">
                   <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenModal(user)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                         <Edit className="w-4 h-4" />
                      </button>
                      {user.role !== 'OWNER' && (
                        <button 
                            onClick={() => toggleStatus(user)}
                            className={`p-1.5 rounded transition-colors ${
                                user.isActive 
                                    ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' 
                                    : 'text-emerald-500 hover:bg-emerald-50'
                            }`}
                            title={user.isActive ? "Deactivate (Kill Switch)" : "Activate User"}
                        >
                            <Power className="w-4 h-4" />
                        </button>
                      )}
                   </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* --- ADD/EDIT MODAL --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "Edit Staff Profile" : "Create New Staff Account"}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            required
                            className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400"
                            placeholder="e.g. Juan Cruz"
                            value={formData.fullName}
                            onChange={e => setFormData({...formData, fullName: e.target.value})}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Username</label>
                    <div className="relative">
                        <Users className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" 
                            required
                            className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400"
                            placeholder="e.g. juanc"
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {isEditMode ? "Reset Password (Optional)" : "Initial Password"}
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="password" 
                        required={!isEditMode}
                        className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400"
                        placeholder="••••••••"
                        value={formData.password}
                        onChange={e => setFormData({...formData, password: e.target.value})}
                        minLength={6}
                    />
                </div>
            </div>

            <div className="border-t border-slate-100 my-2"></div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">System Role</label>
                <select 
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 cursor-pointer"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as any})}
                    disabled={isEditMode && selectedUser?.role === 'OWNER'}
                >
                    <option value="STAFF">Store Staff (Stationary)</option>
                    <option value="LIVE_CHICKEN">Live Chicken (Mobile)</option>
                    <option value="FREEZER_VAN">Freezer Van (Mobile)</option>
                    <option value="OWNER">System Owner (Admin)</option>
                </select>
            </div>

            {formData.role !== 'OWNER' && (
                <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                        {formData.role === 'STAFF' ? 'Assigned Branch' : 'Home Base / Origin'}
                    </label>
                    <div className="relative">
                        <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <select 
                            className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-400 cursor-pointer"
                            value={formData.branchId}
                            onChange={e => setFormData({...formData, branchId: e.target.value})}
                        >
                            {branches.map(b => (
                                <option key={b.id} value={b.id}>{b.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            <div className="pt-4 flex justify-end gap-3">
                <button 
                    type="button" 
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                    Cancel
                </button>
                <button 
                    type="submit" 
                    className="px-4 py-2 text-sm font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-700 shadow-md transition-all active:scale-95"
                >
                    {isEditMode ? "Save Changes" : "Create Account"}
                </button>
            </div>
        </form>
      </Modal>
    </div>
  );
}