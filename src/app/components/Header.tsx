"use client";

import { useAuth } from '../contexts/AuthContext';
import { Bell, User, LogOut, Menu } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function Header() {
  const { user, logout } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Click outside handler to close dropdowns
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

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
      {/* Left Side: Branding or Page Title Context */}
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-slate-700 hidden md:block">
          FarmPulse Management
        </h2>
      </div>

      {/* Right Side: Actions */}
      <div className="flex items-center gap-2 md:gap-4">
        
        {/* Notifications */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-500 hover:bg-slate-100 rounded-full transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            {/* Notification Badge Mockup */}
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
              <div className="px-4 py-3 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-800">Notifications</h3>
                <span className="text-xs text-blue-600 cursor-pointer hover:underline">Mark all read</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {/* Mock Notification Items */}
                <div className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors cursor-pointer">
                  <p className="text-sm text-slate-800 font-medium">New delivery received</p>
                  <p className="text-xs text-slate-500 mt-0.5">San Roque Branch • 2 mins ago</p>
                </div>
                <div className="px-4 py-3 hover:bg-slate-50 border-b border-slate-50 transition-colors cursor-pointer">
                  <p className="text-sm text-slate-800 font-medium">Low stock alert: Whole Chicken</p>
                  <p className="text-xs text-slate-500 mt-0.5">Rawis Branch • 1 hour ago</p>
                </div>
                <div className="px-4 py-3 text-center text-xs text-slate-400 mt-2">
                  No more notifications
                </div>
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
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
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