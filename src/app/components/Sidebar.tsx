"use client";

import Link from 'next/link';
import { useAuth } from '../contexts/AuthContext'; // FIX: Relative path
import { usePathname } from 'next/navigation';

// Define link type
type NavLink = { href: string; label: string };

// Define links for each role
const ownerLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/branches', label: 'Branches' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/deliveries', label: 'Deliveries' },
  { href: '/expenses', label: 'Expenses' },
];

const staffLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/sales', label: 'Sales' },
  { href: '/inventory', label: 'Inventory' },
  { href: '/deliveries', label: 'Deliveries' },
  { href: '/expenses', label: 'Expenses' },
];

const freezerVanLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/freezer-van/sales', label: 'Sales' },
  { href: '/freezer-van/inventory', label: 'Inventory' },
];

const liveChickenLinks: NavLink[] = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/live-chicken/distribution', label: 'Distribution' },
  { href: '/live-chicken/inventory', label: 'Inventory' },
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

  // FIX: Use type assertion to tell TypeScript the role is a valid key
  const links = user ? roleLinks[user.role as keyof typeof roleLinks] : [];

  return (
    <nav className="w-64 h-screen p-6 bg-gray-900 text-white flex flex-col justify-between">
      <div>
        <h2 className="text-2xl font-semibold text-white">FarmPulse</h2>
        <span className="text-sm text-gray-400">Welcome, {user?.username}</span>

        <ul className="mt-10 space-y-2">
          {/* FIX: Add type to link */}
          {links.map((link: NavLink) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className={`block px-4 py-2 rounded-md ${
                  pathname === link.href
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={logout}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700"
      >
        Logout
      </button>
    </nav>
  );
}