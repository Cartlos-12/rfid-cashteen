'use client';
import React, { useEffect } from "react";

export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface ReceiptData {
  id: string;
  customerName: string;
  oldBalance?: number;
  newBalance?: number;
  items: CartItem[];
  total: number;
  date: string;
}

export default function ReceiptPage({ data, onClose }: { data: ReceiptData; onClose: () => void }) {

  useEffect(() => {
    // Automatic printing
    (async () => {
      try {
        const response = await fetch("http://localhost:3001/print", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Print failed");
        console.log("Print success:", result.message);
      } catch (err) {
        console.error("Automatic print failed:", err);
      }
    })();
  }, [data]);

  return (
    <div id="receipt-content" className="modal d-block position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 1050, position: "relative" }}>
      {/* Background overlay */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(3px)' }}
        onClick={onClose}
      />
      <div className="d-flex justify-content-center align-items-center w-100 h-100">
        <div
          className="modal-content p-3 position-relative"
          style={{
            fontFamily: "monospace",
            overflow: "hidden",
            width: "380px",
            maxHeight: "90%",
            borderRadius: "8px",
          }}
        >
          <img
            src="/logo.png"
            alt="logo"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              opacity: 0.15,
              width: "60%",
              pointerEvents: "none",
              userSelect: "none",
              zIndex: 0,
              borderRadius: "100px",
            }}
          />
          <div style={{ position: "relative", zIndex: 1 }}>
            <div className="modal-header justify-content-center position-relative">
              <h5 className="modal-title fw-bold">Invoice</h5>
              <button
                type="button"
                className="btn-close position-absolute"
                style={{ right: '1rem' }}
                onClick={onClose}
              />
            </div>
            <div className="modal-body">
              <div className="text-center mb-3">
                <h6 className="fw-bold mb-0">CashTeen Payment System</h6>
                <small>Official Invoice</small>
              </div>
              <div className="mb-2">
                <p className="mb-1"><strong>Receipt ID:</strong> {data.id}</p>
                <p className="mb-1"><strong>Customer:</strong> {data.customerName}</p>
                <p className="mb-1"><strong>Date:</strong> {data.date}</p>
                {data.oldBalance !== undefined && data.newBalance !== undefined && (
                  <>
                    <p className="mb-1"><strong>Old Balance:</strong> ₱{data.oldBalance.toFixed(2)}</p>
                    <p className="mb-1"><strong>New Balance:</strong> ₱{data.newBalance.toFixed(2)}</p>
                  </>
                )}
              </div>
              <hr />
              <div>
                {data.items.map((i, idx) => (
                  <div key={idx} className="d-flex justify-content-between mb-1">
                    <span>{i.name} x{i.quantity}</span>
                    <span>₱{(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-bold">
                <span>Total</span>
                <span>₱{data.total.toFixed(2)}</span>
              </div>
              <div className="text-center mt-3">
                <small>Thank you for your purchase!</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
