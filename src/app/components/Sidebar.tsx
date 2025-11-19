"use client";

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext';
import { usePathname } from 'next/navigation';

type NavLink = { href: string; label: string; icon?: string };

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
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const links = user ? roleLinks[user.role as keyof typeof roleLinks] : [];

  return (
    <nav className="w-64 h-screen bg-slate-900 text-slate-300 flex flex-col shadow-2xl z-10">
      {/* Header */}
      <div className="p-6 border-b border-slate-800">
        <h2 className="text-2xl font-bold text-white tracking-wide flex items-center gap-2">
          <span className="text-green-500 text-3xl">❖</span> FarmPulse
        </h2>
        <div className="mt-4 bg-slate-800 rounded-lg p-3">
          <p className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
            Logged in as
          </p>
          <p className="text-white font-medium truncate" title={user?.username}>
            {user?.username}
          </p>
          <span className="text-[10px] bg-green-600 text-white px-1.5 py-0.5 rounded mt-1 inline-block">
            {user?.role.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto py-4">
        <ul className="space-y-1 px-3">
          {links.map((link: NavLink) => {
            const isActive = pathname === link.href;
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                    isActive
                      ? 'bg-green-600 text-white shadow-lg translate-x-1'
                      : 'hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="text-lg">{link.icon}</span>
                  <span className="font-medium">{link.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-200 bg-red-900/30 hover:bg-red-900/50 border border-red-900/50 rounded-lg transition-colors"
        >
          <span>🚪</span> Logout
        </button>
      </div>
    </nav>
  );
}