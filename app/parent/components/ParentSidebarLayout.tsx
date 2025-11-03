'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
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
  const [sessionChecked, setSessionChecked] = useState(false);
  const [sessionValid, setSessionValid] = useState(false);

  // -------------------------------------
  // ✅ SESSION VALIDATION & PROTECTION
  // -------------------------------------
  useEffect(() => {
    let isMounted = true;
    let intervalId: NodeJS.Timeout;

    const expireSession = () => {
      setSessionValid(false);
      localStorage.clear();
      sessionStorage.clear();
      // Hard redirect to prevent back/forward navigation
      window.location.replace('/parent/login');
    };

    const checkSession = async () => {
      try {
        const res = await fetch('/parent/api/auth/check', { credentials: 'include' });
        if (!res.ok) throw new Error('Session invalid');

        if (isMounted) {
          setSessionValid(true);
          setSessionChecked(true);

          // Redirect from login to dashboard if session valid
          if (window.location.pathname === '/parent/login') {
            window.location.replace('/parent/dashboard');
          }
        }
      } catch {
        expireSession();
      }
    };

    checkSession();
    // Re-check periodically (30s)
    intervalId = setInterval(checkSession, 30000);

    // Handle back/forward navigation
    const handlePopState = () => checkSession();
    // Handle tab visibility change
    const handleVisibilityChange = () => {
      if (!document.hidden) checkSession();
    };

    window.addEventListener('popstate', handlePopState);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Prevent cached pages from showing after logout
    window.onpageshow = (event) => {
      if (event.persisted) checkSession();
    };

    return () => {
      isMounted = false;
      clearInterval(intervalId);
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.onpageshow = null;
    };
  }, [pathname, router]);

  // -------------------------------------
  // ✅ LOGOUT FUNCTION
  // -------------------------------------
  const handleLogout = async () => {
    try {
      await fetch('/parent/api/auth/logout', { method: 'POST', credentials: 'include' });
    } catch (err) {
      console.error('Logout failed', err);
    } finally {
      // Expire session immediately
      setSessionValid(false);
      localStorage.clear();
      sessionStorage.clear();
      window.location.replace('/parent/login');
    }
  };

  // -------------------------------------
  // NAV LINK CLASS
  // -------------------------------------
  const navLinkClass = (href: string) =>
    `nav-link d-flex justify-content-start px-3 py-3 rounded-3 fw-semibold mb-0 ${
      pathname === href
        ? 'bg-white text-primary shadow-sm'
        : 'text-white opacity-85 hover-opacity-100'
    }`;

  // -------------------------------
  // ❌ BLOCK RENDERING IF SESSION INVALID
  // -------------------------------
  if (!sessionChecked || !sessionValid) return null;

  // -------------------------------------
  // RENDER COMPONENT
  // -------------------------------------
  return (
    <div className="min-vh-100" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gridTemplateRows: '1fr' }}>
      {/* Mobile top bar */}
      <div className="d-md-none bg-primary text-white d-flex justify-content-between align-items-center px-3 py-3 shadow-sm position-fixed top-0 start-0 w-100 z-index-1051">
        <button
          className="btn btn-sm text-white border-0 bg-transparent"
          onClick={() => setSidebarOpen(true)}
        >
          <List size={24} />
        </button>
        <h5 className="mb-0 fw-bold">Parent Portal</h5>
        <div style={{ width: '24px' }}></div>
      </div>

      {/* Sidebar */}
      <aside
        className={`sidebar bg-gradient-primary text-white d-flex flex-column justify-content-between vh-100 shadow-lg ${
          sidebarOpen ? 'open' : ''
        }`}
        style={{ width: '280px', position: 'fixed', top: 0, left: 0, zIndex: 1050, transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)', transition: 'transform 0.3s ease-in-out' }}
      >
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-white-50">
          <h6 className="mb-0 fw-bold text-white">Parent Portal</h6>
          <button
            className="btn btn-sm text-white d-md-none border-0 bg-transparent"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-grow-1 overflow-auto p-3">
          {/* Student Info Card */}
          <div className="card text-black mb-4 border-0 rounded-4 shadow-sm bg-white">
            {student ? (
              <div className="p-3">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-3 flex-shrink-0"
                    style={{ width: '50px', height: '50px' }}
                  >
                    <PersonBadge size={24} color="white" />
                  </div>
                  <div className="flex-grow-1">
                    <p className="fw-bold mb-1 fs-6 text-truncate">{student.name}</p>
                    <small className="text-muted d-block">ID: {student.id}</small>
                    <small className="text-muted">RFID: {student.rfid}</small>
                  </div>
                </div>
                <div className="border-top pt-3">
                  <p className="mb-0 fw-bold text-success fs-6">
                    Balance: ₱{Number(student.balance || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            ) : (
              <div className="placeholder-glow p-3">
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
                <div className="border-top pt-2">
                  <span className="placeholder col-5 d-block"></span>
                </div>
              </div>
            )}
          </div>

          <nav className="nav flex-column">
            <Link
              href="/parent/dashboard"
              className={navLinkClass('/parent/dashboard')}
              onClick={() => setSidebarOpen(false)}
            >
              <Speedometer2 size={20} />
              <span className="ms-3">Dashboard</span>
            </Link>
            <Link
              href="/parent/topup"
              className={navLinkClass('/parent/topup')}
              onClick={() => setSidebarOpen(false)}
            >
              <CashCoin size={20} />
              <span className="ms-3">Load Money</span>
            </Link>
            <Link
              href="/parent/topup-history"
              className={navLinkClass('/parent/topup-history')}
              onClick={() => setSidebarOpen(false)}
            >
              <ClockHistory size={20} />
              <span className="ms-3">Load History</span>
            </Link>
            <Link
              href="/parent/receipts"
              className={navLinkClass('/parent/receipts')}
              onClick={() => setSidebarOpen(false)}
            >
              <Receipt size={20} />
              <span className="ms-3">Receipts</span>
            </Link>
          </nav>
        </div>

        {/* Logout Button */}
        <div className="p-3 border-top border-white-50 mt-auto">
          <button
            onClick={handleLogout}
            className="btn w-100 fw-bold d-flex align-items-center justify-content-center gap-2 border-0"
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              borderRadius: '8px',
              padding: '10px 0',
              transition: 'background-color 0.2s ease, transform 0.1s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#c82333')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#dc3545')}
          >
            <BoxArrowRight size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Overlay for mobile */}
      <div
        className={`overlay position-fixed top-0 start-0 w-100 h-100 ${sidebarOpen ? 'show' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Main Content */}
      <main className="p-3 p-md-4 bg-light overflow-auto" style={{ gridColumn: '2', gridRow: '1', minHeight: '100vh' }}>
        {children}
      </main>

      <style jsx>{`
        .bg-gradient-primary {
          background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
        }
        .sidebar {
          z-index: 1050;
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
            position: static !important;
            transform: none !important;
          }
          .overlay {
            display: none;
          }
        }
        .nav-link {
          transition: all 0.2s ease-in-out;
          text-decoration: none;
        }
        .nav-link:hover {
          background-color: rgba(255, 255, 255, 0.15);
          transform: translateX(5px);
        }
      `}</style>
    </div>
  );
}
