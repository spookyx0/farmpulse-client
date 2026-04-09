/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo } from 'react';
import api from '@/app/services/api';
import { 
  Users, UserPlus, MapPin,  
  Power, Search, Lock, Briefcase, Filter, Edit, AlertTriangle, ShieldAlert, CheckCircle,
  Building2, Store, Plus, Activity, Trash2
} from 'lucide-react';
import { useToast } from '@/app/contexts/ToastContext';
import { Modal } from '@/app/components/ui/Modal'; 
import { ConfirmationModal } from '@/app/components/ui/ConfirmationModal';

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
  branchId?: number; 
  branch?: Branch;
  isActive: boolean;
}

export default function StaffManagementPage() {
  const { showToast } = useToast();
  
  // Data State
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);

  // Tab State
  const [activeTab, setActiveTab] = useState<'STAFF' | 'BRANCHES'>('STAFF');

  // Filter State
  const [search, setSearch] = useState('');
  const [filterBranch, setFilterBranch] = useState<string>('ALL');

  // Staff Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [userToToggle, setUserToToggle] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Branch Modal States
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deletingBranch, setDeletingBranch] = useState<Branch | null>(null);
  const [newBranchName, setNewBranchName] = useState('');

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
      const userParams = filterBranch !== 'ALL' ? { branch_id: filterBranch } : {};
      
      const [usersRes, branchesRes] = await Promise.all([
        api.get('/users', { params: userParams }),
        api.get('/branches')
      ]);
      
      setUsers(usersRes.data);
      setBranches(branchesRes.data);
    } catch (error) {
      console.error(error);
      showToast("Failed to load management data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterBranch]);

  // --- KPIs ---
  const stats = useMemo(() => {
    const activeStaff = users.filter(u => u.isActive).length;
    const suspendedStaff = users.length - activeStaff;
    return {
      totalStaff: users.length,
      activeStaff,
      suspendedStaff,
      totalBranches: branches.length
    };
  }, [users, branches]);

  // --- STAFF HANDLERS ---
  const handleOpenModal = (user?: User) => {
    if (user) {
      setIsEditMode(true);
      setSelectedUser(user);
      setFormData({
        username: user.username,
        password: '', 
        fullName: user.fullName || '',
        role: user.role,
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
      const payload: any = { 
        username: formData.username,
        fullName: formData.fullName,
        role: formData.role,
        branch_id: formData.role === 'OWNER' ? null : Number(formData.branchId) 
      };
      
      if (isEditMode && selectedUser) {
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

  const confirmStatusToggle = async () => {
    if (!userToToggle) return;
    try {
      await api.patch(`/users/${userToToggle.id}/status`);
      showToast(`Account ${userToToggle.isActive ? 'suspended' : 'activated'} successfully`, "success");
      setSuspendModalOpen(false);
      setUserToToggle(null);
      fetchData(); 
    } catch (error) {
      showToast("Failed to update status", "error");
    }
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;
    try {
      await api.delete(`/users/${deletingUser.id}`);
      showToast("Staff deleted successfully", "success");
      setDeletingUser(null);
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to delete staff member", "error");
    }
  };

  // --- BRANCH HANDLERS ---
  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
      setNewBranchName(branch.name);
    } else {
      setEditingBranch(null);
      setNewBranchName('');
    }
    setIsBranchModalOpen(true);
  };

  const handleSaveBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBranchName.trim()) return;
    
    try {
      if (editingBranch) {
        await api.patch(`/branches/${editingBranch.id}`, { name: newBranchName });
        showToast("Branch updated successfully", "success");
      } else {
        await api.post('/branches', { name: newBranchName });
        showToast("New branch established successfully", "success");
      }
      setIsBranchModalOpen(false);
      setEditingBranch(null);
      setNewBranchName('');
      fetchData();
    } catch (error: any) {
      showToast(error.response?.data?.message || "Failed to save branch", "error");
    }
  };

  const confirmDeleteBranch = async () => {
    if (!deletingBranch) return;
    try {
      await api.delete(`/branches/${deletingBranch.id}`);
      showToast("Branch deleted successfully", "success");
      setDeletingBranch(null);
      fetchData();
    } catch (error: any) {
      // Usually fails if there are still users assigned to this branch
      showToast(error.response?.data?.message || "Failed to delete branch. Make sure no staff are assigned to it.", "error");
    }
  };

  // Client-side search filtering
  const filteredUsers = users.filter(u => 
    u.fullName?.toLowerCase().includes(search.toLowerCase()) || 
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      
      {/* --- HEADER SECTION --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-blue-600" /> Control Center
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your operational network, assign roles, and enforce security access.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => handleOpenBranchModal()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-sm font-bold rounded-xl hover:bg-slate-50 hover:text-blue-600 transition-all shadow-sm active:scale-95"
          >
            <Building2 className="w-4 h-4" /> Add Branch
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all shadow-md hover:shadow-lg active:scale-95"
          >
            <UserPlus className="w-4 h-4" /> Add Staff
          </button>
        </div>
      </div>

      {/* --- KPI CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Headcount</p>
            <p className="text-3xl font-black text-slate-900 mt-1">{stats.totalStaff}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Users className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Operations</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{stats.totalBranches}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Store className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Staff</p>
            <p className="text-3xl font-black text-emerald-600 mt-1">{stats.activeStaff}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><Activity className="w-6 h-6" /></div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Suspended Accounts</p>
            <p className="text-3xl font-black text-red-600 mt-1">{stats.suspendedStaff}</p>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600"><Lock className="w-6 h-6" /></div>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
        
        {/* TABS */}
        <div className="flex bg-slate-50 border-b border-slate-200">
          <button 
            onClick={() => setActiveTab('STAFF')}
            className={`flex items-center gap-2 px-8 py-4 text-sm font-bold transition-colors relative ${activeTab === 'STAFF' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Users className="w-4 h-4" /> Staff Directory
            {activeTab === 'STAFF' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-slate-900 rounded-t-full" />}
          </button>
          <button 
            onClick={() => setActiveTab('BRANCHES')}
            className={`flex items-center gap-2 px-8 py-4 text-sm font-bold transition-colors relative ${activeTab === 'BRANCHES' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Building2 className="w-4 h-4" /> Branch Network
            {activeTab === 'BRANCHES' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
          </button>
        </div>

        {/* --- STAFF TAB CONTENT --- */}
        {activeTab === 'STAFF' && (
          <>
            {/* FILTERS */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row gap-4 items-center justify-between bg-white">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by name or username..." 
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-400 focus:bg-white transition-all"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto bg-slate-50 border border-slate-200 rounded-xl px-3 py-1">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select 
                      className="p-1.5 bg-transparent text-sm font-bold text-slate-600 focus:outline-none cursor-pointer w-full md:w-48"
                      value={filterBranch}
                      onChange={e => setFilterBranch(e.target.value)}
                  >
                      <option value="ALL">All Locations</option>
                      {branches.map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                  </select>
              </div>
            </div>

            {/* STAFF TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Identity</th>
                    <th className="px-6 py-4">System Role</th>
                    <th className="px-6 py-4">Assignment</th>
                    <th className="px-6 py-4">Security Status</th>
                    <th className="px-6 py-4 text-right">Manage</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">Loading personnel data...</td></tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">No staff members found.</td></tr>
                  ) : filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-sm ${user.isActive ? 'bg-slate-800' : 'bg-slate-300'}`}>
                              {user.username[0].toUpperCase()}
                          </div>
                          <div>
                              <p className={`font-bold ${user.isActive ? 'text-slate-900' : 'text-slate-400'}`}>
                                  {user.fullName || user.username}
                              </p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">@{user.username}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border ${
                          user.role === 'OWNER' ? 'bg-slate-900 text-white border-slate-900' :
                          user.role === 'STAFF' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                          {user.role === 'OWNER' ? (
                              <span className="text-slate-400 font-bold text-xs uppercase tracking-wider">Global Operations</span>
                          ) : (
                              <div className="flex items-center gap-2 text-slate-700 font-bold text-xs">
                                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                  {user.branch?.name || <span className="text-red-400">Unassigned</span>}
                              </div>
                          )}
                      </td>
                      <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]' : 'bg-red-500'}`}></span>
                              <span className={`text-xs font-bold ${user.isActive ? 'text-emerald-700' : 'text-red-600'}`}>
                                {user.isActive ? 'Active Access' : 'Suspended'}
                              </span>
                          </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenModal(user)}
                              className="p-2 text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-all shadow-sm"
                              title="Edit Details"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            {user.role !== 'OWNER' && (
                              <button 
                                  onClick={() => {setUserToToggle(user); setSuspendModalOpen(true);}}
                                  className={`p-2 bg-white border rounded-lg transition-all shadow-sm ${
                                      user.isActive 
                                          ? 'text-orange-600 border-orange-200 hover:bg-orange-50' 
                                          : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'
                                  }`}
                                  title={user.isActive ? "Deactivate Access" : "Restore Access"}
                              >
                                  <Power className="w-4 h-4" />
                              </button>
                            )}
                            <button 
                              onClick={() => setDeletingUser(user)}
                              className="p-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm"
                              title="Delete Staff"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* --- BRANCHES TAB CONTENT --- */}
        {activeTab === 'BRANCHES' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="px-6 py-4 w-20 text-center">ID</th>
                  <th className="px-6 py-4">Branch Identity</th>
                  <th className="px-6 py-4 text-center">Assigned Personnel</th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-right">Manage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">Loading branch data...</td></tr>
                ) : branches.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium">No branches established yet.</td></tr>
                ) : branches.map((branch) => {
                  const staffCount = users.filter(u => u.branchId === branch.id).length;
                  return (
                    <tr key={branch.id} className="hover:bg-blue-50/30 transition-colors group">
                      <td className="px-6 py-4 text-center text-slate-400 font-mono text-xs font-bold">#{branch.id}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                            <Store className="w-5 h-5" />
                          </div>
                          <span className="font-bold text-slate-900 text-base">{branch.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-bold text-xs">
                          {staffCount} Members
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Operational
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => handleOpenBranchModal(branch)}
                              className="p-2 text-blue-600 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-all shadow-sm"
                              title="Edit Branch"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={() => setDeletingBranch(branch)}
                              className="p-2 text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-lg transition-all shadow-sm"
                              title="Delete Branch"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================= */}
      {/* MODALS                                      */}
      {/* ========================================= */}

      {/* --- ADD/EDIT BRANCH MODAL --- */}
      <Modal isOpen={isBranchModalOpen} onClose={() => setIsBranchModalOpen(false)} title={editingBranch ? "Update Branch Details" : "Establish New Branch"}>
        <form onSubmit={handleSaveBranch} className="space-y-5 mt-2">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Branch Name / Location</label>
            <div className="relative">
              <Store className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                required
                className="w-full pl-9 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                placeholder="e.g. San Roque Main, Catarman Hub"
                value={newBranchName}
                onChange={e => setNewBranchName(e.target.value)}
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-2">This is the operational hub that staff can be assigned to.</p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={() => setIsBranchModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
            <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-2">
              {editingBranch ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />} 
              {editingBranch ? 'Save Updates' : 'Create Branch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* --- ADD/EDIT STAFF MODAL --- */}
      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title={isEditMode ? "Edit Staff Profile" : "Register Personnel"}
      >
        <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                    <div className="relative">
                        <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input 
                            type="text" required
                            className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white"
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
                            type="text" required
                            className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white"
                            placeholder="e.g. juanc"
                            value={formData.username}
                            onChange={e => setFormData({...formData, username: e.target.value})}
                        />
                    </div>
                </div>
            </div>

            <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                    {isEditMode ? "Reset Password (Optional)" : "Initial Access Password"}
                </label>
                <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input 
                        type="password" 
                        required={!isEditMode}
                        className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white"
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
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white cursor-pointer font-medium"
                    value={formData.role}
                    onChange={e => setFormData({...formData, role: e.target.value as any})}
                    disabled={isEditMode && selectedUser?.role === 'OWNER'}
                >
                    <option value="STAFF">Store Staff (Stationary)</option>
                    <option value="LIVE_CHICKEN">Live Chicken (Mobile)</option>
                    <option value="FREEZER_VAN">Freezer Van (Mobile)</option>
                    <option value="OWNER" className="text-red-600 font-bold">System Owner (Admin)</option>
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
                            className="w-full pl-9 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-slate-400 focus:bg-white cursor-pointer font-medium"
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

            <div className="pt-4 flex justify-end gap-3 border-t border-slate-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors">Cancel</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-all active:scale-95">
                    {isEditMode ? "Save Changes" : "Create Account"}
                </button>
            </div>
        </form>
      </Modal>

      {/* --- CONFIRMATION MODAL FOR SUSPEND/ACTIVATE --- */}
      <ConfirmationModal
        isOpen={suspendModalOpen}
        onClose={() => setSuspendModalOpen(false)}
        onConfirm={confirmStatusToggle}
        title={userToToggle?.isActive ? "Security: Suspend Account?" : "Restore Access?"}
        message={userToToggle?.isActive 
          ? `User "${userToToggle?.username}" will be immediately logged out and blocked from accessing the system.`
          : `User "${userToToggle?.username}" will regain access to the dashboard and assigned branch.`
        }
        confirmText={userToToggle?.isActive ? 'Confirm Suspension' : 'Activate Account'}
        variant={userToToggle?.isActive ? "danger" : "primary"}
      />

      {/* --- DELETE STAFF CONFIRMATION MODAL --- */}
      <ConfirmationModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={confirmDeleteUser}
        title="Delete Personnel Record?"
        message={`Are you sure you want to permanently delete the account for ${deletingUser?.fullName || deletingUser?.username}? This action cannot be undone.`}
        confirmText="Yes, Delete Account"
        variant="danger"
      />

      {/* --- DELETE BRANCH CONFIRMATION MODAL --- */}
      <ConfirmationModal
        isOpen={!!deletingBranch}
        onClose={() => setDeletingBranch(null)}
        onConfirm={confirmDeleteBranch}
        title="Delete Branch / Location?"
        message={`Are you sure you want to permanently delete "${deletingBranch?.name}"? You must reassign or remove all staff attached to this branch first.`}
        confirmText="Yes, Delete Branch"
        variant="danger"
      />

    </div>
  );
}