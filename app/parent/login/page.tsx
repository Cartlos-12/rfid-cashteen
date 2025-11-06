'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "bootstrap/dist/css/bootstrap.min.css";
import 'bootstrap-icons/font/bootstrap-icons.css';

export default function LoginPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => setMounted(true), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true); // start skeleton animation
      const res = await fetch("/parent/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        credentials: "include",
      });

      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message);

      // Simulate short verification delay
      setTimeout(() => router.replace("/parent/dashboard"), 1500);
    } catch (err: any) {
      setLoading(false);
      alert(err.message || "Login failed. Please try again.");
    }
  };

  if (!mounted) return null;

  return (
    <div className="login-wrapper d-flex justify-content-center align-items-center vh-100">
      {/* Skeleton Loader */}
      {loading && (
        <div className="skeleton-overlay d-flex justify-content-center align-items-center">
          <div className="skeleton-card p-5 rounded-4 shadow-lg text-center">
            <div className="skeleton-logo mx-auto mb-4"></div>
            <div className="skeleton-line short mb-3"></div>
            <div className="skeleton-line mb-4"></div>
            <div className="skeleton-input mb-3"></div>
            <div className="skeleton-input mb-4"></div>
            <div className="skeleton-button mx-auto"></div>
            <p className="mt-4 text-muted fw-semibold">Verifying your account...</p>
          </div>
        </div>
      )}

      {/* Login Card */}
      {!loading && (
        <div className="login-card card border-0 rounded-4 shadow-lg p-5 mx-auto">
          <div className="text-center mb-4">
            <div className="logo mb-3">
              <i className="bi bi-wallet2 text-primary fs-1"></i>
            </div>
            <h2 className="fw-bold text-dark">Welcome, Parent</h2>
            <p className="text-muted">Sign in to access your parent portal</p>
          </div>

          <form onSubmit={handleSubmit} className="d-flex flex-column gap-3" autoComplete="off">
            <div className="form-group position-relative">
              <label className="form-label fw-semibold">Email</label>
              <div className="input-icon-wrapper">
                <i className="bi bi-envelope-fill"></i>
                <input
                  type="email"
                  placeholder="Enter your email"
                  className="form-control form-control-lg ps-5"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group position-relative">
              <label className="form-label fw-semibold">Password</label>
              <div className="input-icon-wrapper">
                <i className="bi bi-lock-fill"></i>
                <input
                  type="password"
                  placeholder="Enter your password"
                  className="form-control form-control-lg ps-5"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-lg fw-bold py-2 mt-3 rounded-3 w-100">
              Sign In
            </button>
          </form>

          <div className="text-center mt-4">
            <small className="text-muted">© 2025 Cashteen. All rights reserved.</small>
          </div>
        </div>
      )}

      <style jsx>{`
        /* Background with gradient animation */
        .login-wrapper {
          background: linear-gradient(135deg, #6ea8fe, #b2d4ff, #e9f0ff);
          animation: gradientMove 8s ease infinite;
          background-size: 200% 200%;
          padding: 1rem;
          position: relative;
        }

        @keyframes gradientMove {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }

        /* Login Card Styling */
        .login-card {
          width: 100%;
          max-width: 420px;
          background: rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(12px);
          transition: all 0.4s ease;
        }

        .login-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 35px rgba(0,0,0,0.1);
        }

        .form-control {
          border-radius: 12px;
          padding: 0.75rem 1rem;
          background-color: #f8f9fa;
          border: 1px solid #dee2e6;
          transition: all 0.3s ease;
        }

        .form-control:focus {
          border-color: #007bff;
          box-shadow: 0 0 0 0.25rem rgba(13,110,253,0.15);
          background-color: #fff;
        }

        .input-icon-wrapper {
          position: relative;
        }

        .input-icon-wrapper i {
          position: absolute;
          left: 15px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
        }

        .btn-primary {
          border-radius: 10px;
          letter-spacing: 0.4px;
          transition: all 0.3s ease;
        }

        .btn-primary:hover {
          background-color: #0056b3;
          box-shadow: 0 6px 20px rgba(0,0,0,0.1);
        }

        /* Skeleton Loader */
        .skeleton-overlay {
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0.6);
          backdrop-filter: blur(8px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 999;
        }

        .skeleton-card {
          width: 380px;
          max-width: 90%;
          border-radius: 20px;
          background: #f1f3f5;
          animation: pulse 1.6s infinite ease-in-out;
        }

        .skeleton-logo {
          width: 60px;
          height: 60px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f7f7f7 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          border-radius: 50%;
          animation: shimmer 1.5s infinite linear;
        }

        .skeleton-line, .skeleton-input, .skeleton-button {
          border-radius: 10px;
          background: linear-gradient(90deg, #e0e0e0 25%, #f7f7f7 50%, #e0e0e0 75%);
          background-size: 200% 100%;
          animation: shimmer 1.5s infinite linear;
        }

        .skeleton-line {
          height: 14px;
          width: 80%;
          margin: 0 auto;
        }

        .skeleton-line.short {
          width: 60%;
        }

        .skeleton-input {
          height: 45px;
          width: 100%;
        }

        .skeleton-button {
          height: 50px;
          width: 100%;
          border-radius: 10px;
        }

        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.95; }
          50% { opacity: 0.7; }
        }

        @media (max-width: 576px) {
          .login-card {
            padding: 2rem 1.5rem;
            margin-top: 2rem;
          }
          .skeleton-card {
            padding: 2rem 1.5rem;
            height: auto;
          }
        }
      `}</style>
    </div>
  );
}
