"use client";

import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, ReactNode } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

export default function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-green-200 border-t-green-600 rounded-full animate-spin"></div>
          <div className="text-sm font-semibold text-slate-500 animate-pulse">Loading FarmPulse...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* 1. Sidebar (Fixed Left) */}
      <aside className="hidden md:block w-64 flex-shrink-0 border-r border-slate-200">
        <Sidebar />
      </aside>

      {/* 2. Main Content Wrapper (Right Side) */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-100/50">
        
        {/* 2a. Header (Fixed Top) */}
        <Header />

        {/* 2b. Scrollable Page Content */}
        {/* REMOVED max-w-7xl to allow full width */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <div className="w-full h-full"> 
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}