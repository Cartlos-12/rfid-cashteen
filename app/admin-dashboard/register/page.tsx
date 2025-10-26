'use client';

import { useState, useEffect, useRef } from 'react';

export default function RegisterPage() {
  const [mounted, setMounted] = useState(false); // Prevent SSR mismatch

  const [rfid, setRfid] = useState('');
  const [email, setEmail] = useState('');
  const [id, setId] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [scanning, setScanning] = useState(false);

  const [loadingModal, setLoadingModal] = useState(false);
  const [successModal, setSuccessModal] = useState(false);
  const [errorModal, setErrorModal] = useState<{ message: string; conflicts?: string }>({ message: '', conflicts: '' });

  const bufferRef = useRef('');
  const timeoutRef = useRef<number | null>(null);

  // Wait for client mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // RFID scanning
  useEffect(() => {
    if (!scanning) return;

    bufferRef.current = '';

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        setRfid(bufferRef.current);
        bufferRef.current = '';
        setScanning(false);
      } else if (e.key.length === 1) {
        bufferRef.current += e.key;
      }
      e.preventDefault?.();
    }

    window.addEventListener('keydown', onKey);

    timeoutRef.current = window.setTimeout(() => {
      if (scanning) {
        bufferRef.current = '';
        setScanning(false);
      }
    }, 10000);

    return () => {
      window.removeEventListener('keydown', onKey);
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [scanning]);

  const handleScanClick = () => {
    setRfid('');
    setScanning(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!rfid.trim() || !email.trim() || !id.trim() || !firstName.trim() || !lastName.trim()) {
      setErrorModal({ message: 'Please fill all fields before submitting.' });
      return;
    }

    setLoadingModal(true);

    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: id.trim(), firstName: firstName.trim(), lastName: lastName.trim(), rfid: rfid.trim(), email: email.trim() }),
      });

      const data = await res.json();
      setLoadingModal(false);

      if (res.ok && data.success) {
        setSuccessModal(true);

        // ✅ Reset inputs when modal closes
      } else if (res.status === 409) {
        setErrorModal({ message: 'Registration failed. The following field(s) already exist:', conflicts: data?.message });
      } else {
        setErrorModal({ message: data?.message || 'Registration failed.' });
      }
    } catch {
      setLoadingModal(false);
      setErrorModal({ message: 'Network or server error.' });
    }
  };

  if (!mounted) return null; // Prevent SSR hydration mismatch

  return (
    <main className="min-vh-100 bg-light d-flex flex-column">
      <header className="py-3 px-4 border-bottom bg-white shadow-sm">
        <h1 className="fw-bold text-primary mb-0">Register Student</h1>
        <p className="text-muted mb-0">
          Scan their RFID card and enter student details. The registered Gmail will receive an invitation.
          </p>
      </header>


      <section className="flex-grow-1 d-flex justify-content-center align-items-start py-5 px-4">
        <div className="card shadow-sm p-4 w-100" style={{ maxWidth: 800 }}>
          <form onSubmit={handleSubmit} className="row g-4">
            {/* RFID Scan */}
            <div className="col-12">
              <label className="form-label fw-semibold">RFID Tag</label>
              <div className="input-group">
                <input
                  type="text"
                  className="form-control form-control-lg"
                  value={rfid}
                  readOnly
                  placeholder={scanning ? 'Waiting for scan…' : 'Click Scan'}
                />
                <button
                  type="button"
                  className={`btn btn-lg ${scanning ? 'btn-warning' : 'btn-outline-primary'}`}
                  onClick={handleScanClick}
                >
                  {scanning ? 'Scanning…' : 'Scan RFID'}
                </button>
              </div>
            </div>

            {/* Gmail */}
            <div className="col-12">
              <label className="form-label fw-semibold">Student Email</label>
              <input
                type="email"
                className="form-control form-control-lg"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@thelewiscollege.edu.ph"
                required
              />
            </div>

            {/* School ID */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Student ID</label>
              <input
                type="text"
                className="form-control form-control-lg"
                value={id}
                onChange={(e) => setId(e.target.value)}
                placeholder="e.g. C-000-001"
                required
              />
            </div>

            {/* First Name */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">First Name</label>
              <input
                type="text"
                className="form-control form-control-lg"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter first name"
                required
              />
            </div>

            {/* Last Name */}
            <div className="col-md-6">
              <label className="form-label fw-semibold">Last Name</label>
              <input
                type="text"
                className="form-control form-control-lg"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter last name"
                required
              />
            </div>

            {/* Submit */}
            <div className="col-12 d-flex justify-content-end mt-4">
              <button type="submit" className="btn btn-primary btn-lg px-5 shadow-sm">
                Register Student
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Loading Modal */}
      {loadingModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', zIndex: 1050 }}
        >
          <div className="bg-white p-5 rounded-4 shadow-lg text-center" style={{ minWidth: '300px', maxWidth: '400px' }}>
            <div className="mb-4">
              <div className="spinner-border text-primary" role="status" style={{ width: '3rem', height: '3rem' }} />
            </div>
            <h5 className="fw-bold mb-2">Registering Student...</h5>
            <p className="text-muted mb-0">Please wait while we save the information and send the invitation email.</p>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {successModal && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', zIndex: 1050 }}
        >
          <div className="bg-white p-5 rounded-4 shadow-lg text-center" style={{ minWidth: '300px', maxWidth: '400px' }}>
            <div className="mb-4">
              <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5 className="fw-bold mb-2">Success!</h5>
            <p className="text-muted mb-4">RFID has been registered and the user account created successfully.</p>
            <button
              className="btn btn-success btn-lg px-4 shadow-sm"
              onClick={() => {
                setSuccessModal(false);
                setRfid('');
                setEmail('');
                setId('');
                setFirstName('');
                setLastName('');
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
      
      {errorModal.message && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)', zIndex: 1050 }}
        >
          <div className="bg-white p-5 rounded-4 shadow-lg text-center" style={{ minWidth: '300px', maxWidth: '400px' }}>
            <div className="mb-4">
              <i className="bi bi-exclamation-triangle-fill text-danger" style={{ fontSize: '3rem' }}></i>
            </div>
            <h5 className="fw-bold mb-2">Error</h5>
            <p className="text-muted mb-2"></p>
            {errorModal.conflicts && <p className="text-danger fw-semibold">{errorModal.conflicts}</p>}
            <button className="btn btn-danger btn-lg px-4 shadow-sm" onClick={() => setErrorModal({ message: '', conflicts: '' })}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
