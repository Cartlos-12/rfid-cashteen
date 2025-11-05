'use client';

import { useEffect, useState, useRef } from 'react';

export default function TopUpPage() {
  const [student, setStudent] = useState<{ rfid: string } | null>(null);
  const [amount, setAmount] = useState('');
  const [wallet, setWallet] = useState('Gcash');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(300);
  const [canResend, setCanResend] = useState(false);

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const countdownInterval = useRef<number | null>(null);

  useEffect(() => {
    async function fetchStudent() {
      try {
        const res = await fetch('/parent/api/student', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.success) setStudent({ rfid: data.student.rfid });
        else setOtpError('⚠️ Could not fetch RFID info.');
      } catch {
        setOtpError('⚠️ Error fetching RFID info.');
      }
    }
    fetchStudent();
  }, []);

  useEffect(() => {
    if (showOtpModal && isOtpSent && otpCountdown > 0) {
      if (countdownInterval.current === null) {
        countdownInterval.current = window.setInterval(() => {
          setOtpCountdown((prev) => prev - 1);
        }, 1000);
      }
    } else if (otpCountdown <= 0 && countdownInterval.current !== null) {
      clearInterval(countdownInterval.current);
      countdownInterval.current = null;
      setCanResend(true);
      setOtpError('⏰ OTP expired. Please resend.');
    }

    return () => {
      if (countdownInterval.current !== null) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    };
  }, [showOtpModal, isOtpSent, otpCountdown]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleSendOtp = async () => {
    if (!student?.rfid || !amount) {
      setOtpError('⚠️ Please fill in all required fields.');
      return;
    }

    setIsLoading(true);
    setOtpError('');
    try {
      const res = await fetch('/parent/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIsOtpSent(true);
        setShowOtpModal(true);
        setOtpCountdown(300);
        setCanResend(false);
        setOtpError('OTP sent to your email.');
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else setOtpError(`❌ ${data.message || 'Failed to send OTP.'}`);
    } catch {
      setOtpError('⚠️ Something went wrong sending OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
    if (!value && index > 0) otpRefs.current[index - 1]?.focus();
  };

  const handleTopup = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!student) return setOtpError('⚠️ RFID not found.');
    if (otp.some((d) => !d)) return setOtpError('⚠️ Please complete the OTP.');

    const otpValue = otp.join('');
    setIsLoading(true);
    setOtpError('');

    try {
      const res = await fetch('/parent/api/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rfid: student.rfid, amount: Number(amount), wallet, otp: otpValue }),
        credentials: 'include',
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setAmount('');
        setWallet('Gcash');
        setOtp(['', '', '', '', '', '']);
        setShowOtpModal(false);
        setShowSuccessModal(true);
        if (countdownInterval.current !== null) {
          clearInterval(countdownInterval.current);
          countdownInterval.current = null;
        }
      } else {
        setOtpError(` ${data.message || 'OTP is invalid or expired.'}`);
      }
    } catch {
      setOtpError('⚠️ Server error during top-up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="card shadow-lg animate-drop-in mx-auto mt-5"
        style={{ maxWidth: '480px', width: '100%', borderRadius: '1rem' }}
      >
        <div className="card-body p-4">
          <h3 className="text-center text-dark fw-bold mb-3">Load RFID Balance</h3>
          <p className="text-center text-muted mb-4">Confirm your details before proceeding.</p>

          <div className="mb-3">
            <label className="form-label fw-semibold">RFID Tag</label>
            <input
              type="text"
              className="form-control text-center fw-bold"
              value={student?.rfid ?? 'Loading...'}
              disabled
              style={{ fontSize: '1.1rem' }}
            />
          </div>

          <div className="mb-3">
            <label className="form-label fw-semibold">Amount (₱)</label>
            <input
              type="number"
              className="form-control"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min={50}
              step={50}
              style={{ fontWeight: '500' }}
            />
            {!amount && <p className="text-danger mt-1 small">Please enter an amount.</p>}
          </div>

          <div className="mb-4">
            <label className="form-label fw-semibold">E-Wallet</label>
            <select
              className="form-select"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            >
              <option value="Gcash">Gcash</option>
            </select>
          </div>

          {otpError && <p className="text-center text-danger mb-3">{otpError}</p>}

          <button
            className="btn btn-primary w-100 py-2 fw-bold"
            onClick={handleSendOtp}
            disabled={isLoading || !student?.rfid || !amount}
          >
            {isLoading && <span className="spinner-border spinner-border-sm text-light me-2"></span>}
            Confirm
          </button>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="modal-overlay">
          <div className="modal-card animate-drop-in">
            <h5 className="text-center mb-2 fw-bold">Enter OTP</h5>
            <p className="text-center text-muted mb-2">6-digit OTP sent to your email</p>
            <p className="text-center text-secondary mb-3">
              {otpCountdown > 0 ? `OTP expires in ${formatTime(otpCountdown)}` : 'OTP expired'}
            </p>
            {otpError && <p className="text-center text-danger mb-3">{otpError}</p>}

            <div className="otp-container mb-3">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el: HTMLInputElement | null) => {
                    if (el) otpRefs.current[idx] = el;
                  }}
                  type="text"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  maxLength={1}
                  className="form-control text-center fw-bold otp-input"
                />
              ))}
            </div>

            <button
              className="btn btn-primary w-100 mb-2 py-2 fw-bold d-flex justify-content-center align-items-center gap-2"
              onClick={handleTopup}
              disabled={isLoading || otpCountdown <= 0}
            >
              {isLoading && <span className="spinner-border spinner-border-sm text-light"></span>}
              Proceed
            </button>

            <button
              className="btn btn-outline-secondary w-100 mb-2 py-2"
              onClick={() => setShowOtpModal(false)}
            >
              Cancel
            </button>

            <button
              className="btn btn-link w-100 py-1"
              onClick={handleSendOtp}
              disabled={!canResend}
            >
              Resend OTP
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          <div className="modal-card border-success animate-drop-in">
            <div className="text-center mb-3">
              <h5 className="text-success fw-bold">Money Sent Successfully</h5>
              <p className="text-muted">Your RFID balance has been updated.</p>
            </div>
            <button
              className="btn btn-success w-100 py-2 fw-bold"
              onClick={() => setShowSuccessModal(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .otp-container {
          display: flex;
          justify-content: center;
          flex-wrap: nowrap;
          gap: 0.5rem;
        }

        @media (max-width: 400px) {
          .otp-container {
            flex-wrap: nowrap;
            gap: 0.4rem;
          }
          .otp-input {
            width: 2.4rem !important;
            height: 2.4rem !important;
            font-size: 1.1rem;
          }
        }

        .otp-input {
          width: 3rem;
          height: 3rem;
          font-size: 1.3rem;
          border-radius: 0.5rem;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(5px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1050;
        }

        .modal-card {
          background: #fff;
          padding: 2rem;
          border-radius: 1rem;
          max-width: 400px;
          width: 90%;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .modal-card.border-success {
          border: 2px solid #28a745;
        }

        @keyframes dropIn {
          0% {
            opacity: 0;
            transform: translateY(-30px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-drop-in {
          animation: dropIn 0.4s ease forwards;
        }
      `}</style>
    </>
  );
}
