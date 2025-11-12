'use client';

import { useEffect, useState, useRef } from 'react';

export default function TopUpPage() {
  const [showContent, setShowContent] = useState(false);
  const [showModalContent, setShowModalContent] = useState(false);
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

  const otpRefs = useRef<Array<HTMLInputElement | null>>(Array(6).fill(null));
  const countdownInterval = useRef<number | null>(null);

  const setOtpRef = (index: number) => (el: HTMLInputElement | null) => {
    otpRefs.current[index] = el;
  };

  // Initial fade-in
  useEffect(() => setShowContent(true), []);

  // Delay modal content for animation
  useEffect(() => {
    if (showOtpModal || showSuccessModal) {
      setShowModalContent(false);
      const timer = setTimeout(() => setShowModalContent(true), 250);
      return () => clearTimeout(timer);
    }
  }, [showOtpModal, showSuccessModal]);

  // Fetch student RFID
  useEffect(() => {
    fetch('/parent/api/student', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setStudent({ rfid: data.student.rfid });
        else setOtpError('⚠️ Could not fetch RFID info.');
      })
      .catch(() => setOtpError('⚠️ Error fetching RFID info.'));
  }, []);

  // ✅ OTP Countdown — fixed dependency array
  useEffect(() => {
    if (showOtpModal && isOtpSent && otpCountdown > 0) {
      if (countdownInterval.current === null) {
        countdownInterval.current = window.setInterval(() => {
          setOtpCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval.current!);
              countdownInterval.current = null;
              setCanResend(true);
              setOtpError('⏰ OTP expired. Please resend.');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    }

    return () => {
      if (countdownInterval.current !== null) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
      }
    };
  }, [showOtpModal, isOtpSent, otpCountdown]); // ← added otpCountdown

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // Send / Resend OTP
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
        if (countdownInterval.current !== null) {
          clearInterval(countdownInterval.current);
          countdownInterval.current = null;
        }
        countdownInterval.current = window.setInterval(() => {
          setOtpCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownInterval.current!);
              countdownInterval.current = null;
              setCanResend(true);
              setOtpError('OTP expired. Please resend.');
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else {
        setOtpError(`❌ ${data.message || 'Failed to send OTP.'}`);
      }
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
        body: JSON.stringify({
          rfid: student.rfid,
          amount: Number(amount),
          wallet,
          otp: otpValue,
        }),
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
        setOtpError(`${data.message || 'OTP is invalid or expired.'}`);
      }
    } catch {
      setOtpError('⚠️ Server error during top-up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className={`fade-in-content ${showContent ? 'fade-in' : ''}`}>
        <div className="container-fluid px-3 position-relative" style={{ minHeight: '70vh' }}>
          {/* Main Form */}
          <div className="topup-card card shadow-lg mx-auto mt-5">
            <div className="card-body p-5">
              <h3 className="text-center text-dark fw-bold mb-3">Load RFID Balance</h3>
              <p className="text-center text-muted mb-4">
                Confirm your details before proceeding.
              </p>

              <div className="mb-3">
                <label className="form-label fw-semibold">RFID Tag</label>
                <input
                  type="text"
                  className="form-control text-center fw-bold"
                  value={student?.rfid ?? ''}
                  disabled
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
                />
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
                {isLoading ? 'Processing...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="modal-overlay">
          {showModalContent && (
            <div className="modal-card animate-fade-in">
              <h5 className="text-center mb-2 fw-bold">Enter OTP</h5>
              <p className="text-center text-muted mb-2">6-digit OTP sent to your email</p>
              <p
                className={`text-center mb-3 ${
                  otpCountdown <= 60 && otpCountdown > 0
                    ? 'text-danger fw-bold'
                    : 'text-secondary'
                }`}
              >
                {otpCountdown > 0
                  ? `OTP expires in ${formatTime(otpCountdown)}`
                  : 'OTP expired'}
              </p>

              {otpError && <p className="text-center text-danger mb-3">{otpError}</p>}

              <div className="otp-container mb-3">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={setOtpRef(idx)}
                    type="text"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    maxLength={1}
                    className="form-control text-center fw-bold otp-input"
                  />
                ))}
              </div>

              <button className="btn btn-primary w-100 mb-2 py-2 fw-bold" onClick={handleTopup}>
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
          )}
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="modal-overlay">
          {showModalContent && (
            <div className="modal-card border-success animate-fade-in">
              <div className="text-center mb-3">
                <h5 className="text-success fw-bold">Money Sent Successfully</h5>
                <p className="text-muted">Your RFID balance has been updated.</p>
              </div>
              <button
                className="btn btn-success w-100 py-2 fw-bold btn-gradient-success"
                onClick={() => setShowSuccessModal(false)}
              >
                Close
              </button>
            </div>
          )}
        </div>
      )}

      {/* Styles */}
      <style jsx global>{`
        html,
        body {
          margin: 0;
          padding: 0;
          height: 100%;
          overflow-x: hidden;
        }
      `}</style>

      <style jsx>{`
        .fade-in-content {
          opacity: 0;
          transform: translateY(20px);
          transition: opacity 0.8s ease, transform 0.8s ease;
        }
        .fade-in-content.fade-in {
          opacity: 1;
          transform: translateY(0);
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          width: 100%;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          background: rgba(0, 0, 0, 0.5);
          backdrop-filter: blur(6px);
          z-index: 3000;
          margin: 0;
          padding: 0;
        }

        .modal-card {
          background: #fff;
          padding: 2rem;
          border-radius: 1rem;
          max-width: 420px;
          width: 90%;
          max-height: 90%;
          overflow-y: auto;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          margin-left: 278px;
        }

        .animate-fade-in {
          animation: modalIn 0.4s ease forwards;
        }

        @keyframes modalIn {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        .otp-container {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
        }

        .otp-input {
          width: 3rem;
          height: 3rem;
          font-size: 1.25rem;
          border-radius: 0.5rem;
        }

        .topup-card {
          max-width: 480px;
          width: 105%;
          border-radius: 1rem;
          background: linear-gradient(135deg, #ffffff, #f9fafb);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.12);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
        }

        .btn-gradient-success {
          background: linear-gradient(135deg, #22c55e, #4ade80);
          border: none;
        }

        @media (max-width: 576px) {
          .modal-card {
            padding: 1.5rem;
            width: 95%;
          }
          .otp-input {
            width: 2.5rem;
            height: 2.5rem;
            font-size: 1rem;
          }
        }
      `}</style>
    </>
  );
}
