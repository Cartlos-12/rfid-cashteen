'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState, useCallback } from 'react';
import SessionExpiredModal from "../components/SessionExpiredModal";
import {
  PersonBadge,
  CashCoin,
  Receipt,
  Speedometer2,
  ClockHistory,
  BoxArrowRight,
  List,
  X,
  ThreeDotsVertical,
  ShieldLock,
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

interface SessionExpiredModalProps {
  onConfirm: () => void;
}

 
export default function ParentSidebarLayout({ children }: Props) {
  const router = useRouter();
  const pathname = usePathname();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);

  // Password modal states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Toast states
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [showToast, setShowToast] = useState(false);
  const showBootstrapToast = useCallback(
    (message: string, type: 'success' | 'error' = 'success') => {
      setToastMessage(message);
      setToastType(type);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    },
    []
  );

  // ===============================
  // SESSION MANAGEMENT
  // ===============================
  const verifySession = useCallback(async (redirectOnFail = true) => {
    try {
      const checkRes = await fetch('/parent/api/auth/check', {
        credentials: 'include',
        cache: 'no-store',
      });
      if (!checkRes.ok) throw new Error('Unauthorized');

      const meRes = await fetch('/parent/api/auth/me', {
        credentials: 'include',
        cache: 'no-store',
      });
      const meData = await meRes.json();
      if (!meRes.ok || !meData.success) throw new Error('Unauthorized');

      setStudent({ ...meData.data, rfid: meData.data.rfid || '' });
    } catch {
      if (redirectOnFail) handleLogout(true);
    } finally {
      setCheckingSession(false);
    }
  }, []);
  


  useEffect(() => {
    // Initial session check
    verifySession();

    // Handle back/forward buttons
    const handlePopState = () => verifySession();
    window.addEventListener('popstate', handlePopState);

    // Handle tab switching
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') verifySession(false);
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Replace current history to avoid stale forward
    window.history.replaceState(null, '', window.location.href);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [verifySession]);

  const handleLogout = useCallback(
    async (silent: boolean = false) => {
      setIsLoggingOut(true);
      try {
        await fetch('/parent/api/auth/logout', { method: 'POST', credentials: 'include' });
      } finally {
        if (!silent) showBootstrapToast('Session expired. Please log in again.', 'error');
        window.location.replace('/parent/login');
      }
    },
    [showBootstrapToast]
  );

  // ===============================
  // CHANGE PASSWORD
  // ===============================
  const handleChangePassword = useCallback(async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showBootstrapToast('All fields are required', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showBootstrapToast('New password and confirmation do not match', 'error');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch('/parent/api/change', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showBootstrapToast('Password updated successfully', 'success');
        setShowChangePasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showBootstrapToast(data.message || 'Failed to update password', 'error');
      }
    } catch {
      showBootstrapToast('Something went wrong', 'error');
    } finally {
      setIsSaving(false);
    }
  }, [currentPassword, newPassword, confirmPassword, showBootstrapToast]);

  // ===============================
  // NAVIGATION
  // ===============================
  const navLinkClass = useCallback(
    (href: string) => {
      const isActive = pathname === href;
      return `nav-link d-flex justify-content-start px-3 py-3 rounded-3 fw-semibold mb-1 ${
        isActive ? 'bg-white text-primary shadow-sm' : 'text-white opacity-85 hover-opacity-100'
      }`;
    },
    [pathname]
  );

  if (checkingSession || isLoggingOut) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  

  return (
    <div className="layout-wrapper d-flex">
      {/* Mobile Top Bar */}
<div className="mobile-topbar d-md-none bg-primary text-white d-flex justify-content-between align-items-center px-3 py-3 position-fixed top-0 start-0 w-100 shadow-sm">
  <button className="btn text-white border-0 bg-transparent" onClick={() => setSidebarOpen(true)}>
    <List size={24} />
  </button>
  <h5 className="mb-0 fw-bold">Parent Portal</h5>
  <div className="position-relative">
    <button
      className="btn text-white border-0 bg-transparent"
      onClick={() => setShowDropdown(!showDropdown)}
    >
      <ThreeDotsVertical size={22} />
    </button>
    {/* Mobile Dropdown */}
{showDropdown && (
  <div
    className="mobile-dropdown position-fixed shadow-lg rounded-3 bg-white d-flex flex-column"
    style={{
      top: '55px', // below the topbar
      right: '30px',
      zIndex: 2000,
      minWidth: '180px',
      animation: 'fadeInDropdown 0.2s ease',
    }}
  >
    <button
      className="text-start d-flex align-items-center gap-2 fw-semibold text-dark hover-bg-light"
      style={{padding: '10px', borderRadius: '10px'}}
      onClick={() => {
        setShowDropdown(false);
        setShowChangePasswordModal(true);
      }}
    >
      <ShieldLock size={18} /> Change Password
    </button>
  </div>
)}
  </div>
</div>

      {/* Sidebar */}
      <aside className={`sidebar bg-gradient-primary text-white d-flex flex-column justify-content-between shadow-lg ${sidebarOpen ? 'open' : ''}`}>
        <div className="d-flex justify-content-between align-items-center p-3 border-bottom border-white-25">
          <h6 className="mb-0 fw-bold">Parent Portal</h6>
          <div className="d-flex align-items-center">
            <div className="d-none d-md-block position-relative">
              <button className="btn text-white border-0 bg-transparent" onClick={() => setShowDropdown(!showDropdown)}>
                <ThreeDotsVertical size={22} />
              </button>
              {showDropdown && (
                <div className="dropdown-menu show position-absolute end-0 mt-2 shadow rounded-3 bg-white">
                  <button
                    className="dropdown-item"
                    onClick={() => {
                      setShowDropdown(false);
                      setShowChangePasswordModal(true);
                    }}
                  >
                    Change Password
                  </button>
                </div>
              )}
            </div>

            <button className="btn btn-sm text-white d-md-none border-0 bg-transparent ms-2" onClick={() => setSidebarOpen(false)}>
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-3 flex-grow-1 overflow-auto">
          {student && (
            <div className="card text-black mb-4 border-0 rounded-4 shadow-sm bg-white position-relative">
              <div className="p-3">
                <div className="d-flex align-items-center mb-3">
                  <div className="rounded-circle bg-primary d-flex align-items-center justify-content-center me-2" style={{ width: '50px', height: '49px' }}>
                    <PersonBadge size={24} color="white" />
                  </div>
                  <div>
                    <p className="fw-bold mb-1 fs-6 text-truncate">{student.name}</p>
                    <small className="text-muted d-block">ID: {student.id}</small>
                    <small className="text-muted">RFID: {student.rfid}</small>
                  </div>
                </div>

                <div className="border-top pt-3">
                  <p className="mb-0 fw-bold text-success fs-6">Balance: ₱{Number(student.balance || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

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
            onClick={() => handleLogout(false)}
            className="btn w-100 fw-bold d-flex align-items-center justify-content-center gap-2 border-0 text-white"
            style={{ backgroundColor: '#dc3545', borderRadius: '8px', padding: '10px 0' }}
          >
            <BoxArrowRight size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Overlay for Mobile */}
      <div className={`overlay ${sidebarOpen ? 'active' : ''}`} onClick={() => setSidebarOpen(false)} />

      {/* Main Content */}
      <main className="main-content flex-grow-1 bg-light">
        <div className="content-wrapper fade-in">{children}</div>
      </main>

      {/* Change Password Modal */}
{showChangePasswordModal && (
  <div
    className="profile-modal-backdrop"
    onClick={(e) => e.currentTarget === e.target && setShowChangePasswordModal(false)}
  >
    <div className="profile-modal-content animate-fadeup shadow-lg">
      <div className="modal-header border-0 pb-2">
        <h5 className="modal-title fw-bold text-primary d-flex align-items-center">
          <ShieldLock className="me-2" size={22} /> Change Password
        </h5>
      </div>

      <div className="modal-body">
        <div className="mb-3">
          <label className="form-label fw-semibold">Current Password</label>
          <input
            type="password"
            className="form-control form-control-lg rounded-3"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">New Password</label>
          <input
            type="password"
            className="form-control form-control-lg rounded-3"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-semibold">Confirm New Password</label>
          <input
            type="password"
            className="form-control form-control-lg rounded-3"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
          />
        </div>
      </div>

      <div className="modal-footer border-0 pt-0 d-flex justify-content-end gap-2">
        <button
          className="btn btn-outline-secondary fw-semibold px-4"
          onClick={() => setShowChangePasswordModal(false)}
          disabled={isSaving}
        >
          Cancel
        </button>
        <button
          className="btn btn-primary fw-semibold px-4"
          onClick={handleChangePassword}
          disabled={isSaving}
        >
          {isSaving && <span className="spinner-border spinner-border-sm me-2" role="status" />}
          Save Changes
        </button>
      </div>
    </div>
  </div>
)}


      {/* Toast */}
      {showToast && (
    <div className={`toast position-fixed bottom-0 end-0 m-3 ${toastType === 'error' ? 'bg-danger' : 'bg-success'} text-white p-3 rounded`}>
      {toastMessage}
    </div>
  )}

  <SessionExpiredModal onConfirm={() => handleLogout(false)} />


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
        .sidebar.open { transform: translateX(0); }
        .mobile-topbar { z-index: 1100; }
        .dropdown-menu { min-width: 160px; }
        .overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(0,0,0,0);
          opacity: 0;
          z-index: 1150;
          transition: opacity 0.3s ease-in-out;
          pointer-events: none;
        }
        .overlay.active { background-color: rgba(0,0,0,0.5); opacity: 1; pointer-events: auto; }
        .main-content { min-height: 100vh; width: 100%; overflow-x: hidden; overflow-y: auto; background-color: #f8f9fa; position: relative; z-index: 1; }
        .content-wrapper { max-width: 1200px; margin: 0 auto; width: 100%; padding: 1rem; }
        .custom-dropdown { min-width: 160px; z-index: 1700; }
        .fade-in { animation: fadeIn 0.3s ease-in-out forwards; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .profile-modal-backdrop { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.55); display: flex; justify-content: center; align-items: center; z-index: 1600; overflow-y: auto; padding: 1rem; animation: fadeIn 0.3s ease-in-out; }
        .profile-modal-content { background: #fff; max-width: 480px; width: 100%; padding: 2rem 2.5rem; border-radius: 1.25rem; padding: 2rem 2.5rem; border-radius: 1.25rem; width: 100%; max-width: 480px; position: relative; transform: translateY(20px); animation: slideUp 0.3s ease forwards; }
        @keyframes slideUp { to { transform: translateY(0); } }
        .form-control { height: 50px; border-radius: 10px; transition: box-shadow 0.2s ease; }
        .form-control:focus { border-color: #007bff; box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25); outline: none; }
        .modal-footer .btn-primary { background: linear-gradient(135deg, #007bff, #0056d2); border: none; }
        .modal-footer .btn-primary:hover { background: linear-gradient(135deg, #0069d9, #004ab3); }
        @media (max-width: 576px) { .profile-modal-content { padding: 1.5rem; margin: 0 auto; width: 100%; max-width: 95%; } }
        @media (max-width: 767px) { .main-content { padding-top: 80px; } }
        @media (min-width: 768px) { .sidebar { transform: none; z-index: 1050; } .main-content { margin-left: 280px; } }
      `}</style> 
    </div>
  );
}
