'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();

  

  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Register states
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState('');

  // Handle login
// Handle login
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault();
  setError('');

  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (res.ok) {
    // Replace current history entry to prevent going back
    router.replace('/admin-dashboard');
  } else {
    const data = await res.json();
    setError(data.message || 'Login failed');
  }
};

  // Handle register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');
    setRegSuccess('');

    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: regEmail, password: regPassword }),
    });

    if (res.ok) {
      setRegSuccess('Admin registered successfully!');
      setRegEmail('');
      setRegPassword('');
      // Close modal
      const modalEl = document.getElementById('registerModal');
      if (modalEl) {
        // @ts-ignore
        const modal = bootstrap.Modal.getInstance(modalEl);
        modal.hide();
      }
    } else {
      const data = await res.json();
      setRegError(data.message || 'Registration failed');
    }
  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div>
        {/* Login Form */}
        <form className="card p-4 shadow mb-3" style={{ minWidth: '350px' }} onSubmit={handleLogin}>
          <h3 className="mb-3 text-center">Admin Login</h3>
          {error && <div className="alert alert-danger">{error}</div>}
          <div className="mb-3">
            <label>Email</label>
            <input type="email" className="form-control" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="mb-3">
            <label>Password</label>
            <input type="password" className="form-control" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary w-100">Login</button>
        </form>

        {/* Register Button */}
        <div className="text-center">
          <button className="btn btn-secondary" data-bs-toggle="modal" data-bs-target="#registerModal">
            Register Admin
          </button>
        </div>

        {/* Register Modal */}
        <div className="modal fade" id="registerModal" tabIndex={-1} aria-hidden="true">
          <div className="modal-dialog">
            <form className="modal-content" onSubmit={handleRegister}>
              <div className="modal-header">
                <h5 className="modal-title">Register Admin</h5>
                <button type="button" className="btn-close" data-bs-dismiss="modal"></button>
              </div>
              <div className="modal-body">
                {regError && <div className="alert alert-danger">{regError}</div>}
                {regSuccess && <div className="alert alert-success">{regSuccess}</div>}
                <div className="mb-3">
                  <label>Email</label>
                  <input type="email" className="form-control" value={regEmail} onChange={e => setRegEmail(e.target.value)} required />
                </div>
                <div className="mb-3">
                  <label>Password</label>
                  <input type="password" className="form-control" value={regPassword} onChange={e => setRegPassword(e.target.value)} required />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                <button type="submit" className="btn btn-primary">Register</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
