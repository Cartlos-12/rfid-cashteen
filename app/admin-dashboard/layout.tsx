'use client';
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function AdminDashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [reportsOpen, setReportsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  // Check session on mount
  useEffect(() => {
    const sessionActive = localStorage.getItem("sessionActive");
    if (!sessionActive) {
      router.replace("/"); // redirect to login if no session
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("sessionActive"); // expire session
    setShowLogoutModal(false);
    router.replace("/"); // redirect to login
  };

  const toggleReports = () => setReportsOpen(!reportsOpen);

  const isReportsActive =
    pathname.includes("/admin-dashboard/transactions") || pathname.includes("/admin-dashboard/users-log");

  const navLinks = [
    { name: "Dashboard", path: "/admin-dashboard" },
    { name: "Register", path: "/admin-dashboard/register" },
    { name: "Users", path: "/admin-dashboard/users" },
    { name: "Add Item", path: "/admin-dashboard/add" },
  ];

  return (
    <div className="d-flex vh-100 text-white">
      {/* Sidebar */}
      <aside className="d-flex flex-column flex-shrink-0 p-3 sidebar-bg text-white" style={{ width: "250px" }}>
        <div className="d-flex flex-column align-items-center mb-4">
          <div
            className="logo-wrapper d-flex align-items-center justify-content-center mb-2"
            style={{
              width: "70px",
              height: "70px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.15)",
            }}
          >
            <img src="/logo.png" alt="Logo" style={{ width: "60px", height: "60px", objectFit: "contain", borderRadius:"50px"}} />
          </div>
          <span className="fs-5 fw-bold text-white text-center">Admin Panel</span>
        </div>
        <hr className="border-light" />

        <ul className="nav flex-column mb-auto text-white">
          {navLinks.map(link => (
            <li key={link.path}>
              <button
                onClick={() => router.push(link.path)}
                className={`nav-link d-flex align-items-center justify-content-between ${pathname === link.path ? "active-link" : ""}`}
              >
                {link.name}
              </button>
            </li>
          ))}

          {/* Reports Dropdown */}
          <li>
            <button
              onClick={toggleReports}
              className={`dropdown-btn d-flex justify-content-between align-items-center ${isReportsActive ? "active-link" : ""}`}
            >
              Reports
              <span className={`arrow ${reportsOpen ? "rotate" : ""}`}>▼</span>
            </button>

            <div
              className="dropdown-content ms-3 mt-1"
              style={{
                maxHeight: reportsOpen ? "500px" : "0",
                overflow: "hidden",
                transition: "max-height 0.3s ease",
              }}
            >
              <ul className="nav flex-column">
                <li>
                  <button
                    onClick={() => router.push("/admin-dashboard/transactions")}
                    className={`nav-link ${pathname === "/admin-dashboard/transactions" ? "active-link" : ""}`}
                  >
                    Transactions
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => router.push("/admin-dashboard/users-log")}
                    className={`nav-link ${pathname === "/admin-dashboard/users-log" ? "active-link" : ""}`}
                  >
                    System Logs
                  </button>
                </li>
              </ul>
            </div>
          </li>
        </ul>

        {/* Logout Button */}
        <button onClick={() => setShowLogoutModal(true)} className="btn btn-logout w-100 mt-auto">
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="flex-grow-1 p-4 bg-light overflow-auto">{children}</main>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="modal fade show d-block" tabIndex={-1} style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Logout</h5>
                <button type="button" className="btn-close" onClick={() => setShowLogoutModal(false)}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to log out?</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowLogoutModal(false)}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .sidebar-bg { background: #0099ff; }
        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          padding: 0.5rem 0.8rem;
          margin-bottom: 0;
          color: #fff;
          border: none;
          background: none;
          cursor: pointer;
          transition: all 0.2s ease;
          text-align: left;
        }
        .nav-link::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 10%;
          width: 80%;
          height: 1px;
          background-color: rgba(255,255,255,0.1);
        }
        .nav-link:hover { background-color: rgba(255,255,255,0.15); }
        .active-link { background-color: rgba(255,255,255,0.25); color: #fff; font-weight: 600; border-left: 4px solid #fff; }
        .dropdown-btn { display: flex; justify-content: space-between; align-items: center; width: 100%; padding: 0.5rem 0.8rem; border: none; background: none; color: #fff; cursor: pointer; }
        .dropdown-btn:hover { background-color: rgba(255,255,255,0.15); }
        .arrow { transition: transform 0.3s ease; color: #fff; }
        .arrow.rotate { transform: rotate(180deg); }
        .btn-logout { background-color: #f93f2f; border: none; color: #fff; font-weight: 500; }
        .btn-logout:hover { background-color: #ff5252; font-weight: bold; }
      `}</style>
    </div>
  );
}
