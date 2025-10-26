'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode } from 'react';
import {
  PersonBadge,
  CashCoin,
  Receipt,
  Speedometer2,
  ClockHistory,
  BoxArrowRight,
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
    <div className="d-flex" style={{ minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside
        className="text-white p-4 d-flex flex-column justify-content-between"
        style={{
          width: '300px',
          backgroundColor: '#148eff',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div>
          <h4 className="fw-bold mb-4 text-center">Parent Portal</h4>

          {/* Student Info Card */}
          <div
            className="card text-black mb-4 border-0 rounded-3 p-3 shadow-sm bg-white"
            style={{
              minHeight: '140px',
              maxHeight: '160px',
              overflow: 'hidden',
            }}
          >
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
              /* Skeleton shimmer while loading */
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

      {/* Main Content */}
      <main className="flex-grow-1 p-4 bg-light">{children}</main>
    </div>
  );
}
