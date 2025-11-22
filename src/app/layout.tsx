import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from './contexts/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import React from 'react';
import { ToastProvider } from './contexts/ToastContext';


const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FarmPulse System',
  description: 'FarmPulse Business Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-gray-50 text-gray-900 antialiased`}>
        <AuthProvider>
          <SocketProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}