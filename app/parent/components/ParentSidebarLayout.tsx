'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import axios from 'axios';

export default function ParentSidebarLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const res = await axios.get('/parent/api/auth/check');
        if (res.status === 200) {
          setCheckingAuth(false);
        }
      } catch (err) {
        router.replace('/parent/login');
      }
    };
    verifyAuth();
  }, [router]);

  if (checkingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-50">
        <div className="flex flex-col items-center space-y-3">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-600 text-white flex flex-col">
        <div className="p-4 text-lg font-bold border-b border-blue-500">Parent Dashboard</div>
        <nav className="flex-1 p-4 space-y-2">
          <button
            onClick={() => router.push('/parent/home')}
            className={`block w-full text-left px-4 py-2 rounded hover:bg-blue-500 ${
              pathname === '/parent/home' ? 'bg-blue-500' : ''
            }`}
          >
            Home
          </button>
          <button
            onClick={() => router.push('/parent/transactions')}
            className={`block w-full text-left px-4 py-2 rounded hover:bg-blue-500 ${
              pathname === '/parent/transactions' ? 'bg-blue-500' : ''
            }`}
          >
            Transactions
          </button>
        </nav>
        <div className="p-4 border-t border-blue-500">
          <button
            onClick={async () => {
              await axios.post('/parent/api/auth/logout');
              router.replace('/parent/login');
            }}
            className="w-full px-4 py-2 bg-red-500 hover:bg-red-600 rounded"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
