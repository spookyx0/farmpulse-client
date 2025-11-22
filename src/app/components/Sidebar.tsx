"use client";

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';

type NavLink = { href: string; label: string; icon?: string };

// Define links for each role with Icons (using emojis for simplicity, or you can use Lucide icons if imported)
const ownerLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/branches', label: 'Branches', icon: '🏢' },
  { href: '/inventory', label: 'Inventory', icon: '📦' },
  { href: '/deliveries', label: 'Deliveries', icon: '🚚' },
  { href: '/expenses', label: 'Expenses', icon: '💰' },
];

const staffLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/sales', label: 'Sales Register', icon: '🛒' },
  { href: '/inventory', label: 'Inventory', icon: '📦' },
  { href: '/deliveries', label: 'Deliveries', icon: '🚚' },
  { href: '/expenses', label: 'Expenses', icon: '💰' },
];

const freezerVanLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/freezer-van/sales', label: 'Van Sales', icon: '🚚' },
  { href: '/freezer-van/inventory', label: 'Van Inventory', icon: '❄️' },
];

const liveChickenLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/live-chicken/distribution', label: 'Distribution', icon: '🐓' },
  { href: '/live-chicken/inventory', label: 'Coop Inventory', icon: '📝' },
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
      <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-slate-950">
        <h2 className="text-xl font-bold text-white tracking-wide flex items-center gap-2">
          <span className="text-green-500 text-2xl">❖</span> FarmPulse
        </h2>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto py-6">
        <p className="px-6 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Main Menu
        </p>
        <ul className="space-y-1 px-3">
          {links.map((link: NavLink) => {
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
                  <span className={`text-lg transition-transform group-hover:scale-110 ${isActive ? '' : 'opacity-70 group-hover:opacity-100'}`}>
                    {link.icon}
                  </span>
                  <span className="font-medium text-sm">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Minimal Footer (Version Info) */}
      <div className="p-4 border-t border-slate-800 text-center text-xs text-slate-600">
        <p>FarmPulse System v1.0</p>
        <p className="mt-1">© 2025</p>
      </div>
    </nav>
  );
}