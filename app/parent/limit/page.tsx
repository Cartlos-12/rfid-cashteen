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
        setStudent({
          ...data.student,
          balance: Number(data.student.balance),
          daily_limit: Number(data.student.daily_limit || 0),
        });
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
      } else setMessage(`❌ ${data.message}`);
    } catch (err) {
      console.error(err);
      setMessage('❌ Error saving daily limit.');
    } finally {
      setSaving(false);
    }
  };

  const balance = Number(student?.balance || 0);
  const limit = Number(student?.daily_limit || 0);
  const limitPercentage = limit > 0 ? (limit / balance) * 100 : 0;

  return (
    <div className="container py-5 d-flex flex-column align-items-center">
      <div className="limit-card card shadow-lg">
        <div className="card-body p-5 w-100">
          <h3 className="text-center text-dark fw-bold mb-4">Daily Spending Limit</h3>

          {loading ? (
            <div className="skeleton-wrapper">
              <div className="skeleton skeleton-title mb-3"></div>
              <div className="skeleton skeleton-text mb-2"></div>
              <div className="skeleton skeleton-text mb-2"></div>
              <div className="skeleton skeleton-input mb-2"></div>
              <div className="skeleton skeleton-btn"></div>
            </div>
          ) : !student ? (
            <div className="alert alert-danger text-center">Student data not found.</div>
          ) : (
            <>
              {/* Student Info */}

              {/* Circular Progress */}
              <div className="progress-wrapper mb-4 text-center">
                <svg viewBox="0 0 36 36" className="circular-chart">
                  <path
                    className="circle-bg"
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="circle"
                    strokeDasharray={`${Math.min(limitPercentage, 100)}, 100`}
                    d="M18 2.0845
                      a 15.9155 15.9155 0 0 1 0 31.831
                      a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <text x="18" y="20.35" className="percentage">
                    {limit > 0 ? `${limitPercentage.toFixed(0)}%` : 'N/A'}
                  </text>
                </svg>
                <div className="mt-2">
                  <div className="text-success fw-semibold">Balance: ₱{balance.toFixed(2)}</div>
                  <div className="text-primary fw-semibold">
                    {limit > 0 ? `Limit: ₱${limit.toFixed(2)}` : 'Limit not set'}
                  </div>
                </div>
              </div>

              {/* Input */}
              <div className="w-100 mb-3" style={{ maxWidth: '400px' }}>
                <label htmlFor="limitInput" className="form-label fw-semibold small mb-1">
                  Set New Daily Limit
                </label>
                <div className="input-wrapper shadow-sm rounded p-2 d-flex align-items-center mb-1">
                  <span className="currency-symbol me-2">₱</span>
                  <input
                    id="limitInput"
                    type="number"
                    className="form-control border-0 bg-transparent"
                    placeholder="Enter amount"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    disabled={saving}
                  />
                </div>
                <small className="text-muted">Must be positive and ≤ balance.</small>
              </div>

              {/* Message */}
              {message && (
                <div
                  className={`alert mt-2 w-100 text-center px-3 py-2 rounded-pill ${
                    message.includes('✅') ? 'alert-success' : 'alert-warning'
                  }`}
                  role="alert"
                  style={{ maxWidth: '400px' }}
                >
                  {message}
                </div>
              )}

              {/* Save Button */}
              <button
                className="btn btn-primary w-100 fw-semibold mt-3"
                style={{ maxWidth: '400px' }}
                onClick={handleSetLimit}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Saving...
                  </>
                ) : (
                  'Save Limit'
                )}
              </button>

              <div className="mt-3 text-center text-muted small">
                <i className="bi bi-lightbulb text-warning me-1"></i>
                Tip: Limit resets daily and cannot exceed balance.
              </div>
            </>
          )}
        </div>
      </div>

      {/* Styles */}
      <style jsx>{`
        :global(body) {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8f9fa;
        }

        /* Card */
        .limit-card {
          max-width: 480px;
          width: 90%;
          border-radius: 1rem;
          background: #ffffff;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }
        .limit-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
        }

        /* Input wrapper */
        .input-wrapper {
          background: #fefefe;
          border-radius: 12px;
          padding: 0.5rem 1rem;
          transition: all 0.2s;
        }
        .input-wrapper:focus-within {
          box-shadow: 0 4px 15px rgba(59, 130, 246, 0.25);
        }
        .currency-symbol {
          font-weight: 600;
          color: #0d6efd;
        }
        .form-control:focus {
          box-shadow: none;
        }

        /* Circular Progress */
        .circular-chart {
          display: block;
          max-width: 120px;
          max-height: 120px;
          margin: 0 auto;
        }
        .circle-bg {
          fill: none;
          stroke: #eee;
          stroke-width: 3.8;
        }
        .circle {
          fill: none;
          stroke-width: 3.8;
          stroke-linecap: round;
          stroke: #0d6efd;
          transition: stroke-dasharray 1s ease;
        }
        .percentage {
          font-size: 0.5em;
          text-anchor: middle;
          fill: #333;
        }

        /* Skeleton */
        .skeleton-wrapper {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          width: 100%;
        }
        .skeleton {
          background-color: #e0e0e0;
          border-radius: 4px;
          animation: pulse 1.2s infinite ease-in-out;
        }
        .skeleton-title { height: 1.5rem; width: 60%; margin-bottom: 1rem; }
        .skeleton-text { height: 1rem; width: 50%; margin-bottom: 0.5rem; }
        .skeleton-input { height: 2.2rem; width: 100%; margin-bottom: 1rem; }
        .skeleton-btn { height: 2.5rem; width: 100%; }
        @keyframes pulse {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }

        @media (max-width: 576px) {
          .circular-chart { max-width: 100px; max-height: 100px; }
          .bi { font-size: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
}
