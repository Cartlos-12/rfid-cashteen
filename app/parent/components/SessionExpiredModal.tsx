'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function SessionExpiredModal({ onConfirm }: { onConfirm: () => void }) {
  const router = useRouter();
  const [show, setShow] = useState(false);

  useEffect(() => {
    const originalFetch = window.fetch;

    window.fetch = async (...args) => {
      const response = await originalFetch(...args);

      if (response.status === 401) {
        setShow(true);
      }
      return response;
    };
  }, []);

  if (!show) return null;

  return (
    <div className="expired-overlay d-flex justify-content-center align-items-center">
      <div className="expired-modal p-4 rounded-4 shadow-lg text-center animate-pop">
        <i className="bi bi-clock-history text-danger" style={{ fontSize: "3.5rem" }}></i>

        <h4 className="fw-bold text-danger mt-3">Session Expired</h4>
        <p className="text-muted mb-4">
          Your login session has expired. Please sign in again.
        </p>

        <button
          className="btn btn-danger px-4 fw-semibold"
          onClick={() => router.replace("/parent/login")}
        >
          Login Again
        </button>
      </div>

      <style jsx>{`
        .expired-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.55);
          backdrop-filter: blur(5px);
          z-index: 2000;
          animation: fadeIn 0.3s ease;
        }

        .expired-modal {
          width: 340px;
          max-width: 90%;
          background: white;
          border-radius: 16px;
          animation: pop 0.35s ease forwards;
        }

        @keyframes pop {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
