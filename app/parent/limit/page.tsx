'use client';

import React, { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css';

interface Student {
  id: string | number;
  name: string;
  balance: number | string;
  daily_limit: number | string;
}

export default function SpendingLimitPage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [newLimit, setNewLimit] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchStudent() {
      try {
        const res = await fetch('/parent/api/student', { credentials: 'include' });
        if (!res.ok) throw new Error('Failed to fetch student');

        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        setStudent({ ...data.student, balance: Number(data.student.balance), daily_limit: Number(data.student.daily_limit || 0) });
      } catch (err) {
        console.error(err);
        setMessage('❌ Failed to load student data.');
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, []);

  const handleSetLimit = async () => {
    if (!student) return;

    const limitValue = Number(newLimit);
    if (isNaN(limitValue) || limitValue <= 0) {
      setMessage('⚠️ Please enter a valid positive number.');
      return;
    }
    if (limitValue > Number(student.balance)) {
      setMessage('❌ Limit cannot exceed current balance.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/parent/api/limit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ student_id: student.id, daily_limit: limitValue }),
      });
      const data = await res.json();
      if (data.success) {
        setStudent({ ...student, daily_limit: limitValue });
        setMessage('✅ Daily spending limit set successfully!');
        setNewLimit('');
      } else {
        setMessage(`❌ ${data.message}`);
      }
    } catch (err) {
      console.error(err);
      setMessage('❌ Error saving daily limit.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container py-4">
        <h3 className="fw-bold text-primary mb-4">Daily Spending Limit</h3>
        <div className="card shadow-sm border-0 bg-white skeleton-card">
          <div className="card-body p-3">
            <div className="skeleton skeleton-title mb-3"></div>
            <div className="d-flex justify-content-between mb-2">
              <div className="skeleton skeleton-text-sm"></div>
              <div className="skeleton skeleton-text-xs"></div>
            </div>
            <div className="d-flex justify-content-between mb-3">
              <div className="skeleton skeleton-text-sm"></div>
              <div className="skeleton skeleton-text-xs"></div>
            </div>
            <hr className="my-3" />
            <div className="mb-3">
              <div className="skeleton skeleton-text-sm mb-2"></div>
              <div className="skeleton skeleton-input"></div>
            </div>
            <div className="skeleton skeleton-btn"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="container py-4 text-center">
        <div className="alert alert-danger">Student data not found.</div>
      </div>
    );
  }

  const balance = Number(student.balance);
  const limit = Number(student.daily_limit || 0);
  const limitPercentage = limit > 0 ? (limit / balance) * 100 : 0;

  return (
    <div className="container py-4">
      <h3 className="fw-bold text-primary mb-4">Daily Spending Limit</h3>
      <div className="card shadow-sm border-0 bg-white limit-card">
        <div className="card-body p-3 p-md-4">

          <div className="row g-3 mb-3">
            <div className="col-6 col-md-6">
              <div className="text-center card-info">
                <i className="bi bi-wallet2 text-success fs-4 mb-1"></i>
                <p className="mb-0 text-muted small">Balance</p>
                <h6 className="fw-bold text-success">₱{balance.toFixed(2)}</h6>
              </div>
            </div>
            <div className="col-6 col-md-6">
              <div className="text-center card-info">
                <i className="bi bi-clock text-primary fs-4 mb-1"></i>
                <p className="mb-0 text-muted small">Daily Limit</p>
                <h6 className="fw-bold text-primary">
                  {limit > 0 ? `₱${limit.toFixed(2)}` : 'Not Set'}
                </h6>
              </div>
            </div>
          </div>

          {limit > 0 && (
            <div className="mb-3">
              <div className="progress rounded-pill" style={{ height: '8px' }}>
                <div
                  className="progress-bar bg-primary"
                  role="progressbar"
                  style={{ width: `${Math.min(limitPercentage, 100)}%` }}
                  aria-valuenow={limitPercentage}
                  aria-valuemin={0}
                  aria-valuemax={100}
                ></div>
              </div>
              <small className="text-muted text-center d-block mt-1">{limitPercentage.toFixed(1)}% of balance</small>
            </div>
          )}

          <hr className="my-3" />

          <div className="mb-3">
            <label htmlFor="limitInput" className="form-label fw-semibold small">
              Set New Daily Limit
            </label>
            <div className="input-group input-group-sm">
              <span className="input-group-text">₱</span>
              <input
                id="limitInput"
                type="number"
                className="form-control"
                placeholder="Enter amount"
                value={newLimit}
                onChange={(e) => setNewLimit(e.target.value)}
                disabled={saving}
              />
            </div>
            <small className="form-text text-muted">Must be positive and ≤ balance.</small>
          </div>

          {message && (
            <div className={`alert alert-sm mt-2 ${message.includes('✅') ? 'alert-success' : 'alert-warning'}`}>
              {message}
            </div>
          )}

          <button
            className="btn btn-primary btn-sm w-100 fw-semibold mt-2"
            onClick={handleSetLimit}
            disabled={saving}
          >
            {saving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              'Save Limit'
            )}
          </button>
        </div>
      </div>

      <div className="mt-3 text-center">
        <small className="text-muted">
          <i className="bi bi-lightbulb text-warning me-1"></i>
          Tip: Limit resets daily and cannot exceed balance.
        </small>
      </div>

      <style jsx>{`
        :global(body) {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        }

        .limit-card {
          max-width: 500px;
          margin: 0 auto;
          border-radius: 12px;
        }

        .card-info i {
          font-size: 1.5rem;
        }

        .student-name {
          font-size: 1.1rem;
        }

        /* Skeleton loading */
        :global(.skeleton) {
          background-color: #e0e0e0;
          border-radius: 4px;
          animation: pulse 1.2s infinite ease-in-out;
        }
        :global(.skeleton-title) { height: 1.4rem; width: 50%; margin-bottom: 1rem; }
        :global(.skeleton-text-sm) { height: 1rem; width: 50%; }
        :global(.skeleton-text-xs) { height: 0.8rem; width: 30%; }
        :global(.skeleton-input) { height: 2rem; width: 100%; }
        :global(.skeleton-btn) { height: 2rem; width: 100%; }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }

        @media (max-width: 767.98px) {
          .limit-card { margin: 0 1rem; }
          .card-info i { font-size: 1.25rem; }
          .student-name { font-size: 1rem; }
        }
      `}</style>
    </div>
  );
}
