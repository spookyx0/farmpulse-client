/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
 
"use client";

import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Bell, User, LogOut, Package, ShoppingCart, Truck, Info, Banknote } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

// Define the Notification Type
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  type: 'sale' | 'delivery' | 'info' | 'expense';
}

export default function Header() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Track current user ref to avoid stale closures in socket listeners
  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  // --- 1. Load Notifications from SessionStorage ---
  useEffect(() => {
    if (typeof window === 'undefined' || !user) return;

    const key = `farmpulse_notifications_${user.id}_${user.role}`;
    const stored = sessionStorage.getItem(key);
    
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
         
        const hydrated = parsed.map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp) 
        }));
        setNotifications(hydrated);
      } catch (e) {
        setNotifications([]);
      }
    }
  }, [user?.id, user?.role]); 

  const saveNotifications = (newNotifs: NotificationItem[]) => {
    const currentUser = userRef.current;
    if (currentUser && typeof window !== 'undefined') {
       const key = `farmpulse_notifications_${currentUser.id}_${currentUser.role}`;
       sessionStorage.setItem(key, JSON.stringify(newNotifs));
    }
  };

  // --- 2. Real-time Listeners ---
  useEffect(() => {
    if (!socket) return;

    // Helper to add notification safely
    const pushNotification = (notif: NotificationItem) => {
      setNotifications(prev => {
        const updated = [notif, ...prev].slice(0, 50); // Keep last 50
        saveNotifications(updated);
        return updated;
      });
    };

    // 2a. Sales
    const handleNewSale = (sale: any) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const userBranchId = Number(currentUser.branchId);
      const saleBranchId = Number(sale.branch?.id || sale.branchId);
      
      const isOwner = currentUser.role === 'OWNER';
      const isMyBranch = currentUser.role === 'STAFF' && userBranchId === saleBranchId;

      if (isOwner || isMyBranch) {
        pushNotification({
          id: `sale-${Date.now()}-${Math.random()}`,
          title: 'New Sale Recorded',
          message: `Branch Sale: ₱${Number(sale.total_amount).toFixed(2)}`,
          timestamp: new Date(),
          read: false,
          type: 'sale'
        });
      }
    };

    // 2b. Delivery Updates (FIXED: Explicit updates for Owner)
    const handleDeliveryUpdate = (delivery: any) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const userBranchId = Number(currentUser.branchId);
      const deliveryBranchId = Number(delivery.branch?.id || delivery.branchId);
      
      const isOwner = currentUser.role === 'OWNER';
      const isMyBranch = currentUser.role === 'STAFF' && userBranchId === deliveryBranchId;

      if (isOwner || isMyBranch) {
        // Format message based on role
        const branchName = delivery.branch?.name ? ` to ${delivery.branch.name}` : '';
        const statusMsg = delivery.status === 'DELIVERED' ? 'has been RECEIVED' : `is now ${delivery.status}`;
        
        const message = isOwner 
            ? `Shipment #${delivery.id}${branchName} ${statusMsg}.`
            : `Delivery #${delivery.id} update: ${delivery.status}`;

        pushNotification({
          id: `del-upd-${Date.now()}-${Math.random()}`,
          title: 'Shipment Update',
          message: message,
          timestamp: new Date(),
          read: false,
          type: 'delivery'
        });
      }
    };

    // 2c. New Delivery
    const handleNewDelivery = (delivery: any) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const userBranchId = Number(currentUser.branchId);
      const deliveryBranchId = Number(delivery.branch?.id || delivery.branchId);
      
      const isOwner = currentUser.role === 'OWNER';
      const isMyBranch = currentUser.role === 'STAFF' && userBranchId === deliveryBranchId;

      if (isOwner) {
        pushNotification({
          id: `del-new-${Date.now()}-${Math.random()}`,
          title: 'Delivery Dispatched',
          message: `Delivery #${delivery.id} created successfully for ${delivery.branch?.name || 'Branch'}.`,
          timestamp: new Date(),
          read: false,
          type: 'delivery'
        });
      } else if (isMyBranch) {
        pushNotification({
          id: `del-new-${Date.now()}-${Math.random()}`,
          title: 'Incoming Delivery',
          message: `Headquarters sent delivery #${delivery.id}. Check Deliveries tab.`,
          timestamp: new Date(),
          read: false,
          type: 'delivery'
        });
      }
    };

    // 2d. Inventory Changes (Master)
    const handleInventoryUpdate = (data: any) => {
      const currentUser = userRef.current;
      if (currentUser?.role === 'OWNER') {
        pushNotification({
          id: `inv-${Date.now()}-${Math.random()}`,
          title: 'Inventory Updated',
          message: `Master Inventory: Item ${data.type}d successfully.`,
          timestamp: new Date(),
          read: false,
          type: 'info'
        });
      }
    };

    // 2e. New Expense
    const handleNewExpense = (expense: any) => {
      const currentUser = userRef.current;
      if (!currentUser) return;

      const userBranchId = Number(currentUser.branchId);
      const expBranchId = Number(expense.branchId);
      
      const isOwner = currentUser.role === 'OWNER';
      const isMyBranch = currentUser.role === 'STAFF' && userBranchId === expBranchId;

      if (isOwner || isMyBranch) {
        pushNotification({
          id: `exp-${Date.now()}-${Math.random()}`,
          title: 'Expense Recorded',
          message: `${expense.category}: ₱${Number(expense.amount).toFixed(2)} - ${expense.description || 'No desc'}`,
          timestamp: new Date(),
          read: false,
          type: 'expense'
        });
      }
    };

    socket.on('newSale', handleNewSale);
    socket.on('deliveryUpdated', handleDeliveryUpdate);
    socket.on('newDelivery', handleNewDelivery);
    socket.on('inventoryUpdated', handleInventoryUpdate);
    socket.on('newExpense', handleNewExpense);

    return () => {
      socket.off('newSale', handleNewSale);
      socket.off('deliveryUpdated', handleDeliveryUpdate);
      socket.off('newDelivery', handleNewDelivery);
      socket.off('inventoryUpdated', handleInventoryUpdate);
      socket.off('newExpense', handleNewExpense);
    };
  }, [socket]);

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveNotifications(updated);
  };

  const clearNotifications = () => {
    setNotifications([]);
    saveNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="bg-white h-16 border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-700 hidden md:block">
        </h2>
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        
        {/* Notifications Bell */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-pulse"></span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50 max-h-[90vh] flex flex-col">
              <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center bg-slate-50/50 rounded-t-xl">
                <h3 className="text-sm font-bold text-slate-800">Notifications ({unreadCount})</h3>
                <div className="flex gap-3">
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline font-medium">Mark Read</button>
                  <button onClick={clearNotifications} className="text-xs text-slate-400 hover:text-red-600 transition-colors">Clear</button>
                </div>
              </div>
              
              <div className="overflow-y-auto custom-scrollbar p-0">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`px-4 py-3 border-b border-slate-50 transition-colors hover:bg-slate-50 flex gap-3 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`mt-1 p-2 rounded-full h-fit shrink-0 ${
                        notif.type === 'sale' ? 'bg-green-100 text-green-600' : 
                        notif.type === 'delivery' ? 'bg-amber-100 text-amber-600' :
                        notif.type === 'expense' ? 'bg-red-100 text-red-600' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {notif.type === 'sale' && <ShoppingCart className="w-4 h-4" />}
                        {notif.type === 'delivery' && <Truck className="w-4 h-4" />}
                        {notif.type === 'expense' && <Banknote className="w-4 h-4" />}
                        {notif.type === 'info' && <Info className="w-4 h-4" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="text-sm text-slate-800 font-bold leading-snug truncate">{notif.title}</p>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {notif.timestamp instanceof Date ? notif.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{notif.message}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-12 text-center text-slate-400 text-sm flex flex-col items-center">
                    <Bell className="w-8 h-8 mb-2 opacity-20" />
                    No new notifications
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="h-8 w-px bg-slate-200 mx-1 hidden md:block"></div>

        {/* User Profile */}
        <div className="relative" ref={profileRef}>
          <button 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center gap-3 p-1.5 pr-3 rounded-full hover:bg-slate-50 transition-all border border-transparent hover:border-slate-200"
          >
            <div className="h-8 w-8 bg-gradient-to-tr from-green-500 to-teal-600 rounded-full flex items-center justify-center text-white shadow-sm">
              <User className="w-4 h-4" />
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-semibold text-slate-700 leading-none">{user?.username}</p>
              <p className="text-[10px] font-medium text-slate-500 uppercase mt-1 tracking-wide">{user?.role.replace('_', ' ')}</p>
            </div>
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
              <div className="px-4 py-3 border-b border-slate-50 md:hidden">
                <p className="text-sm font-bold text-slate-800">{user?.username}</p>
                <p className="text-xs text-slate-500">{user?.role}</p>
              </div>
              
              <button 
                onClick={() => alert("Profile Settings - Coming Soon")}
                className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors flex items-center gap-2"
              >
                <User className="w-4 h-4" /> Profile Settings
              </button>
              
              <div className="my-1 border-t border-slate-50"></div>
              
              <button 
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}