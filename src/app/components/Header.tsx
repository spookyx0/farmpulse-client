/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Bell, User, LogOut, Package, ShoppingCart } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

// Define the Notification Type
interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: Date; // In state, this is a Date object. In JSON, it's a string.
  read: boolean;
  type: 'sale' | 'delivery' | 'info';
}

export default function Header() {
  const { user, logout } = useAuth();
  const socket = useSocket();
  
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Helper to get the unique storage key for the current user
  // Uniqueness ensures that if you log out and log in as someone else, you don't see old notifs
  const getStorageKey = useCallback(() => {
    if (!user) return null;
    return `farmpulse_notifications_${user.id}_${user.role}`;
  }, [user]);

  // --- 1. Load Notifications from SessionStorage on Mount ---
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const key = getStorageKey();
    if (!key) return;

    // FIX: Use sessionStorage to match your Auth system
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
        console.error("Failed to parse notifications", e);
      }
    } else {
      setNotifications([]); // Reset if no key found
    }
  }, [getStorageKey]);

  // --- 2. Helper to Update State AND SessionStorage ---
  const updateNotifications = (newNotifs: NotificationItem[]) => {
    setNotifications(newNotifs);
    const key = getStorageKey();
    if (key && typeof window !== 'undefined') {
      sessionStorage.setItem(key, JSON.stringify(newNotifs));
    }
  };

  // --- Real-time Listener ---
  useEffect(() => {
    if (!socket || !user) return;

    // Handler for New Sales
    const handleNewSale = (sale: any) => {
      const isOwner = user.role === 'OWNER';
      const isMyBranch = user.role === 'STAFF' && user.branchId === sale.branch?.id;

      if (isOwner || isMyBranch) {
        const newNotif: NotificationItem = {
          id: `sale-${Date.now()}-${Math.random()}`,
          title: 'New Sale Recorded',
          message: `${sale.branch?.name}: $${sale.total_amount} sold by ${sale.staff?.username}`,
          timestamp: new Date(),
          read: false,
          type: 'sale'
        };
        
        // Use functional state update to get latest list, then save to storage
        setNotifications(prev => {
          const updated = [newNotif, ...prev];
          const key = getStorageKey();
          if(key) sessionStorage.setItem(key, JSON.stringify(updated));
          return updated;
        });
      }
    };

    // Handler for Delivery Updates
    const handleDeliveryUpdate = (delivery: any) => {
      const isOwner = user.role === 'OWNER';
      const isMyBranch = user.role === 'STAFF' && user.branchId === delivery.branch?.id;

      if (isOwner || isMyBranch) {
        const newNotif: NotificationItem = {
          id: `del-${Date.now()}-${Math.random()}`,
          title: 'Delivery Update',
          message: `Delivery #${delivery.id} is now ${delivery.status}`,
          timestamp: new Date(),
          read: false,
          type: 'delivery'
        };

        setNotifications(prev => {
          const updated = [newNotif, ...prev];
          const key = getStorageKey();
          if(key) sessionStorage.setItem(key, JSON.stringify(updated));
          return updated;
        });
      }
    };

    socket.on('newSale', handleNewSale);
    socket.on('deliveryUpdated', handleDeliveryUpdate);

    return () => {
      socket.off('newSale', handleNewSale);
      socket.off('deliveryUpdated', handleDeliveryUpdate);
    };
  }, [socket, user, getStorageKey]);

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

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    updateNotifications(updated);
  };

  const clearNotifications = () => {
    updateNotifications([]);
  };

  return (
    <header className="bg-white h-16 border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-700 hidden md:block">
          FarmPulse Management
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
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right z-50">
              <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">Notifications ({unreadCount})</h3>
                <div className="flex gap-2">
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">Mark Read</button>
                  <button onClick={clearNotifications} className="text-xs text-slate-400 hover:text-slate-600">Clear</button>
                </div>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notif) => (
                    <div 
                      key={notif.id} 
                      className={`px-4 py-3 border-b border-slate-50 transition-colors hover:bg-slate-50 flex gap-3 ${!notif.read ? 'bg-blue-50/30' : ''}`}
                    >
                      <div className={`mt-1 p-2 rounded-full h-fit ${notif.type === 'sale' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'}`}>
                        {notif.type === 'sale' ? <ShoppingCart className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                      </div>
                      <div>
                        <p className="text-sm text-slate-800 font-medium leading-snug">{notif.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{notif.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {notif.timestamp instanceof Date && !isNaN(notif.timestamp.getTime()) 
                            ? notif.timestamp.toLocaleTimeString() 
                            : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-4 py-8 text-center text-slate-400 text-sm">
                    <Bell className="w-8 h-8 mx-auto mb-2 opacity-20" />
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