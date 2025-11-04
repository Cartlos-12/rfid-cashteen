'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false); // ✅ Prevent hydration mismatch
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const [show, setShow] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const showToast = (message: string, type: "success" | "error") => {
    setToastMessage(message);
    setToastType(type);
    setShow(true);
    setTimeout(() => setShow(false), 1500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/parent/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      showToast("Login successful!", "success");
      setTimeout(() => router.push("/parent/dashboard"), 1500);
    } catch (err: any) {
      showToast(err.message || "Login failed", "error");
    }
  };

  // ✅ Avoid rendering before mount to prevent SSR/client mismatch
  if (!mounted) return null;

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light position-relative">
      {/* Toast */}
      <div
        className={`toast position-fixed top-0 end-0 m-3 p-0 border-0 shadow rounded-4 ${show ? 'show' : ''}`}
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        style={{
          minWidth: "300px",
          background: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(10px)",
          color: toastType === "success" ? "#28a745" : "#dc3545",
          opacity: show ? 1 : 0,
          transform: show ? 'translateX(0)' : 'translateX(120%)',
          transition: 'all 0.5s ease-in-out',
          overflow: 'hidden',
        }}
      >
        <div className="d-flex align-items-center p-3">
          <i className={`me-2 fs-5 ${toastType === "success" ? "bi bi-check-circle-fill" : "bi bi-x-circle-fill"}`}></i>
          <div className="flex-grow-1 fw-semibold">{toastMessage}</div>
          <button type="button" className="btn-close btn-close-white" onClick={() => setShow(false)}></button>
        </div>
        <div className="toast-progress-wrapper">
          <div className={`toast-progress ${show ? "countdown" : ""}`} />
        </div>
      </div>

      {/* Login Card */}
      <div className="card shadow-lg p-4 rounded-4 border-0" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="text-center mb-4">
          <h3 className="fw-bold text-primary">Parent Login</h3>
          <p className="text-muted">Access your receipts and account</p>
        </div>

        <form onSubmit={handleSubmit} className="d-flex flex-column gap-3" autoComplete="off">
          <div>
            <label className="form-label fw-semibold">Gsuite</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="form-control"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="new-email"
            />
          </div>

          <div>
            <label className="form-label fw-semibold">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="form-control"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <button type="submit" className="btn btn-primary fw-bold py-2 mt-2 rounded-3">
            Login
          </button>
        </form>

        <div className="text-center mt-3">
          <small className="text-muted">© 2025 Cashteen. All rights reserved.</small>
        </div>
      </div>

      {/* Toast styles */}
      <style jsx>{`
        .toast-progress-wrapper {
          height: 4px;
          width: 100%;
          background-color: rgba(255, 255, 255, 0.2);
        }
        .toast-progress {
          height: 4px;
          background-color: currentColor;
          width: 100%;
          transform-origin: left;
        }
        .toast-progress.countdown {
          animation: countdown 1.5s linear forwards;
        }
        @keyframes countdown {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
