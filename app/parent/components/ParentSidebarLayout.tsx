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
  children: ReactNode;
}

export default function ParentSidebarLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const checkRes = await fetch('/parent/api/auth/check', { credentials: 'include', cache: 'no-store' });
        if (!checkRes.ok) throw new Error('Unauthorized');

        const meRes = await fetch('/parent/api/auth/me', { credentials: 'include', cache: 'no-store' });
        const meData = await meRes.json();
        if (!meRes.ok || !meData.success) throw new Error('Not authenticated');

        if (!cancelled) setStudent({ ...meData.data, rfid: meData.data.rfid || '' });
      } catch {
        if (!cancelled) router.replace('/parent/login');
      } finally {
        if (!cancelled) setCheckingSession(false);
      }
    };

    verifySession();

    const handleVisibilityChange = () => { if (document.visibilityState === 'visible') verifySession(); };
    const handlePopState = () => verifySession();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('popstate', handlePopState);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [router]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch('/parent/api/auth/logout', { method: 'POST', credentials: 'include' });
    } finally {
      router.replace('/parent/login');
    }
  };

  if (checkingSession || isLoggingOut) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const navLinkClass = (href: string) => {
    const isActive = pathname === href;
    return `nav-link d-flex justify-content-start px-3 py-3 rounded-3 fw-semibold mb-1 ${
      isActive ? 'bg-white text-primary shadow-sm' : 'text-white opacity-85 hover-opacity-100'
    }`;
  };
  
  return (
    <div className="layout-wrapper d-flex">
      {/* Mobile Top Bar */}
      <div className="mobile-topbar d-md-none bg-primary text-white d-flex justify-content-between align-items-center px-3 py-3 position-fixed top-0 start-0 w-100 shadow-sm">
        <button
          className="btn text-white border-0 bg-transparent"
          onClick={() => setSidebarOpen(true)}
        >
          <List size={24} />
        </button>
        <h5 className="mb-0 fw-bold">Parent Portal</h5>
        <div style={{ width: '24px' }} />
      </div>

      {/* Sidebar */}
      <aside
        className={`sidebar bg-gradient-primary text-white d-flex flex-column justify-content-between shadow-lg ${
          sidebarOpen ? 'open' : ''
        }`}
      >
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-white-25">
          <h6 className="mb-0 fw-bold">Parent Portal</h6>
          <button
            className="btn btn-sm text-white d-md-none border-0 bg-transparent"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-3 flex-grow-1 overflow-auto">
          {student && (
            <div className="card text-black mb-4 border-0 rounded-4 shadow-sm bg-white">
              <div className="p-3">
                <div className="d-flex align-items-center mb-3">
                  <div
                    className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2"
                    style={{ width: '51px', height: '44px' }}
                  >
                    <PersonBadge size={24} color="white" />
                  </div>
                  <div>
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
            </div>
          )}

          {/* Nav Links */}
          <nav className="nav flex-column">
            <Link href="/parent/dashboard" className={navLinkClass('/parent/dashboard')} onClick={() => setSidebarOpen(false)}>
              <Speedometer2 size={20} /> <span className="ms-3">Dashboard</span>
            </Link>
            <Link href="/parent/topup" className={navLinkClass('/parent/topup')} onClick={() => setSidebarOpen(false)}>
              <CashCoin size={20} /> <span className="ms-3">Load Money</span>
            </Link>
            <Link href="/parent/limit" className={navLinkClass('/parent/limit')} onClick={() => setSidebarOpen(false)}>
              <CashCoin size={20} /> <span className="ms-3">Limit Spending</span>
            </Link>
            <Link href="/parent/topup-history" className={navLinkClass('/parent/topup-history')} onClick={() => setSidebarOpen(false)}>
              <ClockHistory size={20} /> <span className="ms-3">Load History</span>
            </Link>
            <Link href="/parent/receipts" className={navLinkClass('/parent/receipts')} onClick={() => setSidebarOpen(false)}>
              <Receipt size={20} /> <span className="ms-3">Receipts</span>
            </Link>
          </nav>
        </div>

        {/* Logout */}
        <div className="p-3 border-top border-white-25">
          <button
            onClick={handleLogout}
            className="btn w-100 fw-bold d-flex align-items-center justify-content-center gap-2 border-0 text-white"
            style={{
              backgroundColor: '#dc3545',
              borderRadius: '8px',
              padding: '10px 0',
            }}
          >
            <BoxArrowRight size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Overlay for Mobile */}
      <div
        className={`overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <main className="main-content flex-grow-1 bg-light">
        <div className="content-wrapper fade-in">{children}</div>
      </main>

      {/* Styles */}
      <style jsx>{`
        .bg-gradient-primary {
          background: linear-gradient(135deg, #007bff, #0056b3);
        }
        .sidebar {
          width: 270px;
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          transform: translateX(-100%);
          transition: transform 0.3s ease-in-out;
          z-index: 1200;
        }
        .sidebar.open {
          transform: translateX(0);
        }
        .mobile-topbar {
          z-index: 1100;
        }
        .overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0, 0, 0, 0);
          opacity: 0;
          z-index: 1150;
          transition: opacity 0.3s ease-in-out;
          pointer-events: none;
        }
        .overlay.active {
          background-color: rgba(0, 0, 0, 0.5);
          opacity: 1;
          pointer-events: auto;
        }
        .main-content {
          min-height: 100vh;
          width: 100%;
          overflow-x: hidden;
          overflow-y: auto;
          background-color: #f8f9fa;
          position: relative;
          z-index: 1;
        }
        .content-wrapper {
          max-width: 1200px;
          margin: 0 auto;
          width: 100%;
          padding: 1rem;
        }
        .fade-in {
          animation: fadeIn 0.3s ease-in-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @media (max-width: 767px) {
          .main-content {
            padding-top: 80px;
          }
        }
        @media (min-width: 768px) {
          .sidebar {
            transform: none;
            z-index: 1050;
          }
          .main-content {
            margin-left: 280px;
          }
        }
      `}</style>
    </div>
  );
}
