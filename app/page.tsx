'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Set session
        localStorage.setItem('sessionActive', 'true');

        // Keep skeleton for 1s for effect
        setTimeout(() => {
          if (data.user.role === 'admin') {
            router.replace('/admin-dashboard');
          } else if (data.user.role === 'cashier') {
            router.replace('/cashier-dashboard');
          } else {
            setError('Unauthorized role.');
            setIsLoading(false);
          }
        }, 1000);
      } else {
        setError(data.message);
        setIsLoading(false);
      }
    } catch (err) {
      console.error("Login error:", err);
      setError('Something went wrong. Try again.');
      setIsLoading(false);
    }
  };

  const logoColor = '#1E3A8A';

  return (
    <div className="d-flex align-items-center justify-content-center vh-100" style={{ backgroundColor: '#f0f4f8' }}>
      <div className="card shadow-lg p-5 rounded-4" style={{ width: '28rem' }}>
        {/* Logo */}
        <div className="d-flex justify-content-center mb-4">
          <img
            src="/logo.png"
            alt="App Logo"
            className="img-fluid"
            style={{
              width: '90px',
              height: '90px',
              objectFit: 'contain',
              borderRadius: '50%',
              boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
            }}
          />
        </div>

        <h2 className="text-center mb-4" style={{ color: logoColor }}>Login</h2>

        {error && <div className="alert alert-danger">{error}</div>}

        {isLoading ? (
          <div className="d-flex flex-column gap-3">
            <div className="placeholder-glow">
              <span className="placeholder col-12 rounded-3" style={{ height: '3rem' }}></span>
            </div>
            <div className="placeholder-glow">
              <span className="placeholder col-12 rounded-3" style={{ height: '3rem' }}></span>
            </div>
            <div className="placeholder-glow">
              <span className="placeholder col-12 rounded-3" style={{ height: '2.5rem' }}></span>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="username" className="form-label fw-semibold">Username</label>
              <input
                type="text"
                className="form-control rounded-3 shadow-sm"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your Username"
                required
              />
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="form-label fw-semibold">Password</label>
              <input
                type="password"
                className="form-control rounded-3 shadow-sm"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              className="btn w-100 rounded-3"
              style={{ backgroundColor: logoColor, borderColor: logoColor, color: '#fff' }}
            >
              Login
            </button>
          </form>
        )}

        <div className="text-center mt-4 text-muted" style={{ fontSize: '0.85rem' }}>
          © {new Date().getFullYear()} Cashteen. All rights reserved.
        </div>
      </div>
    </div>
  );
}
