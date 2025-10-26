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

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Fetch student RFID
  useEffect(() => {
    async function fetchStudent() {
      try {
        const res = await fetch('/parent/api/student', { credentials: 'include' });
        const data = await res.json();
        if (res.ok && data.success) setStudent({ rfid: data.student.rfid });
        else setOtpError('⚠️ Could not fetch RFID info.');
      } catch (err) {
        console.error(err);
        setOtpError('⚠️ Error fetching RFID info.');
      }
    }
    fetchStudent();
  }, []);

  const handleSendOtp = async () => {
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
        setOtpError('OTP sent to your email.');
        setTimeout(() => otpRefs.current[0]?.focus(), 100);
      } else setOtpError(`❌ ${data.message || 'Failed to send OTP.'}`);
    } catch (err) {
      console.error(err);
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
        // Success: reset inputs
        setAmount('');
        setWallet('gcash');
        setOtp(['', '', '', '', '', '']);
        setShowOtpModal(false);
        setShowSuccessModal(true);
      } else {
        // OTP error or expired
        setOtpError(` ${data.message || 'OTP is invalid or expired.'}`);
      }
    } catch (err) {
      console.error(err);
      setOtpError('⚠️ Server error during top-up.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex justify-content-center align-items-center bg-light p-3">
      <div className="card shadow-lg w-100" style={{ maxWidth: '450px', borderRadius: '1rem' }}>
        <div className="card-body p-4">
          <h3 className="text-center text-primary mb-3">Load RFID Balance</h3>
          <p className="text-center text-muted mb-4">Confirm your details before proceeding.</p>

          <div className="mb-3">
            <label className="form-label">RFID Tag</label>
            <input
              type="text"
              className="form-control"
              value={student?.rfid ?? 'Loading...'}
              disabled
            />
          </div>

          <div className="mb-3">
            <label className="form-label">Amount (₱)</label>
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
            <label className="form-label">E-Wallet</label>
            <select
              className="form-select"
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
            >
              <option value="gcash">GCash</option>
            </select>
          </div>

          <button
            className="btn btn-primary w-100 mb-3"
            onClick={handleSendOtp}
            disabled={isLoading}
          >
            {isLoading ? 'Processing…' : 'Confirm'}
          </button>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', zIndex: 1050 }}>
          <div className="card p-4 shadow-lg" style={{ maxWidth: '400px', borderRadius: '1rem' }}>
            <h5 className="text-center mb-3">Enter OTP</h5>
            <p className="text-center text-muted mb-3">6-digit OTP sent to your email</p>
            {otpError && <p className="text-center text-danger mb-2">{otpError}</p>}

            <div className="d-flex justify-content-center gap-2 mb-3 flex-wrap">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={(el: HTMLInputElement | null) => { if (el) otpRefs.current[idx] = el; }}
                  type="text"
                  value={digit}
                  onChange={(e) => handleOtpChange(idx, e.target.value)}
                  maxLength={1}
                  className="form-control text-center"
                  style={{ width: '3rem', height: '3rem', fontSize: '1.25rem' }}
                />
              ))}
            </div>

            <button
              className="btn btn-success w-100 mb-2 d-flex justify-content-center align-items-center gap-2"
              onClick={handleTopup}
              disabled={isLoading}
            >
              {isLoading && <span className="spinner-border spinner-border-sm text-dark"></span>}
              Proceed
            </button>
            <button className="btn btn-outline-secondary w-100" onClick={() => setShowOtpModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center" 
             style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(5px)', zIndex: 1050 }}>
          <div className="card p-4 shadow-lg border-success" style={{ maxWidth: '400px', borderRadius: '1rem' }}>
            <div className="text-center mb-3">
              <h5 className="text-success">Money Sent Successful</h5>
              <p className="text-muted">Your RFID balance has been updated.</p>
            </div>
            <button className="btn btn-success w-100" onClick={() => setShowSuccessModal(false)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
