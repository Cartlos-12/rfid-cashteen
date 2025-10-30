'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useState } from 'react';
import {
  PersonBadge,
  CashCoin,
  Receipt,
  Speedometer2,
  ClockHistory,
  BoxArrowRight,
  List,
  X,
} from 'react-bootstrap-icons';

type Student = {
  id: string | number;
  rfid: string;
  name: string;
  balance: number | string;
};

interface Props {
  student: Student | null;
  children: ReactNode;
}

export default function ParentSidebarLayout({ student, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navLinkClass = (href: string) =>
    `nav-link d-flex align-items-center gap-2 px-3 py-2 rounded-3 fw-semibold ${
      pathname === href
        ? 'bg-white text-primary shadow-sm'
        : 'text-white opacity-85 hover-opacity-100'
    }`;

  const handleLogout = async () => {
    try {
      await fetch('/parent/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      router.push('/parent/login');
    }
  };

  return (
    <div className="d-flex flex-column flex-md-row min-vh-100">
      {/* Mobile top bar */}
      <div className="d-md-none bg-primary text-white d-flex justify-content-between align-items-center px-3 py-2">
        <button className="btn btn-sm text-white" onClick={() => setSidebarOpen(true)}>
          <List size={24} />
        </button>
        <h5 className="mb-0">Parent Portal</h5>
      </div>

      {/* Sidebar */}
      <aside
        className={`sidebar bg-primary text-white flex-shrink-0 d-flex flex-column justify-content-between p-4 position-fixed top-0 start-0 vh-100 shadow-sm ${
          sidebarOpen ? 'open' : ''
        }`}
      >
        {/* Close button on mobile */}
        <button
          className="btn btn-sm text-white d-md-none mb-3 align-self-end"
          onClick={() => setSidebarOpen(false)}
        >
          <X size={24} />
        </button>

        <div>
          {/* Student Info Card */}
          <div className="card text-black mb-4 border-0 rounded-3 p-3 shadow-sm bg-white">
            {student ? (
              <div>
                <div className="d-flex align-items-center mb-2">
                  <div
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3"
                    style={{ width: '50px', height: '50px' }}
                  >
                    <PersonBadge size={26} color="white" />
                  </div>
                  <div>
                    <p className="fw-bold mb-0" style={{ fontSize: '16px' }}>
                      {student.name}
                    </p>
                    <small className="text-muted d-block">ID: {student.id}</small>
                    <small className="text-muted">RFID: {student.rfid}</small>
                  </div>
                </div>
                <div className="border-top pt-2 mt-2">
                  <p className="mb-0 fw-semibold text-success">
                    Balance: ₱{Number(student.balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="placeholder-glow w-100">
                <div className="d-flex align-items-center mb-2">
                  <div
                    className="placeholder rounded-circle bg-secondary me-3"
                    style={{ width: '50px', height: '50px', opacity: 0.5 }}
                  ></div>
                  <div className="flex-grow-1">
                    <span className="placeholder col-8 mb-1 d-block"></span>
                    <span className="placeholder col-6 mb-1 d-block"></span>
                    <span className="placeholder col-4 d-block"></span>
                  </div>
                </div>
                <div className="border-top pt-2 mt-2">
                  <span className="placeholder col-5 d-block"></span>
                </div>
              </div>
            )}
          </div>

          <hr />

          {/* Navigation */}
          <nav className="nav flex-column gap-2">
            <Link href="/parent/dashboard" className={navLinkClass('/parent/dashboard')}>
              <Speedometer2 /> Dashboard
            </Link>
            <Link href="/parent/topup" className={navLinkClass('/parent/topup')}>
              <CashCoin /> Load Money
            </Link>
            <Link href="/parent/topup-history" className={navLinkClass('/parent/topup-history')}>
              <ClockHistory /> Load History
            </Link>
            <Link href="/parent/receipts" className={navLinkClass('/parent/receipts')}>
              <Receipt /> Receipts
            </Link>
          </nav>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="btn position-relative d-flex align-items-center justify-content-center mt-4 fw-bold"
          style={{
            width: '100%',
            backgroundColor: '#ec3d37',
            color: 'white',
            borderRadius: '10px',
            padding: '10px 0',
          }}
        >
          <BoxArrowRight className="me-2" color="white" size={18} />
          Logout
        </button>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      <div
        className={`overlay position-fixed top-0 start-0 w-100 h-100 ${
          sidebarOpen ? 'show' : ''
        }`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Main Content */}
      <main className="flex-grow-1 p-3 p-md-4 ms-md-250" style={{ marginLeft: '0' }}>
        {children}
      </main>

      <style jsx>{`
        .sidebar {
          width: 250px;
          z-index: 1050;
          transform: translateX(-100%);
          transition: transform 0.3s ease-in-out;
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .overlay {
          background-color: rgba(0, 0, 0, 0.5);
          opacity: 0;
          visibility: hidden;
          z-index: 1040;
          transition: opacity 0.3s ease;
        }

        .overlay.show {
          opacity: 1;
          visibility: visible;
        }

        @media (min-width: 768px) {
          .sidebar {
            transform: translateX(0);
            position: fixed;
          }
          .overlay {
            display: none;
          }
          main {
            margin-left: 250px;
          }
        }
      `}</style>
    </div>
  );
}
