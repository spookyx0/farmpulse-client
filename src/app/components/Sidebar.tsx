"use client";

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Store, 
  Package, 
  Truck, 
  Banknote, 
  ShoppingCart, 
  Snowflake, 
  Egg, 
  ClipboardList,
  Users,
  FileText,
  MessageSquare,
  X 
} from 'lucide-react';

type NavLink = { href: string; label: string; icon: React.ReactNode };
type NavSection = { title: string; items: NavLink[] };

const ownerLinks: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { href: '/branches', label: 'Branches', icon: <Store className="w-5 h-5" /> },
      { href: '/inventory', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
      { href: '/stock-requests', label: 'Stock Requests', icon: <ClipboardList className="w-5 h-5" /> },
      { href: '/deliveries', label: 'Deliveries', icon: <Truck className="w-5 h-5" /> },
      { href: '/expenses', label: 'Expenses', icon: <Banknote className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Monitoring',
    items: [
      { href: '/live-chicken/monitoring', label: 'Live Chicken Monitoring', icon: <Egg className="w-5 h-5" /> },
      { href: '/freezer-van/monitoring', label: 'Freezer Van Monitoring', icon: <Snowflake className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Admin Menu',
    items: [
      { href: '/staff', label: 'Staff Management', icon: <Users className="w-5 h-5" /> },
      { href: '/audit', label: 'Audit Logs', icon: <FileText className="w-5 h-5" /> },
      { href: '/chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
    ]
  }
];

const staffLinks: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { href: '/sales', label: 'Sales Register', icon: <ShoppingCart className="w-5 h-5" /> },
      { href: '/stock-requests', label: 'Stock Requests', icon: <ClipboardList className="w-5 h-5" /> },
      { href: '/inventory', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
      { href: '/deliveries', label: 'Deliveries', icon: <Truck className="w-5 h-5" /> },
      { href: '/expenses', label: 'Expenses', icon: <Banknote className="w-5 h-5" /> },
      { href: '/chat', label: 'Chat', icon: <MessageSquare className="w-5 h-5" /> },
    ]
  }
];

const freezerVanLinks: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { href: '/freezer-van/sales', label: 'Van Sales', icon: <Truck className="w-5 h-5" /> },
      { href: '/freezer-van/inventory', label: 'Van Inventory', icon: <Snowflake className="w-5 h-5" /> },
    ]
  }
];

const liveChickenLinks: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { href: '/live-chicken/distribution', label: 'Distribution', icon: <Egg className="w-5 h-5" /> },
      { href: '/live-chicken/inventory', label: 'Coop Inventory', icon: <ClipboardList className="w-5 h-5" /> },
    ]
  }
];

const roleLinks = {
  OWNER: ownerLinks,
  STAFF: staffLinks,
  FREEZER_VAN: freezerVanLinks,
  LIVE_CHICKEN: liveChickenLinks,
};

export default function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  
  // Mobile Sidebar State
  const [isOpen, setIsOpen] = useState(false);

  // Listen for the Custom Event triggered by the Header Burger menu
  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev);
    window.addEventListener('toggleSidebar', handleToggle);
    return () => window.removeEventListener('toggleSidebar', handleToggle);
  }, []);

  const links = user ? roleLinks[user.role as keyof typeof roleLinks] : [];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Main Sidebar Container */}
      <nav className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl border-r border-slate-800 transform transition-transform duration-300 ease-in-out md:relative md:h-screen md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Logo Header */}
        <div className="h-16 flex items-center justify-between px-10 border-b border-slate-800 bg-slate-950 shrink-0">
          <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-3">
            <Image src="/LSBLogo.png" alt="LSB Logo" width={32} height={32} className="w-8 h-8 rounded-full" /> 
            LSB Store
          </h2>
          {/* Mobile Close Button */}
          <button onClick={() => setIsOpen(false)} className="md:hidden p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 custom-scrollbar">
          {links.map((section, idx) => (
            <div key={idx} className="mb-6">
              <p className="px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                {section.title}
              </p>
              <ul className="space-y-1.5 px-4">
                {section.items.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(link.href + '/');
                  return (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        onClick={() => setIsOpen(false)} // Auto-close on mobile when link is clicked
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                          isActive
                            ? 'bg-[#10b981] text-white shadow-md' // Matches the bright green in your screenshot
                            : 'hover:bg-slate-800/50 hover:text-white'
                        }`}
                      >
                        <span className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'}`}>
                          {link.icon}
                        </span>
                        <span className="font-semibold text-sm tracking-wide">{link.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        {/* Minimal Footer */}
        <div className="p-4 border-t border-slate-800/50 text-center text-[10px] font-medium text-slate-500 shrink-0 bg-slate-900">
          <p>LSB Store System</p>
          <p className="mt-0.5">© 2026</p>
        </div>
      </nav>
    </>
  );
}