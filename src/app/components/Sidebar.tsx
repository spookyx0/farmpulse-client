"use client";

import Link from 'next/link';
import Image from 'next/image';
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
  FileText
} from 'lucide-react';

// Update type to accept React Components (Icons) instead of just strings
type NavLink = { href: string; label: string; icon: React.ReactNode };
type NavSection = { title: string; items: NavLink[] };

const ownerLinks: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { href: '/branches', label: 'Branches', icon: <Store className="w-5 h-5" /> },
      { href: '/inventory', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
      { href: '/deliveries', label: 'Deliveries', icon: <Truck className="w-5 h-5" /> },
      { href: '/expenses', label: 'Expenses', icon: <Banknote className="w-5 h-5" /> },
    ]
  },
  {
    title: 'Admin Menu',
    items: [
      { href: '/staff', label: 'Staff Management', icon: <Users className="w-5 h-5" /> },
      { href: '/audit-logs', label: 'Audit Logs', icon: <FileText className="w-5 h-5" /> },
    ]
  }
];

const staffLinks: NavSection[] = [
  {
    title: 'Main Menu',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
      { href: '/sales', label: 'Sales Register', icon: <ShoppingCart className="w-5 h-5" /> },
      { href: '/inventory', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
      { href: '/deliveries', label: 'Deliveries', icon: <Truck className="w-5 h-5" /> },
      { href: '/expenses', label: 'Expenses', icon: <Banknote className="w-5 h-5" /> },
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

  const links = user ? roleLinks[user.role as keyof typeof roleLinks] : [];

  return (
    <nav className="w-full h-full bg-slate-900 text-slate-300 flex flex-col shadow-xl border-r border-slate-800">
      {/* Minimal Logo Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-450">
        <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-4">
          <Image src="/LSBLogo.png" alt="LSB Logo" width={32} height={32} className="w-8 h-8" /> LSB Store
        </h2>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6">
        {links.map((section, idx) => (
          <div key={idx} className="mb-6">
            <p className="px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              {section.title}
            </p>
            <ul className="space-y-1 px-3">
              {section.items.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                        isActive
                          ? 'bg-green-600 text-white shadow-md translate-x-1'
                          : 'hover:bg-slate-800 hover:text-white'
                      }`}
                    >
                      <span className={`transition-transform group-hover:scale-110 ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`}>
                        {link.icon}
                      </span>
                      <span className="font-medium text-sm">{link.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      {/* Minimal Footer (Version Info) */}
      <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-600">
        <p>LSB Store System</p>
        <p className="mt-1">© 2026</p>
      </div>
    </nav>
  );
}