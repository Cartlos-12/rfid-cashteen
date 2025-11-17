  'use client';

  import React, { useEffect, useState } from 'react';
  import 'bootstrap/dist/css/bootstrap.min.css';
  import 'bootstrap-icons/font/bootstrap-icons.css';

  interface Student {
    id: string | number;
    name: string;
    balance: number;
    daily_limit: number;
    spent_today?: number;
  }

  export default function SpendingLimitPage() {
    const [showContent, setShowContent] = useState(false);
    const [student, setStudent] = useState<Student | null>(null);
    const [newLimit, setNewLimit] = useState('');
    const [message, setMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [loading, setLoading] = useState(true);
    const [attempts, setAttempts] = useState(0);

    useEffect(() => setShowContent(true), []);

    // ---------- FETCH STUDENT DATA ----------
    const fetchStudent = async () => {
      try {
        const res = await fetch(`${window.location.origin}/parent/api/student`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to fetch student');

        const data = await res.json();
        if (!data.success) throw new Error(data.message);

        setStudent({
          id: data.student.id,
          name: data.student.name,
          balance: Number(data.student.balance || 0),
          daily_limit: Number(data.student.daily_limit || 0),
          spent_today: Number(data.student.spent_today || 0),
        });
      } catch (err) {
        console.error(err);
        setMessage('❌ Failed to load student data.');
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchStudent();
      const interval = setInterval(fetchStudent, 5000); // auto-refresh every 5s
      return () => clearInterval(interval);
    }, []);

    // ---------- FRONTEND ATTEMPT TRACKING ----------
    useEffect(() => {
      if (!student) return;
      const key = `limitAttempts_${student.id}`;
      const today = new Date().toISOString().slice(0, 10);
      const stored = localStorage.getItem(key);

      if (stored) {
        const { date, count } = JSON.parse(stored);
        if (date === today) setAttempts(count);
        else localStorage.setItem(key, JSON.stringify({ date: today, count: 0 }));
      } else {
        localStorage.setItem(key, JSON.stringify({ date: today, count: 0 }));
      }

      const handleStorage = (e: StorageEvent) => {
        if (e.key === key && e.newValue) {
          const { date, count } = JSON.parse(e.newValue);
          if (date === today) setAttempts(count);
          else setAttempts(0);
        }
      };

      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }, [student]);

    const incrementAttempt = () => {
      if (!student) return;
      const key = `limitAttempts_${student.id}`;
      const today = new Date().toISOString().slice(0, 10);
      const newCount = attempts + 1;
      localStorage.setItem(key, JSON.stringify({ date: today, count: newCount }));
      setAttempts(newCount);
    };

    // ---------- HANDLE SET LIMIT ----------
    const handleSetLimit = async () => {
  if (!student) return;
  if (attempts >= 3) {
    setMessage(`⚠️ You have reached 3 attempts today. Try again after ${timeLeft}.`);
    return;
  }

  const limitValue = Number(newLimit);
  if (isNaN(limitValue) || limitValue <= 0) {
    setMessage('⚠️ Please enter a valid number.');
    return;
  }
  if (limitValue > student.balance) {
    setMessage('⚠️ Limit cannot exceed current balance.');
    return;
  }

  try {
    setSaving(true);
    const res = await fetch(`${window.location.origin}/parent/api/limit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ student_id: student.id, daily_limit: limitValue }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.message);

    incrementAttempt();
    setMessage('✅ Daily spending limit set successfully!');
    setNewLimit('');

    // Reset spent_today to 0 and update daily_limit
    setStudent((prev) =>
      prev ? { ...prev, daily_limit: limitValue, spent_today: 0 } : prev
    );
  } catch (err) {
    console.error(err);
    setMessage(`${err instanceof Error ? err.message : 'Error saving daily limit.'}`);
  } finally {
    setSaving(false);
  }
};

    const disableSetButton =
      saving || (student && Number(newLimit) > student.balance) || attempts >= 3;

    // ---------- TIME LEFT ----------
    function calculateTimeLeft() {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const hours = Math.floor(diff / 1000 / 60 / 60);
      const minutes = Math.floor((diff / 1000 / 60) % 60);
      return `${hours}h ${minutes}m`;
    }

    useEffect(() => {
      const updateTimer = () => setTimeLeft(calculateTimeLeft());
      updateTimer();
      const interval = setInterval(updateTimer, 60000);
      return () => clearInterval(interval);
    }, []);

    const balance = student?.balance ?? 0;
    const limit = student?.daily_limit ?? 0;
    const spentToday = student?.spent_today ?? 0;
    const remainingLimit = Math.max(limit - spentToday, 0);
    const limitPercentage = limit > 0 ? (spentToday / limit) * 100 : 0;

    return (
      <div className={`fade-in-content ${showContent ? 'fade-in' : ''}`}>
        <div className="container-fluid px-3 position-relative" style={{ minHeight: '70vh' }}>
          <div className="d-flex flex-column align-items-center py-5">
            <div className="limit-card card shadow-lg">
              <div className="card-body p-5 w-100">
                <h3 className="text-center text-dark fw-bold mb-4">Daily Spending Limit</h3>
                {loading ? (
                  <div className="text-center py-5 text-muted">Loading student data...</div>
                ) : !student ? (
                  <div className="alert alert-danger text-center">Student data not found.</div>
                ) : (
                  <>
                    <div className="progress-wrapper mb-4 text-center">
                      <svg viewBox="0 0 36 36" className="circular-chart">
                        <defs>
                          <linearGradient id="gradient" x1="1" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#007bff" />
                            <stop offset="100%" stopColor="#0056b3" />
                          </linearGradient>
                        </defs>
                        <path
                          className="circle-bg"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="circle"
                          strokeDasharray={`${Math.min(limitPercentage, 100)}, 100`}
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <text x="18" y="20.35" className="percentage">
                          {limit > 0 ? `${limitPercentage.toFixed(0)}%` : 'N/A'}
                        </text>
                      </svg>
                      <div className="mt-3">
                        <div className="fw-semibold text-primary">Set Limit: ₱{limit.toFixed(2)}</div>
                        <div className="fw-semibold text-secondary">
                          Spent Today: ₱{spentToday.toFixed(2)} <br />
                          Remaining: ₱{remainingLimit.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    <div className="w-100 mb-3" style={{ maxWidth: '400px' }}>
                      <label htmlFor="limitInput" className="form-label fw-semibold small mb-1">
                        Set New Daily Limit
                      </label>
                      <div className="input-group">
                        <span className="input-group-text currency-symbol">₱</span>
                        <input
                          id="limitInput"
                          type="number"
                          className="form-control modern-input"
                          placeholder="Enter amount"
                          value={newLimit}
                          onChange={(e) => setNewLimit(e.target.value)}
                          disabled={saving || attempts >= 3}
                        />
                      </div>
                      {attempts >= 3 && (
                        <div className="alert alert-warning mt-2 py-1 px-2 small text-center">
                          ⚠️ You have reached 3 attempts today. Try again after {timeLeft}.
                        </div>
                      )}
                    </div>

                    <button
                      className="btn modern-btn w-100 fw-semibold mt-3"
                      style={{ maxWidth: '400px' }}
                      onClick={handleSetLimit}
                      disabled={disableSetButton}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Saving...
                        </>
                      ) : (
                        'Set Limit'
                      )}
                    </button>

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

                    <div className="mt-3 text-center text-muted small">
                      <i className="bi bi-clock-history text-primary me-1"></i>
                      You can edit the limit again in <strong>{timeLeft}</strong>.
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          :global(body) {
            font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
            background-color: #f9fafb;
            color: #1f2937;
          }
          .fade-in-content {
            opacity: 0;
            transform: translateY(20px);
            transition: opacity 0.8s ease, transform 0.8s ease;
          }
          .fade-in-content.fade-in {
            opacity: 1;
            transform: translateY(0);
          }
          .limit-card {
            max-width: 480px;
            width: 105%;
            border-radius: 1rem;
            background: linear-gradient(135deg, #ffffff, #f9fafb);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
            transition: transform 0.25s ease, box-shadow 0.25s ease;
            margin-left: 20px;
          }
          .limit-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
          }
          .input-group-text.currency-symbol {
            background: #f1f5f9;
            border: 1px solid #e5e7eb;
            border-right: none;
            color: #007bff;
            font-weight: 600;
            border-radius: 0.75rem 0 0 0.75rem;
          }
          .modern-input {
            border: 1px solid #e5e7eb;
            border-left: none;
            border-radius: 0 0.75rem 0.75rem 0;
            background: #ffffff;
            transition: all 0.2s;
          }
          .modern-input:focus {
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
            outline: none;
          }
          .modern-btn {
            background: #007bff;
            border: none;
            border-radius: 0.75rem;
            box-shadow: 0 4px 12px rgba(0, 123, 255, 0.3);
            color: #ffffff;
            font-weight: 600;
            transition: all 0.3s ease;
            padding: 0.75rem 1.5rem;
          }
          .modern-btn:disabled {
            opacity: 0.6;
            transform: none;
            box-shadow: 0 2px 6px rgba(0, 123, 255, 0.2);
          }
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
            stroke: url(#gradient);
            transition: stroke-dasharray 1.5s ease, stroke 0.5s;
          }
          .percentage {
            font-size: 0.5em;
            text-anchor: middle;
            fill: #374151;
            font-weight: 600;
          }
          .alert {
            animation: fadeIn 0.4s ease;
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-5px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @media (max-width: 576px) {
            .circular-chart {
              max-width: 100px;
              max-height: 100px;
            }
            .limit-card .card-body {
              padding: 1.5rem;
            }
            .modern-btn {
              padding: 0.6rem 1.2rem;
            }
          }
        `}</style>
      </div>
    );
  }
