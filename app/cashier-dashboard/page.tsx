'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { HouseDoor, Cart, ClockHistory } from "react-bootstrap-icons";
import CashierPOS from "../component/pos/page";
import CashierTransactions from "../transactions/page";

export default function CashierDashboard() {
  const router = useRouter();
  const [active, setActive] = useState("dashboard");
  const [sessionChecked, setSessionChecked] = useState(false);

  // Check session on mount
  useEffect(() => {
    const session = localStorage.getItem("sessionActive");
    if (!session) {
      router.replace("/"); // redirect if no session
    } else {
      setSessionChecked(true);
    }
  }, [router]);

  // Bulletproof logout function
  const handleLogout = async () => {
    const sessionStr = localStorage.getItem("sessionActive");
    if (!sessionStr) {
      router.replace("/");
      return;
    }

    const sessionData = JSON.parse(sessionStr);
    if (!sessionData.id || !sessionData.username) {
      console.warn("Session data incomplete, logging out anyway");
      localStorage.removeItem("sessionActive");
      router.replace("/");
      return;
    }

    try {
      const res = await fetch("/api/admin/user-logs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: String(sessionData.id),
          userName: sessionData.username,
          role: sessionData.role || "cashier",
          action: "logout",
          details: "Cashier logged out",
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("Logout log API failed:", text);
      }
    } catch (err) {
      console.error("Failed to log logout:", err);
    } finally {
      // Always clear session and redirect
      localStorage.removeItem("sessionActive");
      router.replace("/");
    }
  };

  const menu = [
    { key: "dashboard", label: "Dashboard", icon: <HouseDoor /> },
    { key: "pos", label: "POS", icon: <Cart /> },
    { key: "history", label: "Transactions", icon: <ClockHistory /> },
  ];

  if (!sessionChecked) return null;

  const ProtectedComponent = ({ children }: { children: React.ReactNode }) => {
    const session = localStorage.getItem("sessionActive");
    if (!session) {
      router.replace("/");
      return null;
    }
    return <>{children}</>;
  };

  return (
    <div className="d-flex vh-100">
      {/* Sidebar */}
      <aside className="bg-dark text-light p-3 d-flex flex-column" style={{ width: "250px" }}>
        <h4 className="mb-4">Cashier Panel</h4>
        <ul className="nav flex-column flex-grow-1">
          {menu.map(item => (
            <li key={item.key} className="nav-item mb-2">
              <button
                onClick={() => setActive(item.key)}
                className={`d-flex align-items-center w-100 btn btn-sm text-start ${
                  active === item.key ? "btn-primary" : "btn-outline-light"
                }`}
              >
                <span className="me-2">{item.icon}</span>
                {item.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Logout Button */}
        <div className="mt-auto">
          <button className="btn btn-danger w-100" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow-1 p-4 bg-light overflow-auto">
        {active === "dashboard" && (
          <ProtectedComponent>
            <h2>Welcome Cashier Dashboard</h2>
          </ProtectedComponent>
        )}
        {active === "pos" && (
          <ProtectedComponent>
            <CashierPOS />
          </ProtectedComponent>
        )}
        {active === "history" && (
          <ProtectedComponent>
            <CashierTransactions />
          </ProtectedComponent>
        )}
      </main>
    </div>
  );
}
