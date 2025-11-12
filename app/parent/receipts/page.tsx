'use client';

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";

interface CartItem {
  id?: number;
  name: string;
  price: number;
  quantity: number;
}

interface ReceiptData {
  id?: string;
  customerName: string;
  total: number;
  items: CartItem[];
  date?: string;
  oldBalance?: number;
  newBalance?: number;
}

interface Transaction {
  id: string | number;
  user_name: string;
  total: number;
  status: string;
  created_at: string;
  items?: CartItem[];
}

interface Parent {
  id: string;
  name: string;
  email: string;
}

function ReceiptModal({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const receiptId = data.id || `TX-${new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14)}`;
  const formattedDate = data.date ? new Date(data.date).toLocaleString() : new Date().toLocaleString();

  return (
    <div className="modal d-block position-fixed top-0 start-0 w-100 h-100" style={{ zIndex: 1050 }}>
      {/* Overlay */}
      <div
        className="position-absolute top-0 start-0 w-100 h-100"
        style={{ backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="modal-dialog modal-dialog-centered position-relative">
        <div className="modal-content p-3" style={{ fontFamily: 'monospace', maxHeight: '90vh', overflowY: 'auto', width: '400px', margin: 'auto', borderRadius: '8px' }}>
          
          {/* Header */}
          <div className="modal-header justify-content-center position-relative">
            <h5 className="modal-title fw-bold">Invoice</h5>
            <button type="button" className="btn-close position-absolute" style={{ right: '1rem' }} onClick={onClose}></button>
          </div>

          {/* Body */}
          <div className="modal-body">
            <div className="text-center mb-3">
              <h6 className="fw-bold mb-0">Cashteen Payment System</h6>
              <small>Invoice</small>
            </div>

            <div className="mb-2">
              <p className="mb-1"><strong>Receipt ID:</strong> {receiptId}</p>
              <p className="mb-1"><strong>Customer:</strong> {data.customerName}</p>
              <p className="mb-1"><strong>Date:</strong> {formattedDate}</p>
              {data.oldBalance !== undefined && data.newBalance !== undefined && (
                <>
                  <p className="mb-1"><strong>Old Balance:</strong> ₱{data.oldBalance.toFixed(2)}</p>
                  <p className="mb-1"><strong>New Balance:</strong> ₱{data.newBalance.toFixed(2)}</p>
                </>
              )}
            </div>

            <hr />

            <div>
              {data.items.length > 0 ? (
                data.items.map((i, idx) => (
                  <div key={idx} className="d-flex justify-content-between mb-1">
                    <span>{i.name} x{i.quantity}</span>
                    <span>₱{(i.price * i.quantity).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted">No items listed</p>
              )}
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

          {/* Footer */}
          <div className="modal-footer">
            <button
              className="btn btn-success w-100"
              onClick={() => window.print()}
            >
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReceiptsPage() {
  const [parent, setParent] = useState<Parent | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [animateContent, setAnimateContent] = useState(false);

  useEffect(() => {
    async function fetchParent() {
      try {
        const res = await fetch("/parent/api/auth/me");
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Not logged in");
        setParent(data.data);
      } catch (err: any) {
        console.error("No logged-in parent:", err.message);
        setParent(null);
      }
    }
    fetchParent();
  }, []);

  useEffect(() => {
    if (!parent?.id) return;

    async function fetchTransactions() {
      try {
        const res = await fetch("/parent/api/receipts?page=1", { credentials: "include" });
        if (!res.ok) throw new Error("Failed to fetch transactions");
        const data: Transaction[] = await res.json();

        setTransactions(data.map(tx => ({
          ...tx,
          total: Number(tx.total) || 0,
          items: Array.isArray(tx.items) ? tx.items : [],
        })));
        setAnimateContent(true);
      } catch (err) {
        console.error(err);
        setTransactions([]);
        setAnimateContent(true);
      }
    }

    fetchTransactions();
  }, [parent]);

  const openReceipt = (tx: Transaction) => {
    setSelectedReceipt({
      id: tx.id.toString(),
      customerName: tx.user_name,
      total: tx.total,
      items: tx.items || [],
      date: tx.created_at,
    });
  };

  return (
    <div className="container-fluid px-3 position-relative" style={{ minHeight: "70vh" }}>
      <div className={`transition-container ${animateContent ? "fade-in-container" : ""}`}>
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3 px-2">
          <h3 className="text-dark fw-bold mb-3">Invoice Purchase</h3>
        </div>

        {/* Transactions Table */}
        <div className="shadow-sm border rounded table-container" style={{ maxHeight: '580px', overflowY: 'auto', backgroundColor: '#fff' }}>
          <div className="d-none d-sm-block table-responsive">
            <table className="table table-hover mb-0 align-middle" style={{ tableLayout: 'fixed', minWidth: '600px', width: '100%' }}>
              <thead className="table-header sticky-top shadow-sm">
                <tr className="text-center">
                  <th className="py-3">Customer</th>
                  <th className="py-3">Date</th>
                  <th className="py-3">Total</th>
                  <th className="py-3">Action</th>
                </tr>
              </thead>
              <tbody className="text-center">
                {transactions.length ? transactions.map((tx, index) => (
                  <tr key={tx.id} className="align-middle fade-in" style={{ animationDelay: `${index * 0.05}s` }}>
                    <td className="fw-semibold">{tx.user_name}</td>
                    <td>{new Date(tx.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</td>
                    <td className="text-success fw-semibold">₱{tx.total.toFixed(2)}</td>
                    <td>
                      <button className="btn btn-sm btn-primary px-3 py-1" onClick={() => openReceipt(tx)}>View</button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="py-5 text-muted">No transactions found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Mobile Cards */}
        <div className="d-block d-sm-none px-2">
          {transactions.length ? transactions.map((tx, i) => (
            <div key={tx.id} className="mobile-card border rounded shadow-sm mb-3 p-3 fade-in" style={{ backgroundColor: i % 2 === 0 ? '#f8f9fa' : '#ffffff', animationDelay: `${i * 0.05}s` }}>
              <div className="d-flex justify-content-between mb-1"><span className="fw-semibold">Customer:</span><span>{tx.user_name}</span></div>
              <div className="d-flex justify-content-between mb-1"><span className="fw-semibold">Date:</span><span>{new Date(tx.created_at).toLocaleString('en-PH', { timeZone: 'Asia/Manila' })}</span></div>
              <div className="d-flex justify-content-between mb-1"><span className="fw-semibold">Total:</span><span className="text-success fw-semibold">₱{tx.total.toFixed(2)}</span></div>
              <button className="btn btn-primary w-100 mt-2" onClick={() => openReceipt(tx)}>View Receipt</button>
            </div>
          )) : <div className="text-center py-5 text-muted">No transactions found</div>}
        </div>
      </div>

      {/* Receipt Modal */}
      {selectedReceipt && <ReceiptModal data={selectedReceipt} onClose={() => setSelectedReceipt(null)} />}

      <style jsx>{`
        .table-header th { background-color: #cfe2ff; font-weight: 600; color: #0d6efd; }
        table tbody tr:hover { background-color: #d0e4ff; transition: background-color 0.3s; }
        .mobile-card { transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease; }
        .mobile-card:hover { transform: translateY(-2px); box-shadow: 0 6px 15px rgba(0,0,0,0.1); }

        .fade-in { opacity: 0; animation: fadeIn 0.5s forwards; }
        @keyframes fadeIn { to { opacity: 1; } }

        .transition-container { opacity: 0; transition: opacity 0.5s ease; }
        .fade-in-container { opacity: 1; }

        @media (max-width: 576px) {
          .table-container { margin-left: 0 !important; margin-right: 0 !important; }
          table thead th, table tbody td { font-size: 0.85rem; padding: 0.5rem; }
        }
      `}</style>
    </div>
  );
}
